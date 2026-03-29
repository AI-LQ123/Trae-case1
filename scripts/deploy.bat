@echo off
echo Starting deployment...

if not exist ".env" (
    echo Error: .env file not found. Copy .env.example to .env and configure.
    exit /b 1
)

echo Pulling latest changes...
git pull origin main

echo Building and starting services...
docker-compose up -d --build

echo Deployment complete!
docker-compose ps
