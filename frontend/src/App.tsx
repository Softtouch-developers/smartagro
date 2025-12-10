import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FarmerDashboard } from "./components/FarmerDashboard";
import { CustomerDashboard } from "./components/CustomerDashboard";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { FeatureShowcase } from "./components/FeatureShowcase";
import { DemoNotice } from "./components/DemoNotice";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { OTPVerificationPage } from "./pages/OTPVerificationPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { Sprout, ShoppingCart, Loader2 } from "lucide-react";
import { Toaster } from "./components/ui/sonner";

type AuthView = "login" | "signup" | "otp" | "forgot-password";

function AppContent() {
  const { user, isAuthenticated, isLoading, logout, switchMode } = useAuth();
  const [authView, setAuthView] = useState<AuthView>("login");
  const [otpPhoneNumber, setOtpPhoneNumber] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-green-800">Loading SmartAgro...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === "signup") {
      return (
        <SignupPage
          onNavigateToLogin={() => setAuthView("login")}
          onNavigateToOTP={(phoneNumber) => {
            setOtpPhoneNumber(phoneNumber);
            setAuthView("otp");
          }}
        />
      );
    }

    if (authView === "otp") {
      return (
        <OTPVerificationPage
          phoneNumber={otpPhoneNumber}
          onNavigateToLogin={() => setAuthView("login")}
        />
      );
    }

    if (authView === "forgot-password") {
      return (
        <ForgotPasswordPage onNavigateToLogin={() => setAuthView("login")} />
      );
    }

    return (
      <LoginPage
        onNavigateToSignup={() => setAuthView("signup")}
        onNavigateToForgotPassword={() => setAuthView("forgot-password")}
      />
    );
  }

  // User is authenticated - show dashboard based on current mode
  const isFarmerMode = user?.current_mode === "farmer";

  return (
    <>
      <PWAInstallPrompt />
      <OfflineIndicator />

      <div className="min-h-screen bg-gray-50">
        <div className="bg-green-600 text-white p-4 shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sprout className="w-6 h-6" />
              <span>SmartAgro</span>
            </div>
            <div className="flex items-center gap-3">
              {user && user.roles.length > 1 && (
                <button
                  onClick={() => switchMode(isFarmerMode ? "buyer" : "farmer")}
                  className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm"
                >
                  Switch to {isFarmerMode ? "Buyer" : "Farmer"}
                </button>
              )}
              <button
                onClick={logout}
                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {isFarmerMode ? <FarmerDashboard /> : <CustomerDashboard />}
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}