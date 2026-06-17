import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Mail, LogOut, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { isUserBootstrappedAdmin } from '../services/backendService';
import AdminHub from './AdminHub';

type AuthStage = 'checking' | 'signed-out' | 'denied' | 'granted';

export default function AdminPortal() {
  const [stage, setStage] = useState<AuthStage>('checking');
  const [adminName, setAdminName] = useState('');
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
        let role = '';
        let name = user.displayName || user.email || 'Admin';
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          role = data.role || '';
          name = data.name || name;
        }
        const isAdmin = isUserBootstrappedAdmin(user.email) || role === 'admin';
        if (isAdmin) {
          setAdminName(name);
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
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#E34718] animate-spin" />
      </div>
    );
  }

  if (stage === 'granted') {
    return (
      <div className="min-h-screen bg-neutral-50" id="admin-portal-root">
        <div className="bg-neutral-950 text-white px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#E34718]" />
            <div>
              <span className="font-display font-bold text-sm block leading-none">Jazbaticket Admin Portal</span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">Signed in as {adminName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-300 hover:text-white"
            >
              <span>View Site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 py-2 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-full cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
          <AdminHub />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-neutral-200/90 rounded-[28px] p-8 w-full max-w-sm shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-[#E34718] rounded-full flex items-center justify-center border-2 border-[#C23A12]/30 shadow-xs mb-3">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display font-bold text-lg text-neutral-800">Admin Portal</h1>
          <p className="text-xs text-neutral-400 font-medium mt-1">Jazbaticket platform management</p>
        </div>

        {stage === 'denied' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>That account does not have admin access.</span>
          </div>
        )}
        {loginError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@jazbaticket.com"
              required
              className="w-full bg-white border-2 border-neutral-200/80 rounded-xl p-3 text-sm font-semibold focus:ring-1 focus:ring-[#E34718] focus:outline-none text-neutral-800 placeholder-neutral-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-white border-2 border-neutral-200/80 rounded-xl p-3 text-sm font-semibold focus:ring-1 focus:ring-[#E34718] focus:outline-none text-neutral-800 placeholder-neutral-300"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#E34718] hover:bg-[#C23A12] disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm uppercase transition-all shadow-sm cursor-pointer"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <a href="/" className="block text-center text-[11px] text-neutral-400 font-semibold mt-5 hover:text-neutral-600 hover:underline">
          ← Back to main site
        </a>
      </div>
    </div>
  );
}
