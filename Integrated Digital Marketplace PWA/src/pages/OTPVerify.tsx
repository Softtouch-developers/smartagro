import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function OTPVerify({ userId, onComplete, onCancel }: { userId: number; onComplete?: () => void; onCancel?: () => void }) {
  const { verifyOtp } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await verifyOtp({ user_id: userId, otp_code: code, otp_type: 'PHONE_VERIFICATION' });
      if (res && res.tokens) {
        if (onComplete) onComplete();
      }
    } catch (err: any) {
      setError(err?.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow">
      <h3 className="text-lg font-semibold mb-4">Verify Phone</h3>
      <p className="text-gray-600 mb-3">Enter the 6-digit code sent to your phone.</p>
      {error && <div className="text-red-600 mb-3">{error}</div>}
      <form onSubmit={submit} className="space-y-3">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className="w-full px-4 py-3 border rounded text-center" />
        <div className="flex justify-between">
          <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">{loading ? 'Verifying...' : 'Verify'}</button>
        </div>
      </form>
    </div>
  );
}
