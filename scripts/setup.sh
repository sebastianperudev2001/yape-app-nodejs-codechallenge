#!/bin/bash

echo "Setting up Yape Anti-Fraud System..."
echo ""

# 1. Install dependencies
echo "Installing dependencies..."
npm install

# 2. Copy env file
echo "Creating .env file..."
cp .env.example .env

# 3. Start infrastructure
echo "Starting Docker containers..."
docker-compose up -d

# 4. Wait for services to be ready
echo "Waiting for PostgreSQL and Kafka to be ready..."
sleep 10

# 5. Generate Prisma Client
echo "Generating Prisma Client..."
cd apps/transaction-api && npx prisma generate && cd ../..

# 6. Run migrations
echo "Running database migrations..."
cd apps/transaction-api && npx prisma migrate dev --name init && cd ../..

# 7. Seed database
echo "Seeding database..."
cd apps/transaction-api && npx prisma db seed && cd ../..

# 8. Create Kafka topics
echo "Creating Kafka topics..."
docker exec -it yape-kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic transaction.created \
  --partitions 3 \
  --replication-factor 1 \
  --if-not-exists

docker exec -it yape-kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic transaction.validated \
  --partitions 3 \
  --replication-factor 1 \
  --if-not-exists

echo ""
echo "Setup complete!"
echo ""
echo "To start the services:"
echo "  npm run start:dev          # Transaction API"
echo "  cd apps/anti-fraud-service && npm run start:dev  # Anti-Fraud Service"
echo ""
echo "APIs available at:"
echo "  REST API: http://localhost:3000"
echo "  GraphQL Playground: http://localhost:3000/graphql"
echo "  Swagger Docs: http://localhost:3000/api"
