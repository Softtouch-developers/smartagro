import { useState, useEffect } from 'react';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import productsAPI from '../lib/products';

interface Product {
  id: number | string;
  product_name: string;
  category?: string;
  quantity_available?: number;
  unit_of_measure?: string;
  price_per_unit?: number;
  region?: string;
  district?: string;
  seller?: any;
  primary_image_url?: string;
  description?: string;
}

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await productsAPI.listProducts({
          category: filters?.category !== 'all' ? filters?.category : undefined,
          page: 1,
          page_size: 20,
        });

        // Expect ProductListResponse { products: [], total, page, ... }
        if (res && res.products) setProducts(res.products.map((p: any) => ({
          id: p.id,
          product_name: p.product_name || p.productName || p.name,
          category: p.category,
          quantity_available: p.quantity_available || p.quantity,
          unit_of_measure: p.unit_of_measure || p.unit,
          price_per_unit: p.price_per_unit || p.pricePerUnit,
          region: p.region || p.location,
          seller: p.seller || p.farmer,
          primary_image_url: p.primary_image_url || p.image || null,
          description: p.description
        })));
        else setProducts([]);
      } catch (e) {
        // fallback: empty
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [filters]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && <div>Loading products...</div>}
        {!loading && products.map((product) => (
          <ProductCard
            key={String(product.id)}
            product={{
              id: String(product.id),
              name: product.product_name,
              category: product.category || 'Unknown',
              quantity: String(product.quantity_available || ''),
              unit: product.unit_of_measure || 'kg',
              pricePerUnit: product.price_per_unit || 0,
              location: product.region || '',
              farmer: product.seller?.full_name || (product.seller?.name || ''),
              farmerId: product.seller?.id || '',
              quality: 'Grade A',
              harvestDate: '',
              availableUntil: '',
              image: product.primary_image_url || '',
              verified: true,
              description: product.description || ''
            }}
            userType={userType}
            onViewDetails={() => setSelectedProduct(product)}
          />
        ))}
      </div>

      {!loading && products.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center">
          <p className="text-gray-500">No products found matching your criteria</p>
        </div>
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={{
            id: String(selectedProduct.id),
            name: selectedProduct.product_name,
            category: selectedProduct.category || '',
            quantity: String(selectedProduct.quantity_available || ''),
            unit: selectedProduct.unit_of_measure || 'kg',
            pricePerUnit: selectedProduct.price_per_unit || 0,
            location: selectedProduct.region || '',
            farmer: selectedProduct.seller?.full_name || '',
            quality: 'Grade A',
            harvestDate: '',
            availableUntil: '',
            image: selectedProduct.primary_image_url || '',
            verified: true,
            description: selectedProduct.description || ''
          }}
          userType={userType}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}
