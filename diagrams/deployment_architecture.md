@startuml SmartAgro_Deployment_Diagram
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Deployment.puml

title Deployment Diagram - SmartAgro on DigitalOcean

Deployment_Node(client, "User Device", "Mobile/Desktop Browser") {
    Container(browser, "Web Browser", "Chrome, Safari, Firefox", "Runs React PWA with service workers")
    ContainerDb(indexeddb, "IndexedDB", "Browser Storage", "Offline data cache")
}

Deployment_Node(do_platform, "DigitalOcean App Platform", "Singapore Region") {
    Deployment_Node(frontend_service, "Static Site Service") {
        Container(react_app, "React PWA", "Static Assets", "Built React application")
    }
    
    Deployment_Node(backend_service, "Web Service", "1 GB RAM") {
        Container(fastapi, "FastAPI Application", "Python 3.11", "REST API + Business Logic")
        Container(agent, "Farming AI Agent", "Embedded Service", "LLM-based assistant")
    }
}

Deployment_Node(do_databases, "DigitalOcean Managed Databases", "Singapore Region") {
    Deployment_Node(postgres_node, "PostgreSQL Cluster", "1 GB RAM, 10 GB Storage") {
        ContainerDb(postgres, "PostgreSQL 15", "with pgvector", "Relational data + embeddings")
    }
    
    Deployment_Node(redis_node, "Redis Cluster", "1 GB RAM") {
        ContainerDb(redis, "Redis 7", "In-memory cache", "Sessions, cache, rate limits")
    }
}

Deployment_Node(do_spaces_node, "DigitalOcean Spaces", "Singapore Region") {
    ContainerDb(spaces, "Object Storage + CDN", "250 GB Storage", "Media files")
}

Deployment_Node(mongodb_atlas, "MongoDB Atlas", "Frankfurt Region (EU)") {
    ContainerDb(mongo, "MongoDB Free Tier", "512 MB Storage", "Document database")
}

Deployment_Node(external_services, "External Services", "Cloud") {
    System_Ext(paystack, "Paystack", "Payment Processing")
    System_Ext(mnotify, "mNotify", "SMS Gateway")
    System_Ext(openweather, "OpenWeatherMap", "Weather Data")
    System_Ext(openrouter, "OpenRouter", "LLM Provider")
}

Rel(browser, react_app, "HTTPS", "Downloads")
Rel(browser, fastapi, "HTTPS/JSON", "API calls")
Rel(browser, spaces, "HTTPS", "Image loads via CDN")

Rel(fastapi, postgres, "TCP/SSL", "SQL queries")
Rel(fastapi, redis, "TCP/SSL", "Cache operations")
Rel(fastapi, mongo, "TCP/SSL", "Document queries")
Rel(fastapi, spaces, "HTTPS", "S3 API")

Rel(agent, postgres, "TCP/SSL", "Vector search")
Rel(agent, openrouter, "HTTPS", "LLM requests")
Rel(agent, openweather, "HTTPS", "Weather queries")

Rel(fastapi, paystack, "HTTPS", "Payment API")
Rel(fastapi, mnotify, "HTTPS", "SMS API")

@enduml