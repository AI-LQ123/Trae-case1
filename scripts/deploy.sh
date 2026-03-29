#!/bin/bash

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting deployment...${NC}"

check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        exit 1
    fi
}

check_command docker
check_command docker-compose
check_command git

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env file not found. Copy .env.example to .env and configure.${NC}"
    exit 1
fi

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo -e "${YELLOW}Creating backup in $BACKUP_DIR...${NC}"
if [ -d "./server/storage" ]; then
    cp -r "./server/storage" "$BACKUP_DIR/" 2>/dev/null || true
fi

echo -e "${GREEN}Pulling latest changes...${NC}"
git pull origin main

echo -e "${GREEN}Stopping existing services...${NC}"
docker-compose down --remove-orphans || true

echo -e "${GREEN}Building and starting services...${NC}"
docker-compose build --no-cache server
docker-compose up -d

echo -e "${GREEN}Waiting for services to start...${NC}"
sleep 10

if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}Deployment successful!${NC}"
    docker-compose ps
    echo -e "${YELLOW}Recent logs:${NC}"
    docker-compose logs --tail=20
else
    echo -e "${RED}Deployment failed! Attempting rollback...${NC}"
    docker-compose down
    if [ -d "$BACKUP_DIR/storage" ]; then
        cp -r "$BACKUP_DIR/storage" ./server/ 2>/dev/null || true
    fi
    echo -e "${RED}Rollback complete${NC}"
    exit 1
fi
