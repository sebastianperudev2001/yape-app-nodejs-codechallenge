#!/bin/bash

echo "Starting all services..."

# Start infrastructure
docker-compose up -d

# Wait a bit
sleep 3

# Start transaction API in background
echo "Starting Transaction API..."
cd apps/transaction-api
npm run start:dev &
TRANS_PID=$!

# Wait a bit
sleep 2

# Start anti-fraud service
echo "Starting Anti-Fraud Service..."
cd ../anti-fraud-service
npm run start:dev &
FRAUD_PID=$!

echo ""
echo "All services started!"
echo "Transaction API PID: $TRANS_PID"
echo "Anti-Fraud Service PID: $FRAUD_PID"
echo ""
echo "To stop all services, run: ./scripts/stop-all.sh"
