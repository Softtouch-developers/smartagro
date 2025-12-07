@startuml SmartAgro_Container_Diagram
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

LAYOUT_TOP_DOWN()

title Container Diagram - SmartAgro Platform

Person(farmer, "Farmer", "Smallholder farmer")
Person(buyer, "Buyer", "Wholesale buyer")
Person(admin, "Admin", "Platform admin")

System_Boundary(smartagro, "SmartAgro Platform") {
    Container(webapp, "Web Application", "React PWA", "Provides marketplace interface, offline capabilities via service workers")
    Container(api, "API Application", "Python FastAPI", "Handles business logic, authentication, integrations")
    
    ContainerDb(postgres, "Relational Database", "PostgreSQL + pgvector", "Stores users, orders, escrow, notifications, crop embeddings")
    ContainerDb(mongo, "Document Database", "MongoDB Atlas", "Stores chat messages, agent conversations, flexible product data")
    ContainerDb(redis, "Cache", "Redis", "Stores JWT sessions, rate limits, cached product listings")
    ContainerDb(spaces, "Object Storage", "DigitalOcean Spaces", "Stores product images, voice notes, attachments")
    
    Container(indexeddb, "Local Storage", "IndexedDB", "Offline data: user profiles, products, chats")
}

System_Ext(paystack, "Paystack", "Payment Gateway")
System_Ext(mnotify, "mNotify", "SMS Service")
System_Ext(openweather, "OpenWeatherMap", "Weather API")
System_Ext(openrouter, "OpenRouter", "LLM API")

Rel(farmer, webapp, "Uses", "HTTPS")
Rel(buyer, webapp, "Uses", "HTTPS")
Rel(admin, webapp, "Uses", "HTTPS")

Rel(webapp, api, "Makes API calls", "JSON/HTTPS")
Rel(webapp, indexeddb, "Reads/Writes offline data", "IndexedDB API")

Rel(api, postgres, "Reads/Writes", "SQL/SSL")
Rel(api, mongo, "Reads/Writes", "MongoDB Protocol/SSL")
Rel(api, redis, "Reads/Writes", "Redis Protocol/SSL")
Rel(api, spaces, "Uploads/Retrieves files", "S3 API/HTTPS")

Rel(api, paystack, "Processes payments", "REST API/HTTPS")
Rel(api, mnotify, "Sends SMS/OTP", "REST API/HTTPS")
Rel(api, openweather, "Fetches weather", "REST API/HTTPS")
Rel(api, openrouter, "Queries LLM", "OpenAI API/HTTPS")

Rel(paystack, api, "Webhook events", "HTTPS")

@enduml