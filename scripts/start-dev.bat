@echo off
echo Starting development environment...

if not exist ".env" (
    copy .env.example .env
    echo Created .env from example. Please edit if needed.
)

echo Starting Redis...
docker-compose up -d redis

echo Installing dependencies with locked versions...
npm ci

echo.
echo Development environment ready!
echo Server will be available at: http://localhost:3000
echo.

echo Starting server in development mode...
npm run dev:server
