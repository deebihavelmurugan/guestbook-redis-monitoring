# Kubernetes Guestbook with Redis Monitoring

## Overview

This project deploys a Kubernetes Guestbook application using Pulumi and TypeScript and extends it with Redis monitoring using Prometheus, Redis Exporter, and Grafana.

The infrastructure is deployed declaratively using Pulumi. Prometheus collects Redis metrics exposed by Redis Exporter, and Grafana visualizes those metrics through a dashboard.

## Architecture

The solution includes:

- **Guestbook Frontend:** Three frontend replicas.
- **Redis Leader:** Stores Guestbook entries.
- **Redis Replica:** Handles read operations.
- **Redis Exporter:** Exposes Redis performance metrics for Prometheus.
- **Prometheus:** Scrapes and stores Redis Exporter metrics.
- **Grafana:** Visualizes Redis metrics using a monitoring dashboard.

### Monitoring flow

Redis → Redis Exporter → Prometheus → Grafana

## Technology Stack

- Pulumi
- TypeScript
- Kubernetes
- Redis
- Redis Exporter
- Prometheus
- Grafana
- Helm

## Prerequisites

Before deploying, ensure the following tools are installed and configured:

- Docker Desktop with Kubernetes enabled, or another Kubernetes cluster
- kubectl
- Pulumi CLI
- Node.js and npm

Verify Kubernetes connectivity:

```bash
kubectl get nodes
```

## Project Structure

```text
.
├── index.ts
├── k8sjs.ts
├── Pulumi.yaml
├── Pulumi.dev.yaml
├── package.json
├── package-lock.json
├── tsconfig.json
├── imgs/
│   └── guestbook.png
└── screenshots/
    ├── grafana-dashboard.png
    └── prometheus-targets.png
```

## Deployment Instructions

### 1. Clone the repository

```bash
git clone https://github.com/deebihavelmurugan/guestbook-redis-monitoring.git
cd guestbook-redis-monitoring
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Pulumi

Select the development stack:

```bash
pulumi stack select dev
```

This project was tested using Pulumi's local backend. If using the local backend, initialize it with:

```bash
pulumi login --local
```

The project uses encrypted Pulumi configuration for the Grafana administrator password. Configure the secret for your own environment if needed:

```bash
pulumi config set --secret grafanaAdminPassword YOUR_PASSWORD
```

Do not commit plaintext passwords, access tokens, or Pulumi passphrases.

### 4. Deploy the infrastructure

Preview the deployment:

```bash
pulumi preview
```

Deploy:

```bash
pulumi up
```

Review the proposed changes and confirm the deployment.

### 5. Verify Kubernetes resources

```bash
kubectl get pods -A
kubectl get services -A
kubectl get deployments -A
```

Verify that the Guestbook, Redis, Redis Exporter, Prometheus, and Grafana resources are running.

## Accessing the Guestbook

Forward the frontend service port:

```bash
kubectl port-forward svc/frontend 8765:80
```

Open the application:

http://localhost:8765

## Accessing Grafana

Grafana is available locally through Kubernetes port forwarding.

Start the port-forward:

```bash
kubectl port-forward svc/guestbook-grafana 3000:80 -n monitoring
```

Open Grafana:

**URL:** http://localhost:3000

**Username:** `admin`

**Password:** The Grafana administrator password configured through Pulumi encrypted configuration. Retrieve it from your own Pulumi environment:

```bash
pulumi config get guestbook-easy:grafanaAdminPassword --show-secrets
```

The password should be shared with the assessment reviewer separately through a secure channel, not committed to this repository.

## Prometheus Verification

Forward the Prometheus service:

```bash
kubectl port-forward svc/guestbook-prometheus-server 9090:80 -n monitoring
```

Open Prometheus:

http://localhost:9090

### Verify Redis Exporter target

Navigate to:

http://localhost:9090/targets

Confirm that the `redis-exporter` target is in the **UP** state.

### Verify Redis metrics

In the Prometheus query interface, execute:

```promql
redis_up
```

An output value of `1` indicates that Redis Exporter can successfully collect Redis metrics.

Other useful queries:

**Connected Redis clients**

```promql
redis_connected_clients
```

**Redis memory usage**

```promql
redis_memory_used_bytes
```

**Redis commands processed per second**

```promql
rate(redis_commands_processed_total[5m])
```

**Note:** The current monitoring implementation collects Redis metrics through Redis Exporter. It does not currently expose or scrape application-level metrics directly from the Guestbook frontend.

## Grafana Dashboard

The Grafana dashboard visualizes Redis performance metrics, including:

1. Connected Clients
2. Memory Usage
3. Commands Per Second

### Dashboard Screenshot

![Grafana Dashboard](screenshots/grafana-dashboard.png)

### Prometheus Targets Screenshot

![Prometheus Targets](screenshots/prometheus-targets.png)

## Cleanup

To remove the deployed resources:

```bash
pulumi destroy
```

Review and confirm the destruction when prompted.

## Reference

The Guestbook application is based on the Pulumi Kubernetes TypeScript Guestbook example:

https://github.com/pulumi/examples/tree/master/kubernetes-ts-guestbook

This project extends the example with Redis Exporter, Prometheus, and Grafana monitoring.
