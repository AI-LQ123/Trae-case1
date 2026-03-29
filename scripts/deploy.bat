@echo off
echo Starting deployment...

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: git is not installed
    exit /b 1
)

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: docker is not installed
    exit /b 1
)

where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: docker-compose is not installed
    exit /b 1
)

if not exist ".env" (
    echo Error: .env file not found. Copy .env.example to .env and configure.
    exit /b 1
)

echo Prerequisites checked

echo Pulling latest changes...
git pull origin main

echo Stopping existing services...
docker-compose down --remove-orphans

echo Building and starting services...
docker-compose build --no-cache server
docker-compose up -d

echo Waiting for services to start...
timeout /t 5 /nobreak >nul

echo Deployment complete!
echo Running containers:
docker-compose ps

echo.
echo Recent logs:
docker-compose logs --tail=20
