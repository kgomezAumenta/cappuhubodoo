#!/bin/bash

# Configuration
URL="http://localhost:3500"

echo "--- 1. Testing Connection ---"
curl -s "$URL/test-connection" | jq .
echo -e "\n"

echo "--- 2. Search Client (e.g., 'pruebas') ---"
curl -s -X POST "$URL/webhook/clients/search" \
     -H "Content-Type: application/json" \
     -d '{"query": "pruebas"}' | jq .
echo -e "\n"

echo "--- 3. Search Product (e.g., 'Storage') ---"
# Puedes usar % como comodín
curl -s -X POST "$URL/webhook/products/search" \
     -H "Content-Type: application/json" \
     -d '{"query": "Ameri%"}' | jq .
echo -e "\n"

echo "--- 4. Create Client ---"
CLIENT_RESPONSE=$(curl -s -X POST "$URL/webhook/clients/create" \
     -H "Content-Type: application/json" \
     -d '{"name": "Cliente de Prueba BOT", "phone": "123456789", "email": "bot@example.com"}')
echo $CLIENT_RESPONSE | jq .
CLIENT_ID=$(echo $CLIENT_RESPONSE | jq -r '.id')
echo -e "\n"

echo "--- 5. Create Order (using Client ID: $CLIENT_ID) ---"
# Note: You should replace product_id with a real ID from the Search Product output
ORDER_RESPONSE=$(curl -s -X POST "$URL/webhook/orders/create" \
     -H "Content-Type: application/json" \
     -d "{
       \"partner_id\": $CLIENT_ID,
       \"products\": [
         {\"product_id\": 1, \"quantity\": 2}
       ]
     }")
echo $ORDER_RESPONSE | jq .
ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.id')
echo -e "\n"

echo "--- 6. Confirm Order (Order ID: $ORDER_ID) ---"
curl -s -X POST "$URL/webhook/orders/update-payment" \
     -H "Content-Type: application/json" \
     -d "{\"order_id\": $ORDER_ID, \"payment_status\": \"paid\"}" | jq .
echo -e "\n"
