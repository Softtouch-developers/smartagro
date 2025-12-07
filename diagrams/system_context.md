@startuml SmartAgro_System_Context
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

LAYOUT_WITH_LEGEND()

title System Context Diagram - SmartAgro Platform

Person(farmer, "Farmer", "Smallholder farmer selling produce")
Person(buyer, "Buyer/Aggregator", "Wholesale buyer or consumer")
Person(admin, "Admin", "Platform administrator")

System(smartagro, "SmartAgro Platform", "Digital marketplace connecting farmers and buyers, reducing post-harvest losses")

System_Ext(paystack, "Paystack", "Payment processing and transfers")
System_Ext(mnotify, "mNotify", "SMS/OTP services")
System_Ext(openweather, "OpenWeatherMap", "Weather forecasts")
System_Ext(openrouter, "OpenRouter", "LLM API for farming assistant")

Rel(farmer, smartagro, "Lists produce, manages inventory, chats with AI assistant", "HTTPS")
Rel(buyer, smartagro, "Browses products, places orders, chats with farmers", "HTTPS")
Rel(admin, smartagro, "Resolves disputes, monitors platform", "HTTPS")

Rel(smartagro, paystack, "Processes payments, transfers funds", "API/HTTPS")
Rel(smartagro, mnotify, "Sends OTP, notifications", "API/HTTPS")
Rel(smartagro, openweather, "Fetches weather data", "API/HTTPS")
Rel(smartagro, openrouter, "Queries LLM for farming advice", "API/HTTPS")

Rel(paystack, smartagro, "Sends webhooks (payment events)", "HTTPS")
Rel(mnotify, farmer, "Sends SMS", "SMS")
Rel(mnotify, buyer, "Sends SMS", "SMS")

@enduml