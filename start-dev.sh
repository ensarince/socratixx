#!/bin/bash
# Quick Start Script for SOCRATIX Development

echo "🤔 Starting SOCRATIX Development Environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed. Please install Node.js >= 18${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found ($(node --version))${NC}"

# Check backend setup
echo ""
echo "📦 Checking backend setup..."

if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}⚠ Creating backend/.env from template${NC}"
    cp server/.env.example server/.env
    echo -e "${YELLOW}Please add your OPENAI_API_KEY to server/.env${NC}"
fi

if [ ! -d "server/node_modules" ]; then
    echo "📥 Installing backend dependencies..."
    cd server
    npm install
    cd ..
fi

# Check frontend setup
echo ""
echo "📦 Checking frontend setup..."

if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    npm install
fi

# Start servers
echo ""
echo "🚀 Starting servers..."
echo ""

# Start backend in background
echo -e "${GREEN}Starting backend on port 3000...${NC}"
cd server && npm run dev &
BACKEND_PID=$!

# Give backend time to start
sleep 2

# Start frontend
echo -e "${GREEN}Starting frontend on port 5173...${NC}"
cd .. && npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
