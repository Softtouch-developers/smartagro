import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User response to the install prompt: ${outcome}`);

    // Clear the deferredPrompt for later use
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-2xl p-6 z-50 border-2 border-green-500">
      <button
        onClick={() => setShowPrompt(false)}
        className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <X className="w-5 h-5 text-gray-500" />
      </button>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-6 h-6 text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-gray-900 mb-1">Install SmartAgro</h3>
          <p className="text-gray-600 mb-4">
            Install our app for faster access and offline support
          </p>
          <button
            onClick={handleInstall}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}
