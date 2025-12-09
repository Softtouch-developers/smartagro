import { useState } from 'react';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  pricePerUnit: number;
  location: string;
  farmer: string;
  farmerId: string;
  quality: 'Premium' | 'Grade A' | 'Grade B';
  harvestDate: string;
  availableUntil: string;
  image: string;
  verified: boolean;
  description: string;
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Fresh Tomatoes',
    category: 'vegetables',
    quantity: '500',
    unit: 'kg',
    pricePerUnit: 4.50,
    location: 'Techiman',
    farmer: 'Opanyin Kwame',
    farmerId: 'F001',
    quality: 'Premium',
    harvestDate: '2025-12-02',
    availableUntil: '2025-12-10',
    image: 'tomatoes',
    verified: true,
    description: 'Fresh, ripe tomatoes harvested this week. Perfect for market resale.'
  },
  {
    id: '2',
    name: 'Sweet Corn',
    category: 'grains',
    quantity: '800',
    unit: 'kg',
    pricePerUnit: 3.20,
    location: 'Ejura',
    farmer: 'Maame Abena',
    farmerId: 'F002',
    quality: 'Grade A',
    harvestDate: '2025-12-01',
    availableUntil: '2025-12-15',
    image: 'corn',
    verified: true,
    description: 'High-quality sweet corn, excellent for wholesale distribution.'
  },
  {
    id: '3',
    name: 'Garden Eggs',
    category: 'vegetables',
    quantity: '300',
    unit: 'kg',
    pricePerUnit: 5.80,
    location: 'Kumasi',
    farmer: 'Kofi Mensah',
    farmerId: 'F003',
    quality: 'Premium',
    harvestDate: '2025-12-03',
    availableUntil: '2025-12-11',
    image: 'eggplant',
    verified: true,
    description: 'Premium quality garden eggs, freshly harvested and ready for market.'
  },
  {
    id: '4',
    name: 'Onions',
    category: 'vegetables',
    quantity: '1000',
    unit: 'kg',
    pricePerUnit: 3.50,
    location: 'Wenchi',
    farmer: 'Yaw Boateng',
    farmerId: 'F004',
    quality: 'Grade A',
    harvestDate: '2025-11-28',
    availableUntil: '2025-12-20',
    image: 'onions',
    verified: true,
    description: 'Locally grown onions with excellent storage quality.'
  },
  {
    id: '5',
    name: 'Chili Peppers',
    category: 'vegetables',
    quantity: '200',
    unit: 'kg',
    pricePerUnit: 8.00,
    location: 'Techiman',
    farmer: 'Akua Serwaa',
    farmerId: 'F005',
    quality: 'Premium',
    harvestDate: '2025-12-04',
    availableUntil: '2025-12-12',
    image: 'peppers',
    verified: true,
    description: 'Hot chili peppers, perfect for spice markets and food processing.'
  },
  {
    id: '6',
    name: 'Cassava',
    category: 'tubers',
    quantity: '1500',
    unit: 'kg',
    pricePerUnit: 2.20,
    location: 'Atebubu',
    farmer: 'Opanyin Kwame',
    farmerId: 'F001',
    quality: 'Grade A',
    harvestDate: '2025-12-01',
    availableUntil: '2025-12-18',
    image: 'cassava',
    verified: true,
    description: 'Fresh cassava roots suitable for gari processing or direct sale.'
  }
];

interface ProductListingProps {
  userType: 'farmer' | 'customer';
  filters?: {
    category: string;
    location: string;
    sortBy: string;
  };
}

export function ProductListing({ userType, filters }: ProductListingProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  let filteredProducts = userType === 'farmer' 
    ? mockProducts.filter(p => p.farmerId === 'F001')
    : mockProducts;

  if (filters) {
    if (filters.category !== 'all') {
      filteredProducts = filteredProducts.filter(p => p.category === filters.category);
    }
    if (filters.location !== 'all') {
      filteredProducts = filteredProducts.filter(p => p.location === filters.location);
    }
    if (filters.sortBy === 'price-low') {
      filteredProducts = [...filteredProducts].sort((a, b) => a.pricePerUnit - b.pricePerUnit);
    } else if (filters.sortBy === 'price-high') {
      filteredProducts = [...filteredProducts].sort((a, b) => b.pricePerUnit - a.pricePerUnit);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            userType={userType}
            onViewDetails={() => setSelectedProduct(product)}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center">
          <p className="text-gray-500">No products found matching your criteria</p>
        </div>
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          userType={userType}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}
