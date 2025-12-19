import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Mail, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/stores/uiStore';
import { getErrorMessage } from '@/services/api/client';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const toast = useToast();

  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const user = await login({
        phone_number: loginMethod === 'phone' ? phone : undefined,
        email: loginMethod === 'email' ? email : undefined,
        password,
      });
      toast.success('Welcome back!');

      // Redirect based on user type/mode
      if (user.user_type === 'ADMIN') {
        navigate('/admin');
      } else if (user.current_mode === 'FARMER') {
        navigate('/farmer');
      } else {
        navigate('/');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      {/* Logo & Welcome */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">SmartAgro</h1>
        <p className="text-gray-600">Welcome back! Sign in to continue.</p>
      </div>

      {/* Login Method Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
        <button
          type="button"
          onClick={() => setLoginMethod('phone')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${loginMethod === 'phone'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500'
            }`}
        >
          <Phone className="w-4 h-4" />
          Phone
        </button>
        <button
          type="button"
          onClick={() => setLoginMethod('email')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${loginMethod === 'email'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500'
            }`}
        >
          <Mail className="w-4 h-4" />
          Email
        </button>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {loginMethod === 'phone' ? (
          <Input
            label="Phone Number"
            type="tel"
            placeholder="024 XXX XXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-5 h-5" />}
            required
          />
        ) : (
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-5 h-5" />}
            required
          />
        )}

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isLoading}
          className="mt-6"
        >
          Sign In
        </Button>
      </form>

      {/* Sign Up Link */}
      <p className="text-center text-gray-600 mt-8">
        Don't have an account?{' '}
        <Link to="/signup" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;
