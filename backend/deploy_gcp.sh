#!/bin/bash

# Exit on error
set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="smartagro-backend"
REGION="us-central1"
IMAGE_TAG="gcr.io/$PROJECT_ID/$SERVICE_NAME"
GCS_BUCKET_NAME="smartagro-481707_cloudbuild"

echo "🚀 Starting deployment for project: $PROJECT_ID"

# 1. Build and Push Docker Image
echo "📦 Building and pushing Docker image..."
gcloud builds submit --tag $IMAGE_TAG .

# 2. Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."

# Read .env.prod file using Python helper
echo "📖 Reading .env.prod file..."
ENV_VARS=$(python3 deploy_helper.py)

gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_TAG \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars "STORAGE_TYPE=gcs,GCS_BUCKET_NAME=$GCS_BUCKET_NAME,$ENV_VARS" \
    --command "" \
    --args "" 
    # --command "alembic" \
    # --args "upgrade,head"

echo "✅ Deployment complete!"
# https://smartagro-backend-925054869230.us-central1.run.app