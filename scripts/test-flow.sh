#!/bin/bash

echo "Testing complete transaction flow..."
echo ""

# Test 1: Create approved transaction
echo "Test 1: Creating APPROVED transaction (value: 500)..."
RESPONSE=$(curl -s -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "accountExternalIdDebit": "550e8400-e29b-41d4-a716-446655440000",
    "accountExternalIdCredit": "550e8400-e29b-41d4-a716-446655440001",
    "tranferTypeId": 1,
    "value": 500
  }')

TRANS_ID_1=$(echo $RESPONSE | jq -r '.transactionExternalId')
echo "Transaction created: $TRANS_ID_1"
echo "Response: $RESPONSE"
echo ""

# Wait for anti-fraud processing
echo "Waiting 3 seconds for anti-fraud processing..."
sleep 3

# Query transaction
echo "Querying transaction status..."
STATUS=$(curl -s http://localhost:3000/transactions/$TRANS_ID_1)
echo "Response: $STATUS"
echo ""

# Test 2: Create rejected transaction
echo "Test 2: Creating REJECTED transaction (value: 1500)..."
RESPONSE=$(curl -s -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "accountExternalIdDebit": "550e8400-e29b-41d4-a716-446655440002",
    "accountExternalIdCredit": "550e8400-e29b-41d4-a716-446655440003",
    "tranferTypeId": 1,
    "value": 1500
  }')

TRANS_ID_2=$(echo $RESPONSE | jq -r '.transactionExternalId')
echo "Transaction created: $TRANS_ID_2"
echo "Response: $RESPONSE"
echo ""

# Wait for anti-fraud processing
echo "Waiting 3 seconds for anti-fraud processing..."
sleep 3

# Query transaction
echo "Querying transaction status..."
STATUS=$(curl -s http://localhost:3000/transactions/$TRANS_ID_2)
echo "Response: $STATUS"
echo ""

echo "Flow test complete!"
echo ""
echo "Expected results:"
echo "  Transaction 1 ($TRANS_ID_1): status should be 'approved'"
echo "  Transaction 2 ($TRANS_ID_2): status should be 'rejected'"
