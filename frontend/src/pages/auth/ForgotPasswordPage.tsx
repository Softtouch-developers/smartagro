import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Button, Input } from '@/components/common';
import { authApi } from '@/services/api';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';

type Step = 'request' | 'verify' | 'reset';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState<Step>('request');
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (method === 'email') {
        await authApi.requestPasswordReset({ email });
      } else {
        await authApi.requestPasswordReset({ phone_number: phone });
      }
      toast.success('Reset code sent! Check your ' + (method === 'email' ? 'email' : 'phone'));
      setStep('verify');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let response;
      if (method === 'email') {
        response = await authApi.verifyResetOtp({ email, otp_code: otp });
      } else {
        response = await authApi.verifyResetOtp({ phone_number: phone, otp_code: otp });
      }
      setResetToken(response.reset_token);
      setStep('reset');
      toast.success('Code verified successfully');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword(resetToken, newPassword);
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      {/* Back Button */}
      <button
        onClick={() => step === 'request' ? navigate('/login') : setStep('request')}
        className="flex items-center text-gray-600 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-1" />
        Back
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {step === 'request' && 'Forgot Password?'}
          {step === 'verify' && 'Enter Reset Code'}
          {step === 'reset' && 'Create New Password'}
        </h1>
        <p className="text-gray-600">
          {step === 'request' && "No worries, we'll send you reset instructions."}
          {step === 'verify' && `Enter the 6-digit code sent to your ${method}`}
          {step === 'reset' && 'Your new password must be different from previously used passwords.'}
        </p>
      </div>

      {/* Request Reset Form */}
      {step === 'request' && (
        <>
          {/* Method Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => setMethod('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${method === 'email'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
                }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              type="button"
              onClick={() => setMethod('phone')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${method === 'phone'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
                }`}
            >
              <Phone className="w-4 h-4" />
              Phone
            </button>
          </div>

          <form onSubmit={handleRequestReset} className="space-y-4">
            {method === 'email' ? (
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-5 h-5" />}
                required
              />
            ) : (
              <Input
                label="Phone Number"
                type="tel"
                placeholder="024 XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="w-5 h-5" />}
                required
              />
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
              className="mt-6"
            >
              Send Reset Code
            </Button>
          </form>
        </>
      )}

      {/* Verify OTP Form */}
      {step === 'verify' && (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <Input
            label="Reset Code"
            type="text"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="text-center text-2xl tracking-widest"
            required
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={otp.length !== 6}
            className="mt-6"
          >
            Verify Code
          </Button>

          <button
            type="button"
            onClick={handleRequestReset}
            className="w-full text-center text-sm text-primary hover:underline"
          >
            Didn't receive code? Send again
          </button>
        </form>
      )}

      {/* Reset Password Form */}
      {step === 'reset' && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            }
            required
          />

          <Input
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <p className="text-sm text-gray-500">
            Password must be at least 8 characters
          </p>

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLoading}
            className="mt-6"
          >
            Reset Password
          </Button>
        </form>
      )}

      {/* Back to Login */}
      <p className="text-center text-gray-600 mt-8">
        Remember your password?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default ForgotPasswordPage;
