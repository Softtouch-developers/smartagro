import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Package,
    Truck,
    CheckCircle,
    Clock,
    MapPin,
    Phone,
    MessageCircle,
    AlertCircle,
    XCircle,
    User,
} from 'lucide-react';
import {
    Button,
    Badge,
    LoadingPage,
    Modal,
    Input,
} from '@/components/common';
import { ordersApi } from '@/services/api';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getImageUrl } from '@/utils/images';
import type { OrderStatus } from '@/types';

const orderSteps = [
    { key: 'PENDING', label: 'Pending', icon: Clock },
    { key: 'PAID', label: 'New Order', icon: AlertCircle },
    { key: 'CONFIRMED', label: 'Processing', icon: Package },
    { key: 'SHIPPED', label: 'Shipped', icon: Truck },
    { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
];

const FarmerOrderDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const toast = useToast();
    const queryClient = useQueryClient();

    const [showShipModal, setShowShipModal] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [carrier, setCarrier] = useState('');

    // Fetch order
    const { data, isLoading } = useQuery({
        queryKey: ['order', id],
        queryFn: () => ordersApi.getOrder(Number(id)),
        enabled: !!id,
    });

    const order = data?.order;
    const buyerInfo = data?.buyer as { id?: number; full_name?: string; phone_number?: string } | undefined;

    const shipMutation = useMutation({
        mutationFn: (orderId: number) =>
            ordersApi.shipOrder(orderId, {
                carrier: carrier || undefined,
                tracking_number: trackingNumber || undefined,
            }),
        onSuccess: () => {
            toast.success('Order marked as shipped!');
            queryClient.invalidateQueries({ queryKey: ['order', id] });
            setShowShipModal(false);
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
        },
    });

    const processOrderMutation = useMutation({
        mutationFn: (orderId: number) =>
            ordersApi.updateOrderStatus(orderId, 'CONFIRMED'),
        onSuccess: () => {
            toast.success('Order is now being processed!');
            queryClient.invalidateQueries({ queryKey: ['order', id] });
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
        },
    });

    const confirmPickupMutation = useMutation({
        mutationFn: (orderId: number) => ordersApi.confirmPickup(orderId),
        onSuccess: () => {
            toast.success('Pickup confirmed! Waiting for buyer confirmation.');
            queryClient.invalidateQueries({ queryKey: ['order', id] });
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
        },
    });

    const getCurrentStepIndex = () => {
        if (!order) return 0;
        if (order.status === 'CANCELLED') return -1;
        // Map status to step index
        const statusMap: Record<string, number> = {
            'PENDING': 0,
            'PAID': 1,
            'CONFIRMED': 2,
            'SHIPPED': 3,
            'DELIVERED': 4,
            'COMPLETED': 4,
        };
        return statusMap[order.status] || 0;
    };

    if (isLoading) {
        return <LoadingPage message="Loading order..." />;
    }

    if (!order) {
        return (
            <div className="max-w-lg mx-auto px-4 py-8 text-center">
                <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Order Not Found</h2>
                <Button onClick={() => navigate('/farmer/orders')}>Back to Orders</Button>
            </div>
        );
    }

    const currentStep = getCurrentStepIndex();
    const isPaid = order.status === 'PAID';
    const isProcessing = order.status === 'CONFIRMED';
    const isShipped = order.status === 'SHIPPED';
    const isPickup = order.delivery_method === 'PICKUP';
    const isReadyForPickup = isShipped && isPickup;
    const canConfirmPickup = isReadyForPickup && !order.pickup_confirmed_by_farmer;

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
                    <div>
                        <h1 className="text-lg font-semibold">Order #{order.order_number}</h1>
                        <p className="text-xs text-gray-500">
                            {formatDate(order.created_at)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-4">
                {/* Order Status */}
                {order.status === 'CANCELLED' ? (
                    <div className="bg-red-50 rounded-xl p-4 mb-4 flex items-center gap-3">
                        <XCircle className="w-6 h-6 text-red-500" />
                        <div>
                            <p className="font-medium text-red-900">Order Cancelled</p>
                            <p className="text-sm text-red-700">
                                {order.cancelled_reason || 'This order has been cancelled'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl p-4 mb-4">
                        <h2 className="font-semibold text-gray-900 mb-4">Order Status</h2>
                        <div className="relative">
                            {/* Progress Line */}
                            <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200">
                                <div
                                    className="h-full bg-primary transition-all"
                                    style={{
                                        width: `${(currentStep / (orderSteps.length - 1)) * 100}%`,
                                    }}
                                />
                            </div>

                            {/* Steps */}
                            <div className="relative flex justify-between">
                                {orderSteps.map((step, idx) => {
                                    const isCompleted = idx <= currentStep;
                                    const isCurrent = idx === currentStep;
                                    return (
                                        <div key={step.key} className="flex flex-col items-center">
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${isCompleted
                                                    ? 'bg-primary text-white'
                                                    : 'bg-gray-200 text-gray-400'
                                                    } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                                            >
                                                <step.icon className="w-5 h-5" />
                                            </div>
                                            <p
                                                className={`text-xs mt-2 text-center ${isCompleted ? 'text-primary font-medium' : 'text-gray-400'
                                                    }`}
                                            >
                                                {step.label}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Product Info */}
                <div className="bg-white rounded-xl p-4 mb-4">
                    <h2 className="font-semibold text-gray-900 mb-3">Items</h2>
                    {order.items && order.items.length > 0 ? (
                        <div className="space-y-4">
                            {order.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex gap-4">
                                    <img
                                        src={getImageUrl(item.product?.primary_image_url)}
                                        alt={item.product_name_snapshot}
                                        className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-900">{item.product_name_snapshot}</h3>
                                        <p className="text-sm text-gray-500">
                                            Qty: {item.quantity}
                                        </p>
                                        <p className="text-primary font-semibold mt-1">
                                            {formatCurrency(item.subtotal)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex gap-4">
                            <img
                                src={getImageUrl(order.product_image || '')}
                                alt={order.product_name}
                                className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900">{order.product_name}</h3>
                                <p className="text-sm text-gray-500">
                                    Qty: {order.quantity} {order.unit_of_measure?.toLowerCase() || 'units'}
                                </p>
                                <p className="text-primary font-semibold mt-1">
                                    {formatCurrency(order.total_amount)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Buyer Info */}
                <div className="bg-white rounded-xl p-4 mb-4">
                    <h2 className="font-semibold text-gray-900 mb-3">Customer</h2>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{buyerInfo?.full_name || order.buyer_name || 'Guest User'}</p>
                                {(buyerInfo?.phone_number || order.buyer_phone) && (
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {buyerInfo?.phone_number || order.buyer_phone}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/messages?buyer=${order.buyer_id}`)}
                            leftIcon={<MessageCircle className="w-4 h-4" />}
                        >
                            Chat
                        </Button>
                    </div>
                </div>

                {/* Delivery Address */}
                <div className="bg-white rounded-xl p-4 mb-4">
                    <h2 className="font-semibold text-gray-900 mb-3">Delivery Details</h2>
                    <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-gray-900">{order.delivery_address}</p>
                            {order.delivery_notes && (
                                <p className="text-sm text-gray-500 mt-1">
                                    Note: {order.delivery_notes}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-white rounded-xl p-4 mb-4">
                    <h2 className="font-semibold text-gray-900 mb-3">Payment Summary</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="text-gray-900">
                                {formatCurrency(order.total_amount * 0.95)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Platform Fee</span>
                            <span className="text-gray-900">
                                {formatCurrency(order.total_amount * 0.05)}
                            </span>
                        </div>
                        <div className="flex justify-between font-semibold pt-2 border-t border-gray-100">
                            <span className="text-gray-900">Total</span>
                            <span className="text-primary">{formatCurrency(order.total_amount)}</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <Badge
                            variant={
                                order.payment_status === 'PAID'
                                    ? 'success'
                                    : order.payment_status === 'PENDING'
                                        ? 'warning'
                                        : 'default'
                            }
                        >
                            {order.payment_status || 'PAID'}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            {(isPaid || isProcessing || canConfirmPickup) && (
                <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
                    <div className="max-w-lg mx-auto flex gap-3">
                        {isPaid && (
                            <Button
                                variant="outline"
                                fullWidth
                                onClick={() => processOrderMutation.mutate(order.id)}
                                isLoading={processOrderMutation.isPending}
                            >
                                Start Processing
                            </Button>
                        )}
                        {isProcessing && !isPickup && (
                            <Button
                                variant="primary"
                                fullWidth
                                leftIcon={<Truck className="w-4 h-4" />}
                                onClick={() => setShowShipModal(true)}
                            >
                                Mark as Shipped
                            </Button>
                        )}
                        {isProcessing && isPickup && (
                            <Button
                                variant="primary"
                                fullWidth
                                leftIcon={<Package className="w-4 h-4" />}
                                onClick={() => shipMutation.mutate(order.id)}
                                isLoading={shipMutation.isPending}
                            >
                                Ready for Pickup
                            </Button>
                        )}
                        {canConfirmPickup && (
                            <Button
                                variant="primary"
                                fullWidth
                                leftIcon={<CheckCircle className="w-4 h-4" />}
                                onClick={() => confirmPickupMutation.mutate(order.id)}
                                isLoading={confirmPickupMutation.isPending}
                            >
                                Confirm Pickup
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Pickup Status Info */}
            {isReadyForPickup && (
                <div className="fixed bottom-32 left-0 right-0 px-4 z-10">
                    <div className="max-w-lg mx-auto bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                        <p className="text-amber-800">
                            {order.pickup_confirmed_by_farmer && !order.pickup_confirmed_by_buyer && (
                                <>You've confirmed pickup. Waiting for buyer to confirm.</>
                            )}
                            {!order.pickup_confirmed_by_farmer && order.pickup_confirmed_by_buyer && (
                                <>Buyer has confirmed pickup. Please confirm to complete the order.</>
                            )}
                            {!order.pickup_confirmed_by_farmer && !order.pickup_confirmed_by_buyer && (
                                <>Order is ready for pickup. Both you and the buyer need to confirm when pickup happens.</>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* Ship Order Modal */}
            <Modal
                isOpen={showShipModal}
                onClose={() => setShowShipModal(false)}
                title="Ship Order"
            >
                <div className="space-y-4 p-4">
                    <p className="text-sm text-gray-600">
                        Add shipping details for order #{order.order_number}
                    </p>

                    <Input
                        label="Carrier (Optional)"
                        placeholder="e.g., GIG Logistics, DHL"
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                    />

                    <Input
                        label="Tracking Number (Optional)"
                        placeholder="Enter tracking number"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                    />

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            fullWidth
                            onClick={() => setShowShipModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={() => shipMutation.mutate(order.id)}
                            isLoading={shipMutation.isPending}
                        >
                            Confirm Shipment
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default FarmerOrderDetailPage;
