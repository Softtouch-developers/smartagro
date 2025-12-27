import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Upload, X, Leaf } from 'lucide-react';
import {
  Button,
  Input,
  Select,
} from '@/components/common';
import { productsApi } from '@/services/api';
import { useToast } from '@/stores/uiStore';
import { useSyncStore } from '@/stores/syncStore';
import { saveProductOffline } from '@/services/sync';
import { getErrorMessage } from '@/services/api/client';
import { PRODUCT_CATEGORIES, UNITS_OF_MEASURE } from '@/utils/constants';

interface ImagePreview {
  file: File;
  url: string;
}

const AddProductPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const isOnline = useSyncStore((state) => state.isOnline);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    description: '',
    quantity_available: '',
    unit_of_measure: '',
    price_per_unit: '',
    minimum_order_quantity: '1',
    harvest_date: '',
    expected_shelf_life_days: '',
    is_organic: false,
    is_negotiable: false,
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ImagePreview[] = [];
    Array.from(files).forEach((file) => {
      if (images.length + newImages.length < 5) {
        newImages.push({
          file,
          url: URL.createObjectURL(file),
        });
      }
    });

    setImages((prev) => [...prev, ...newImages]);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(images[index].url);
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_name || !formData.category || !formData.quantity_available ||
      !formData.unit_of_measure || !formData.price_per_unit || !formData.description) {
      toast.error('Please fill details for all fields.');
      return;
    }

    if (formData.harvest_date) {
      const harvestDate = new Date(formData.harvest_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (harvestDate > today) {
        toast.error('Harvest date cannot be in the future.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isOnline) {
        // Create product online
        const product = await productsApi.createProduct({
          product_name: formData.product_name,
          category: formData.category,
          description: formData.description || undefined,
          quantity_available: Number(formData.quantity_available),
          unit_of_measure: formData.unit_of_measure,
          price_per_unit: Number(formData.price_per_unit),
          minimum_order_quantity: Number(formData.minimum_order_quantity) || 1,
          harvest_date: formData.harvest_date || undefined,
          expected_shelf_life_days: formData.expected_shelf_life_days
            ? Number(formData.expected_shelf_life_days)
            : undefined,
          is_organic: formData.is_organic,
          is_negotiable: formData.is_negotiable,
        });

        // Upload images
        for (let i = 0; i < images.length; i++) {
          await productsApi.uploadProductImage(product.id, images[i].file, i === 0);
        }

        toast.success('Product added successfully!');
        navigate('/farmer/products');
      } else {
        // Save offline
        const imageBlobs = await Promise.all(
          images.map(async (img) => {
            const response = await fetch(img.url);
            return response.blob();
          })
        );

        await saveProductOffline({
          localId: `draft-${Date.now()}`,
          product_name: formData.product_name,
          category: formData.category,
          description: formData.description || undefined,
          quantity_available: Number(formData.quantity_available),
          unit_of_measure: formData.unit_of_measure,
          price_per_unit: Number(formData.price_per_unit),
          minimum_order_quantity: Number(formData.minimum_order_quantity) || 1,
          harvest_date: formData.harvest_date || undefined,
          expected_shelf_life_days: formData.expected_shelf_life_days
            ? Number(formData.expected_shelf_life_days)
            : undefined,
          is_organic: formData.is_organic,
          is_negotiable: formData.is_negotiable,
          images: imageBlobs,
        });

        toast.success('Product saved! Will upload when online.');
        navigate('/farmer/products');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Add Product</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-4">
        {/* Images */}
        <section className="bg-white rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-4">Product Images</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((img, index) => (
              <div
                key={index}
                className="relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden"
              >
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded">
                    Main
                  </span>
                )}
              </div>
            ))}

            {images.length < 5 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors"
                >
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-xs">Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors"
                >
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-xs">Upload</span>
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
          />
          <p className="text-xs text-gray-500 mt-2">
            Add up to 5 images. First image will be the main photo.
          </p>
        </section>

        {/* Basic Info */}
        <section className="bg-white rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <Input
              label="Product Name"
              placeholder="e.g., Fresh Tomatoes"
              value={formData.product_name}
              onChange={(e) => handleInputChange('product_name', e.target.value)}
              required
            />
            <Select
              label="Category"
              placeholder="Select a category"
              value={formData.category}
              onChange={(value) => handleInputChange('category', value)}
              options={PRODUCT_CATEGORIES.map((c) => ({
                value: c.value,
                label: `${c.emoji} ${c.label}`,
              }))}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                placeholder="Describe your product..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none h-24"
              />
            </div>
          </div>
        </section>

        {/* Pricing & Quantity */}
        <section className="bg-white rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-4">Pricing & Quantity</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Price"
                type="number"
                placeholder="0.00"
                value={formData.price_per_unit}
                onChange={(e) => handleInputChange('price_per_unit', e.target.value)}
                required
              />
              <Select
                label="Unit"
                placeholder="Select unit"
                value={formData.unit_of_measure}
                onChange={(value) => handleInputChange('unit_of_measure', value)}
                options={UNITS_OF_MEASURE.map((u) => ({
                  value: u.value,
                  label: u.label,
                }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Quantity Available"
                type="number"
                placeholder="0"
                value={formData.quantity_available}
                onChange={(e) => handleInputChange('quantity_available', e.target.value)}
                required
              />
              <Input
                label="Min. Order Quantity"
                type="number"
                placeholder="1"
                value={formData.minimum_order_quantity}
                onChange={(e) => handleInputChange('minimum_order_quantity', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Additional Info */}
        <section className="bg-white rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-4">Additional Details</h2>
          <div className="space-y-4">
            <Input
              label="Harvest Date (Optional)"
              type="date"
              value={formData.harvest_date}
              onChange={(e) => handleInputChange('harvest_date', e.target.value)}
            />
            <Input
              label="Expected Shelf Life (Days)"
              type="number"
              placeholder="e.g., 7"
              value={formData.expected_shelf_life_days}
              onChange={(e) => handleInputChange('expected_shelf_life_days', e.target.value)}
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_organic}
                  onChange={(e) => handleInputChange('is_organic', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="flex items-center gap-1">
                  <Leaf className="w-4 h-4 text-green-600" />
                  Organic
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_negotiable}
                  onChange={(e) => handleInputChange('is_negotiable', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>Price Negotiable</span>
              </label>
            </div>
          </div>
        </section>
      </form>

      {/* Submit Button */}
      <div className="bg-white border-t border-gray-200 mt-auto z-20">
        <div className="max-w-lg mx-auto px-4 py-4">
          <Button
            fullWidth
            size="lg"
            isLoading={isLoading}
            onClick={handleSubmit}
          >
            {isOnline ? 'Add Product' : 'Save Offline'}
          </Button>
          {!isOnline && (
            <p className="text-xs text-center text-amber-600 mt-2">
              You're offline. Product will be uploaded when back online.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;
