# Backend API Endpoints Guide

This document outlines the available backend endpoints and their intended usage to guide frontend development.
For detailed request/response schemas, please refer to the auto-generated API docs (Swagger UI) at `/docs` when running the backend locally.

## Authentication (`/auth`)
Used for user registration, login, and security.

```
POST   /auth/signup             # Register a new user (Farmer or Buyer)
                                 # Email optional for farmers, required for buyers
                                 # Region and town_city required for farmers
POST   /auth/verify-otp         # Verify phone number after signup
POST   /auth/resend-otp         # Resend verification OTP
POST   /auth/login              # Login with email/phone and password
                                 # Supports both email and phone_number login
POST   /auth/refresh            # Refresh access token
POST   /auth/logout             # Logout current user
POST   /auth/forgot-password    # Initiate password reset
POST   /auth/reset-password     # Complete password reset with OTP
GET    /auth/me                 # Get current authenticated user info
POST   /auth/switch-mode        # Switch between FARMER and BUYER mode
GET    /auth/current-mode       # Get current user's active mode
```

## Users (`/api/v1/users`)
Manage user profiles and account settings.

```
GET    /api/v1/users/me                     # Get current user's full profile
PATCH  /api/v1/users/me                     # Update current user's profile
DELETE /api/v1/users/me                     # Delete current user's account
GET    /api/v1/users/me/transactions/status # Check active transactions before deletion
GET    /api/v1/users/{user_id}              # Get public profile of another user
```

## Products (`/api/v1/products`)
Product listings and management.

```
GET    /api/v1/products             # List products (filters: category, region, price, etc.)
POST   /api/v1/products             # Create a new product (Farmers only)
GET    /api/v1/products/featured    # Get featured products
GET    /api/v1/products/search      # Search products by name/description
GET    /api/v1/products/{id}        # Get product details
PUT    /api/v1/products/{id}        # Update a product (Owner only)
DELETE /api/v1/products/{id}        # Delete a product (Owner only)
```

## Shopping Cart (`/api/v1/cart`)
Manage shopping cart for multi-item purchases from a single farmer.

```
GET    /api/v1/cart                 # Get active cart with items and totals
                                     # Returns cart details, expiry time, fee breakdown
POST   /api/v1/cart/items           # Add product to cart
                                     # Creates new cart if needed
                                     # Can only add items from same farmer
                                     # Refreshes 8-hour expiry timer
PUT    /api/v1/cart/items/{id}      # Update cart item quantity
                                     # Validates stock availability
DELETE /api/v1/cart/items/{id}      # Remove item from cart
DELETE /api/v1/cart                 # Clear entire cart
POST   /api/v1/cart/checkout        # Checkout cart and create order
                                     # Validates stock for all items
                                     # Creates order with order_items
                                     # Reserves stock (reduces quantity_available)
                                     # If no email on file, use checkout_email
```

**Cart Rules:**
- Cart expires after 8 hours of inactivity
- Can only contain products from a single farmer
- To buy from different farmer, must clear/checkout current cart
- Background job runs hourly to expire old carts

**Add to Cart Request:**
```json
{
  "product_id": 123,
  "quantity": 5.0
}
```

**Checkout Request:**
```json
{
  "delivery_method": "DELIVERY",        // DELIVERY or PICKUP
  "delivery_address": "123 Main St",
  "delivery_region": "Greater Accra",
  "delivery_district": "Accra Metropolitan",
  "delivery_phone": "+233241234567",
  "delivery_notes": "Call before delivery",
  "checkout_email": "buyer@email.com"   // Optional, required if user has no email
}
```

## Orders (`/api/v1/orders`)
Order processing and tracking.

```
POST   /api/v1/orders               # Create a new order (Buyers only) - DEPRECATED
                                     # Use cart checkout for multi-item orders
GET    /api/v1/orders               # List my orders (as Buyer or Seller)
GET    /api/v1/orders/{id}          # Get order details (includes order_items)
PUT    /api/v1/orders/{id}/ship     # Mark order as shipped (Sellers only)
PUT    /api/v1/orders/{id}/deliver  # Confirm delivery (Buyers only)
PUT    /api/v1/orders/{id}/cancel   # Cancel unpaid order
GET    /api/v1/orders/{id}/tracking # Get order tracking history
```

## Escrow & Payments (`/api/v1/escrow`)
Handle payments and secure transactions.

```
POST   /api/v1/escrow/initialize    # Initialize payment for an order
GET    /api/v1/escrow/{id}          # Get escrow transaction details
```

## Chat (`/api/v1/chat`)
Messaging between buyers and farmers.

```
POST   /api/v1/chat/conversations                  # Start/get conversation
GET    /api/v1/chat/conversations                  # List my conversations
GET    /api/v1/chat/conversations/{id}/messages    # Get messages in a conversation
POST   /api/v1/chat/messages                       # Send a message
GET    /api/v1/chat/unread-count                   # Get total unread message count
POST   /api/v1/chat/upload/voice                   # Upload voice note for chat
```

