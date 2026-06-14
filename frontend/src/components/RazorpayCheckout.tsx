'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, CreditCard, ShieldCheck } from 'lucide-react';

interface RazorpayCheckoutProps {
  amount: number; // In INR (e.g., 499)
  itemName: string;
  itemDescription?: string;
  onSuccess: (paymentId: string, orderId: string) => void;
  onFailure?: (error: string) => void;
  buttonText?: string;
  buttonClassName?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RazorpayCheckout({
  amount,
  itemName,
  itemDescription,
  onSuccess,
  onFailure,
  buttonText = 'Pay Now',
  buttonClassName,
  userName = '',
  userEmail = '',
  userPhone = '',
}: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [paymentId, setPaymentId] = useState('');

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    setStatus('idle');

    try {
      // 1. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load Razorpay');

      // 2. Create order on server
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          receipt: `order_${Date.now()}`,
          notes: { item: itemName },
        }),
      });
      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || 'Failed to create order');

      // 3. Open Razorpay checkout with ALL payment methods
      const options = {
        key: orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Arogya Raksha',
        description: itemDescription || itemName,
        image: '/favicon.ico',
        order_id: orderData.orderId,
        prefill: {
          name: userName,
          email: userEmail,
          contact: userPhone,
        },
        // Enable ALL payment methods including UPI apps
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
          emi: true,
          paylater: true,
        },
        config: {
          display: {
            preferences: {
              show_default_blocks: true, // Show UPI apps (GPay, PhonePe, Paytm) prominently
            },
          },
        },
        theme: {
          color: '#10b981',
          backdrop_color: 'rgba(0,0,0,0.6)',
        },
        handler: async (response: any) => {
          // 4. Verify payment on server
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setStatus('success');
              setPaymentId(response.razorpay_payment_id);
              onSuccess(response.razorpay_payment_id, response.razorpay_order_id);
            } else {
              setStatus('failed');
              onFailure?.('Payment verification failed');
            }
          } catch {
            setStatus('failed');
            onFailure?.('Payment verification error');
          }
          setLoading(false);
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
          confirm_close: true,
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      setStatus('failed');
      onFailure?.(error.message);
      setLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center animate-in fade-in duration-300">
        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
        <h3 className="font-bold text-emerald-800 text-lg mb-1">Payment Successful!</h3>
        <p className="text-sm text-emerald-600 mb-2">{itemName}</p>
        <p className="text-xs text-emerald-500 font-mono">Payment ID: {paymentId}</p>
        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-emerald-600">
          <ShieldCheck className="h-3.5 w-3.5" /> Secured by Razorpay
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-center animate-in fade-in duration-300">
        <XCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h3 className="font-bold text-rose-800 text-lg mb-1">Payment Failed</h3>
        <p className="text-sm text-rose-600 mb-3">Something went wrong. Please try again.</p>
        <button onClick={() => { setStatus('idle'); handlePayment(); }}
          className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all">
          Retry Payment
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className={buttonClassName || 'w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'}
    >
      {loading ? (
        <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
      ) : (
        <><CreditCard className="h-5 w-5" /> {buttonText} — ₹{amount}</>
      )}
    </button>
  );
}
