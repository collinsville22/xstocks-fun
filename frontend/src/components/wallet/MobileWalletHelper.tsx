import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * MobileWalletHelper - Provides guidance for mobile users on how to connect their wallet
 * Shows helpful instructions when user is on mobile and not connected
 */
export const MobileWalletHelper: React.FC = () => {
  const { connected, publicKey } = useWallet();
  const [isMobile, setIsMobile] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
      setIsMobile(isMobileDevice);
    };

    checkMobile();

    // Check if user has dismissed the helper before
    const isDismissed = localStorage.getItem('mobile_wallet_helper_dismissed') === 'true';
    setDismissed(isDismissed);
  }, []);

  useEffect(() => {
    // Show helper if on mobile, not connected, and not dismissed
    if (isMobile && !connected && !dismissed) {
      // Delay showing to avoid overwhelming user immediately
      const timer = setTimeout(() => {
        setShowHelper(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowHelper(false);
    }
  }, [isMobile, connected, dismissed]);

  const handleDismiss = () => {
    setShowHelper(false);
    setDismissed(true);
    localStorage.setItem('mobile_wallet_helper_dismissed', 'true');
  };

  // Don't render if not showing or not on mobile
  if (!showHelper || !isMobile || connected) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[10000] animate-slide-up">
      <div className="bg-white border-4 border-black rounded-3xl shadow-2xl p-5 max-w-md mx-auto">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Dismiss"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Helper content */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-playful-green/10 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-playful-green"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-display font-bold text-base text-[#2C2C2C] mb-2">
                Connect Your Wallet on Mobile
              </h3>
              <p className="text-sm text-[#5C5C5C] font-body leading-relaxed mb-3">
                To use xStocksFun on mobile, open this site in your wallet's built-in browser:
              </p>
              <ol className="space-y-2 text-sm text-[#4C4C4C] font-body">
                <li className="flex gap-2">
                  <span className="font-bold text-playful-green">1.</span>
                  <span>Open your Phantom or Solflare mobile app</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-playful-green">2.</span>
                  <span>Tap the Browser or dApp browser tab</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-playful-green">3.</span>
                  <span>Navigate to this website</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-playful-green">4.</span>
                  <span>Tap "Connect Wallet" to get started</span>
                </li>
              </ol>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2.5 bg-playful-green text-white rounded-full font-display font-bold text-sm border-2 border-black hover:bg-playful-orange transition-all duration-200 shadow-md"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileWalletHelper;
