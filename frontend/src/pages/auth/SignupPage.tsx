import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Mail, Eye, EyeOff, User, ArrowLeft, Check, X } from 'lucide-react';
import { Button, Input, Select } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';
import { GHANA_REGIONS } from '@/utils/constants';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const signup = useAuthStore((state) => state.signup);
  const isLoading = useAuthStore((state) => state.isLoading);
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<'FARMER' | 'BUYER' | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    password: '',
    confirm_password: '',
    region: '',
    town_city: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const passwordRequirements = [
    { label: 'At least 8 characters', valid: formData.password.length >= 8 },
    { label: 'At least one uppercase letter', valid: /[A-Z]/.test(formData.password) },
    { label: 'At least one lowercase letter', valid: /[a-z]/.test(formData.password) },
    { label: 'At least one number', valid: /[0-9]/.test(formData.password) },
  ];

  const isPasswordValid = passwordRequirements.every((req) => req.valid);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUserTypeSelect = (type: 'FARMER' | 'BUYER') => {
    setUserType(type);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Please meet all password requirements');
      return;
    }

    if (!userType) {
      toast.error('Please select account type');
      return;
    }

    // For farmers, region is required
    if (userType === 'FARMER' && !formData.region) {
      toast.error('Please select your region');
      return;
    }

    try {
      const { userId } = await signup({
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        email: formData.email || undefined,
        password: formData.password,
        user_type: userType,
        region: formData.region || undefined,
        town_city: formData.town_city || undefined,
      });

      toast.success('Account created! Please verify your phone number.');
      navigate('/verify-otp', { state: { userId, phone: formData.phone_number } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // Step 1: Select user type
  if (step === 1) {
    return (
      <div className="flex-1 flex flex-col px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">SmartAgro</h1>
          <p className="text-gray-600">How would you like to use SmartAgro?</p>
        </div>

        <div className="space-y-4 mt-8">
          <button
            onClick={() => handleUserTypeSelect('FARMER')}
            className="w-full p-6 border-2 border-gray-200 rounded-xl text-left hover:border-primary transition-colors"
          >
            <div className="text-4xl mb-2">🌾</div>
            <h3 className="text-lg font-semibold text-gray-900">I'm a Farmer</h3>
            <p className="text-gray-500 text-sm mt-1">
              Sell your produce directly to buyers across Ghana
            </p>
          </button>

          <button
            onClick={() => handleUserTypeSelect('BUYER')}
            className="w-full p-6 border-2 border-gray-200 rounded-xl text-left hover:border-primary transition-colors"
          >
            <div className="text-4xl mb-2">🛒</div>
            <h3 className="text-lg font-semibold text-gray-900">I'm a Buyer</h3>
            <p className="text-gray-500 text-sm mt-1">
              Buy fresh produce directly from local farmers
            </p>
          </button>
        </div>

        <p className="text-center text-gray-600 mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  // Step 2: Registration form
  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      <button
        onClick={() => setStep(1)}
        className="flex items-center text-gray-600 mb-4"
      >
        <ArrowLeft className="w-5 h-5 mr-1" />
        Back
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
        <p className="text-gray-600">
          {userType === 'FARMER' ? 'Register as a farmer' : 'Register as a buyer'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          placeholder="Enter your full name"
          value={formData.full_name}
          onChange={(e) => handleInputChange('full_name', e.target.value)}
          leftIcon={<User className="w-5 h-5" />}
          required
        />

        <Input
          label="Phone Number"
          type="tel"
          placeholder="024 XXX XXXX"
          value={formData.phone_number}
          onChange={(e) => handleInputChange('phone_number', e.target.value)}
          leftIcon={<Phone className="w-5 h-5" />}
          required
        />

        <Input
          label={userType === 'FARMER' ? 'Email (Optional)' : 'Email Address'}
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          leftIcon={<Mail className="w-5 h-5" />}
          required={userType === 'BUYER'}
        />

        <Select
          label={userType === 'FARMER' ? 'Region' : 'Region (Optional)'}
          placeholder="Select your region"
          value={formData.region}
          onChange={(value) => handleInputChange('region', value)}
          options={GHANA_REGIONS.map((r) => ({ value: r, label: r }))}
          required={userType === 'FARMER'}
        />

        <Input
          label="Town/City (Optional)"
          type="text"
          placeholder="Enter your town or city"
          value={formData.town_city}
          onChange={(e) => handleInputChange('town_city', e.target.value)}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Create a password"
          value={formData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
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

        {/* Password Strength Indicator */}
        <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
          <p className="font-medium text-gray-700">Password Requirements:</p>
          <div className="grid grid-cols-1 gap-1">
            {passwordRequirements.map((req, index) => (
              <div key={index} className="flex items-center space-x-2">
                {req.valid ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <X className="w-4 h-4 text-gray-400" />
                )}
                <span className={req.valid ? 'text-green-700' : 'text-gray-500'}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
          value={formData.confirm_password}
          onChange={(e) => handleInputChange('confirm_password', e.target.value)}
          required
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isLoading}
          disabled={!isPasswordValid || formData.password !== formData.confirm_password}
          className="mt-6"
        >
          Create Account
        </Button>
      </form>

      <p className="text-center text-gray-500 text-sm mt-6">
        By signing up, you agree to our{' '}
        <Link to="/terms" className="text-primary hover:underline">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link to="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
};

export default SignupPage;
