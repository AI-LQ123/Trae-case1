#!/bin/bash

cleanup() {
    echo ""
    echo "Stopping Redis..."
    docker-compose stop redis
    echo "Development environment stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "Starting development environment..."

echo "Starting Redis..."
docker-compose up -d redis

echo "Installing dependencies with locked versions..."
npm ci

echo ""
echo "✅ Development environment ready!"
echo "Server will be available at: http://localhost:3000"
echo "Press Ctrl+C to stop the environment"
echo ""

echo "Starting server in development mode..."
npm run dev:server
