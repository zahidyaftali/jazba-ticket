import React, { useState } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Wallet, 
  CreditCard, 
  ArrowRight, 
  ArrowLeft,
  Info 
} from 'lucide-react';

interface PayPalCheckoutFormProps {
  amount: number;
  currency: 'USD' | 'PKR' | 'GBP';
  billingName: string;
  billingEmail: string;
  onPaymentSuccess: (transactionId: string) => void;
  onPaymentError: (err: string) => void;
}

export default function PayPalCheckoutForm({
  amount,
  currency,
  billingName,
  billingEmail,
  onPaymentSuccess,
  onPaymentError
}: PayPalCheckoutFormProps) {
  const [payStep, setPayStep] = useState<'idle' | 'login' | 'otp' | 'confirm' | 'processing'>('idle');
  const [email, setEmail] = useState(billingEmail || '');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFunding, setSelectedFunding] = useState<'balance' | 'linked_card'>('balance');

  // Multi-step handlers
  const handleInitiatePayPal = (mode: 'standard' | 'later') => {
    setErrorMessage('');
    if (!email) {
      setErrorMessage('Please provide a valid email or mobile number associated with your PayPal account.');
      return;
    }
    setPayStep('login');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage('Please enter your PayPal email.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }
    setErrorMessage('');
    setPayStep('otp');
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 4) {
      setErrorMessage('Verification code must be at least 4 digits.');
      return;
    }
    setErrorMessage('');
    setPayStep('confirm');
  };

  const handleFinalPayment = () => {
    setPayStep('processing');
    setTimeout(() => {
      const parentId = `PAYID-${Math.random().toString(36).substring(2, 14).toUpperCase()}`;
      onPaymentSuccess(parentId);
    }, 2200);
  };

  const formattedAmount = () => {
    if (currency === 'PKR') {
      return `Rs. ${Math.round(amount * 280).toLocaleString()}`;
    }
    if (currency === 'GBP') {
      return `£${(amount * 0.78).toFixed(2)}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="bg-white border-2 border-neutral-100 rounded-2xl p-5 sm:p-7 shadow-xs font-sans mt-2" id="paypal-checkout-gate">
      {/* Header element */}
      <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-3.5 mb-5 text-left">
        <div className="flex items-center gap-2">
          {/* Custom Styled PayPal Logo */}
          <span className="italic font-serif font-black tracking-tighter text-[#003087] text-xl">
            Pay<span className="text-[#0079c1]">Pal</span>
          </span>
          <span className="text-[9px] bg-[#0079c1]/10 text-[#003087] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
            Gateway
          </span>
        </div>
        <div className="bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200 text-right leading-none shrink-0">
          <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block">Total Amount:</span>
          <span className="text-sm font-mono font-black text-neutral-800 tracking-tight block mt-1">
            {formattedAmount()}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2 animate-fadeIn text-left">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* IDLE state showing primary action buttons */}
      {payStep === 'idle' && (
        <div className="space-y-4 text-left">
          <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs font-semibold text-amber-800 leading-relaxed">
              <p className="font-extrabold uppercase text-[10px] tracking-wide mb-1 text-amber-900">
                PayPal Express Sandbox Enabled
              </p>
              <p className="font-medium text-amber-700">
                Securely authenticating seat reservation details. Fill in your billing info above, click pay below, then login with any mock credentials to test safely.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Your PayPal Registered Email
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-paypal-account@email.com"
                required
                className="w-full bg-white border-2 border-neutral-200 rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-800 placeholder-neutral-300 focus:border-[#0079c1] focus:outline-none focus:ring-0 transition-all font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* PayPal Yellow Button */}
              <button
                type="button"
                onClick={() => handleInitiatePayPal('standard')}
                className="w-full py-4.5 bg-[#ffc439] hover:bg-[#f2ba36] text-[#003087] rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-[#EAC124]"
              >
                <span className="italic font-serif font-black lowercase tracking-tighter text-sm">paypal</span>
                <span>Checkout</span>
              </button>

              {/* Pay Later Blue Button */}
              <button
                type="button"
                onClick={() => handleInitiatePayPal('later')}
                className="w-full py-4.5 bg-[#0070ba] hover:bg-[#005ea6] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-[#00548c]"
              >
                <span className="italic font-serif font-black lowercase tracking-tighter text-sm text-amber-300">paypal</span>
                <span>Pay Later</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN state */}
      {payStep === 'login' && (
        <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-left animate-slideDown">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-3">
            <span className="text-[10px] font-bold text-[#003087] uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#0079c1]" /> Secure Identification
            </span>
            <button 
              type="button" 
              onClick={() => setPayStep('idle')} 
              className="text-[10px] text-neutral-400 hover:text-black font-black uppercase tracking-wider flex items-center gap-0.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Account Email
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-paypal-account@email.com"
                required
                className="w-full bg-white border-2 border-neutral-200 rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-800 placeholder-neutral-300 focus:border-[#0079c1] focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Password
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-white border-2 border-neutral-200 rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-850 placeholder-neutral-300 focus:border-[#0079c1] focus:outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#0070ba] hover:bg-[#005ea6] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-4"
          >
            <span>Login to secure vault</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* OTP verification state */}
      {payStep === 'otp' && (
        <form onSubmit={handleOtpVerify} className="space-y-4 text-left animate-slideDown">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <span className="text-[10px] font-bold text-[#003087] uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Dynamic Code Verification
            </span>
            <button 
              type="button" 
              onClick={() => setPayStep('login')} 
              className="text-[10px] text-neutral-400 hover:text-black font-black uppercase tracking-wider flex items-center gap-0.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          <p className="text-[11px] text-neutral-500 font-semibold leading-relaxed">
            A secure instant authorization code was sent to <strong className="text-neutral-800">{email}</strong>. Enter any 4-digit code (e.g. <strong className="text-emerald-600">1234</strong>) to confirm identity.
          </p>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Enter 4-Digit Code
            </label>
            <input 
              type="text" 
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              required
              className="w-full bg-white border-2 border-neutral-200 rounded-xl px-4 py-3 text-sm font-mono font-black text-center text-neutral-800 placeholder-neutral-300 focus:border-[#0079c1] focus:outline-none transition-all tracking-[0.5em]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#0070ba] hover:bg-[#005ea6] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Verify & Continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* CONFIRMATION state */}
      {payStep === 'confirm' && (
        <div className="space-y-4 text-left animate-slideDown">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-1">
            <span className="text-[10px] font-bold text-[#003087] uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Account Verified
            </span>
            <span className="text-[9px] text-[#003087] font-black">{email}</span>
          </div>

          <p className="text-[11px] text-neutral-500 font-semibold">
            Choose your preferred funding source connected to your PayPal wallet:
          </p>

          <div className="space-y-2.5">
            <div 
              onClick={() => setSelectedFunding('balance')}
              className={`p-3.5 rounded-xl border-2 flex items-center justify-between cursor-pointer select-none transition-all ${
                selectedFunding === 'balance' ? 'border-[#0079c1] bg-[#0079c1]/5' : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-4 h-4 text-[#003087]" />
                <div>
                  <span className="text-xs font-extrabold text-neutral-800 block leading-none">PayPal Balance</span>
                  <span className="text-[10px] text-neutral-400 font-bold block mt-1">Available Instant: {formattedAmount()}</span>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedFunding === 'balance' ? 'border-[#0079c1] bg-[#0079c1]' : 'border-neutral-300'}`}>
                {selectedFunding === 'balance' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
            </div>

            <div 
              onClick={() => setSelectedFunding('linked_card')}
              className={`p-3.5 rounded-xl border-2 flex items-center justify-between cursor-pointer select-none transition-all ${
                selectedFunding === 'linked_card' ? 'border-[#0079c1] bg-[#0079c1]/5' : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-neutral-600" />
                <div>
                  <span className="text-xs font-extrabold text-neutral-800 block leading-none">Visa Debit Card (Linked)</span>
                  <span className="text-[10px] text-neutral-400 font-bold block mt-1">Primary card ending in •••• 5678</span>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedFunding === 'linked_card' ? 'border-[#0079c1] bg-[#0079c1]' : 'border-neutral-300'}`}>
                {selectedFunding === 'linked_card' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinalPayment}
            className="w-full py-4 bg-[#ffc439] hover:bg-[#f2ba36] text-[#003087] rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer mt-4"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Complete Authorization of {formattedAmount()}</span>
          </button>
        </div>
      )}

      {/* PROCESSING state */}
      {payStep === 'processing' && (
        <div className="py-10 text-center space-y-4 animate-pulse">
          <Loader2 className="w-8 h-8 text-[#0079c1] animate-spin mx-auto" />
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">
              SECURE DEPOSIT TRANSFERRING
            </span>
            <p className="text-xs font-bold text-neutral-800">
              Contacting PayPal clearing network...
            </p>
            <p className="text-[10px] text-neutral-500 font-semibold max-w-xs mx-auto">
              Please do not refresh this ticket container. Your seating tokens are being reserved in our live vault block.
            </p>
          </div>
        </div>
      )}

      {/* Compliance seal line */}
      <div className="pt-4 border-t border-neutral-100 mt-4.5 flex flex-col sm:flex-row gap-2 items-center justify-between text-[9px] font-bold text-neutral-400 font-mono uppercase tracking-widest">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          PayPal Encryption Certificate SSL-SHA256
        </span>
        <span className="text-[#003087]">PCI-DSS COMPLIANT</span>
      </div>
    </div>
  );
}
