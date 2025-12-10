import { useState } from 'react';
import { ProductListing } from './ProductListing';
import { CustomerOrders } from './CustomerOrders';
import { SearchFilters } from './SearchFilters';
import { FeatureShowcase } from './FeatureShowcase';
import { ShoppingCart, Package, MapPin } from 'lucide-react';

export function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState<'browse' | 'orders'>('browse');
  const [cartCount] = useState(5);
  const [filters, setFilters] = useState({
    category: 'all',
    location: 'all',
    sortBy: 'recent'
  });

  return (
    <div className="max-w-7xl mx-auto p-4 pb-24">
      {/* Feature Showcase */}
      {activeTab === 'browse' && <FeatureShowcase />}
      
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-gray-900 mb-2">Welcome, Auntie Esi</h1>
            <p className="text-gray-600 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Makola Market, Accra
            </p>
          </div>
          
          <div className="relative">
            <button className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-emerald-50 rounded-lg p-4">
            <p className="text-emerald-700 mb-1">Available Farmers</p>
            <p className="text-emerald-900">142 Active</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-blue-700 mb-1">Active Orders</p>
            <p className="text-blue-900">7 In Transit</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-purple-700 mb-1">This Month</p>
            <p className="text-purple-900">GHS 18,750</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'browse'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Package className="w-5 h-5" />
          Browse Products
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'orders'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          My Orders
        </button>
      </div>

      {/* Content Area */}
      <div>
        {activeTab === 'browse' && (
          <>
            <SearchFilters filters={filters} onFilterChange={setFilters} />
            <ProductListing userType="customer" filters={filters} />
          </>
        )}
        {activeTab === 'orders' && <CustomerOrders />}
      </div>
    </div>
  );
}