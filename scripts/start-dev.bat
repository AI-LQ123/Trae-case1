@echo off
echo Starting development environment...

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
