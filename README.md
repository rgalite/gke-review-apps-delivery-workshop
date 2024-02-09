# Introduction

# Prerequisites

## Activate required APIs

```bash
gcloud services enable \
    artifactregistry.googleapis.com \
    clouddeploy.googleapis.com \
    run.googleapis.com
```

# Setup

- Create Docker repository with Artifact registry

```bash
gcloud artifacts repositories create cms \
    --repository-format=docker \
    --location=europe-west
```

- Create Cloud Deploy frontend targets for dev and prod

```bash
gcloud deploy apply --file deploy/cd/frontend-target.yaml --region europe-west1
```

- Create Cloud Deploy cms targets for dev and prod

```bash
gcloud deploy apply --file deploy/cd/cms-target.yaml --region europe-west1
```

- Create Cloud Deploy cms mulit-targets for dev and prod

```bash
gcloud deploy apply --file deploy/cd/cms-multi-target.yaml --region europe-west1
```

- Create Cloud Deploy delivery pipeline for frontend

```bash
gcloud deploy apply --file deploy/cd/frontend-delivery-pipeline.yaml --region europe-west1
```

- Create Cloud Deploy delivery pipeline for cms

```bash
gcloud deploy apply --file deploy/cd/cms-delivery-pipeline.yaml --region europe-west1
```

- Create Cloud Deploy delivery pipeline for both apps

```bash
gcloud deploy apply --file deploy/cd/cms-multitarget-pipeline.yaml --region europe-west1
```
