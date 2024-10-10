# Introduction

In today's fast-paced and ever-changing business landscape, the ability to quickly and efficiently deploy applications is critical. Insufficient collaboration tools between application and product development teams can introduce challenges when reviewing application changes, potentially extending the time to market.

Review apps are short-lived application environments that enable developers, designers, QA personnel, product managers, and other reviewers to assess and interact with code modifications as part of the code review process. These environments are built using the branch's code, providing a tangible and interactive platform for reviewing proposed changes.

Through this workshop, we will guide you through the journey of establishing a platform that leverages GKE for the creation of disposable environments. We will incorporate ingresses using the Kubernetes Gateway API to direct traffic towards the short-lived applications. Lastly, we will utilize Config Connector to effortlessly construct the infrastructure dynamically.

We will cover the following topics:

- Introduction to disposable app environments and their benefits
- Leveraging the Kubernetes and Getway API to drive traffic to the ephemeral apps
- Provisioning and tearing down infrastructure for the ephemeral apps with Kubernetes
- Integrating with continuous integration and continuous deployment (CI/CD) pipelines
  Best practices for security and scalability

# Setup

## Get the code

```bash
git clone -b labs/gke https://github.com/rgalite/gke-review-apps-delivery-workshop
```

## Activate required APIs

This workshop will need the following APIs enabled:

- Container API
- Artifact Registry
- Certificate Manager
- SQL Admin
- Cloud Build
- Secret Manager

```bash
gcloud services enable container.googleapis.com \
    artifactregistry.googleapis.com \
    certificatemanager.googleapis.com \
    sqladmin.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    container.googleapis.com
```

## Create a GKE Autopilot Cluster

Update the environment variables with your own values.

```bash
export REGION=europe-west9
export PROJECT_ID=$(gcloud config get project)
export CLUSTER_NAME=cluster
export NETWORK=gke-vpc
export ROUTER_NAME=gke-router
```

This part creates all the network related components to make our cluster private and still be able to connect to the internet.

```bash
gcloud compute networks create $NETWORK --subnet-mode=custom
```

Create a subnet in the region of your choice.

```bash
gcloud compute networks subnets create $REGION \
    --network=$NETWORK \
    --range=10.10.0.0/24 \
    --region=$REGION
```

Because we have a private cluster, we need to create a NAT gateway.

```bash
gcloud compute routers create $ROUTER_NAME \
    --region $REGION \
    --network $NETWORK \
    --project=$PROJECT_ID
```

We'll route all IPs from the subnet to the NAT gateway.

```bash
gcloud compute routers nats create nat \
    --router=$ROUTER_NAME \
    --region=$REGION \
    --auto-allocate-nat-external-ips \
    --nat-all-subnet-ip-ranges \
    --project=$PROJECT_ID
```

Let's create a cluster with private nodes in the region you selected.

```bash
gcloud container clusters create-auto $CLUSTER_NAME \
    --location=$REGION \
    --project=$PROJECT_ID \
    --network=$NETWORK \
    --subnetwork=$REGION \
    --enable-private-nodes
```

Get the credentials for the cluster.

```bash
gcloud container clusters get-credentials $CLUSTER_NAME \
    --region=$REGION \
    --project=$PROJECT_ID
```

# Create a Gateway

Our objective is to make the application accessible through a global load balancer, allowing users to reach it via a designated domain name.

Securing our application using Transport Layer Security (TLS) is a crucial step in protecting sensitive data and ensuring the integrity of communication between your application and its users.

