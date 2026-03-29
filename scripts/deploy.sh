#!/bin/bash

set -e

echo "Starting deployment..."

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found. Copy .env.example to .env and configure."
    exit 1
fi

echo "Pulling latest changes..."
git pull origin main

echo "Building and starting services..."
docker-compose up -d --build

echo "Deployment complete!"
docker-compose ps
