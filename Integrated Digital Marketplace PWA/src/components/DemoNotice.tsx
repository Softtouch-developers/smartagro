import { Info, X } from 'lucide-react';
import { useState } from 'react';

export function DemoNotice() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 max-w-md bg-blue-50 border-2 border-blue-200 rounded-xl p-4 shadow-lg z-40">
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 p-1 hover:bg-blue-100 rounded-lg transition-colors"
      >
        <X className="w-4 h-4 text-blue-600" />
      </button>

      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <div>
          <h4 className="text-blue-900 mb-1">Demo Mode</h4>
          <p className="text-blue-700">
            This is a frontend demonstration with mock data. Full functionality requires backend integration 
            with payment systems, SMS services, and real farmer/buyer databases.
          </p>
        </div>
      </div>
    </div>
  );
}
