import { Package, Clock, CheckCircle, XCircle, MapPin, Phone } from 'lucide-react';

interface Order {
  id: string;
  productName: string;
  quantity: string;
  totalPrice: number;
  buyer: string;
  buyerPhone: string;
  buyerLocation: string;
  status: 'pending' | 'confirmed' | 'in-transit' | 'delivered' | 'cancelled';
  orderDate: string;
  deliveryDate?: string;
}

const mockOrders: Order[] = [
  {
    id: 'ORD001',
    productName: 'Fresh Tomatoes',
    quantity: '150 kg',
    totalPrice: 675,
    buyer: 'Auntie Esi',
    buyerPhone: '+233 24 123 4567',
    buyerLocation: 'Makola Market, Accra',
    status: 'pending',
    orderDate: '2025-12-04'
  },
  {
    id: 'ORD002',
    productName: 'Cassava',
    quantity: '300 kg',
    totalPrice: 660,
    buyer: 'Kwabena Stores',
    buyerPhone: '+233 20 987 6543',
    buyerLocation: 'Kejetia, Kumasi',
    status: 'confirmed',
    orderDate: '2025-12-03',
    deliveryDate: '2025-12-06'
  },
  {
    id: 'ORD003',
    productName: 'Fresh Tomatoes',
    quantity: '200 kg',
    totalPrice: 900,
    buyer: 'Grace Wholesale',
    buyerPhone: '+233 54 555 1234',
    buyerLocation: 'Tema Station',
    status: 'in-transit',
    orderDate: '2025-12-02',
    deliveryDate: '2025-12-05'
  },
  {
    id: 'ORD004',
    productName: 'Cassava',
    quantity: '500 kg',
    totalPrice: 1100,
    buyer: 'Market Queen Ventures',
    buyerPhone: '+233 24 777 8888',
    buyerLocation: 'Circle, Accra',
    status: 'delivered',
    orderDate: '2025-11-28',
    deliveryDate: '2025-11-30'
  }
];

export function FarmerOrders() {
  const getStatusConfig = (status: Order['status']) => {
    const configs = {
      pending: {
        color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        icon: Clock,
        label: 'Awaiting Confirmation'
      },
      confirmed: {
        color: 'bg-blue-100 text-blue-700 border-blue-300',
        icon: Package,
        label: 'Confirmed'
      },
      'in-transit': {
        color: 'bg-purple-100 text-purple-700 border-purple-300',
        icon: Package,
        label: 'In Transit'
      },
      delivered: {
        color: 'bg-green-100 text-green-700 border-green-300',
        icon: CheckCircle,
        label: 'Delivered'
      },
      cancelled: {
        color: 'bg-red-100 text-red-700 border-red-300',
        icon: XCircle,
        label: 'Cancelled'
      }
    };
    return configs[status];
  };

  return (
    <div className="space-y-4">
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
                <p className="text-gray-700">Buyer: {order.buyer}</p>
                <p className="text-gray-600 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {order.buyerPhone}
                </p>
                <p className="text-gray-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {order.buyerLocation}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-gray-600">Order Date: {new Date(order.orderDate).toLocaleDateString()}</p>
                {order.deliveryDate && (
                  <p className="text-gray-600">Delivery Date: {new Date(order.deliveryDate).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {order.status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t">
                <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Accept Order
                </button>
                <button className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                  Decline
                </button>
              </div>
            )}

            {order.status === 'confirmed' && (
              <div className="pt-4 border-t">
                <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  Mark as Shipped
                </button>
              </div>
            )}

            {order.status === 'in-transit' && (
              <div className="pt-4 border-t">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-purple-700">Funds held in escrow - will be released upon buyer confirmation</p>
                </div>
              </div>
            )}

            {order.status === 'delivered' && (
              <div className="pt-4 border-t">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-700">✓ Payment released - GHS {order.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