## AI Farming Agent (`/api/v1/agent`)
Intelligent AI assistant for farmers with agricultural knowledge, platform data access, and multimodal support.

### Chat Endpoints
```
POST   /api/v1/agent/chat                          # Send message (non-streaming response)
POST   /api/v1/agent/chat/stream                   # Send message with SSE streaming response
POST   /api/v1/agent/chat/upload                   # Send message with file upload (image/audio/video)
```

**Chat Request Body:**
```json
{
  "message": "How do I control pests on my tomato farm?",
  "session_id": "agent_abc123...",  // Optional - creates new session if not provided
  "media_attachments": [            // Optional - for multimodal input
    {
      "type": "image",              // image, audio, or video
      "url": "https://...",         // URL to media file
      "mime_type": "image/jpeg"
    }
  ]
}
```

**Streaming Response (SSE Events):**
- `event: start` - Stream started, includes session_id
- `event: token` - Individual response tokens
- `event: tool_start` - Tool execution starting (e.g., fetching weather)
- `event: tool_end` - Tool execution complete with result
- `event: done` - Stream complete
- `event: error` - Error occurred

### Session Management
```
POST   /api/v1/agent/sessions                      # Create new chat session
GET    /api/v1/agent/sessions                      # List user's chat sessions
GET    /api/v1/agent/sessions/{session_id}         # Get session history with messages
POST   /api/v1/agent/sessions/{session_id}/rate    # Rate session (1-5 stars + feedback)
POST   /api/v1/agent/sessions/{session_id}/end     # Mark session as completed
DELETE /api/v1/agent/sessions/{session_id}         # Delete a session
```

### Knowledge Base (Admin Only)
```
POST   /api/v1/agent/knowledge/index               # Index/re-index knowledge base documents
GET    /api/v1/agent/knowledge/documents           # List all knowledge documents
GET    /api/v1/agent/knowledge/documents/{id}      # Get specific document details
POST   /api/v1/agent/knowledge/search              # Search knowledge base (hybrid search)
```

**Index Request Body:**
```json
{
  "force_reindex": false  // Set true to re-process all documents
}
```

**Search Request Body:**
```json
{
  "query": "how to control fall armyworm",
  "document_type": "CROP_GUIDE",     // Optional filter
  "crops": ["maize"],                // Optional filter
  "topics": ["pest_control"],        // Optional filter
  "limit": 5
}
```

### Agent Capabilities
The AI agent can help farmers with:
- **Agricultural Knowledge**: Crop cultivation, pest control, harvesting, post-harvest handling, soil management
- **Platform Data**: View products, orders, earnings, buyer enquiries
- **Weather**: Get forecasts for any Ghana location
- **Planning**: Calculate optimal planting dates for target harvest

## Notifications (`/api/v1/notifications`)
User notifications.

```
GET    /api/v1/notifications            # List notifications
GET    /api/v1/notifications/unread     # Get unread count
PUT    /api/v1/notifications/{id}/read  # Mark single notification as read
PUT    /api/v1/notifications/read-all   # Mark all as read
DELETE /api/v1/notifications/{id}       # Delete a notification
```

## Storage (`/api/v1/storage`)
File uploads.

```
POST   /api/v1/storage/upload/image     # Upload image (products, profile)
POST   /api/v1/storage/upload/voice     # Upload voice note
POST   /api/v1/storage/upload/document  # Upload document (disputes)
DELETE /api/v1/storage/{path}           # Delete a file
```

## Admin (`/api/v1/admin`)
Administrative functions (Admin users only).

```
# Disputes
POST   /api/v1/admin/disputes                   # Raise a dispute
GET    /api/v1/admin/disputes                   # List disputes
GET    /api/v1/admin/disputes/{id}              # Get dispute details
PUT    /api/v1/admin/disputes/{id}/respond      # Respond to dispute (Seller)
POST   /api/v1/admin/disputes/{id}/resolve      # Resolve dispute (Admin)

# Dashboard & Users
GET    /api/v1/admin/dashboard                  # Get platform statistics
GET    /api/v1/admin/users                      # List all users
PUT    /api/v1/admin/users/{id}/suspend         # Suspend user
PUT    /api/v1/admin/users/{id}/activate        # Activate user
PUT    /api/v1/admin/users/{id}/verify          # Manually verify user
GET    /api/v1/admin/audit-logs                 # View audit logs

# System Configuration
GET    /api/v1/admin/config                     # List all system config values
GET    /api/v1/admin/config/{key}               # Get specific config value
PUT    /api/v1/admin/config/{key}               # Update config value
```

**Available Configuration Keys:**
- `AGENT_SYSTEM_PROMPT`: AI agent's system prompt (customize agent behavior)
- `WELCOME_MESSAGE`: Homepage welcome message
- `PLATFORM_FEE_PERCENTAGE`: Platform commission percentage

**Update Config Request Body:**
```json
{
  "value": "New configuration value here..."
}
```

## Webhooks
External integrations.

```
POST   /webhooks/paystack       # Paystack payment notifications
```
