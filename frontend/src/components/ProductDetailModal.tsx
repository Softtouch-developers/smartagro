import { X, MapPin, Calendar, Award, User, Phone, ShoppingCart, Edit, Trash2 } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState } from 'react';
import type { Product } from '../lib/types';

interface ProductDetailModalProps {
  product: Product;
  userType: 'farmer' | 'customer';
  onClose: () => void;
}


export function ProductDetailModal({ product, userType, onClose }: ProductDetailModalProps) {
  const [orderQuantity, setOrderQuantity] = useState(1);
  
  // Map backend fields to display values
  const productName = product.product_name || product.name || 'Unknown Product';
  const unit = product.unit_of_measure || product.unit || 'KG';
  const quantity = product.quantity_available ?? product.quantity_kg ?? 0;
  const price = product.price_per_unit ?? product.price_per_kg ?? 0;
  const productImage = product.primary_image_url || 
    (product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : null) ||
    (product.images && product.images.length > 0 ? product.images[0] : null) ||
    'https://images.unsplash.com/photo-1683008952375-410ae668e6b9?w=400';
  const farmerName = product.seller?.full_name || 'Unknown Seller';
  const isVerified = product.seller?.is_verified || false;
  
  const totalPrice = (orderQuantity * price).toFixed(2);

  const handleOrder = () => {
    alert(`Order placed for ${orderQuantity} ${unit} of ${productName}. Total: GHS ${totalPrice}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-gray-900">{productName}</h2>
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
                  src={productImage}
                  alt={productName}
                  className="w-full h-full object-cover"
                />
                {isVerified && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    <span>Verified</span>
                  </div>
                )}
                {product.is_organic && (
                  <div className="absolute top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-full flex items-center gap-2">
                    <span>🌱 Organic</span>
                  </div>
                )}
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  {product.variety && (
                    <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full">
                      {product.variety}
                    </span>
                  )}
                  <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full capitalize">
                    {product.category}
                  </span>
                </div>
                <p className="text-gray-700">{product.description || 'No description available'}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-700">
                  <User className="w-5 h-5 text-gray-500" />
                  <span>Farmer: {farmerName}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <span>{product.district}, {product.region}</span>
                  {product.farm_location && (
                    <span className="text-gray-500">({product.farm_location})</span>
                  )}
                </div>
                {product.harvest_date && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span>Harvested: {new Date(product.harvest_date).toLocaleDateString()}</span>
                  </div>
                )}
                {product.expected_shelf_life_days && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span>Shelf life: {product.expected_shelf_life_days} days</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Price per {unit}</span>
                  <span className="text-green-600">GHS {price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Available Quantity</span>
                  <span className="text-gray-900">{quantity} {unit}</span>
                </div>
                {product.minimum_order_quantity && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-600">Minimum Order</span>
                    <span className="text-gray-900">{product.minimum_order_quantity} {unit}</span>
                  </div>
                )}
              </div>

              {userType === 'customer' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-700 mb-2 block">
                      Order Quantity ({unit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(Math.max(product.minimum_order_quantity || 1, parseFloat(e.target.value) || product.minimum_order_quantity || 1))}
                      min={product.minimum_order_quantity || 1}
                      max={quantity}
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
