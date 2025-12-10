import { Shield, Wifi, MessageSquare, Mic, Award, TrendingDown } from 'lucide-react';

export function FeatureShowcase() {
  const features = [
    {
      icon: Shield,
      title: 'Escrow Protection',
      description: 'Payments held securely until delivery confirmation',
      color: 'text-blue-600 bg-blue-100'
    },
    {
      icon: Wifi,
      title: 'Offline First',
      description: 'Work without internet, sync when connected',
      color: 'text-purple-600 bg-purple-100'
    },
    {
      icon: MessageSquare,
      title: 'AI Farming Advisor',
      description: 'Get real-time advice on crops, pests, and pricing',
      color: 'text-green-600 bg-green-100'
    },
    {
      icon: Mic,
      title: 'Voice Input',
      description: 'Speak to add products - no typing needed',
      color: 'text-orange-600 bg-orange-100'
    },
    {
      icon: Award,
      title: 'Verified Quality',
      description: 'Quality grades and farmer verification',
      color: 'text-yellow-600 bg-yellow-100'
    },
    {
      icon: TrendingDown,
      title: 'Reduce Waste',
      description: 'Direct sales to minimize post-harvest losses',
      color: 'text-red-600 bg-red-100'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h3 className="text-gray-900 mb-4">Why SmartAgro?</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div key={index} className="text-center">
              <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                <Icon className="w-6 h-6" />
              </div>
              <p className="text-gray-700 mb-1">{feature.title}</p>
              <p className="text-gray-500">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
