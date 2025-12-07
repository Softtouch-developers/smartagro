@startuml SmartAgro_Notification_Flow
title Data Flow - Notification System

!define RECTANGLE class

RECTANGLE Event {
    Order Update
    New Message
    Payment Status
}

RECTANGLE NotificationService {
    Create Notification
}

RECTANGLE PostgreSQL {
    notifications table
}

RECTANGLE SMSQueue {
    Should send SMS?
}

RECTANGLE mNotify {
    Send SMS
}

RECTANGLE PollingClient {
    Frontend polls every 30s
}

Event --> NotificationService: Trigger
NotificationService --> PostgreSQL: INSERT notification
NotificationService --> SMSQueue: Check criteria

SMSQueue --> mNotify: If critical\n(OTP, payment, order)
mNotify --> User: SMS delivered

PollingClient --> NotificationService: GET /notifications/unread
NotificationService --> PostgreSQL: Query unread
PostgreSQL --> NotificationService: Unread list
NotificationService --> PollingClient: JSON response
PollingClient --> User: Display badge/alert

note right of SMSQueue
SMS sent for:
- OTP verification
- Payment confirmed
- Order shipped
- Payment released
Not sent for:
- Chat messages (in-app only)
- Minor updates
end note

@enduml