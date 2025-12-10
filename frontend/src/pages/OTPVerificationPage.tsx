import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../lib/services/auth.service';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '../components/ui/input-otp';
import { Sprout, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface OTPVerificationPageProps {
  phoneNumber: string;
  onNavigateToLogin: () => void;
}

export function OTPVerificationPage({
  phoneNumber,
  onNavigateToLogin,
}: OTPVerificationPageProps) {
  const { verifyOTP } = useAuth();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);

    try {
      await verifyOTP({
        phone_number: phoneNumber,
        otp,
      });
      toast.success('Phone number verified successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);

    try {
      await authService.resendOTP(phoneNumber);
      toast.success('A new verification code has been sent');
      setOtp('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <Sprout className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-green-900 mb-2">Verify Your Phone</h1>
          <p className="text-gray-600">
            We sent a 6-digit code to <strong>{phoneNumber}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => setOtp(value)}
              disabled={isLoading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={isLoading || otp.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify & Continue'
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center">
          <p className="text-gray-600 text-sm">Didn&apos;t receive the code?</p>
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={isResending}
            className="text-green-600 hover:text-green-700 text-sm"
          >
            {isResending ? 'Sending...' : 'Resend Code'}
          </button>

          <div className="pt-4">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="text-gray-600 hover:text-gray-700 text-sm"
            >
              Back to login
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
