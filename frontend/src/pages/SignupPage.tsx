import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Sprout, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface SignupPageProps {
  onNavigateToLogin: () => void;
  onNavigateToOTP: (phoneNumber: string) => void;
}

export function SignupPage({ onNavigateToLogin, onNavigateToOTP }: SignupPageProps) {
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    phone_number: '',
    full_name: '',
    password: '',
    confirmPassword: '',
    email: '',
    region: '',
    district: '',
  });
  const [roles, setRoles] = useState<('farmer' | 'buyer')[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (roles.length === 0) {
      toast.error('Please select at least one role (Farmer or Buyer)');
      return;
    }

    setIsLoading(true);

    try {
      await signup({
        phone_number: formData.phone_number,
        full_name: formData.full_name,
        password: formData.password,
        email: formData.email || undefined,
        roles,
        region: formData.region || undefined,
        district: formData.district || undefined,
      });
      toast.success('Account created! Please verify your phone number.');
      onNavigateToOTP(formData.phone_number);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleToggle = (role: 'farmer' | 'buyer') => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
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
          <h1 className="text-green-900 mb-2">Join SmartAgro</h1>
          <p className="text-gray-600">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="Enter your full name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="0XX XXX XXXX"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="confirm_password">Confirm Password</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="region">Region (Optional)</Label>
              <Input
                id="region"
                type="text"
                placeholder="e.g., Greater Accra"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="district">District (Optional)</Label>
              <Input
                id="district"
                type="text"
                placeholder="e.g., Accra Metro"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>I am a:</Label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="farmer"
                  checked={roles.includes('farmer')}
                  onCheckedChange={() => handleRoleToggle('farmer')}
                  disabled={isLoading}
                />
                <label htmlFor="farmer" className="text-sm cursor-pointer">
                  Farmer
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="buyer"
                  checked={roles.includes('buyer')}
                  onCheckedChange={() => handleRoleToggle('buyer')}
                  disabled={isLoading}
                />
                <label htmlFor="buyer" className="text-sm cursor-pointer">
                  Buyer
                </label>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating account...
              </>
            ) : (
              'Sign Up'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-gray-600 text-sm">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="text-green-600 hover:text-green-700"
          >
            Sign in
          </button>
        </div>
      </Card>
    </div>
  );
}
