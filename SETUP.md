# Setup

## Activate required APIs

```bash
gcloud services enable container.googleapis.com \
  artifactregistry.googleapis.com \
  certificatemanager.googleapis.com \
  sqladmin.googleapis.com \
  cloudbuild.googleapis.com
```

## Create a GKE Autopilot Cluster

```bash
export REGION=europe-west1
export PROJECT_ID=mgalite-ts24-playground
export CLUSTER_NAME=review-apps
export NETWORK=gke-review-apps-vpc
export ROUTER_NAME=gke-review-apps-router
```

This part creates all the network related components to make our cluster private and still be able to connect to the internet.

```bash
gcloud compute networks create $NETWORK --subnet-mode=custom
```

```bash
gcloud compute networks subnets create $REGION \
  --network=$NETWORK \
  --range=10.10.0.0/24 \
  --region=$REGION
```

```bash
gcloud compute routers create $ROUTER_NAME
  --region $LOCATION \
  --network $NETWORK \
  --project=$PROJECT_ID
```

```bash
gcloud compute routers nats create nat --router=$ROUTER_NAME --region=$REGION \
  --auto-allocate-nat-external-ips \
  --nat-all-subnet-ip-ranges \
  --project=$PROJECT_ID
```

Now we can create the cluster.

```bash
gcloud container clusters create-auto $CLUSTER_NAME \
  --location=$REGION \
  --project=$PROJECT_ID \
  --network=$NETWORK \
  --subnetwork=$REGION \
  --enable-private-nodes
```

## Create a Cloud SQL instance

```bash
export INSTANCE_NAME=cms-instance
```

```bash
gcloud sql instances create $INSTANCE_NAME \
  --database-version=POSTGRES_14 \
  --cpu=4 \
  --memory=16GB \
  --database-flags=cloudsql.iam_authentication=on \
  --region=$REGION
```

```bash
gcloud sql databases create cms --instance=$INSTANCE_NAME
```

## Give access to the Cloud SQL instance to future workloads

```bash
export CMS_WORKLOAD_SA=cms-workload
```

Create a service account for the cms workload

```bash
gcloud iam service-accounts create $CMS_WORKLOAD_SA
```

Gives the service account the Cloud SQL Client role and instance User role

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member "serviceAccount:$CMS_WORKLOAD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/cloudsql.client"
```

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member "serviceAccount:$CMS_WORKLOAD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/cloudsql.instanceUser"
```

```bash
gcloud sql users create $CMS_WORKLOAD_SA@$PROJECT_ID.iam \
  --instance=$INSTANCE_NAME \
  --type=cloud_iam_service_account
```

Allow the Kubernetes Service Account to impersonate the Google Service account

```bash
gcloud iam service-accounts add-iam-policy-binding $CMS_WORKLOAD_SA@$PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:$PROJECT_ID.svc.id.goog[prod/cms]"
```

## Create an Artifact Registry repository to store our container images

```bash
export REPOSITORY_NAME=go-eat
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
```

```bash
gcloud artifacts repositories create go-eat --repository-format=docker --location=$REGION
```

Allow the SA attached the gke cluster nodes to read the repository.

```bash
gcloud artifacts repositories add-iam-policy-binding $REPOSITORY_NAME \
  --location=$REGION \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```
