import { MapPin, Calendar, Award, Eye, Edit, Trash2 } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import type { Product } from '../lib/types';
import { productService } from '../lib/services/product.service';
import { toast } from 'sonner@2.0.3';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
  userType: 'farmer' | 'customer';
  onViewDetails: () => void;
  onProductUpdated?: () => void;
}

export function ProductCard({ product, userType, onViewDetails, onProductUpdated }: ProductCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const qualityColors: Record<string, string> = {
    'Premium': 'bg-purple-100 text-purple-700',
    'Grade A': 'bg-green-100 text-green-700',
    'Grade B': 'bg-blue-100 text-blue-700',
    'A': 'bg-green-100 text-green-700',
    'B': 'bg-blue-100 text-blue-700',
    'C': 'bg-gray-100 text-gray-700'
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const productName = product.product_name || product.name || 'this product';
    if (!confirm(`Are you sure you want to delete ${productName}?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await productService.deleteProduct(product.id);
      toast.success('Product deleted successfully');
      onProductUpdated?.();
    } catch (error) {
      toast.error('Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  // Use primary_image_url or first image_url, fallback to legacy images field
  const productImage = product.primary_image_url || 
    (product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : null) ||
    (product.images && product.images.length > 0 ? product.images[0] : null) ||
    'https://images.unsplash.com/photo-1683008952375-410ae668e6b9?w=400';

  // Use product_name or fallback to legacy name field
  const productName = product.product_name || product.name || 'Unknown Product';
  
  // Use unit_of_measure or fallback to legacy unit field
  const unit = product.unit_of_measure || product.unit || 'KG';
  
  // Use quantity_available or fallback to legacy quantity_kg
  const quantity = product.quantity_available ?? product.quantity_kg ?? 0;
  
  // Use price_per_unit or fallback to legacy price_per_kg
  const price = product.price_per_unit ?? product.price_per_kg ?? 0;

  const qualityGrade = product.variety || product.quality_grade || 'A';

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={productImage}
          alt={productName}
          className="w-full h-full object-cover"
        />
        {product.seller?.is_verified && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full flex items-center gap-1 text-sm">
            <Award className="w-4 h-4" />
            <span>Verified</span>
          </div>
        )}
        {qualityGrade && (
          <div className={`absolute top-3 left-3 ${qualityColors[qualityGrade] || qualityColors['A']} px-3 py-1 rounded-full text-sm`}>
            {qualityGrade === 'A' ? 'Grade A' : qualityGrade === 'B' ? 'Grade B' : qualityGrade}
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-gray-900 mb-1">{productName}</h3>
            <p className="text-sm text-gray-600">{product.seller?.full_name || 'Unknown Seller'}</p>
          </div>
          <div className="text-right">
            <p className="text-green-600">GHS {price.toFixed(2)}</p>
            <p className="text-sm text-gray-500">per {unit}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{product.district}, {product.region}</span>
          </div>
          {product.harvest_date && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Harvested: {new Date(product.harvest_date).toLocaleDateString()}</span>
            </div>
          )}
          <div className="text-gray-900">
            Available: {quantity} {unit}
          </div>
          {product.status && product.status !== 'AVAILABLE' && product.status !== 'available' && (
            <div className="text-red-600">
              Status: {product.status}
            </div>
          )}
          {product.is_organic && (
            <div className="text-green-600 text-xs">
              🌱 Organic
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onViewDetails}
            className={`flex-1 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
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
          
          {userType === 'farmer' && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-3 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
              title="Delete product"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}