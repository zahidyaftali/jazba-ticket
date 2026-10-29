import React, { useState, useEffect } from 'react';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, auth, User } from '../firebase';
import { isUserBootstrappedAdmin, getUserProfile, syncAccountProfile } from '../services/backendService';
import AdminHub from './AdminHub';
import brandMark from '../../assets/images/Favicon.png';

type AuthStage = 'checking' | 'signed-out' | 'denied' | 'granted';

export default function AdminPortal() {
  const [stage, setStage] = useState<AuthStage>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        setStage('signed-out');
        return;
      }
      try {
        const profile = await getUserProfile(user.uid);
        const role = profile?.role || '';
        const isAdmin = isUserBootstrappedAdmin(user.email) || role === 'admin';
        if (isAdmin) {
          syncAccountProfile(user);
          setStage('granted');
        } else {
          await signOut(auth);
          setStage('denied');
        }
      } catch (err) {
        console.error('Admin role check failed:', err);
        await signOut(auth);
        setStage('denied');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged above handles the role check and stage transition
    } catch (err: any) {
      setLoginError('Invalid admin email or password.');
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setStage('signed-out');
  };

  if (stage === 'checking') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#ffed00] animate-spin" />
      </div>
    );
  }

  if (stage === 'granted') {
    return <AdminHub onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-white p-8 w-full max-w-sm border border-white/20">
        <div className="mb-7 flex flex-col items-center text-center">
          <img src={brandMark} alt="Jazba Tickets" className="w-12 h-12 object-contain mb-4" />
          <h1 className="font-display font-bold text-2xl leading-none text-black">Admin Portal</h1>
          <p className="text-xs text-[#8a8a8a] font-medium mt-2">Jazba Tickets platform management</p>
        </div>

        {stage === 'denied' && (
          <div className="mb-5 p-3 bg-[#f7f7f7] border-l-2 border-black text-black text-xs font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>That account does not have admin access.</span>
          </div>
        )}
        {loginError && (
          <div className="mb-5 p-3 bg-[#f7f7f7] border-l-2 border-black text-black text-xs font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#666] mb-2 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@jazbaentertainment.net"
              required
              className="w-full bg-[#f7f7f7] px-3 py-3 text-sm font-medium text-black placeholder-[#8a8a8a]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#666] mb-2 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#f7f7f7] px-3 py-3 text-sm font-medium text-black placeholder-[#8a8a8a]"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#ffed00] hover:bg-[#e6d200] disabled:opacity-60 text-black py-3.5 font-bold text-sm transition-colors cursor-pointer"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <a href="/" className="block text-center text-[11px] text-[#8a8a8a] font-bold mt-6 hover:text-black hover:underline transition-colors">
          ← Back to main site
        </a>
      </div>
    </div>
  );
}
