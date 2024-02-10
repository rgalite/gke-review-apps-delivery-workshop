# Introduction

This repository is a playground to play with different technologies on GCP.

## Setup

Open the `SETUP.md` file to create the necessary Cloud resources.

```bash
export CLUSTER_NAME=review-apps
export PROJECT_ID=mgalite-ts24-playground
export REPO=europe-west1-docker.pkg.dev/$PROJECT_ID/go-eat
export PROJECT_NUMBER=45621755473
export REPOSITORY_NAME=go-eat
```

## Get GKE Kube API credentials

```bash
gcloud container clusters get-credentials $CLUSTER_NAME --region europe-west1 --project $PROJECT_ID
```

```bash
kubectl config rename-context $(kubectl config current-context) prod
```

## Deep Dive

### Prerequisites Kubernetes resources

Create the namespace.

```bash
kubectl create namespace prod
```

### Skaffold

Build the image and push it to Artifact Registry.

```bash
skaffold build --profile prod,cb --default-repo=$REPO --file-output=artifacts.json
```

Render the manifests.

```bash
skaffold render --profile prod --output render.yaml
```

Apply the manifests.

```bash
skaffold apply --profile=prod --namespace=prod render.yaml
```

### Artifact Registry

```bash
gcloud artifacts repositories create go-eat --repository-format=docker --location=europe-west1
```

### Workload Identity

### Gateway API
