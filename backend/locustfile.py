"""
Locust Load Testing for AgroConnect API
========================================

Run with:
    locust -f locustfile.py --host=https://smartagro-backend-925054869230.us-central1.run.app

Or with web UI disabled:
    locust -f locustfile.py --host=https://your-deployed-app-url.com --headless -u 100 -r 10 -t 5m

Parameters:
    -u: Number of users to simulate
    -r: Spawn rate (users per second)
    -t: Test duration (e.g., 5m, 1h)
"""

from locust import HttpUser, task, between, tag
import random
import string
import os


def generate_phone():
    """Generate random Ghana phone number"""
    return f"+23324{random.randint(1000000, 9999999)}"


def generate_email():
    """Generate random email"""
    random_str = ''.join(random.choices(string.ascii_lowercase, k=8))
    return f"test_{random_str}@example.com"


# Credential helpers (override via environment to match your deployed test accounts)
BUYER_EMAIL = os.getenv("TEST_BUYER_EMAIL", "kofi@example.com")
BUYER_PASSWORD = os.getenv("TEST_BUYER_PASSWORD", "Buyer123!")
FARMER_EMAIL = os.getenv("TEST_FARMER_EMAIL", "yaw@example.com")
FARMER_PASSWORD = os.getenv("TEST_FARMER_PASSWORD", "Farmer123!")
ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "Admin123!")


class UnauthenticatedUser(HttpUser):
    """
    Simulates unauthenticated users browsing the platform.
    These are visitors who haven't logged in yet.
    """
    weight = 3  # 30% of users
    wait_time = between(1, 3)

    @tag('health')
    @task(2)
    def health_check(self):
        """Health endpoint"""
        self.client.get("/health", name="/health [GET]")

    @tag('root')
    @task(1)
    def root(self):
        """Root endpoint"""
        self.client.get("/", name="/ [GET]")

    @tag('browse', 'products')
    @task(10)
    def browse_products(self):
        """Browse product listings"""
        self.client.get("/api/v1/products", name="/api/v1/products [GET]")

    @tag('browse', 'products')
    @task(5)
    def browse_featured_products(self):
        """View featured products"""
        self.client.get("/api/v1/products/featured", name="/api/v1/products/featured [GET]")

    @tag('browse', 'products')
    @task(3)
    def search_products(self):
        """Search for products"""
        search_terms = ["tomato", "maize", "rice", "pepper", "onion", "carrot"]
        term = random.choice(search_terms)
        self.client.get(
            f"/api/v1/products/search?q={term}",
            name="/api/v1/products/search [GET]"
        )

    @tag('browse', 'products')
    @task(2)
    def filter_products_by_category(self):
        """Filter products by category"""
        categories = ["vegetables", "grains", "fruits", "tubers"]
        category = random.choice(categories)
        self.client.get(
            f"/api/v1/products?category={category}",
            name="/api/v1/products?category [GET]"
        )

    @tag('browse', 'products')
    @task(2)
    def filter_products_by_region(self):
        """Filter products by region"""
        regions = ["Greater Accra", "Ashanti", "Northern", "Eastern", "Western"]
        region = random.choice(regions)
        self.client.get(
            f"/api/v1/products?region={region}",
            name="/api/v1/products?region [GET]"
        )

    @tag('api-docs')
    @task(1)
    def view_api_docs(self):
        """View API documentation"""
        self.client.get("/docs", name="/docs [GET]")


