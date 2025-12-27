// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'smartagro_access_token',
  REFRESH_TOKEN: 'smartagro_refresh_token',
  USER: 'smartagro_user',
} as const;

// Ghana Regions
export const GHANA_REGIONS = [
  'Ahafo',
  'Ashanti',
  'Bono',
  'Bono East',
  'Central',
  'Eastern',
  'Greater Accra',
  'North East',
  'Northern',
  'Oti',
  'Savannah',
  'Upper East',
  'Upper West',
  'Volta',
  'Western',
  'Western North',
] as const;

export const REGIONS = GHANA_REGIONS;

// Districts by Region
export const DISTRICTS: Record<string, string[]> = {
  'Ahafo': ['Asunafo North', 'Asunafo South', 'Asutifi North', 'Asutifi South', 'Tano North', 'Tano South'],
  'Ashanti': ['Kumasi Metro', 'Asokwa', 'Bantama', 'Kwadaso', 'Manhyia', 'Oforikrom', 'Subin', 'Suame', 'Tafo', 'Asante Akim Central', 'Asante Akim North', 'Asante Akim South', 'Obuasi', 'Ejisu'],
  'Bono': ['Sunyani', 'Sunyani West', 'Berekum East', 'Berekum West', 'Dormaa Central', 'Dormaa East', 'Dormaa West'],
  'Bono East': ['Techiman', 'Techiman North', 'Atebubu-Amantin', 'Kintampo North', 'Kintampo South', 'Nkoranza North', 'Nkoranza South'],
  'Central': ['Cape Coast', 'Effutu', 'Awutu Senya East', 'Komenda-Edina-Eguafo-Abirem', 'Mfantseman', 'Agona West', 'Assin North', 'Assin Central'],
  'Eastern': ['New Juaben South', 'New Juaben North', 'Akuapem North', 'Akuapem South', 'Nsawam Adoagyiri', 'Suhum', 'West Akim', 'East Akim'],
  'Greater Accra': ['Accra Metro', 'Tema West', 'Tema Metro', 'Ashaiman', 'Adenta', 'Ga East', 'Ga West', 'Ga South', 'Ga Central', 'La Dade Kotopon', 'Ledzokuku', 'Krowor'],
  'North East': ['East Mamprusi', 'West Mamprusi', 'Bunkpurugu-Nankpanduri', 'Yunyoo-Nasuan', 'Chereponi', 'Mamprugu Moagduri'],
  'Northern': ['Tamale', 'Sagnarigu', 'Savelugu', 'Nanton', 'Kpandai', 'Nanumba North', 'Nanumba South', 'Yendi', 'Saboba'],
  'Oti': ['Krachi East', 'Krachi West', 'Krachi Nchumuru', 'Biakoye', 'Jasikan', 'Kadjebi', 'Nkwanta North', 'Nkwanta South'],
  'Savannah': ['West Gonja', 'East Gonja', 'Central Gonja', 'North Gonja', 'North East Gonja', 'Sawla-Tuna-Kalba', 'Bole'],
  'Upper East': ['Bolgatanga', 'Bolgatanga East', 'Bawku', 'Bawku West', 'Binduri', 'Builsa North', 'Builsa South', 'Kassena Nankana', 'Kassena Nankana West'],
  'Upper West': ['Wa', 'Wa East', 'Wa West', 'Jirapa', 'Lambussie', 'Lawra', 'Nandom', 'Sissala East', 'Sissala West', 'Daffiama Bussie Issa'],
  'Volta': ['Ho', 'Ho West', 'Hohoe', 'Keta', 'Ketu North', 'Ketu South', 'Kpando', 'North Dayi', 'South Dayi', 'Afadzato South', 'Agotime Ziope', 'Akatsi North', 'Akatsi South'],
  'Western': ['Sekondi-Takoradi', 'Effia-Kwesimintsim', 'Ahanta West', 'Nzema East', 'Jomoro', 'Ellembelle', 'Tarkwa-Nsuaem', 'Prestea-Huni Valley'],
  'Western North': ['Sefwi Wiawso', 'Bibiani-Anhwiaso-Bekwai', 'Aowin', 'Suaman', 'Bia East', 'Bia West', 'Juaboso', 'Bodi', 'Akontombra'],
};

// Product Categories with icons
export const PRODUCT_CATEGORIES = [
  { value: 'VEGETABLES', label: 'Vegetables', emoji: '🥬' },
  { value: 'FRUITS', label: 'Fruits', emoji: '🍎' },
  { value: 'GRAINS', label: 'Grains', emoji: '🌾' },
  { value: 'TUBERS', label: 'Tubers', emoji: '🥔' },
  { value: 'LEGUMES', label: 'Legumes', emoji: '🫘' },
  { value: 'LIVESTOCK', label: 'Livestock', emoji: '🐔' },
  { value: 'DAIRY', label: 'Dairy', emoji: '🥛' },
  { value: 'OTHER', label: 'Other', emoji: '📦' },
] as const;

// Units of Measure
export const UNITS_OF_MEASURE = [
  { value: 'KG', label: 'Kilogram (kg)' },
  { value: 'GRAM', label: 'Gram (g)' },
  { value: 'PIECE', label: 'Piece' },
  { value: 'BUNCH', label: 'Bunch' },
  { value: 'CRATE', label: 'Crate' },
  { value: 'BAG', label: 'Bag' },
  { value: 'TUBER', label: 'Tuber' },
  { value: 'LITRE', label: 'Litre (L)' },
] as const;

// Order Status Colors
export const ORDER_STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'yellow', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  PAID: { label: 'Paid', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  CONFIRMED: { label: 'Confirmed', color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
  SHIPPED: { label: 'Shipped', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
  DELIVERED: { label: 'Delivered', color: 'green', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  COMPLETED: { label: 'Completed', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  CANCELLED: { label: 'Cancelled', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  REFUNDED: { label: 'Refunded', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
  DISPUTED: { label: 'Disputed', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
} as const;

// Platform Configuration
export const PLATFORM_CONFIG = {
  PLATFORM_FEE_PERCENTAGE: 5,
  BASE_DELIVERY_FEE: 20,
  CART_EXPIRY_HOURS: 8,
  CURRENCY_SYMBOL: '₵',
  CURRENCY_CODE: 'GHS',
} as const;

// Navigation items for different user types
export const NAV_ITEMS = {
  buyer: [
    { path: '/', label: 'Home', icon: 'Home' },
    { path: '/search', label: 'Search', icon: 'Search' },
    { path: '/cart', label: 'Cart', icon: 'ShoppingCart' },
    { path: '/orders', label: 'Orders', icon: 'Package' },
    { path: '/messages', label: 'Messages', icon: 'MessageCircle' },
    { path: '/profile', label: 'Profile', icon: 'User' },
  ],
  farmer: [
    { path: '/farmer', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/farmer/products', label: 'Products', icon: 'Package' },
    { path: '/farmer/products/new', label: 'Add', icon: 'Plus' },
    { path: '/ai-assistant', label: 'AI', icon: 'Bot' },
    { path: '/profile', label: 'Profile', icon: 'User' },
  ],
  admin: [
    { path: '/admin', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/admin/users', label: 'Users', icon: 'Users' },
    { path: '/admin/orders', label: 'Orders', icon: 'ShoppingBag' },
    { path: '/admin/disputes', label: 'Disputes', icon: 'Scale' },
    { path: '/admin/settings', label: 'Settings', icon: 'Settings' },
  ],
} as const;
