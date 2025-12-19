import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Plus } from 'lucide-react';
import type { Product } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/utils/constants';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  showAddButton?: boolean;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  showAddButton = true,
  className,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/products/${product.id}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(product);
  };

  // Construct image URL
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return '/placeholder-product.jpg';
    if (path.startsWith('http')) return path;

    // If path starts with uploads/, append to base URL (stripping /api/v1 if present)
    const baseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    let cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // Ensure path starts with uploads/ if it's a local file
    if (!cleanPath.startsWith('uploads/')) {
      cleanPath = `uploads/${cleanPath}`;
    }
    
    return `${baseUrl}/${cleanPath}`;
  };

  const imageUrl = getImageUrl(product.primary_image_url);

  return (
    <div
      onClick={handleClick}
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer',
        'hover:shadow-md transition-shadow duration-200',
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-100">
        <img
          src={imageUrl}
          alt={product.product_name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {product.is_organic && (
          <span className="absolute top-2 left-2 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
            Organic
          </span>
        )}
        {product.status === 'OUT_OF_STOCK' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-900 text-sm font-medium px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Name & Price */}
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-medium text-gray-900 truncate flex-1 mr-2">
            {product.product_name}
          </h3>
          <span className="font-semibold text-primary whitespace-nowrap">
            {formatCurrency(product.price_per_unit)}
          </span>
        </div>

        {/* Unit */}
        <p className="text-sm text-gray-500 mb-2">
          per {product.unit_of_measure.toLowerCase()}
        </p>

        {/* Location & Rating */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <MapPin className="w-3 h-3 mr-1" />
            <span className="truncate max-w-[100px]">
              {product.region || 'Ghana'}
            </span>
          </div>
          {product.seller?.average_rating && (
            <div className="flex items-center">
              <Star className="w-3 h-3 mr-0.5 text-amber-400 fill-amber-400" />
              <span>{product.seller.average_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Add to Cart button */}
        {showAddButton && product.status === 'AVAILABLE' && (
          <button
            onClick={handleAddToCart}
            className="mt-3 w-full flex items-center justify-center gap-1 bg-primary/10 text-primary font-medium py-2 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