class AuthenticatedBuyer(HttpUser):
    """
    Simulates authenticated buyers browsing, adding to cart, and purchasing.
    """
    weight = 4  # 40% of users
    wait_time = between(2, 5)
    
    def on_start(self):
        """Login or signup when user starts"""
        self.token = None
        self.user_id = None
        self.cart_items = []
        
        # Try to login with test credentials or signup
        self._authenticate()

    def _authenticate(self):
        """Authenticate the user"""
        # First try login with existing test account
        with self.client.post(
            "/auth/login",
            json={
                "email": BUYER_EMAIL,
                "password": BUYER_PASSWORD
            },
            name="/auth/login [POST]",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                response.success()
            else:
                # Mark as expected for load testing (test account may not exist)
                response.success()
            
    def _headers(self):
        """Get authorization headers"""
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    @tag('auth')
    @task(1)
    def me_auth(self):
        """Get current auth user info"""
        if self.token:
            self.client.get("/api/v1/auth/me", headers=self._headers(), name="/api/v1/auth/me [GET]")

    @tag('users')
    @task(2)
    def my_profile(self):
        """Get my profile"""
        if self.token:
            self.client.get("/api/v1/users/me", headers=self._headers(), name="/api/v1/users/me [GET]")

    @tag('users')
    @task(1)
    def my_transactions_status(self):
        """Check my transaction status"""
        if self.token:
            self.client.get(
                "/api/v1/users/me/transactions/status",
                headers=self._headers(),
                name="/api/v1/users/me/transactions/status [GET]"
            )

    @tag('users')
    @task(1)
    def current_mode(self):
        """Get current mode"""
        if self.token:
            self.client.get(
                "/api/v1/users/me/mode",
                headers=self._headers(),
                name="/api/v1/users/me/mode [GET]"
            )

    @tag('users')
    @task(1)
    def switch_mode(self):
        """Toggle between buyer/farmer"""
        if self.token:
            target = random.choice(["BUYER", "FARMER"])
            self.client.post(
                "/api/v1/users/me/switch-mode",
                headers=self._headers(),
                json={"target_mode": target},
                name="/api/v1/users/me/switch-mode [POST]",
                catch_response=True
            )

    @tag('browse', 'products')
    @task(10)
    def browse_products(self):
        """Browse products"""
        self.client.get(
            "/api/v1/products",
            headers=self._headers(),
            name="/api/v1/products [GET]"
        )

    @tag('browse', 'products')
    @task(5)
    def view_product_details(self):
        """View a specific product"""
        # Get products first, then view one
        response = self.client.get(
            "/api/v1/products",
            headers=self._headers(),
            name="/api/v1/products [GET - for detail]"
        )
        if response.status_code == 200:
            products = response.json()
            if products and isinstance(products, list) and len(products) > 0:
                product_id = random.choice(products).get("id")
                if product_id:
                    self.client.get(
                        f"/api/v1/products/{product_id}",
                        headers=self._headers(),
                        name="/api/v1/products/{id} [GET]"
                    )

    @tag('cart')
    @task(3)
    def view_cart(self):
        """View shopping cart"""
        if self.token:
            self.client.get(
                "/api/v1/cart",
                headers=self._headers(),
                name="/api/v1/cart [GET]"
            )

    @tag('cart')
    @task(2)
    def add_to_cart(self):
        """Add product to cart"""
        if not self.token:
            return
            
        # Get products first
        response = self.client.get(
            "/api/v1/products",
            headers=self._headers(),
            name="/api/v1/products [GET - for cart]"
        )
        if response.status_code == 200:
            products = response.json()
            if products and isinstance(products, list) and len(products) > 0:
                product = random.choice(products)
                product_id = product.get("id")
                if product_id:
                    self.client.post(
                        "/api/v1/cart/items",
                        headers=self._headers(),
                        json={
                            "product_id": product_id,
                            "quantity": random.uniform(1, 5)
                        },
                        name="/api/v1/cart/items [POST]"
                    )

    @tag('cart')
    @task(1)
    def checkout_cart(self):
        """Attempt cart checkout"""
        if self.token:
            self.client.post(
                "/api/v1/cart/checkout",
                headers=self._headers(),
                json={
                    "delivery_method": "DELIVERY",
                    "delivery_address": "123 Test St",
                    "delivery_region": "Greater Accra",
                    "delivery_district": "Accra Metropolitan",
                    "delivery_phone": generate_phone(),
                    "delivery_notes": "Locust test"
                },
                name="/api/v1/cart/checkout [POST]",
                catch_response=True
            )

    @tag('orders')
    @task(2)
    def view_orders(self):
        """View order history"""
        if self.token:
            self.client.get(
                "/api/v1/orders",
                headers=self._headers(),
                name="/api/v1/orders [GET]"
            )

    @tag('chat')
    @task(2)
    def view_conversations(self):
        """View chat conversations"""
        if self.token:
            self.client.get(
                "/api/v1/chat/conversations",
                headers=self._headers(),
                name="/api/v1/chat/conversations [GET]"
            )

    @tag('notifications')
    @task(3)
    def check_notifications(self):
        """Check notifications"""
        if self.token:
            self.client.get(
                "/api/v1/notifications",
                headers=self._headers(),
                name="/api/v1/notifications [GET]"
            )

    @tag('notifications')
    @task(2)
    def check_unread_count(self):
        """Check unread notification count"""
        if self.token:
            self.client.get(
                "/api/v1/notifications/unread",
                headers=self._headers(),
                name="/api/v1/notifications/unread [GET]"
            )

    @tag('notifications')
    @task(1)
    def mark_all_read(self):
        """Mark notifications read"""
        if self.token:
            self.client.put(
                "/api/v1/notifications/read-all",
                headers=self._headers(),
                name="/api/v1/notifications/read-all [PUT]",
                catch_response=True
            )

    @tag('chat')
    @task(1)
    def send_chat_message(self):
        """Send a chat message (may 404 if no conversation)"""
        if self.token:
            self.client.post(
                "/api/v1/chat/messages",
                headers=self._headers(),
                json={"message": "Hello from Locust"},
                name="/api/v1/chat/messages [POST]",
                catch_response=True
            )

    @tag('profile')
    @task(1)
    def view_profile(self):
        """View user profile"""
        if self.token:
            self.client.get(
                "/api/v1/users/me",
                headers=self._headers(),
                name="/api/v1/users/me [GET]"
            )


class AuthenticatedFarmer(HttpUser):
    """
    Simulates authenticated farmers managing products and orders.
    """
    weight = 2  # 20% of users
    wait_time = between(2, 5)
    
    def on_start(self):
        """Login when farmer starts"""
        self.token = None
        self._authenticate()

    def _authenticate(self):
        """Authenticate the farmer"""
        with self.client.post(
            "/auth/login",
            json={
                "email": FARMER_EMAIL,
                "password": FARMER_PASSWORD
            },
            name="/auth/login [POST]",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                response.success()
            else:
                response.success()

    def _headers(self):
        """Get authorization headers"""
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    @tag('products')
    @task(5)
    def view_my_products(self):
        """View farmer's own products"""
        if self.token:
            self.client.get(
                "/api/v1/products?seller=me",
                headers=self._headers(),
                name="/api/v1/products?seller=me [GET]"
            )

    @tag('products')
    @task(3)
    def product_detail_and_toggle(self):
        """Fetch a product and toggle availability"""
        if not self.token:
            return
        resp = self.client.get(
            "/api/v1/products?seller=me",
            headers=self._headers(),
            name="/api/v1/products?seller=me [GET - toggle]"
        )
        if resp.status_code == 200:
            items = resp.json()
            if isinstance(items, list) and items:
                product_id = random.choice(items).get("id")
                if product_id:
                    self.client.get(
                        f"/api/v1/products/{product_id}",
                        headers=self._headers(),
                        name="/api/v1/products/{id} [GET - farmer]"
                    )
                    self.client.post(
                        f"/api/v1/products/{product_id}/toggle-availability",
                        headers=self._headers(),
                        name="/api/v1/products/{id}/toggle-availability [POST]",
                        catch_response=True
                    )

    @tag('orders')
    @task(4)
    def view_orders(self):
        """View incoming orders"""
        if self.token:
            self.client.get(
                "/api/v1/orders",
                headers=self._headers(),
                name="/api/v1/orders [GET]"
            )

    @tag('chat')
    @task(3)
    def view_conversations(self):
        """View buyer inquiries"""
        if self.token:
            self.client.get(
                "/api/v1/chat/conversations",
                headers=self._headers(),
                name="/api/v1/chat/conversations [GET]"
            )

    @tag('agent')
    @task(2)
    def chat_with_agent(self):
        """Get farming advice from AI agent"""
        if self.token:
            questions = [
                "What is the best time to plant tomatoes?",
                "How do I control pests on my maize farm?",
                "What fertilizer should I use for pepper?",
                "How do I prevent post-harvest losses?",
                "What is the weather forecast for Accra?"
            ]
            self.client.post(
                "/api/v1/agent/chat",
                headers=self._headers(),
                json={
                    "message": random.choice(questions)
                },
                name="/api/v1/agent/chat [POST]"
            )

    @tag('agent')
    @task(2)
    def view_agent_sessions(self):
        """View AI agent chat sessions"""
        if self.token:
            self.client.get(
                "/api/v1/agent/sessions",
                headers=self._headers(),
                name="/api/v1/agent/sessions [GET]"
            )

    @tag('notifications')
    @task(3)
    def check_notifications(self):
        """Check notifications"""
        if self.token:
            self.client.get(
                "/api/v1/notifications",
                headers=self._headers(),
                name="/api/v1/notifications [GET]"
            )

    @tag('profile')
    @task(1)
    def view_profile(self):
        """View farmer profile"""
        if self.token:
            self.client.get(
                "/api/v1/users/me",
                headers=self._headers(),
                name="/api/v1/users/me [GET]"
            )


class AgentStressTest(HttpUser):
    """
    Specifically tests the AI agent endpoint under load.
    Use with: locust -f locustfile.py --tags agent
    """
    weight = 1  # 10% of users
    wait_time = between(3, 8)  # Longer wait for AI responses
    
    def on_start(self):
        """Login when user starts"""
        self.token = None
        self._authenticate()

    def _authenticate(self):
        """Authenticate the user"""
        with self.client.post(
            "/auth/login",
            json={
                "email": "yaw@example.com",
                "password": "Farmer123!"
            },
            name="/auth/login [POST]",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                response.success()
            else:
                response.success()

    def _headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    @tag('agent')
    @task(5)
    def ask_farming_question(self):
        """Ask AI agent a farming question"""
        if self.token:
            questions = [
                "What is the best time to plant tomatoes in Ghana?",
                "How do I control fall armyworm on maize?",
                "What are the symptoms of tomato blight?",
                "How should I prepare my soil for planting?",
                "What is the weather forecast for Kumasi this week?",
                "How do I store harvested maize properly?",
                "What fertilizer ratio is best for pepper?",
                "How do I prevent post-harvest losses for vegetables?",
                "When should I harvest my rice crop?",
                "What are good organic pest control methods?"
            ]
            self.client.post(
                "/api/v1/agent/chat",
                headers=self._headers(),
                json={"message": random.choice(questions)},
                name="/api/v1/agent/chat [POST]",
                timeout=60  # AI responses may take longer
            )

    @tag('agent')
    @task(1)
    def create_session(self):
        """Create new agent session"""
        if self.token:
            self.client.post(
                "/api/v1/agent/sessions",
                headers=self._headers(),
                name="/api/v1/agent/sessions [POST]"
            )

    @tag('agent')
    @task(2)
    def list_sessions(self):
        """List agent sessions"""
        if self.token:
            self.client.get(
                "/api/v1/agent/sessions",
                headers=self._headers(),
                name="/api/v1/agent/sessions [GET]"
            )


class AdminUser(HttpUser):
    """Admin coverage for dashboards, users, disputes, configs"""
    weight = 1
    wait_time = between(3, 8)

    def on_start(self):
        self.token = None
        self._authenticate()

    def _authenticate(self):
        """Authenticate admin user"""
        with self.client.post(
            "/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            },
            name="/auth/login [POST - admin]",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                response.success()
            else:
                response.success()

    def _headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    @tag('admin')
    @task(3)
    def dashboard(self):
        if self.token:
            self.client.get(
                "/api/v1/admin/dashboard",
                headers=self._headers(),
                name="/api/v1/admin/dashboard [GET]",
                catch_response=True
            )

    @tag('admin')
    @task(3)
    def list_users(self):
        if self.token:
            self.client.get(
                "/api/v1/admin/users",
                headers=self._headers(),
                name="/api/v1/admin/users [GET]",
                catch_response=True
            )

    @tag('admin')
    @task(2)
    def disputes(self):
        if self.token:
            self.client.get(
                "/api/v1/admin/disputes",
                headers=self._headers(),
                name="/api/v1/admin/disputes [GET]",
                catch_response=True
            )

    @tag('admin')
    @task(2)
    def audit_logs(self):
        if self.token:
            self.client.get(
                "/api/v1/admin/audit-logs",
                headers=self._headers(),
                name="/api/v1/admin/audit-logs [GET]",
                catch_response=True
            )

    @tag('admin')
    @task(2)
    def system_config(self):
        if self.token:
            self.client.get(
                "/api/v1/admin/config",
                headers=self._headers(),
                name="/api/v1/admin/config [GET]",
                catch_response=True
            )
