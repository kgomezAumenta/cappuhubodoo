# Odoo Hub API Documentation

This Hub acts as a bridge between the WhatsApp BOT and Odoo.

**Base URL:** `https://cappuhubodoo.vercel.app`

---

## 1. Clients (`res.partner`)

### Search Client
Finds clients by name or phone number.
- **Endpoint:** `POST /webhook/clients/search`
- **Body:**
```json
{
  "query": "Name or Phone"
}
```
- **Response:** `data` is an array of clients.

### Create Client
Registers a new client in Odoo.
- **Endpoint:** `POST /webhook/clients/create`
- **Body:**
```json
{
  "name": "Full Name",
  "phone": "123456789",
  "email": "email@example.com",
  "street": "Calle 123, Zona 10",
  "city": "Guatemala",
  "zip": "01010"
}
```
- **Response:** `{"success": true, "id": partner_id}`

---

## 2. Products (`product.product`)

### Search Product
Finds products by name or SKU (Internal Reference).
- **Endpoint:** `POST /webhook/products/search`
- **Body:**
```json
{
  "query": "Americano%"
}
```
> [!TIP]
> Use `%` for wildcards (e.g., `Cafe%` finds anything starting with Cafe).

- **Response:** `data` is an array of products with `id`, `name`, `default_code` (SKU), and `list_price`.

---

## 3. Orders (`sale.order`)

### Create Sales Order
Creates a quotation in Odoo.
- **Endpoint:** `POST /webhook/orders/create`
- **Body:**
```json
{
  "partner_id": 123,
  "street": "Optional: New Delivery Address",
  "city": "Optional: City",
  "zip": "Optional: Zip",
  "confirm": true,
  "products": [
    {
      "product_id": 456,
      "quantity": 2
    }
  ]
}
```
> [!NOTE]
> If `confirm` is `true`, the order will be automatically confirmed (moved from Quotation to Sale Order).
> If `street`, `city`, or `zip` are provided, the system will automatically update the client's information before creating the order.
- **Response:** `{"success": true, "id": order_id, "confirmed": true}`

### Confirm Sales Order
Explicitly confirms an existing order.
- **Endpoint:** `POST /webhook/orders/confirm`
- **Body:**
```json
{
  "order_id": 789
}
```
- **Response:** `{"success": true, "message": "Order confirmed"}`

### Confirm Order via Payment
Confirms the order in Odoo specifically after payment verification.
- **Endpoint:** `POST /webhook/orders/update-payment`
- **Body:**
```json
{
  "order_id": 789,
  "payment_status": "paid"
}
```
- **Response:** `{"success": true, "message": "Order confirmed"}`

---

## Error Handling
All responses include a `success` boolean. If `false`, an `error` field contains the message.
```json
{
  "success": false,
  "error": "Error description from Odoo"
}
```
