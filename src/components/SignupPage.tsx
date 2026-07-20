import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Mail, 
  Lock, 
  User, 
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, auth } from '../firebase';
import { createUserProfile } from '../services/backendService';

interface SignupPageProps {
  onBack: () => void;
  onSuccess: (user: { email: string; name: string }) => void;
  onSwitchToLogin: () => void;
}

export default function SignupPage({ onBack, onSuccess, onSwitchToLogin }: SignupPageProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Simple validation
  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }

    if (!email) {
      setErrorMessage('An email address is required.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Choose a secure password of at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update display name
      await updateProfile(user, { displayName: name.trim() });

      // Complete the profile on the backend (role/status are handled server-side)
      try {
        await createUserProfile(user.uid, { name: name.trim(), city: 'London' });
      } catch (dbErr) {
        console.error("Failed to write profile:", dbErr);
      }
      
      setLoading(false);
      onSuccess({
        email: email,
        name: name.trim()
      });
    } catch (err: any) {
      setLoading(false);
      let friendlyMessage = 'Failed to create account. Email may already be in use.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email address is already registered. Please sign in instead.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setErrorMessage(friendlyMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Complete the profile on the backend if needed
      try {
        await createUserProfile(user.uid, {
          name: user.displayName || user.email?.split('@')[0] || 'Google Guest',
          city: 'London',
        });
      } catch (dbErr) {
        console.error("Failed to save google profile:", dbErr);
      }
      
      setLoading(false);
      onSuccess({
        email: user.email || '',
        name: user.displayName || 'Google Guest'
      });
    } catch (err: any) {
      setLoading(false);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Google sign up failed.');
      }
    }
  };

  const handleFacebookSignIn = async () => {
    setErrorMessage('');
    setLoading(true);
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Complete the profile on the backend if needed
      try {
        await createUserProfile(user.uid, {
          name: user.displayName || user.email?.split('@')[0] || 'Facebook Guest',
          city: 'London',
        });
      } catch (dbErr) {
        console.error("Failed to save facebook profile:", dbErr);
      }

      setLoading(false);
      onSuccess({
        email: user.email || '',
        name: user.displayName || 'Facebook Guest'
      });
    } catch (err: any) {
      setLoading(false);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Facebook sign up failed.');
      }
    }
  };

  return (
    <div className="jz-page min-h-[85vh] bg-[#FAFBFD] text-neutral-900 font-sans relative flex items-center justify-center py-16 px-4 sm:px-6 overflow-hidden" id="signup-page-root">
      
      {/* Background radial accent - matching home page colors but subtle and light */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[#E34718]/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(227,71,24,0.02)_1px,transparent_1px)] [background-size:24px_24px] opacity-75" />
      </div>

      {/* Main content column */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        
        {/* Navigation Return Button */}
        <div className="w-full mb-6 flex justify-start">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-neutral-550 hover:text-[#E34718] font-bold text-xs text-sentence tracking-wider transition-colors cursor-pointer group bg-white   hover:bg-neutral-50 px-4 py-2 rounded-full shadow-xs"
            id="signup-breadcrumb-return"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-neutral-500 group-hover:text-[#E34718]" />
            <span>Back to Home</span>
          </button>
        </div>

        {/* Polished Card */}
        <div className="w-full bg-white   rounded-[2rem] p-8 sm:p-10 shadow-xs space-y-6 relative overflow-hidden transition-all duration-300">
          
          {/* Header */}
          <div className="space-y-2 text-center">
            <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-neutral-900" id="signup-heading-custom">
              Create Your Account
            </h1>
            <p className="text-xs text-neutral-500 font-medium max-w-sm mx-auto leading-normal">
              Sign up to book tickets, follow your favorite artists, and manage your bookings in one place.
            </p>
          </div>

          {/* Validation Warnings */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-red-50   text-red-800 rounded-2xl flex items-start gap-2.5 text-xs text-left leading-normal"
              id="signup-error-alert"
            >
              <AlertCircle className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-sentence tracking-widest text-[9px] text-red-600 block font-mono">Sign-up error</span>
                <p className="font-medium mt-0.5">{errorMessage}</p>
              </div>
            </motion.div>
          )}

          {/* Core inputs form */}
          <form onSubmit={handleSignup} className="space-y-4 text-left">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-450 text-sentence tracking-widest block pl-1 font-sans">
                Your Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-neutral-400" />
                </div>
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Liam Hall"
                  className="w-full bg-neutral-50 hover:bg-neutral-100/60   focus:bg-white rounded-2xl pl-11 pr-4 py-3.5 text-xs font-semibold focus:outline-none  focus:ring-1 focus:ring-[#E34718]/40 placeholder-neutral-405 text-neutral-800 tracking-wide transition-all min-h-[44px]"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-450 text-sentence tracking-widest block pl-1 font-sans">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-neutral-400" />
                </div>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-neutral-50 hover:bg-neutral-100/60   focus:bg-white rounded-2xl pl-11 pr-4 py-3.5 text-xs font-semibold focus:outline-none  focus:ring-1 focus:ring-[#E34718]/40 placeholder-neutral-405 text-neutral-800 tracking-wide transition-all min-h-[44px]"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-450 text-sentence tracking-widest block pl-1 font-sans">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-neutral-400" />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-neutral-50 hover:bg-neutral-100/60   focus:bg-white rounded-2xl pl-11 pr-11 py-3.5 text-xs font-semibold focus:outline-none  focus:ring-1 focus:ring-[#E34718]/40 placeholder-neutral-405 text-neutral-800 tracking-wide transition-all min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                  aria-label="Toggle password preview"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E34718] hover:bg-[#C23A12] disabled:bg-[#E34718]/50 text-white font-extrabold text-xs text-sentence py-4 px-6 rounded-full tracking-widest transition-all shadow-md hover:shadow-lg hover:shadow-[#E34718]/10 active:scale-98 cursor-pointer flex items-center justify-center gap-2 mt-6 min-h-[44px]"
              id="submit-signup-primary"
            >
              <span>{loading ? 'Creating Account...' : 'Sign Up'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

          {/* Third Party Auth */}
          <div className="space-y-4 pt-2">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200/80"></div>
              </div>
              <div className="relative bg-white px-3 text-[9px] text-sentence font-bold text-neutral-400 tracking-widest font-sans">
                Or Continue With
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 py-3 px-4    hover:bg-neutral-50 bg-white rounded-2xl transition-all cursor-pointer shadow-xs font-semibold text-xs text-neutral-750"
              title="Continue with Google"
            >
              <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.73 5.73 0 0 1 8.24 12.8a5.73 5.73 0 0 1 5.751-5.714c1.47 0 2.805.534 3.84 1.412l3.14-3.14c-1.954-1.762-4.52-2.842-6.98-2.842a9.9 9.9 0 0 0-9.9 9.9 9.9 9.9 0 0 0 9.9 9.9c5.44 0 9.06-3.824 9.06-9.106 0-.584-.055-1.155-.156-1.706H12.24z"/>
              </svg>
              <span>Google Account</span>
            </button>

            <button
              type="button"
              onClick={handleFacebookSignIn}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 mt-2   hover:bg-neutral-50 bg-white rounded-2xl transition-all cursor-pointer shadow-xs font-semibold text-xs text-neutral-750"
              title="Continue with Facebook"
            >
              <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.931-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
              </svg>
              <span>Facebook Account</span>
            </button>
          </div>

          {/* Switch View Trigger */}
          <div className="pt-2 text-center text-xs font-bold text-neutral-400 font-sans">
            <span>
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-[#E34718] hover:underline font-extrabold cursor-pointer transition-colors"
                id="signup-switch-login-trigger"
              >
                Sign in here
              </button>
            </span>
          </div>

        </div>

        {/* Footer Brand Statement */}
        <div className="mt-6 text-neutral-400 text-[10px] font-sans font-bold text-sentence tracking-widest text-center select-none">
          Jazba Tickets &middot; Secure Ticketing
        </div>

      </div>

    </div>
  );
}
