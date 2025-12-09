import { MapPin, Calendar, Award, Eye, Edit } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  pricePerUnit: number;
  location: string;
  farmer: string;
  quality: 'Premium' | 'Grade A' | 'Grade B';
  harvestDate: string;
  image: string;
  verified: boolean;
}

interface ProductCardProps {
  product: Product;
  userType: 'farmer' | 'customer';
  onViewDetails: () => void;
}

const imageMap: Record<string, string> = {
  tomatoes: 'https://images.unsplash.com/photo-1683008952375-410ae668e6b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMHRvbWF0b2VzJTIwZmFybXxlbnwxfHx8fDE3NjQ4NDM5ODd8MA&ixlib=rb-4.1.0&q=80&w=1080',
  corn: 'https://images.unsplash.com/photo-1700241739138-4ec27c548035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3JuJTIwaGFydmVzdHxlbnwxfHx8fDE3NjQ4NDM5ODR8MA&ixlib=rb-4.1.0&q=80&w=1080',
  eggplant: 'https://images.unsplash.com/photo-1624895696546-63314ff8a15b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlZ2dwbGFudCUyMHZlZ2V0YWJsZXxlbnwxfHx8fDE3NjQ4MDIzNTZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
  onions: 'https://images.unsplash.com/photo-1570980457205-f54f8167650b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbmlvbnMlMjBoYXJ2ZXN0fGVufDF8fHx8MTc2NDg0Mzk4NXww&ixlib=rb-4.1.0&q=80&w=1080',
  peppers: 'https://images.unsplash.com/photo-1567539549213-cc1697632146?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlsaSUyMHBlcHBlcnN8ZW58MXx8fHwxNzY0ODI1MzE2fDA&ixlib=rb-4.1.0&q=80&w=1080',
  cassava: 'https://images.unsplash.com/photo-1757283961570-682154747d9c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXNzYXZhJTIwcm9vdHxlbnwxfHx8fDE3NjQ4NDM5ODh8MA&ixlib=rb-4.1.0&q=80&w=1080',
};

export function ProductCard({ product, userType, onViewDetails }: ProductCardProps) {
  const qualityColors = {
    'Premium': 'bg-purple-100 text-purple-700',
    'Grade A': 'bg-green-100 text-green-700',
    'Grade B': 'bg-blue-100 text-blue-700'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={imageMap[product.image]}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        {product.verified && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full flex items-center gap-1">
            <Award className="w-4 h-4" />
            <span>Verified</span>
          </div>
        )}
        <div className={`absolute top-3 left-3 ${qualityColors[product.quality]} px-3 py-1 rounded-full`}>
          {product.quality}
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-gray-900 mb-1">{product.name}</h3>
            <p className="text-gray-600">{product.farmer}</p>
          </div>
          <div className="text-right">
            <p className="text-green-600">GHS {product.pricePerUnit}</p>
            <p className="text-gray-500">per {product.unit}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{product.location}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Harvested: {new Date(product.harvestDate).toLocaleDateString()}</span>
          </div>
          <div className="text-gray-900">
            Available: {product.quantity} {product.unit}
          </div>
        </div>

        <button
          onClick={onViewDetails}
          className={`w-full py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            userType === 'farmer'
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {userType === 'farmer' ? (
            <>
              <Edit className="w-5 h-5" />
              Manage
            </>
          ) : (
            <>
              <Eye className="w-5 h-5" />
              View Details
            </>
          )}
        </button>
      </div>
    </div>
  );
}
