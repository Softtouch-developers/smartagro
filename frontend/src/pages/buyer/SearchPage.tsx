import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  ProductCard,
  ProductCardSkeleton,
  CategoryPill,
  EmptyState,
  Button,
  Input,
  Select,
  Modal,
} from '@/components/common';
import { productsApi } from '@/services/api';
import { useCartStore } from '@/stores/cartStore';
import { useToast } from '@/stores/uiStore';
import { PRODUCT_CATEGORIES, GHANA_REGIONS } from '@/utils/constants';
import type { Product, ProductsQuery } from '@/types';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const addToCart = useCartStore((state) => state.addToCart);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ProductsQuery>({
    category: searchParams.get('category') || undefined,
    region: searchParams.get('region') || undefined,
    min_price: searchParams.get('min_price')
      ? Number(searchParams.get('min_price'))
      : undefined,
    max_price: searchParams.get('max_price')
      ? Number(searchParams.get('max_price'))
      : undefined,
    sort_by: (searchParams.get('sort_by') as ProductsQuery['sort_by']) || 'created_at',
    sort_order: (searchParams.get('sort_order') as ProductsQuery['sort_order']) || 'desc',
  });

  // Build query params
  const queryParams = useMemo(
    () => ({
      search: searchQuery || undefined,
      ...filters,
      limit: 20,
    }),
    [searchQuery, filters]
  );

  // Fetch products
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'search', queryParams],
    queryFn: () => productsApi.getProducts(queryParams),
  });

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (filters.category) params.set('category', filters.category);
    if (filters.region) params.set('region', filters.region);
    if (filters.min_price) params.set('min_price', String(filters.min_price));
    if (filters.max_price) params.set('max_price', String(filters.max_price));
    if (filters.sort_by) params.set('sort_by', filters.sort_by);
    if (filters.sort_order) params.set('sort_order', filters.sort_order);
    setSearchParams(params);
  }, [searchQuery, filters, setSearchParams]);

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

  const handleCategorySelect = (category: string | null) => {
    setFilters((prev) => ({ ...prev, category: category || undefined }));
  };

  const clearFilters = () => {
    setFilters({
      sort_by: 'created_at',
      sort_order: 'desc',
    });
    setSearchQuery('');
  };

  const activeFilterCount = [
    filters.category,
    filters.region,
    filters.min_price,
    filters.max_price,
  ].filter(Boolean).length;

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Search Input */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for products..."
            leftIcon={<Search className="w-5 h-5" />}
            rightIcon={
              searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X className="w-4 h-4" />
                </button>
              )
            }
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(true)}
          className="relative"
        >
          <SlidersHorizontal className="w-5 h-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide mb-4">
        <CategoryPill
          category="All"
          isSelected={!filters.category}
          onClick={() => handleCategorySelect(null)}
        />
        {PRODUCT_CATEGORIES.map((cat) => (
          <CategoryPill
            key={cat.value}
            category={cat.label}
            emoji={cat.emoji}
            isSelected={filters.category === cat.value}
            onClick={() => handleCategorySelect(cat.value)}
          />
        ))}
      </div>

      {/* Results */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {data?.total || 0} results
          {searchQuery && ` for "${searchQuery}"`}
        </p>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : data?.products && data.products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {data.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      ) : (
        <EmptyState type="search" />
      )}

      {/* Filters Modal */}
      <Modal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters"
      >
        <div className="p-4 space-y-4">
          <Select
            label="Region"
            placeholder="All regions"
            value={filters.region || ''}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, region: value || undefined }))
            }
            options={[
              { value: '', label: 'All regions' },
              ...GHANA_REGIONS.map((r) => ({ value: r, label: r })),
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Price"
              type="number"
              placeholder="0"
              value={filters.min_price || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  min_price: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
            <Input
              label="Max Price"
              type="number"
              placeholder="Any"
              value={filters.max_price || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  max_price: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>

          <Select
            label="Sort By"
            value={`${filters.sort_by}-${filters.sort_order}`}
            onChange={(value) => {
              const [sort_by, sort_order] = value.split('-');
              setFilters((prev) => ({
                ...prev,
                sort_by: sort_by as ProductsQuery['sort_by'],
                sort_order: sort_order as ProductsQuery['sort_order'],
              }));
            }}
            options={[
              { value: 'created_at-desc', label: 'Newest first' },
              { value: 'created_at-asc', label: 'Oldest first' },
              { value: 'price-asc', label: 'Price: Low to High' },
              { value: 'price-desc', label: 'Price: High to Low' },
              { value: 'rating-desc', label: 'Highest rated' },
            ]}
          />

          <div className="flex gap-3 pt-4">
            <Button variant="outline" fullWidth onClick={clearFilters}>
              Clear
            </Button>
            <Button fullWidth onClick={() => setShowFilters(false)}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SearchPage;
