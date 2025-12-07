@startuml SmartAgro_Purchase_Flow
title Sequence Diagram - Product Purchase with Escrow

actor Buyer
participant "React PWA" as PWA
participant "FastAPI" as API
participant PostgreSQL as DB
participant Redis
participant Paystack
participant mNotify
actor Farmer

Buyer -> PWA: Browse products
PWA -> API: GET /products
API -> Redis: Check cache
alt Cache hit
    Redis -> API: Return cached products
else Cache miss
    API -> DB: Query products
    DB -> API: Return products
    API -> Redis: Cache products (5 min TTL)
end
API -> PWA: Product listings
PWA -> Buyer: Display products

Buyer -> PWA: Add to cart, checkout
PWA -> API: POST /orders (product_id, quantity)
API -> DB: Create order (status='PENDING')
DB -> API: order_id

API -> Paystack: Initialize payment
Paystack -> API: authorization_url
API -> PWA: Redirect URL
PWA -> Buyer: Redirect to Paystack

Buyer -> Paystack: Enter payment details
Paystack -> Paystack: Process payment
Paystack -> API: Webhook (charge.success)

API -> DB: Create escrow (status='HELD')
API -> DB: Update order (status='PAID')
API -> DB: Create notification (buyer & farmer)
API -> mNotify: Send SMS to farmer
mNotify -> Farmer: "New order received"

Farmer -> PWA: Mark order as shipped
PWA -> API: PUT /orders/{id}/ship
API -> DB: Update order (status='SHIPPED')
API -> DB: Create notification
API -> mNotify: Send SMS to buyer
mNotify -> Buyer: "Order shipped"

Buyer -> PWA: Confirm delivery
PWA -> API: POST /escrow/{id}/release
API -> Paystack: Transfer to farmer
Paystack -> API: Transfer successful
API -> DB: Update escrow (status='RELEASED')
API -> DB: Create notification
API -> mNotify: Send SMS to farmer
mNotify -> Farmer: "Payment released"

@enduml