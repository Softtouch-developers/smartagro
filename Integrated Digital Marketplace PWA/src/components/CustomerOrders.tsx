import { Package, Clock, CheckCircle, Truck, MapPin, User } from 'lucide-react';

interface Order {
  id: string;
  productName: string;
  quantity: string;
  totalPrice: number;
  farmer: string;
  farmerPhone: string;
  farmerLocation: string;
  status: 'pending' | 'confirmed' | 'in-transit' | 'delivered';
  orderDate: string;
  estimatedDelivery?: string;
}

const mockOrders: Order[] = [
  {
    id: 'ORD101',
    productName: 'Sweet Corn',
    quantity: '200 kg',
    totalPrice: 640,
    farmer: 'Maame Abena',
    farmerPhone: '+233 24 234 5678',
    farmerLocation: 'Ejura',
    status: 'pending',
    orderDate: '2025-12-04',
    estimatedDelivery: '2025-12-07'
  },
  {
    id: 'ORD102',
    productName: 'Garden Eggs',
    quantity: '100 kg',
    totalPrice: 580,
    farmer: 'Kofi Mensah',
    farmerPhone: '+233 20 345 6789',
    farmerLocation: 'Kumasi',
    status: 'confirmed',
    orderDate: '2025-12-03',
    estimatedDelivery: '2025-12-06'
  },
  {
    id: 'ORD103',
    productName: 'Onions',
    quantity: '300 kg',
    totalPrice: 1050,
    farmer: 'Yaw Boateng',
    farmerPhone: '+233 54 456 7890',
    farmerLocation: 'Wenchi',
    status: 'in-transit',
    orderDate: '2025-12-02',
    estimatedDelivery: '2025-12-05'
  },
  {
    id: 'ORD104',
    productName: 'Fresh Tomatoes',
    quantity: '250 kg',
    totalPrice: 1125,
    farmer: 'Opanyin Kwame',
    farmerPhone: '+233 24 567 8901',
    farmerLocation: 'Techiman',
    status: 'delivered',
    orderDate: '2025-11-30',
    estimatedDelivery: '2025-12-02'
  },
  {
    id: 'ORD105',
    productName: 'Chili Peppers',
    quantity: '50 kg',
    totalPrice: 400,
    farmer: 'Akua Serwaa',
    farmerPhone: '+233 20 678 9012',
    farmerLocation: 'Techiman',
    status: 'in-transit',
    orderDate: '2025-12-01',
    estimatedDelivery: '2025-12-04'
  }
];

export function CustomerOrders() {
  const getStatusConfig = (status: Order['status']) => {
    const configs = {
      pending: {
        color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        icon: Clock,
        label: 'Awaiting Farmer'
      },
      confirmed: {
        color: 'bg-blue-100 text-blue-700 border-blue-300',
        icon: Package,
        label: 'Confirmed'
      },
      'in-transit': {
        color: 'bg-purple-100 text-purple-700 border-purple-300',
        icon: Truck,
        label: 'In Transit'
      },
      delivered: {
        color: 'bg-green-100 text-green-700 border-green-300',
        icon: CheckCircle,
        label: 'Delivered'
      }
    };
    return configs[status];
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-blue-800">
          <strong>Escrow Protection:</strong> Your payment is securely held until you confirm delivery. 
          Only confirm once you've received and inspected your order.
        </p>
      </div>

      {mockOrders.map((order) => {
        const statusConfig = getStatusConfig(order.status);
        const StatusIcon = statusConfig.icon;

        return (
          <div key={order.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-gray-900">{order.productName}</h3>
                  <span className={`px-3 py-1 rounded-full border ${statusConfig.color} flex items-center gap-1`}>
                    <StatusIcon className="w-4 h-4" />
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-gray-600">Order #{order.id}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-gray-900">GHS {order.totalPrice.toFixed(2)}</p>
                <p className="text-gray-600">{order.quantity}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <p className="text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Farmer: {order.farmer}
                </p>
                <p className="text-gray-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {order.farmerLocation}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-gray-600">Ordered: {new Date(order.orderDate).toLocaleDateString()}</p>
                {order.estimatedDelivery && (
                  <p className="text-gray-600">Est. Delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {order.status === 'pending' && (
              <div className="pt-4 border-t">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-yellow-700">Waiting for farmer to confirm your order...</p>
                </div>
              </div>
            )}

            {order.status === 'confirmed' && (
              <div className="pt-4 border-t">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-700">Order confirmed! Farmer is preparing your produce for shipment.</p>
                </div>
              </div>
            )}

            {order.status === 'in-transit' && (
              <div className="pt-4 border-t space-y-3">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-purple-700">Your order is on the way! Payment held securely in escrow.</p>
                </div>
                <button className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                  Confirm Delivery & Release Payment
                </button>
                <button className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
                  Report an Issue
                </button>
              </div>
            )}

            {order.status === 'delivered' && (
              <div className="pt-4 border-t">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <p className="text-green-700">✓ Delivered & Payment Released</p>
                </div>
                <button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Rate this Order
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
