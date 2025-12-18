import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout,
  ShoppingCart,
  Users,
  Shield,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  TrendingUp,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/common';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: <Sprout className="w-8 h-8" />,
    title: 'Fresh from Farms',
    description: 'Buy directly from local Ghanaian farmers. No middlemen, fresher produce, better prices.',
    color: 'bg-green-500',
  },
  {
    icon: <TrendingUp className="w-8 h-8" />,
    title: 'Grow Your Business',
    description: 'Farmers reach thousands of buyers. Track sales, manage orders, and grow your farm business.',
    color: 'bg-blue-500',
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: 'Secure Payments',
    description: 'Your money is protected with escrow. Pay safely and release funds when satisfied.',
    color: 'bg-purple-500',
  },
  {
    icon: <MessageCircle className="w-8 h-8" />,
    title: 'AI Farming Assistant',
    description: 'Get expert advice on crops, pests, and best farming practices powered by AI.',
    color: 'bg-amber-500',
  },
];

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % features.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + features.length) % features.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    setTouchStart(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">SmartAgro</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="text-primary font-medium hover:underline"
        >
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col px-6 py-8">
        {/* Main Heading */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Fresh Produce,{' '}
            <span className="text-primary">Direct from Farmers</span>
          </h1>
          <p className="text-gray-600 text-lg max-w-md mx-auto">
            Ghana's trusted marketplace connecting farmers and buyers for fresh, quality agricultural produce.
          </p>
        </div>

        {/* Feature Carousel */}
        <div
          className="relative flex-1 max-w-lg mx-auto w-full"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="overflow-hidden rounded-2xl bg-white shadow-lg border border-gray-100">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="w-full flex-shrink-0 p-8 flex flex-col items-center text-center"
                >
                  <div
                    className={`w-20 h-20 ${feature.color} rounded-2xl flex items-center justify-center text-white mb-6`}
                  >
                    {feature.icon}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h2>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 hidden md:flex"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 hidden md:flex"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {features.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentSlide
                    ? 'w-8 bg-primary'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* User Type Cards */}
        <div className="mt-8 grid grid-cols-2 gap-4 max-w-lg mx-auto w-full">
          <div className="bg-white rounded-xl border-2 border-gray-100 p-4 text-center hover:border-primary hover:shadow-md transition-all cursor-pointer">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sprout className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">I'm a Farmer</h3>
            <p className="text-xs text-gray-500">Sell your produce</p>
          </div>
          <div className="bg-white rounded-xl border-2 border-gray-100 p-4 text-center hover:border-primary hover:shadow-md transition-all cursor-pointer">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">I'm a Buyer</h3>
            <p className="text-xs text-gray-500">Buy fresh produce</p>
          </div>
        </div>
      </main>

      {/* Bottom CTA */}
      <footer className="px-6 py-6 bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto space-y-3">
          <Button
            fullWidth
            size="lg"
            onClick={() => navigate('/signup')}
            rightIcon={<ArrowRight className="w-5 h-5" />}
          >
            Get Started
          </Button>
          <Button
            fullWidth
            size="lg"
            variant="outline"
            onClick={() => navigate('/login')}
          >
            I already have an account
          </Button>
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>1000+ Users</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4" />
            <span>Secure Payments</span>
          </div>
          <div className="flex items-center gap-1">
            <Smartphone className="w-4 h-4" />
            <span>Mobile First</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WelcomePage;