TLS utilizes certificates for security purposes. In this context, [Certificate Manager](https://cloud.google.com/certificate-manager/docs/overview) plays a crucial role by assisting users in the automatic generation of certificates, thereby enhancing the security of their applications.

## Provision certificates

We'll use the nip.io service to generate certificates.

Create an external IP that will be attached to the load balancer

```bash
gcloud compute addresses create external-ip --global
```

Feel free to change the domain name to match yours.

```bash
export EXTERNAL_IP=$(gcloud compute addresses describe external-ip --format="value(address)")
export DOMAIN_NAME=$EXTERNAL_IP.nip.io
export CERTIFICATE_NAME=app-cert
export CERTIFICATE_MAP=app-cert-map
export CERTIFICATE_MAP_ENTRY=app-cert-map-entry
```

1. Create a Google-managed certificate for your load balancer.

   ```bash
   gcloud certificate-manager certificates create $CERTIFICATE_NAME \
      --domains="$DOMAIN_NAME"
   ```

2. Run the following command to create the certificate map.

   ```bash
   gcloud certificate-manager maps create $CERTIFICATE_MAP
   ```

3. Add an entry for the domain name:

   ```bash
   gcloud certificate-manager maps entries create $CERTIFICATE_MAP_ENTRY \
        --map=$CERTIFICATE_MAP \
        --hostname=$DOMAIN_NAME \
        --certificates=$CERTIFICATE_NAME
   ```

Fantastic! We've successfully provisioned a certificate using Certificate Manager, GCP's dedicated service for certificate management.

In preparation for our future Load Balancer, we've created a map that will ensure the correct certificate is presented for to our app.

## Deploy the gateway

A Gateway resource represents a data plane that routes traffic in Kubernetes. A Gateway can represent many different kinds of load balancing and routing depending on the GatewayClass it uses.

In this section, you create a Gateway. Application teams can use the Gateway to expose their applications to the internet by deploying Routes independently and attaching them securely to the Gateway.

Application teams may have apps deployed in multiple namespace. We'll deploy a shared gateway accessible from namespace that have the label `shared-gateway-access: 'true'`.

Let's setup a few variables:

```bash
export GATEWAY_NAMESPACE=infra-resources
```

1. Create a namespace that will hold the resources created by the infrastructure team.

   ```bash
   kubectl create ns $GATEWAY_NAMESPACE
   ```

2. Save the following manifest to a file named `gateway.yaml`.

   ```bash
   cat << EOF > gateway.yaml
   kind: Gateway
   apiVersion: gateway.networking.k8s.io/v1beta1
   metadata:
     name: external-http
     namespace: $GATEWAY_NAMESPACE
     annotations:
       networking.gke.io/certmap: $CERTIFICATE_MAP
   spec:
     gatewayClassName: gke-l7-global-external-managed
     listeners:
       - name: https
         protocol: HTTPS
         port: 443
         allowedRoutes:
           namespaces:
             from: Selector
             selector:
               matchLabels:
                 shared-gateway-access: 'true'
     addresses:
       - type: NamedAddress
         value: external-ip
   EOF
   ```

3. Deploy the gateway.

   ```bash
   kubectl apply -f gateway.yaml
   ```

4. Monitor the gateway deployment with the following command:

   ```bash
   kubectl describe gateway external-http -n infra-resources
   ```

   At some point, the ip should be asigned to the gateway. No routes have been attached to the gateway for now.

   ```yaml
   Name: external-http
   Namespace: infra-resources
   Kind: Gateway
   [...]
   Status:
     Addresses:
       Type: IPAddress
       Value: <SOME-IP>
     Listeners:
       Attached Routes: 0
   ```

Great! We've successfully deployed our gateway and implemented TLS security protocols for optimal data protection.

## Test the gateway

Let's test the gateway by creating a route to a simple application.

1. Create a namespace.

```bash
kubectl create ns test-gateway
```

2. Put a label on the namespace to allow routes from it to be attached to the gateway.

```bash
kubectl label ns test-gateway shared-gateway-access='true'
```

3. Verify the label has been applied to the namespace.

```bash
kubectl describe ns test-gateway
```

You should have something like this:

```yaml
Name: test-gateway
Labels: kubernetes.io/metadata.name=test-gateway
  shared-gateway-access=true
```

4. Deploy a simple workload to the new namespace.

```bash
kubectl -n test-gateway apply -f \
https://raw.githubusercontent.com/GoogleCloudPlatform/gke-networking-recipes/main/gateway/gke-gateway-controller/app/site.yaml
```

5. Run the following command to create a file named `httproute.yaml`. This is the definition of the route.

```bash
cat << EOF > httproute.yaml
kind: HTTPRoute
apiVersion: gateway.networking.k8s.io/v1beta1
metadata:
  name: site-external
  namespace: test-gateway
spec:
  parentRefs:
  - kind: Gateway
    name: external-http
    namespace: infra-resources
  hostnames:
  - "$DOMAIN_NAME"
  rules:
  - backendRefs:
    - name: site-v1
      port: 8080
EOF
```

6. Deploy the httproute.

```bash
kubectl -n test-gateway apply -f httproute.yaml
```

7. Monitor the httproute.

```bash
kubectl describe httproute site-external -n test-gateway
```

After a few minutes, you should see the status of the httproute change to `Accepted`.

```yaml
Status:
  Parents:
    Conditions:
      Reason:                Accepted
      Status:                True
      Type:                  Accepted
      # ...
      Reason:                ReconciliationSucceeded
      Status:                True
      Type:                  Reconciled
```

Run a curl command to make sure your gateway is accessible from your domain name.

```bash
curl https://test-gateway.$DOMAIN_NAME
```

Fantastic! We've successfully deployed an application attached to the gateway. From now on, any application developer can expose an application through the gateway.

# Deploy the application

## Create a Cloud SQL instance

Update the environment variables with your own values.

```bash
export INSTANCE_NAME=cms-instance
```

The application relies on a PostgreSQL database. Create a Cloud SQL instance with the following command.

```bash
gcloud sql instances create $INSTANCE_NAME \
    --database-version=POSTGRES_14 \
    --tier=db-g1-small \
    --database-flags=cloudsql.iam_authentication=on \
    --region=$REGION
```

## Give access to the Cloud SQL instance to future CMS workload

```bash
export CMS_SERVICE_ACCT=cms-sa
export DATABASE_NAME=cms
```

1. Create a Google service account for the cms workload.
   The Kubernetes `cms` workload will be mapped to the Google Service Account `cms-sa`. The CMS workload will be able to connect to the cloud SQL instance through workload identity.

```bash
gcloud iam service-accounts create $CMS_SERVICE_ACCT
```

2. Give the Google service account the `instance User` role so it can access the instance.

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member "serviceAccount:$CMS_SERVICE_ACCT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role "roles/cloudsql.instanceUser"
```

3. Give the service account the `Cloud SQL Client` role so it can perform SQL queries.

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member "serviceAccount:$CMS_SERVICE_ACCT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role "roles/cloudsql.client"
```

4. Create a SQL User the service account will use to connect to the database.

```bash
gcloud sql users create $CMS_SERVICE_ACCT@$PROJECT_ID.iam \
    --instance=$INSTANCE_NAME \
    --type=cloud_iam_service_account
```

5. Create a database the staging environment will use.

```bash
gcloud sql databases create cms \
    --instance=$INSTANCE_NAME
```

Allow the future Kubernetes Service Account `cms` to impersonate the Google Service account

```bash
gcloud iam service-accounts add-iam-policy-binding $CMS_SERVICE_ACCT@$PROJECT_ID.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:$PROJECT_ID.svc.id.goog[staging/cms]"
```

## Create an Artifact Registry repository to store our container images

```bash
export REPOSITORY_NAME=app
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
```

```bash
gcloud artifacts repositories create $REPOSITORY_NAME --repository-format=docker --location=$REGION
```

Allow the service account attached to the GKE cluster nodes to pull the container images.

```bash
gcloud artifacts repositories add-iam-policy-binding $REPOSITORY_NAME \
    --location=$REGION \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/artifactregistry.reader"
```

## Deploy the application

```bash
export SKAFFOLD_DEFAULT_REPO=$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY_NAME
export SKAFFOLD_NAMESPACE=staging
```

1. Create a namespace for the staging environment.

```bash
kubectl create ns staging
```

2. Add a label to the namespace so http routes can attach the gateway.

```bash
kubectl label ns staging shared-gateway-access='true'
```

For deployment, we’ll use Skaffold.

Skaffold aids in continuous development for Kubernetes applications by streamlining the build, test, and deployment processes. Integrating Skaffold into a CI/CD pipeline offers benefits such as continuous delivery, faster feedback, reduced manual intervention, and enhanced consistency and reliability. This automation empowers developers to deliver high-quality software efficiently and maintain a robust Kubernetes application development process.

3. Run the following command to generate config files for `cms` deployment.
   The configuration file will be stored as `cms/kubernetes-manifests/config/.env.config` and the secrets file as `cms/kubernetes-manifests/config/.env.secret`.

```bash
./generate-config.sh cms
```

4. Run the following command to generate config files for `frontend` deployment.
   The configuration file will be stored as `frontend/kubernetes-manifests/prod/.env.config` and the secrets file as `frontend/kubernetes-manifests/prod/.env.secret`.

```bash
./generate-config.sh frontend
```

5. Deploy the application.

```bash
skaffold run -p prod,cb
```

After a few seconds, the application should be deployed and accessible at `https://$DOMAIN_NAME`.

# Cleanup

- Remove the test application.

  ```bash
  kubectl delete ns infra-resources test-gateway
  ```

- Remove the QA and staging applications

  ```bash
  kubectl delete ns staging
  ```

- Remove the gateway.

  ```bash
  kubectl delete gateway external-http -n infra-resources
  ```

- Remove the maps entries

  ```bash
  gcloud certificate-manager maps entries delete $CERTIFICATE_MAP_ENTRY \
      --map=$CERTIFICATE_MAP
  ```

- Remove the certificate map

  ```bash
  gcloud certificate-manager maps delete $CERTIFICATE_MAP
  ```

- Delete the certificate

  ```bash
  gcloud certificate-manager certificates delete $CERTIFICATE_NAME
  ```

- Delete the service account attached to CMS Workload

  ```bash
  gcloud iam service-accounts delete $CMS_SERVICE_ACCT@$PROJECT_ID.iam.gserviceaccount.com
  ```

- Delete the SQL user

  ```bash
  gcloud sql users delete $CMS_SERVICE_ACCT@$PROJECT_ID.iam
  ```

- Delete the database

  ```bash
  gcloud sql databases delete cms-staging \
      --instance=$INSTANCE_NAME
  ```
