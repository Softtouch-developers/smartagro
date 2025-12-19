import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Package,
  ArrowRight,
  Home,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/common';
import { paymentApi } from '@/services/api';
import { formatCurrency } from '@/utils/formatters';

type PaymentStatus = 'verifying' | 'success' | 'failed' | 'pending';

const PaymentCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const reference = searchParams.get('reference');
  const trxref = searchParams.get('trxref');
  const paymentReference = reference || trxref;

  const [status, setStatus] = useState<PaymentStatus>('verifying');

  // Verify payment
  const { data: verification, error, isLoading } = useQuery({
    queryKey: ['verify-payment', paymentReference],
    queryFn: () => paymentApi.verifyPayment(paymentReference!),
    enabled: !!paymentReference,
    retry: 2,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!paymentReference) {
      setStatus('failed');
      return;
    }

    if (error) {
      setStatus('failed');
      return;
    }

    if (verification) {
      if (verification.success && verification.status === 'success') {
        setStatus('success');
      } else if (verification.status === 'pending') {
        setStatus('pending');
      } else {
        setStatus('failed');
      }
    }
  }, [verification, error, paymentReference]);

  if (isLoading || status === 'verifying') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Verifying Payment
        </h1>
        <p className="text-gray-500 text-center">
          Please wait while we confirm your payment...
        </p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-500 text-center max-w-sm mb-2">
          Your payment has been received and is being held securely in escrow.
        </p>

        {verification?.escrow && (
          <div className="bg-gray-50 rounded-xl p-4 w-full max-w-sm mt-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Amount Paid</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(verification.escrow.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Reference</span>
              <span className="text-sm font-mono text-gray-600">
                {verification.escrow.payment_reference?.slice(0, 12)}...
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span className="text-sm font-medium text-green-600">
                In Escrow
              </span>
            </div>
          </div>
        )}

        <div className="w-full max-w-sm space-y-3">
          <Button
            fullWidth
            onClick={() => navigate('/orders')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            View My Orders
          </Button>
          <Button
            fullWidth
            variant="outline"
            onClick={() => navigate('/')}
            leftIcon={<Home className="w-4 h-4" />}
          >
            Continue Shopping
          </Button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-xl max-w-sm">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">What's Next?</p>
              <p className="text-sm text-blue-700 mt-1">
                The seller has been notified. Once your order is delivered and you
                confirm receipt, the payment will be released to the seller.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-6">
          <RefreshCw className="w-10 h-10 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Pending
        </h1>
        <p className="text-gray-500 text-center max-w-sm mb-6">
          Your payment is being processed. This may take a few moments.
          Please don't close this page.
        </p>

        <div className="w-full max-w-sm space-y-3">
          <Button
            fullWidth
            variant="outline"
            onClick={() => window.location.reload()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Check Again
          </Button>
          <Button
            fullWidth
            variant="ghost"
            onClick={() => navigate('/orders')}
          >
            View My Orders
          </Button>
        </div>
      </div>
    );
  }

  // Failed status
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <XCircle className="w-12 h-12 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Payment Failed
      </h1>
      <p className="text-gray-500 text-center max-w-sm mb-6">
        {!paymentReference
          ? 'No payment reference found. The payment may have been cancelled.'
          : 'We couldn\'t verify your payment. This could be due to insufficient funds, cancelled transaction, or a network issue.'}
      </p>

      <div className="w-full max-w-sm space-y-3">
        <Button
          fullWidth
          onClick={() => navigate(-1)}
        >
          Try Again
        </Button>
        <Button
          fullWidth
          variant="outline"
          onClick={() => navigate('/orders')}
        >
          View My Orders
        </Button>
        <Link
          to="/"
          className="block text-center text-sm text-primary hover:underline mt-4"
        >
          Return to Home
        </Link>
      </div>

      <p className="text-xs text-gray-400 text-center mt-8 max-w-sm">
        If money was deducted from your account but the payment failed,
        it will be refunded within 24-48 hours. Contact support if you need help.
      </p>
    </div>
  );
};

export default PaymentCallbackPage;
