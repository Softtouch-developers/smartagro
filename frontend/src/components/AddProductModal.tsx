import { X, Mic, Upload, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { productService } from '../lib/services/product.service';
import { toast } from 'sonner@2.0.3';

interface AddProductModalProps {
  onClose: () => void;
  onProductCreated?: () => void;
}

export function AddProductModal({ onClose, onProductCreated }: AddProductModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    product_name: '',
    category: 'VEGETABLES',
    quantity: '',
    unit_of_measure: 'KG',
    price_per_unit: '',
    harvestDate: new Date().toISOString().split('T')[0],
    expected_shelf_life_days: '',
    description: '',
    region: 'Bono East',
    district: 'Techiman',
    farm_location: '',
    is_organic: false,
    variety: '',
    minimum_order_quantity: ''
  });

  const handleVoiceInput = (field: string) => {
    // In a real implementation, this would use Web Speech API
    // Placeholder for future voice input functionality
    console.log('Voice input for field:', field);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Map form data to backend API structure
      const productData = {
        product_name: formData.product_name,
        description: formData.description || 'No description provided',
        category: formData.category,
        quantity_available: parseFloat(formData.quantity),
        unit_of_measure: formData.unit_of_measure,
        price_per_unit: parseFloat(formData.price_per_unit),
        region: formData.region,
        district: formData.district,
        harvest_date: formData.harvestDate || undefined,
        expected_shelf_life_days: formData.expected_shelf_life_days ? parseInt(formData.expected_shelf_life_days) : undefined,
        farm_location: formData.farm_location || undefined,
        is_organic: formData.is_organic,
        variety: formData.variety || undefined,
        minimum_order_quantity: formData.minimum_order_quantity ? parseFloat(formData.minimum_order_quantity) : undefined,
      };
      
      const product = await productService.create(productData);
      toast.success('Product listing created successfully!');
      if (onProductCreated) {
        onProductCreated();
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create product listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploadingImage(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await productService.uploadImage(file);
        uploadedUrls.push(result.url);
      }
      setUploadedImages([...uploadedImages, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
      // Note: Images are uploaded but not automatically associated with product
      // Product creation doesn't include images field - they need to be handled separately
      // For now, we'll just store the URLs locally for display purposes
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-gray-900">Add New Product</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Voice Helper Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">
              Tap the <Mic className="w-4 h-4 inline" /> microphone icon next to any field to use voice input
            </p>
          </div>

          {/* Product Name */}
          <div>
            <label className="text-gray-700 mb-2 block">Product Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                placeholder="e.g., Fresh Tomatoes"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <button
                type="button"
                onClick={() => handleVoiceInput('name')}
                className="px-4 py-3 rounded-lg transition-colors bg-green-100 text-green-700 hover:bg-green-200"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-gray-700 mb-2 block">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="VEGETABLES">Vegetables</option>
              <option value="FRUITS">Fruits</option>
              <option value="GRAINS">Grains</option>
              <option value="TUBERS">Tubers</option>
              <option value="CEREALS">Cereals</option>
              <option value="LEGUMES">Legumes</option>
              <option value="LIVESTOCK">Livestock</option>
              <option value="DAIRY">Dairy</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Quantity and Unit */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-700 mb-2 block">Quantity</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="500"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => handleVoiceInput('quantity')}
                  className="px-4 py-3 rounded-lg transition-colors bg-green-100 text-green-700 hover:bg-green-200"
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-gray-700 mb-2 block">Unit of Measure</label>
              <select
                value={formData.unit_of_measure}
                onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="KG">Kilograms (KG)</option>
                <option value="GRAMS">Grams</option>
                <option value="BAGS">Bags</option>
                <option value="CRATES">Crates</option>
                <option value="PIECES">Pieces</option>
                <option value="BUNCHES">Bunches</option>
                <option value="LITERS">Liters</option>
              </select>
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="text-gray-700 mb-2 block">Price per {formData.unit_of_measure} (GHS)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={formData.price_per_unit}
                onChange={(e) => setFormData({ ...formData, price_per_unit: e.target.value })}
                placeholder="4.50"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <button
                type="button"
                onClick={() => handleVoiceInput('price')}
                className="px-4 py-3 rounded-lg transition-colors bg-green-100 text-green-700 hover:bg-green-200"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Dates and Location */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-700 mb-2 block">Harvest Date</label>
              <input
                type="date"
                value={formData.harvestDate}
                onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="text-gray-700 mb-2 block">Expected Shelf Life (days)</label>
              <input
                type="number"
                value={formData.expected_shelf_life_days}
                onChange={(e) => setFormData({ ...formData, expected_shelf_life_days: e.target.value })}
                placeholder="7"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Region and District */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-700 mb-2 block">Region</label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="Bono East"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="text-gray-700 mb-2 block">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="Techiman"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
          </div>

          {/* Farm Location and Other Fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-700 mb-2 block">Farm Location (Optional)</label>
              <input
                type="text"
                value={formData.farm_location}
                onChange={(e) => setFormData({ ...formData, farm_location: e.target.value })}
                placeholder="Techiman Valley"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="text-gray-700 mb-2 block">Variety (Optional)</label>
              <input
                type="text"
                value={formData.variety}
                onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                placeholder="Roma Tomatoes"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Minimum Order and Organic */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-700 mb-2 block">Minimum Order Quantity (Optional)</label>
              <input
                type="number"
                step="0.01"
                value={formData.minimum_order_quantity}
                onChange={(e) => setFormData({ ...formData, minimum_order_quantity: e.target.value })}
                placeholder="10"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="text-gray-700 mb-2 block">Organic Product</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={formData.is_organic}
                  onChange={(e) => setFormData({ ...formData, is_organic: e.target.checked })}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-gray-700">Mark as organic</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-gray-700 mb-2 block">Description</label>
            <div className="flex gap-2">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your produce quality, farming methods, etc."
                rows={4}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="button"
                onClick={() => handleVoiceInput('description')}
                className="px-4 py-3 rounded-lg transition-colors self-start bg-green-100 text-green-700 hover:bg-green-200"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="text-gray-700 mb-2 block">Product Photos</label>
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition-colors cursor-pointer block">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-1">Click to upload photos</p>
              <p className="text-gray-400">or drag and drop</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {isUploadingImage && (
              <div className="mt-2 text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading images...
              </div>
            )}
            {uploadedImages.length > 0 && (
              <div className="mt-2">
                <p className="text-gray-500 mb-2">{uploadedImages.length} image(s) uploaded</p>
                <div className="flex gap-2 flex-wrap">
                  {uploadedImages.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Uploaded ${index + 1}`}
                      className="w-16 h-16 object-cover rounded border border-gray-200"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Create Listing'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}