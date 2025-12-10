import { useState, useEffect } from 'react';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { productService } from '../lib/services/product.service';
import { useAuth } from '../contexts/AuthContext';
import type { Product } from '../lib/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ProductListingProps {
  userType: 'farmer' | 'customer';
  filters?: {
    category: string;
    location: string;
    sortBy: string;
  };
}

export function ProductListing({ userType, filters }: ProductListingProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, [userType, filters, currentPage]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const queryFilters: any = {
        page: currentPage,
        page_size: 20,
      };

      // For farmers, show only their products
      if (userType === 'farmer' && user) {
        queryFilters.seller_id = parseInt(user.id);
      }

      // Apply filters
      if (filters) {
        if (filters.category !== 'all') {
          // Convert frontend category to backend enum format
          queryFilters.category = filters.category.toUpperCase();
        }
        if (filters.location !== 'all') {
          queryFilters.region = filters.location;
        }
        // Backend expects sort_by and sort_order separately
        if (filters.sortBy === 'price-low') {
          queryFilters.sort_by = 'price_per_unit';
          queryFilters.sort_order = 'asc';
        } else if (filters.sortBy === 'price-high') {
          queryFilters.sort_by = 'price_per_unit';
          queryFilters.sort_order = 'desc';
        } else {
          queryFilters.sort_by = 'created_at';
          queryFilters.sort_order = 'desc';
        }
      }

      const response = await productService.getProducts(queryFilters);
      setProducts(response.items);
      setTotalPages(response.pages);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            userType={userType}
            onViewDetails={() => setSelectedProduct(product)}
            onProductUpdated={fetchProducts}
          />
        ))}
      </div>

      {products.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center">
          <p className="text-gray-500">No products found matching your criteria</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white rounded-lg border disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white rounded-lg border disabled:opacity-50"
          >
            Next
          </button>
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