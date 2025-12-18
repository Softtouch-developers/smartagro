# Admin Dashboard Features

## High-Level Feature Overview

```plantuml
@startuml Admin_Dashboard_Overview
title SmartAgro Admin Dashboard - Feature Overview

skinparam backgroundColor #FEFEFE
skinparam componentStyle rectangle
skinparam roundcorner 15

package "Admin Dashboard" {

    package "Analytics & Monitoring" #LightBlue {
        [Platform Statistics] as Stats
        [Revenue Reports] as Revenue
        [User Growth] as Growth
        [Audit Logs] as Audit
    }

    package "User Management" #LightGreen {
        [View All Users] as ViewUsers
        [Suspend/Activate Users] as SuspendUser
        [Verify Users] as VerifyUser
        [Filter by Type/Status] as FilterUsers
    }

    package "Dispute Resolution" #LightCoral {
        [View Disputes] as ViewDisputes
        [Resolve Disputes] as ResolveDispute
        [Issue Refunds] as Refund
        [Release Payments] as Release
    }

    package "System Configuration" #LightYellow {
        [AI Agent System Prompt] as AgentPrompt
        [Platform Fee %] as Fee
        [Welcome Message] as Welcome
    }

    package "Knowledge Base" #Plum {
        [Index Documents] as IndexDocs
        [View Documents] as ViewDocs
        [Search Knowledge] as SearchKB
    }
}

actor Admin #red

Admin --> Stats
Admin --> ViewUsers
Admin --> ViewDisputes
Admin --> AgentPrompt
Admin --> IndexDocs

@enduml
```

## Dashboard Statistics

```plantuml
@startuml Admin_Dashboard_Stats
title Admin Dashboard - Platform Statistics

skinparam class {
    BackgroundColor #FEFEFE
    BorderColor #333333
}

class "Dashboard Stats" as Dashboard {
    **User Metrics**
    --
    + total_users: int
    + total_farmers: int
    + total_buyers: int
    + new_users_this_month: int
    + verified_users: int
    ==
    **Transaction Metrics**
    --
    + total_orders: int
    + completed_orders: int
    + pending_orders: int
    + total_revenue: GHS
    + platform_earnings: GHS
    ==
    **Product Metrics**
    --
    + total_products: int
    + active_listings: int
    + out_of_stock: int
    ==
    **Dispute Metrics**
    --
    + open_disputes: int
    + resolved_disputes: int
    + avg_resolution_time: hours
    ==
    **Escrow Metrics**
    --
    + escrow_balance: GHS
    + pending_releases: int
    + monthly_payouts: GHS
}

note right of Dashboard
    GET /api/v1/admin/dashboard
    Returns all platform statistics
    for admin overview page
end note

@enduml
```

## User Management Flow

```plantuml
@startuml Admin_User_Management
title Admin - User Management Workflow

start

:Admin logs in;

:View Users List;
note right: GET /api/v1/admin/users

if (Filter users?) then (yes)
    :Apply filters;
    note right
        - user_type: FARMER/BUYER
        - account_status
        - is_verified
    end note
endif

:Select user;

switch (Action?)
case (Verify)
    :Manually verify user;
    note right: PUT /api/v1/admin/users/{id}/verify
    :Set is_verified = true;
    :Log admin action;

case (Suspend)
    :Enter suspension reason;
    :Suspend user;
    note right: PUT /api/v1/admin/users/{id}/suspend
    :Set account_status = SUSPENDED;
    :Log admin action;

case (Activate)
    :Activate suspended user;
    note right: PUT /api/v1/admin/users/{id}/activate
    :Set account_status = ACTIVE;
    :Log admin action;

case (View Details)
    :Show user profile;
    :Show user's orders;
    :Show user's products;
endswitch

:Action logged in audit_logs;

stop

@enduml
```

## Dispute Resolution Flow

```plantuml
@startuml Admin_Dispute_Resolution
title Admin - Dispute Resolution Workflow

|Buyer|
start
:Raise dispute on order;
note right
    POST /api/v1/admin/disputes
    {order_id, reason, evidence_urls}
end note

|System|
:Create dispute record;
:Notify seller;
:Notify admin;

|Seller|
:View dispute;
:Submit response;
note right
    PUT /api/v1/admin/disputes/{id}/respond
    {response, evidence_urls}
end note

|Admin|
:Review dispute;
:Examine evidence;
:Review order details;

switch (Resolution Decision?)
case (Full Refund)
    :Issue full refund to buyer;
    note right
        POST /api/v1/admin/disputes/{id}/resolve
        {resolution: "REFUND"}
    end note
    :Transfer escrow to buyer;

case (Release to Seller)
    :Release payment to seller;
    note right
        POST /api/v1/admin/disputes/{id}/resolve
        {resolution: "RELEASE"}
    end note
    :Transfer escrow to seller;

case (Partial Refund)
    :Calculate partial amount;
    note right
        POST /api/v1/admin/disputes/{id}/resolve
        {resolution: "PARTIAL_REFUND",
         partial_refund_amount: X}
    end note
    :Split escrow between parties;
endswitch

|System|
:Update dispute status;
:Log admin action;
:Notify both parties;

stop

@enduml
```

## System Configuration Management

