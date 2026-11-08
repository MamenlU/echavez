import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Loader2, ArrowRight } from 'lucide-react';
import { Footer } from '../components/Footer';

export function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId') || localStorage.getItem('pending_payment_order_id') || '';
  const [status, setStatus] = useState<'verifying' | 'paid' | 'pending' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const controller = new AbortController();
    const verify = async () => {
      setStatus('verifying');
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Please log in, open My Orders, and choose Check Payment.');
        if (!orderId) throw new Error('Open My Orders and choose Check Payment for your order.');
        // Both success and cancel returns require the same server-side verification.
        const response = await fetch('/api/paymongo/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ orderId }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to check payment.');
        if (controller.signal.aborted) return;
        setTestMode(Boolean(data.testMode));
        if (data.paymentStatus === 'Paid') {
          if (localStorage.getItem('pending_payment_order_id') === orderId) localStorage.removeItem('pending_payment_order_id');
          setCountdown(5);
          setStatus('paid');
        } else {
          setMessage('Payment has not been confirmed. Your order is saved in My Orders. You can check again or continue its existing checkout there.');
          setStatus('pending');
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setMessage(error instanceof Error ? error.message : 'Unable to check payment. Check My Orders before paying again.');
        setStatus('error');
      }
    };
    void verify();
    return () => controller.abort();
  }, [orderId, attempt]);

  useEffect(() => {
    if (status !== 'paid') return;
    if (countdown === 0) {
      navigate('/customer/dashboard?tab=orders');
      return;
    }
    const timer = setTimeout(() => setCountdown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, countdown, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
    <main className="flex-grow flex items-center justify-center px-4 py-12">
      <section className="max-w-md w-full bg-white rounded-3xl border border-emerald-100 shadow-lg p-8 text-center" aria-live="polite">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-50 flex items-center justify-center text-[#15803d]">
          {status === 'verifying' ? <Loader2 className="w-8 h-8 animate-spin" /> : status === 'paid' ? <CheckCircle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
        </div>
        <h1 className="text-2xl font-extrabold text-[#17372d]">
          {status === 'verifying' ? 'Checking your payment' : status === 'paid' ? 'Payment confirmed' : 'Payment not yet confirmed'}
        </h1>
        {testMode && <p className="mt-3 text-xs font-bold text-amber-700">Test payment — no real funds collected</p>}
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          {status === 'verifying' ? 'Please wait while Rayjin Hardware checks PayMongo.' : status === 'paid' ? 'Your payment is recorded. The store will review your order separately; follow its progress in My Orders.' : message}
        </p>
        <p className="my-5 text-xs text-gray-500 break-all">{orderId}</p>
        {status !== 'verifying' && (
          <div className="space-y-3">
            {status !== 'paid' && <button type="button" onClick={() => setAttempt(value => value + 1)} className="w-full rounded-xl border border-emerald-200 py-3 text-sm font-bold text-[#15803d]">Check payment again</button>}
            <button type="button" onClick={() => navigate('/customer/dashboard?tab=orders')} className="w-full rounded-xl bg-[#15803d] py-3 text-sm font-bold text-white flex justify-center items-center gap-2">View My Orders <ArrowRight className="h-4 w-4" /></button>
            {status === 'paid' && <p className="text-xs text-gray-500">Opening My Orders in {countdown}s.</p>}
          </div>
        )}
      </section>
    </main>
    <Footer showNavigationSections={false} />
    </div>
  );
}
