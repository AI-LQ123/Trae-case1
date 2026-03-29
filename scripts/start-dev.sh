#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
    echo -e "${YELLOW}\nShutting down Redis...${NC}"
    docker-compose down redis
    echo -e "${GREEN}Cleanup complete!${NC}"
}

trap cleanup EXIT INT TERM

echo -e "${GREEN}Starting development environment...${NC}"

echo -e "${GREEN}Starting Redis...${NC}"
docker-compose up -d redis

echo -e "${GREEN}Installing dependencies with locked versions...${NC}"
npm ci

echo -e "${GREEN}Starting server in development mode...${NC}"
echo -e "${YELLOW}Server will be available at http://localhost:3000${NC}"
npm run dev:server
