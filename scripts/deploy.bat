@echo off
chcp 65001 >nul
echo 🚀 Starting deployment...

if not exist ".env" (
    echo ❌ Error: .env file not found. Copy .env.example to .env and configure.
    exit /b 1
)

echo 📦 Checking prerequisites...
where docker >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker is not installed
    exit /b 1
)

where docker-compose >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker Compose is not installed
    exit /b 1
)

where git >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Git is not installed
    exit /b 1
)

echo ✅ Prerequisites check passed

echo 📥 Pulling latest changes...
git pull origin main

echo 🔧 Stopping existing services...
docker-compose down --remove-orphans

echo 🏗️ Building and starting services...
docker-compose up -d --build

echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak >nul

echo 📊 Checking service status...
docker-compose ps

echo 📜 Showing last 20 lines of logs...
docker-compose logs --tail=20

echo ✅ Deployment complete!
