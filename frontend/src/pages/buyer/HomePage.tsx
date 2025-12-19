import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  ProductCard,
  ProductCardSkeleton,
  CategoryPill,
  EmptyState,
} from '@/components/common';
import { productsApi } from '@/services/api';
import { useCartStore } from '@/stores/cartStore';
import { useToast } from '@/stores/uiStore';
import { PRODUCT_CATEGORIES } from '@/utils/constants';
import type { Product } from '@/types';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const addToCart = useCartStore((state) => state.addToCart);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch featured products
  const { data: featuredProducts, isLoading: featuredLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productsApi.getFeaturedProducts(),
  });

  // Fetch products by category or all
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', { category: selectedCategory }],
    queryFn: () =>
      productsApi.getProducts({
        category: selectedCategory || undefined,
        limit: 20,
      }),
  });

  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart({
        product_id: product.id,
        quantity: product.minimum_order_quantity || 1,
      });
      toast.success(`${product.product_name} added to cart`);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Search Bar */}
      <div
        onClick={() => navigate('/search')}
        className="bg-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-200 transition-colors mb-6"
      >
        <Search className="w-5 h-5 text-gray-400" />
        <span className="text-gray-500">Search for products...</span>
      </div>

      {/* Featured Products */}
      {featuredProducts && featuredProducts.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Featured</h2>
            <button
              onClick={() => navigate('/search?featured=true')}
              className="text-sm text-primary font-medium flex items-center"
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {featuredLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-40">
                    <ProductCardSkeleton />
                  </div>
                ))
              : featuredProducts.map((product) => (
                  <div key={product.id} className="flex-shrink-0 w-40">
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                    />
                  </div>
                ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Categories</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <CategoryPill
            category="All"
            isSelected={selectedCategory === null}
            onClick={() => setSelectedCategory(null)}
          />
          {PRODUCT_CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat.value}
              category={cat.label}
              emoji={cat.emoji}
              isSelected={selectedCategory === cat.value}
              onClick={() => setSelectedCategory(cat.value)}
            />
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {selectedCategory
            ? PRODUCT_CATEGORIES.find((c) => c.value === selectedCategory)?.label
            : 'All Products'}
        </h2>

        {productsLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : productsData?.products && productsData.products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {productsData.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        ) : (
          <EmptyState type="products" />
        )}
      </section>
    </div>
  );
};

export default HomePage;
