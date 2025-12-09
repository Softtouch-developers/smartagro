import { useState } from 'react';
import { ProductListing } from './ProductListing';
import { FarmerOrders } from './FarmerOrders';
import { AdvisoryChat } from './AdvisoryChat';
import { AddProductModal } from './AddProductModal';
import { FeatureShowcase } from './FeatureShowcase';
import { Package, MessageSquare, ShoppingBag, Plus, Mic } from 'lucide-react';

export function FarmerDashboard() {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'chat'>('products');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleVoiceCommand = () => {
    setIsListening(!isListening);
    // In a real implementation, this would integrate with Web Speech API
    if (!isListening) {
      setTimeout(() => setIsListening(false), 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 pb-24">
      {/* Feature Showcase */}
      {activeTab === 'products' && <FeatureShowcase />}
      
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-gray-900 mb-2">Welcome, Opanyin Kwame</h1>
            <p className="text-gray-600">Techiman, Bono East Region</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={handleVoiceCommand}
              className={`flex-1 md:flex-initial px-6 py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              <Mic className="w-5 h-5" />
              {isListening ? 'Listening...' : 'Voice Help'}
            </button>
            <button
              onClick={() => setShowAddProduct(true)}
              className="flex-1 md:flex-initial px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-green-700 mb-1">Active Listings</p>
            <p className="text-green-900">8 Products</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-blue-700 mb-1">Pending Orders</p>
            <p className="text-blue-900">3 Orders</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <p className="text-amber-700 mb-1">This Month's Sales</p>
            <p className="text-amber-900">GHS 2,450</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'products'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Package className="w-5 h-5" />
          My Products
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3 rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'orders'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          Orders
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-6 py-3 rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'chat'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          Farming Advisor
        </button>
      </div>

      {/* Content Area */}
      <div>
        {activeTab === 'products' && <ProductListing userType="farmer" />}
        {activeTab === 'orders' && <FarmerOrders />}
        {activeTab === 'chat' && <AdvisoryChat />}
      </div>

      {showAddProduct && <AddProductModal onClose={() => setShowAddProduct(false)} />}
    </div>
  );
}