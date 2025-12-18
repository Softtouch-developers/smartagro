@startuml SmartAgro_Purchase_Flow
title Sequence Diagram - Product Purchase with Cart & Escrow

actor Buyer
participant "React PWA" as PWA
participant "FastAPI" as API
participant PostgreSQL as DB
participant Redis
participant Paystack
participant mNotify
actor Farmer

== Product Browsing ==
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

== Shopping Cart (Multi-Item Purchase) ==
Buyer -> PWA: Add product to cart
PWA -> API: POST /cart/items (product_id, quantity)
alt New cart
    API -> DB: Create cart (expires in 8h, farmer_id)
    DB -> API: cart_id
end
API -> DB: Create cart_item (quantity, price snapshot)
alt Different farmer check
    API -> PWA: Error: Can only buy from one farmer
    PWA -> Buyer: Clear cart or checkout first
else Same farmer
    API -> DB: Save cart_item
    DB -> API: Success
    API -> PWA: Item added to cart
end

note right of Buyer
  Cart Rules:
  - 8 hour expiry
  - Single farmer only
  - Background job expires old carts hourly
end note

Buyer -> PWA: View cart
PWA -> API: GET /cart
API -> DB: Get active cart with items
DB -> API: Cart details (items, totals, fees)
API -> PWA: Cart response
PWA -> Buyer: Display cart (items, subtotal, fees, expiry)

Buyer -> PWA: Checkout cart
PWA -> API: POST /cart/checkout (delivery details)
alt No email on file
    API -> DB: Update user email from checkout_email
end
API -> DB: Validate stock for all items
API -> DB: Create order with order_items
API -> DB: Reserve stock (reduce quantity_available)
API -> DB: Mark cart as CHECKED_OUT
DB -> API: order_id, order_number

== Payment via Paystack ==
API -> Paystack: Initialize payment
Paystack -> API: authorization_url
API -> PWA: Redirect URL
PWA -> Buyer: Redirect to Paystack

Buyer -> Paystack: Enter payment details
Paystack -> Paystack: Process payment
Paystack -> API: Webhook (charge.success)

== Escrow & Order Fulfillment ==
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
