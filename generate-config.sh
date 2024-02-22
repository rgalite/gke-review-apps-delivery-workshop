#!/bin/bash

# generate configs for frontend config and secrets file
generate-frontend-configs() {
[ -z "$1" ] && local DIR="frontend/kubernetes-manifests/prod" || local DIR="$1"
[ -d "$DIR" ] || mkdir -p "$DIR"

cat << EOF > $DIR/.env.config
HTTP_ROUTE_HOSTNAME=$SKAFFOLD_NAMESPACE.$DOMAIN_NAME
EOF

cat << EOF > $DIR/.env.secret
STRAPI_API_TOKEN=STRAPI_API_TOKEN
EOF
}

# generate configs for backend config and secrets file
generate-backend-configs() {
# initialize a local variable if $1 is empty
[ -z "$1" ] && local DIR="cms/kubernetes-manifests/config" || local DIR="$1"
[ -d "$DIR" ] || mkdir -p "$DIR"

cat <<- EOF > $DIR/.env.config
  PROJECT_ID=$PROJECT_ID
  INSTANCE_CONNECTION_NAME=$PROJECT_ID:$REGION:$INSTANCE_NAME
  GCP_SERVICE_ACCOUNT=$CMS_SERVICE_ACCT@$PROJECT_ID.iam.gserviceaccount.com
  HTTP_ROUTE_HOSTNAME=$SKAFFOLD_NAMESPACE.$DOMAIN_NAME
  INSTANCE_NAME=$INSTANCE_NAME
  WORKLOAD_IDENTITY_GCP_SERVICE_ACCOUNT=projects/$PROJECT_ID/serviceAccounts/$CMS_SERVICE_ACCT@$PROJECT_ID.iam.gserviceaccount.com
  WORKLOAD_IDENTITY_SERVICE_ACCOUNT=$PROJECT_ID.svc.id.goog[$SKAFFOLD_NAMESPACE/cms]
  DATABASE_NAME=cms-$SKAFFOLD_NAMESPACE
EOF

cat << EOF > $DIR/.env.secret
APP_KEYS="$(echo -n "APP_KEYS$SKAFFOLD_NAMESPACE" | md5sum | cut -d ' ' -f 1)"
API_TOKEN_SALT=$(echo -n "API_TOKEN_SALT$SKAFFOLD_NAMESPACE" | md5sum | cut -d ' ' -f 1)
ADMIN_JWT_SECRET=$(echo -n "ADMIN_JWT_SECRET$SKAFFOLD_NAMESPACE" | md5sum | cut -d ' ' -f 1)
TRANSFER_TOKEN_SALT=$(echo -n "TRANSFER_TOKEN_SALT$SKAFFOLD_NAMESPACE" | md5sum | cut -d ' ' -f 1)
JWT_SECRET=$(echo -n "JWT_SECRET$SKAFFOLD_NAMESPACE" | md5sum | cut -d ' ' -f 1)
DATABASE_URL=postgres://$CMS_SERVICE_ACCT%40$PROJECT_ID.iam:@localhost:5432/cms-$SKAFFOLD_NAMESPACE
EOF
}

show-help() {
  echo "Usage: $1 [cms|frontend] [path]"
}

# call function generate-backend-configs if first argument is "backend
# call function generate-frontend-configs if first argument is "frontend"
# otherwise show help message

case "$1" in
cms)
	generate-backend-configs $2
	;;
frontend)
	generate-frontend-configs $2
	;;
*)
  show-help $0
	;;
esac
