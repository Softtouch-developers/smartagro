# SmartAgro - Digital Marketplace PWA

A Progressive Web Application designed to reduce post-harvest losses in Ghana's agricultural sector by connecting smallholder farmers directly with commercial buyers.

## Overview

SmartAgro addresses the US$1.9 billion annual economic loss from post-harvest waste by:
- Creating direct market linkages between farmers and buyers
- Removing opaque middlemen from the supply chain
- Providing real-time farming advisory through AI chatbot
- Implementing escrow-based payment protection
- Supporting offline-first functionality for low-connectivity areas

## Key Features

### For Farmers (Producer View)
- **Product Listing Management**: Add and manage produce listings with photos
- **Voice-First Interface**: Voice input support for low-literacy users (Twi language support planned)
- **Order Management**: Accept/decline orders, track shipments
- **AI Farming Advisor**: Get real-time advice on cultivation, pest control, pricing, and storage
- **Offline Support**: Work without internet, sync when connected

### For Buyers (Customer View)
- **Browse & Filter**: Search produce by category, location, and price
- **Quality Verification**: View verified farmer listings with quality grades
- **Escrow Protection**: Payments held securely until delivery confirmation
- **Order Tracking**: Real-time order status from confirmation to delivery
- **Direct Communication**: Connect directly with farmers

## Progressive Web App Features

### Offline-First Architecture
- Service Worker caching for core functionality
- Local data persistence
- Automatic sync when connectivity restored
- Offline indicator with status notifications

### Installation
- Installable on mobile devices (iOS/Android)
- Desktop installation support
- App-like experience without app store downloads
- Push notification support (planned)

### Performance
- Optimized for low-bandwidth environments
- Image optimization and lazy loading
- Minimal data usage
- Fast load times even on 2G networks

## Technology Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS v4.0
- **Icons**: Lucide React
- **PWA**: Service Workers, Web App Manifest
- **Planned Backend**: FastAPI (Python)
- **Planned Database**: PostgreSQL + MongoDB (polyglot persistence)

## User Personas

### Opanyin Kwame (Farmer)
- 55-year-old tomato farmer in Techiman
- Low digital literacy
- Needs: Certainty of sale, voice-activated interface, works on basic smartphone

### Auntie Esi (Buyer/Aggregator)
- Wholesale buyer in Accra (Makola Market)
- Demands: Consistency, quality verification, transparent pricing
- Needs: Assurance of produce quality before purchase commitment

## Research Context

This platform serves as a research instrument to explore:
> "To what extent do digital market linkages and the removal of opaque middlemen reduce post-harvest spoilage for small-scale farmers in Ghana?"

## Escrow System

SmartAgro implements a trust-based payment system:
1. Buyer places order → Payment held in escrow
2. Farmer confirms and ships produce
3. Buyer receives and inspects order
4. Buyer confirms delivery → Payment released to farmer
5. Dispute resolution available if issues arise

## Future Enhancements

- [ ] Web Speech API integration for voice commands in Twi
- [ ] Real-time weather and market price data
- [ ] SMS integration for feature phone users
- [ ] Geolocation-based farmer matching
- [ ] Blockchain-based payment verification
- [ ] Mobile money integration (MTN MoMo, Vodafone Cash)
- [ ] Multi-language support (English, Twi, Ga, Ewe)
- [ ] Quality grading AI using image recognition

## Installation Instructions

### For Users
1. Visit the SmartAgro web application
2. Click "Install" when prompted (or via browser menu)
3. App will be added to your home screen
4. Launch like any other app

### For Developers
```bash
# Clone repository
git clone [repository-url]

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Test PWA functionality
npm run preview
```

## Contributing

This project is part of academic research on agricultural technology in Ghana. Contributions welcome, especially:
- Twi language translations
- Local market data
- Farming best practices for the chatbot
- Accessibility improvements

## License

[License Type] - Built for research and social impact

## Contact

For research inquiries or partnership opportunities, please contact [contact information]

---

**Note**: This is a frontend demonstration. Full functionality requires backend API integration with payment gateways, SMS services, and database systems as outlined in the technical architecture.
