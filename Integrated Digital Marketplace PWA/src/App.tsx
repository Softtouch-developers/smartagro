import { useState } from "react";
import { FarmerDashboard } from "./components/FarmerDashboard";
import { CustomerDashboard } from "./components/CustomerDashboard";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { FeatureShowcase } from "./components/FeatureShowcase";
import { DemoNotice } from "./components/DemoNotice";
import { Sprout, ShoppingCart } from "lucide-react";

export default function App() {
  const [userType, setUserType] = useState<
    "farmer" | "customer" | null
  >(null);

  return (
    <>
      <PWAInstallPrompt />
      <OfflineIndicator />
      {userType && <DemoNotice />}

      {!userType ? (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            <div className="text-center mb-12">
              <h1 className="text-green-800 mb-4">SmartAgro</h1>
              <p className="text-green-700 max-w-2xl mx-auto">
                Reducing post-harvest losses through direct
                market linkages between farmers and buyers
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={() => setUserType("farmer")}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-green-500 group"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-500 transition-colors">
                    <Sprout className="w-10 h-10 text-green-700 group-hover:text-white" />
                  </div>
                </div>
                <h2 className="text-green-900 mb-3">
                  I'm a Farmer
                </h2>
                <p className="text-gray-600">
                  List your produce, connect with buyers, and
                  get farming advice through our AI assistant
                </p>
              </button>

              <button
                onClick={() => setUserType("customer")}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-emerald-500 group"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                    <ShoppingCart className="w-10 h-10 text-emerald-700 group-hover:text-white" />
                  </div>
                </div>
                <h2 className="text-emerald-900 mb-3">
                  I'm a Buyer
                </h2>
                <p className="text-gray-600">
                  Browse fresh produce directly from farmers
                  with verified quality and transparent pricing
                </p>
              </button>
            </div>

            <div className="mt-12 text-center">
              <p className="text-green-800 mb-2">
                Supported by research to combat US$1.9B annual
                post-harvest losses in Ghana
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50">
          <div className="bg-green-600 text-white p-4 shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sprout className="w-6 h-6" />
                <span>SmartAgro</span>
              </div>
              <button
                onClick={() => setUserType(null)}
                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                Switch View
              </button>
            </div>
          </div>

          {userType === "farmer" ? (
            <FarmerDashboard />
          ) : (
            <CustomerDashboard />
          )}
        </div>
      )}
    </>
  );
}