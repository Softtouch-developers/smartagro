import { X, MapPin, Calendar, Award, User, Phone, ShoppingCart, Edit, Trash2 } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState } from 'react';

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
  availableUntil: string;
  image: string;
  verified: boolean;
  description: string;
}

interface ProductDetailModalProps {
  product: Product;
  userType: 'farmer' | 'customer';
  onClose: () => void;
}

const imageMap: Record<string, string> = {
  tomatoes: 'https://images.unsplash.com/photo-1683008952375-410ae668e6b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMHRvbWF0b2VzJTIwZmFybXxlbnwxfHx8fDE3NjQ4NDM5ODd8MA&ixlib=rb-4.1.0&q=80&w=1080',
  corn: 'https://images.unsplash.com/photo-1700241739138-4ec27c548035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3JuJTIwaGFydmVzdHxlbnwxfHx8fDE3NjQ4NDM5ODR8MA&ixlib=rb-4.1.0&q=80&w=1080',
  eggplant: 'https://images.unsplash.com/photo-1624895696546-63314ff8a15b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlZ2dwbGFudCUyMHZlZ2V0YWJsZXxlbnwxfHx8fDE3NjQ4MDIzNTZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
  onions: 'https://images.unsplash.com/photo-1570980457205-f54f8167650b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbmlvbnMlMjBoYXJ2ZXN0fGVufDF8fHx8MTc2NDg0Mzk4NXww&ixlib=rb-4.1.0&q=80&w=1080',
  peppers: 'https://images.unsplash.com/photo-1567539549213-cc1697632146?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlsaSUyMHBlcHBlcnN8ZW58MXx8fHwxNzY0ODI1MzE2fDA&ixlib=rb-4.1.0&q=80&w=1080',
  cassava: 'https://images.unsplash.com/photo-1757283961570-682154747d9c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXNzYXZhJTIwcm9vdHxlbnwxfHx8fDE3NjQ4NDM5ODh8MA&ixlib=rb-4.1.0&q=80&w=1080',
};

export function ProductDetailModal({ product, userType, onClose }: ProductDetailModalProps) {
  const [orderQuantity, setOrderQuantity] = useState(100);
  const totalPrice = (orderQuantity * product.pricePerUnit).toFixed(2);

  const handleOrder = () => {
    alert(`Order placed for ${orderQuantity}${product.unit} of ${product.name}. Total: GHS ${totalPrice}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-gray-900">{product.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Image Section */}
            <div>
              <div className="relative rounded-xl overflow-hidden bg-gray-100 h-80">
                <ImageWithFallback
                  src={imageMap[product.image]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {product.verified && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    <span>Verified</span>
                  </div>
                )}
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-4 py-2 rounded-full ${
                    product.quality === 'Premium' ? 'bg-purple-100 text-purple-700' :
                    product.quality === 'Grade A' ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {product.quality}
                  </span>
                  <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full capitalize">
                    {product.category}
                  </span>
                </div>
                <p className="text-gray-700">{product.description}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-700">
                  <User className="w-5 h-5 text-gray-500" />
                  <span>Farmer: {product.farmer}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <span>{product.location}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <span>Harvested: {new Date(product.harvestDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <span>Available until: {new Date(product.availableUntil).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Price per {product.unit}</span>
                  <span className="text-green-600">GHS {product.pricePerUnit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Available Quantity</span>
                  <span className="text-gray-900">{product.quantity} {product.unit}</span>
                </div>
              </div>

              {userType === 'customer' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-700 mb-2 block">
                      Order Quantity ({product.unit})
                    </label>
                    <input
                      type="number"
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      max={parseInt(product.quantity)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Total Price</span>
                      <span className="text-emerald-600">GHS {totalPrice}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleOrder}
                    className="w-full py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Place Order (Escrow Protected)
                  </button>

                  <p className="text-gray-600 text-center">
                    Your payment will be held securely until you confirm delivery
                  </p>
                </div>
              )}

              {userType === 'farmer' && (
                <div className="space-y-3">
                  <button className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                    <Edit className="w-5 h-5" />
                    Edit Listing
                  </button>
                  <button className="w-full py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Delete Listing
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
