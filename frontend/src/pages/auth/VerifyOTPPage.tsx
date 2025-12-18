import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/common';
import { authApi } from '@/services/api';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';

const VerifyOTPPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const { userId, phone } = (location.state as { userId: number; phone: string }) || {};

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!userId) {
      navigate('/signup');
    }
  }, [userId, navigate]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = [...otp];
      digits.split('').forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value.replace(/\D/g, '');
      setOtp(newOtp);

      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete verification code');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.verifyOTP({
        user_id: userId,
        otp_code: otpCode,
        otp_type: 'PHONE_VERIFICATION',
      });
      toast.success('Phone number verified successfully!');
      navigate('/login');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authApi.resendOTP(userId, 'PHONE_VERIFICATION');
      toast.success('Verification code sent!');
      setResendCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const maskedPhone = phone
    ? `${phone.slice(0, 3)}****${phone.slice(-3)}`
    : '';

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      <button
        onClick={() => navigate('/signup')}
        className="flex items-center text-gray-600 mb-8"
      >
        <ArrowLeft className="w-5 h-5 mr-1" />
        Back
      </button>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Verify Your Phone
        </h2>
        <p className="text-gray-600">
          We sent a verification code to{' '}
          <span className="font-medium">{maskedPhone}</span>
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center gap-2 mb-8">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-14 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
          />
        ))}
      </div>

      <Button
        onClick={handleVerify}
        fullWidth
        size="lg"
        isLoading={isLoading}
        disabled={otp.join('').length !== 6}
      >
        Verify
      </Button>

      {/* Resend */}
      <div className="text-center mt-6">
        {resendCountdown > 0 ? (
          <p className="text-gray-500">
            Resend code in{' '}
            <span className="font-medium text-gray-700">{resendCountdown}s</span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            className="text-primary font-medium hover:underline"
          >
            Resend verification code
          </button>
        )}
      </div>
    </div>
  );
};

export default VerifyOTPPage;
