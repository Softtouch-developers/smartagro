#!/bin/bash

# Exit on error
set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
JOB_NAME="smartagro-migration"
REGION="us-central1"
IMAGE_TAG="gcr.io/$PROJECT_ID/smartagro-backend"
GCS_BUCKET_NAME="smartagro-481707_cloudbuild"

echo "🚀 Starting migration for project: $PROJECT_ID"

# Read .env.prod file using Python helper
echo "📖 Reading .env.prod file..."
ENV_VARS=$(python3 deploy_helper.py)

# Create or update the Cloud Run Job
echo "⚙️  Creating/Updating Cloud Run Job..."
gcloud run jobs deploy $JOB_NAME \
    --image $IMAGE_TAG \
    --region $REGION \
    --set-env-vars "STORAGE_TYPE=gcs,GCS_BUCKET_NAME=$GCS_BUCKET_NAME,$ENV_VARS" \
    --set-cloudsql-instances "smartagro-481707:us-central1:smartagro-postgres" \
    --command "alembic" \
    --args "upgrade,head"

# Execute the job
echo "🏃 Executing migration job..."
gcloud run jobs execute $JOB_NAME --region $REGION --wait

echo "✅ Migration complete!"
