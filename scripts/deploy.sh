#!/bin/bash

set -euo pipefail

echo "Starting deployment..."

check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ Error: $1 is not installed"
        exit 1
    fi
}

check_command git
check_command docker
check_command docker-compose

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found. Copy .env.example to .env and configure."
    exit 1
fi

echo "✅ Prerequisites checked"

echo "Pulling latest changes..."
git pull origin main

echo "Stopping existing services..."
docker-compose down --remove-orphans

echo "Building and starting services..."
docker-compose build --no-cache server
docker-compose up -d

echo "Waiting for services to start..."
sleep 5

echo "✅ Deployment complete!"
echo "Running containers:"
docker-compose ps

echo ""
echo "Recent logs:"
docker-compose logs --tail=20
