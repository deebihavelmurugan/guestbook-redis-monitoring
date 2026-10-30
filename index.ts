import * as k8sjs from "./k8sjs";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const config = new pulumi.Config();

// --------------------------------------------------
// 1. Existing Guestbook application
// --------------------------------------------------

const redisLeader = new k8sjs.ServiceDeployment("redis-leader", {
    image: "redis",
    ports: [6379],
});

const redisReplica = new k8sjs.ServiceDeployment("redis-replica", {
    image: "pulumi/guestbook-redis-replica",
    ports: [6379],
});

const frontend = new k8sjs.ServiceDeployment("frontend", {
    replicas: 3,
    image: "pulumi/guestbook-php-redis",
    ports: [80],
    allocateIpAddress: true,
    isMinikube: config.getBoolean("isMinikube"),
});

// --------------------------------------------------
// 2. Redis Exporter - exposes Redis metrics
// --------------------------------------------------

const redisExporter = new k8s.apps.v1.Deployment("redis-exporter", {
    metadata: {
        labels: { app: "redis-exporter" },
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: { app: "redis-exporter" },
        },
        template: {
            metadata: {
                labels: { app: "redis-exporter" },
            },
            spec: {
                containers: [{
                    name: "redis-exporter",
                    image: "oliver006/redis_exporter:v1.62.0",
                    ports: [{
                        name: "metrics",
                        containerPort: 9121,
                    }],
                    env: [{
                        name: "REDIS_ADDR",
                        value: "redis://redis-leader:6379",
                    }],
                    resources: {
                        requests: {
                            cpu: "50m",
                            memory: "64Mi",
                        },
                        limits: {
                            cpu: "200m",
                            memory: "128Mi",
                        },
                    },
                }],
            },
        },
    },
}, {
    dependsOn: [redisLeader.deployment, redisLeader.service],
});

const redisExporterService = new k8s.core.v1.Service("redis-exporter", {
    metadata: {
        name: "redis-exporter",
        labels: { app: "redis-exporter" },
    },
    spec: {
        type: "ClusterIP",
        selector: { app: "redis-exporter" },
        ports: [{
            name: "metrics",
            port: 9121,
            targetPort: 9121,
        }],
    },
}, {
    dependsOn: [redisExporter],
});

// --------------------------------------------------
// 3. Prometheus - collects and stores metrics
// --------------------------------------------------

const prometheus = new k8s.helm.v4.Chart("guestbook-prometheus", {
    chart: "prometheus",
    version: "29.39.0",
    namespace: "monitoring",
    repositoryOpts: {
        repo: "https://prometheus-community.github.io/helm-charts",
    },
    values: {
        alertmanager: {
            enabled: false,
        },
        pushgateway: {
            enabled: false,
        },
        kubeStateMetrics: {
            enabled: false,
        },
        "prometheus-node-exporter": {
            enabled: false,
        },
        server: {
            persistentVolume: {
                enabled: false,
            },
            resources: {
                requests: {
                    cpu: "200m",
                    memory: "256Mi",
                },
                limits: {
                    cpu: "500m",
                    memory: "512Mi",
                },
            },
        },
        extraScrapeConfigs: `
- job_name: "redis-exporter"
  static_configs:
    - targets:
        - "redis-exporter.default.svc.cluster.local:9121"
`,
    },
}, {
    dependsOn: [redisExporterService],
});

// --------------------------------------------------
// 4. Grafana - dashboards and metric visualization
// --------------------------------------------------

const grafanaAdminPassword =
    config.requireSecret("grafanaAdminPassword");

const grafana = new k8s.helm.v4.Chart("guestbook-grafana", {
    chart: "grafana",
    version: "10.5.15",
    namespace: "monitoring",
    repositoryOpts: {
        repo: "https://grafana.github.io/helm-charts",
    },
    values: {
        adminUser: "admin",
        adminPassword: grafanaAdminPassword,

        persistence: {
            enabled: false,
        },

        service: {
            type: "ClusterIP",
            port: 80,
        },

        resources: {
            requests: {
                cpu: "100m",
                memory: "128Mi",
            },
            limits: {
                cpu: "500m",
                memory: "256Mi",
            },
        },

        datasources: {
            "datasources.yaml": {
                apiVersion: 1,
                datasources: [{
                    name: "Prometheus",
                    type: "prometheus",
                    access: "proxy",
                    url: "http://guestbook-prometheus-server.monitoring.svc.cluster.local",
                    isDefault: true,
                }],
            },
        },
    },
}, {
    dependsOn: [prometheus],
});

// --------------------------------------------------
// 5. Stack outputs
// --------------------------------------------------

export const frontendIp = frontend.ipAddress;
export const grafanaUrl = "http://localhost:3000";
export const prometheusUrl = "http://localhost:9090";
export const grafanaUsername = "admin";
