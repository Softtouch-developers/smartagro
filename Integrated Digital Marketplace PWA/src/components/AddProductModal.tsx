import { X, Mic, Upload } from 'lucide-react';
import { useState } from 'react';

interface AddProductModalProps {
  onClose: () => void;
}

export function AddProductModal({ onClose }: AddProductModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'vegetables',
    quantity: '',
    unit: 'kg',
    pricePerUnit: '',
    quality: 'Grade A',
    harvestDate: new Date().toISOString().split('T')[0],
    availableUntil: '',
    description: ''
  });

  const handleVoiceInput = (field: string) => {
    setIsListening(true);
    // In a real implementation, this would use Web Speech API
    setTimeout(() => setIsListening(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Product listing created successfully!');
    onClose();
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Fresh Tomatoes"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <button
                type="button"
                onClick={() => handleVoiceInput('name')}
                className={`px-4 py-3 rounded-lg transition-colors ${
                  isListening ? 'bg-red-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Category and Quality */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-700 mb-2 block">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="vegetables">Vegetables</option>
                <option value="grains">Grains</option>
                <option value="tubers">Tubers</option>
                <option value="fruits">Fruits</option>
              </select>
            </div>

            <div>
              <label className="text-gray-700 mb-2 block">Quality Grade</label>
              <select
                value={formData.quality}
                onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="Premium">Premium</option>
                <option value="Grade A">Grade A</option>
                <option value="Grade B">Grade B</option>
              </select>
            </div>
          </div>

          {/* Quantity and Unit */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-700 mb-2 block">Quantity</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="500"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => handleVoiceInput('quantity')}
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    isListening ? 'bg-red-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-gray-700 mb-2 block">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="bags">Bags</option>
                <option value="crates">Crates</option>
                <option value="pieces">Pieces</option>
              </select>
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="text-gray-700 mb-2 block">Price per {formData.unit} (GHS)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={formData.pricePerUnit}
                onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                placeholder="4.50"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <button
                type="button"
                onClick={() => handleVoiceInput('price')}
                className={`px-4 py-3 rounded-lg transition-colors ${
                  isListening ? 'bg-red-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-700 mb-2 block">Harvest Date</label>
              <input
                type="date"
                value={formData.harvestDate}
                onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="text-gray-700 mb-2 block">Available Until</label>
              <input
                type="date"
                value={formData.availableUntil}
                onChange={(e) => setFormData({ ...formData, availableUntil: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
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
                className={`px-4 py-3 rounded-lg transition-colors self-start ${
                  isListening ? 'bg-red-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="text-gray-700 mb-2 block">Product Photos</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-1">Click to upload photos</p>
              <p className="text-gray-400">or drag and drop</p>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Create Listing
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
