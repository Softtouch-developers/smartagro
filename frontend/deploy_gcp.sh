#!/bin/bash

# Exit on error
set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="smartagro-frontend"
REGION="us-central1"
IMAGE_TAG="gcr.io/$PROJECT_ID/$SERVICE_NAME"
BACKEND_URL="https://smartagro-backend-925054869230.us-central1.run.app"

echo "🚀 Starting frontend deployment for project: $PROJECT_ID"

# 1. Build and Push Docker Image
echo "📦 Building and pushing Docker image..."
# Pass the backend URL as a build argument
gcloud builds submit --config cloudbuild.yaml --substitutions=_VITE_API_URL=$BACKEND_URL,_IMAGE_TAG=$IMAGE_TAG .

# 2. Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_TAG \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated

echo "✅ Deployment complete!"