```plantuml
@startuml Admin_System_Config
title Admin - System Configuration

skinparam component {
    BackgroundColor #FEFEFE
    BorderColor #333333
}

package "System Configuration" {
    component "AGENT_SYSTEM_PROMPT" #LightYellow {
    }
    
    note right of "AGENT_SYSTEM_PROMPT"
        AI Agent Behavior
        Customize how the AI farming
        assistant responds to farmers.
        
        PUT /api/v1/admin/config/AGENT_SYSTEM_PROMPT
    end note
    
    component "PLATFORM_FEE_PERCENTAGE" #LightGreen {
    }
    
    note right of "PLATFORM_FEE_PERCENTAGE"
        Platform Commission
        Default: 5%
        Applied to all transactions
        
        PUT /api/v1/admin/config/PLATFORM_FEE_PERCENTAGE
    end note
    
    component "WELCOME_MESSAGE" #LightBlue {
    }
    
    note right of "WELCOME_MESSAGE"
        Homepage Message
        Displayed to users on
        the landing page
        
        PUT /api/v1/admin/config/WELCOME_MESSAGE
    end note
}

actor Admin

Admin --> AGENT_SYSTEM_PROMPT : Edit AI behavior
Admin --> PLATFORM_FEE_PERCENTAGE : Adjust fees
Admin --> WELCOME_MESSAGE : Update messaging

note bottom
    All changes are logged in audit_logs
    with admin_id and timestamp
end note

@enduml
```

## Knowledge Base Management

```plantuml
@startuml Admin_Knowledge_Base
title Admin - Knowledge Base Management

start

:Admin accesses Knowledge Base;

switch (Action?)
case (Index Documents)
    :Trigger indexing;
    note right
        POST /api/v1/agent/knowledge/index
        {force_reindex: false}
    end note

    :Scan /knowledgebase/*.md;

    while (For each file) is (has more)
        if (Already indexed?) then (yes)
            if (Force reindex?) then (yes)
                :Delete existing;
                :Re-process file;
            else (no)
                :Skip file;
            endif
        else (no)
            :Parse markdown;
            :Detect document type;
            :Extract topics/crops;
            :Chunk text;
            :Generate embeddings;
            :Store in MongoDB;
            :Store vectors in pgvector;
        endif
    endwhile (done)

    :Return indexing stats;

case (View Documents)
    :List all documents;
    note right
        GET /api/v1/agent/knowledge/documents
    end note
    :Show document_type, title, crops, topics;

case (Search Knowledge)
    :Enter search query;
    note right
        POST /api/v1/agent/knowledge/search
        {query, filters}
    end note
    :Perform hybrid search;
    :Return ranked results;

endswitch

stop

@enduml
```

## Admin API Endpoints Summary

```plantuml
@startuml Admin_API_Endpoints
title Admin API Endpoints

skinparam class {
    BackgroundColor White
    BorderColor #333333
}

class "Dashboard" as D {
    GET /admin/dashboard
    --
    Returns platform statistics
}

class "Disputes" as Dis {
    POST /admin/disputes
    GET /admin/disputes
    GET /admin/disputes/{id}
    PUT /admin/disputes/{id}/respond
    POST /admin/disputes/{id}/resolve
    --
    Manage disputes & resolutions
}

class "Users" as U {
    GET /admin/users
    PUT /admin/users/{id}/suspend
    PUT /admin/users/{id}/activate
    PUT /admin/users/{id}/verify
    --
    User management
}

class "Audit Logs" as A {
    GET /admin/audit-logs
    --
    View admin action history
}

class "System Config" as C {
    GET /admin/config
    GET /admin/config/{key}
    PUT /admin/config/{key}
    --
    Manage system settings
}

class "Knowledge Base" as K {
    POST /agent/knowledge/index
    GET /agent/knowledge/documents
    GET /agent/knowledge/documents/{id}
    POST /agent/knowledge/search
    --
    Manage AI knowledge base
}

note "All endpoints require\nAdmin authentication" as N1

D .. N1
Dis .. N1
U .. N1
A .. N1
C .. N1
K .. N1

@enduml
```

## Feature Access Matrix

| Feature | Endpoint | Description |
|---------|----------|-------------|
| **Dashboard** | `GET /admin/dashboard` | Platform statistics & metrics |
| **List Users** | `GET /admin/users` | View all users with filters |
| **Suspend User** | `PUT /admin/users/{id}/suspend` | Suspend a user account |
| **Activate User** | `PUT /admin/users/{id}/activate` | Reactivate suspended account |
| **Verify User** | `PUT /admin/users/{id}/verify` | Manually verify a user |
| **Raise Dispute** | `POST /admin/disputes` | Create new dispute |
| **List Disputes** | `GET /admin/disputes` | View all disputes |
| **Resolve Dispute** | `POST /admin/disputes/{id}/resolve` | Admin resolution |
| **Audit Logs** | `GET /admin/audit-logs` | View action history |
| **List Config** | `GET /admin/config` | View all settings |
| **Update Config** | `PUT /admin/config/{key}` | Change system setting |
| **Index KB** | `POST /agent/knowledge/index` | Index knowledge base |
| **List KB Docs** | `GET /agent/knowledge/documents` | View indexed documents |
