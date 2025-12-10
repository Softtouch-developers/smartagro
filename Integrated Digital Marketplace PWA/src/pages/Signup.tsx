import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Signup({ onVerified }: { onVerified?: (user_id: number) => void }) {
  const { signup } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'FARMER' | 'BUYER'>('BUYER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signup({
        full_name: fullName,
        phone_number: phone,
        email: email || undefined,
        password,
        user_type: userType,
      });

      if (res && res.user_id) {
        if (onVerified) onVerified(res.user_id);
      }
    } catch (err: any) {
      setError(err?.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow">
      <h3 className="text-lg font-semibold mb-4">Create account</h3>
      {error && <div className="text-red-600 mb-3">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="w-full px-4 py-3 border rounded" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (+233...)" className="w-full px-4 py-3 border rounded" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="w-full px-4 py-3 border rounded" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 border rounded" />

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2"><input type="radio" checked={userType === 'BUYER'} onChange={() => setUserType('BUYER')} /> Buyer</label>
          <label className="flex items-center gap-2"><input type="radio" checked={userType === 'FARMER'} onChange={() => setUserType('FARMER')} /> Farmer</label>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </div>
      </form>
    </div>
  );
}
