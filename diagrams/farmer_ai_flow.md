# Farmer AI Agent Workflow

## Sequence Diagram - Complete Agent Flow

```plantuml
@startuml SmartAgro_Agent_Flow
title Farmer AI Agent - Complete Workflow

skinparam backgroundColor #FEFEFE
skinparam sequenceArrowThickness 2
skinparam roundcorner 10
skinparam maxmessagesize 200

actor Farmer #green
participant "React PWA" as PWA #lightblue
participant "FastAPI\n/api/v1/agent" as API #orange
participant "FarmingAgent\nService" as Agent #yellow
database "MongoDB\nagent_conversations" as Mongo #lightgreen
database "PostgreSQL\n+ pgvector" as PG #pink
participant "OpenRouter\n(Gemini)" as LLM #purple
participant "External APIs\n(Weather)" as External #gray

== Session Creation ==
Farmer -> PWA: Opens AI Assistant
PWA -> API: POST /agent/sessions
API -> Agent: create_session(farmer_id)
Agent -> Mongo: Insert new session
Mongo --> Agent: session_id
Agent --> API: {session_id}
API --> PWA: session_id
PWA --> Farmer: Chat interface ready

== Streaming Chat Flow ==
Farmer -> PWA: "How do I control fall armyworm on my maize?"
PWA -> API: POST /agent/chat/stream\n{message, session_id}
API -> Agent: chat_stream(message)

Agent -> Mongo: Save user message
Agent -> PG: get_system_prompt()
PG --> Agent: System prompt config

Agent -> Mongo: Load conversation history
Mongo --> Agent: Previous 20 messages

note over Agent: Build messages array:\n- System prompt\n- History\n- User message

Agent -> LLM: **Streaming Request**\nmodel: gemini-2.5-flash\ntools: [search_knowledge, get_weather, ...]
API --> PWA: **SSE: event: start**\n{session_id}

== Tool Calling Loop ==
LLM --> Agent: tool_call: search_knowledge\n{query: "fall armyworm maize control"}
API --> PWA: **SSE: event: tool_start**\n{tool: search_knowledge}

Agent -> PG: Hybrid Search:\n1. Generate query embedding\n2. Semantic search (70%)\n3. Keyword search (30%)\n4. Combine & rank
PG --> Agent: Top 5 relevant chunks

API --> PWA: **SSE: event: tool_end**\n{result: knowledge_results}

Agent -> LLM: Submit tool result
LLM --> Agent: **Streaming tokens**

loop For each token
    Agent --> API: token
    API --> PWA: **SSE: event: token**\n{token: "..."}
    PWA --> Farmer: Display token (typewriter effect)
end

== Completion ==
Agent -> Mongo: Save assistant response\n+ tool calls made
Agent --> API: Complete
API --> PWA: **SSE: event: done**\n{session_id, tool_calls_count}

PWA --> Farmer: Response complete

== Multimodal Input (Optional) ==
note over Farmer, External
**Image/Audio/Video Support:**
1. Farmer uploads photo of diseased crop
2. File stored in DO Spaces
3. URL passed to Gemini with message
4. Gemini analyzes image + text
end note

@enduml
```

## Activity Diagram - Agent Processing

```plantuml
@startuml Agent_Activity
title AI Agent Message Processing

start

:Receive user message;

:Save message to MongoDB;

:Load system prompt from PostgreSQL;

:Load conversation history\n(last 20 messages);

if (Has media attachments?) then (yes)
    :Build multimodal content\n(text + image/audio/video URLs);
else (no)
    :Build text-only content;
endif

:Send to LLM with tools;

while (LLM returns tool_calls?) is (yes)
    :Execute each tool;

    switch (Tool type?)
    case (search_knowledge)
        :Hybrid search in pgvector;
    case (get_weather)
        :Call OpenWeather API;
    case (get_farmer_products)
        :Query PostgreSQL products;
    case (get_farmer_orders)
        :Query PostgreSQL orders;
    case (get_farmer_earnings)
        :Query escrow transactions;
    case (get_buyer_enquiries)
        :Query MongoDB conversations;
    case (calculate_planting_date)
        :Calculate from crop data;
    endswitch

    :Return tool results to LLM;
endwhile (no more tools)

:Stream response tokens;

:Save assistant response to MongoDB;

stop

@enduml
```

## Component Diagram - Agent Architecture

```plantuml
@startuml Agent_Components
title AI Agent Module Architecture

package "Agent Module" {
    [routes.py] as Routes
    [service.py] as Service
    [tools.py] as Tools
    [knowledge_service.py] as Knowledge
}

package "Data Stores" {
    database "PostgreSQL" {
        [SystemConfiguration] as Config
        [KnowledgeEmbedding] as Embeddings
        [User/Product/Order] as CoreData
    }

    database "MongoDB" {
        [agent_conversations] as Conversations
        [knowledge_documents] as KnowledgeDocs
    }
}

package "External Services" {
    cloud "OpenRouter API" {
        [Gemini 2.5 Flash] as LLM
        [text-embedding-3-small] as EmbedModel
    }

    cloud "OpenWeather API" as Weather
}

Routes --> Service : chat/stream
Service --> Tools : execute_tool()
Service --> Conversations : save/load messages
Service --> Config : get_system_prompt()
Service --> LLM : chat completion

Tools --> Knowledge : search_knowledge
Tools --> CoreData : platform data
Tools --> Weather : get_weather

Knowledge --> Embeddings : hybrid_search
Knowledge --> KnowledgeDocs : get_document
Knowledge --> EmbedModel : generate embeddings

@enduml
```

## Available Agent Tools

| Tool | Description | Data Source |
|------|-------------|-------------|
| `search_knowledge` | Search agricultural knowledge base | PostgreSQL (pgvector) + MongoDB |
| `get_weather` | Weather forecast for Ghana locations | OpenWeather API |
| `get_farmer_products` | Farmer's product listings | PostgreSQL (products) |
| `get_farmer_orders` | Farmer's sales/orders | PostgreSQL (orders) |
| `get_farmer_earnings` | Earnings & payout info | PostgreSQL (escrow) |
| `get_buyer_enquiries` | Messages from buyers | MongoDB (conversations) |
| `calculate_planting_date` | Optimal planting date calculator | Internal crop data |

## SSE Event Types

| Event | Description | Data |
|-------|-------------|------|
| `start` | Stream initiated | `{session_id}` |
| `token` | Response token | `{token: "..."}` |
| `tool_start` | Tool execution starting | `{tool, arguments}` |
| `tool_end` | Tool execution complete | `{tool, result, execution_time_ms}` |
| `done` | Stream complete | `{session_id, tool_calls_count}` |
| `error` | Error occurred | `{error: "..."}` |
