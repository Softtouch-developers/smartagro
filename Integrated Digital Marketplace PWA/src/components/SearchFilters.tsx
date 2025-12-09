import { Search, Filter } from 'lucide-react';

interface SearchFiltersProps {
  filters: {
    category: string;
    location: string;
    sortBy: string;
  };
  onFilterChange: (filters: any) => void;
}

export function SearchFilters({ filters, onFilterChange }: SearchFiltersProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-600" />
        <h3 className="text-gray-900">Filter Products</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={filters.category}
          onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Categories</option>
          <option value="vegetables">Vegetables</option>
          <option value="grains">Grains</option>
          <option value="tubers">Tubers</option>
          <option value="fruits">Fruits</option>
        </select>

        <select
          value={filters.location}
          onChange={(e) => onFilterChange({ ...filters, location: e.target.value })}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Locations</option>
          <option value="Techiman">Techiman</option>
          <option value="Ejura">Ejura</option>
          <option value="Kumasi">Kumasi</option>
          <option value="Wenchi">Wenchi</option>
          <option value="Atebubu">Atebubu</option>
        </select>

        <select
          value={filters.sortBy}
          onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value })}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="recent">Most Recent</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>
    </div>
  );
}
