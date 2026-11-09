import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, Globe, ShieldCheck, Mail, Phone, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiPost } from '../lib/api';
import { LoadingImage } from '../components/ui/LoadingImage';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO } from '../lib/seo';

const GOOGLE_ERRORS = {
  google_not_configured: 'Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env, then restart the API.',
  access_denied: 'Google sign-in was cancelled.',
  google_failed: 'Google sign-in failed. Check the client ID, secret, and redirect URI in backend/.env.',
};

export const AuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const idToken = hash.get('id_token');

    async function finish() {
      if (idToken) {
        try {
          await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
        } catch (err) {
          console.error('Firebase did not accept the Google token. The account is still saved on the API.', err);
        }
      }
      window.history.replaceState(null, '', '/auth/callback');
      navigate('/profile', { replace: true });
    }

    finish();
  }, [navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-slate-500 font-bold">
      <Seo
        title={PAGE_SEO.authCallback.title}
        description={PAGE_SEO.authCallback.description}
        noindex
      />
      <Loader2 className="animate-spin mr-2" />
      Signing you in…
    </div>
  );
};

export const LoginPage = () => {
  const { currentUser, login, loginWithPhone, refreshSession, authError } = useAuth();
  const [searchParams] = useSearchParams();
  const [googleError, setGoogleError] = useState(GOOGLE_ERRORS[searchParams.get('error')] || '');
  const accountDeleted = searchParams.get('deleted') === '1';
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('options');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);

  if (currentUser) {
    return <Navigate to="/profile" />;
  }

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Ensure phone number starts with + for international format
      const formattedPhone = phone.startsWith('+') ? phone : `+94${phone}`;
      const result = await loginWithPhone(formattedPhone, 'recaptcha-container');
      setConfirmationResult(result);
      setStep('otp');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Phone Authentication is not enabled in your Firebase project. Please enable it in the Firebase Console (Authentication > Sign-in method).');
      } else {
        setError(err.message || 'Failed to send verification code. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiPost('/api/auth/email/request', { email: email.trim() }, { credentials: 'include' });
      setOtp('');
      setStep('emailOtp');
    } catch (err) {
      setError(err.message || 'Could not send the verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiPost('/api/auth/email/verify', { email: email.trim(), code: otp }, { credentials: 'include' });
      await refreshSession();
    } catch (err) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setError('');
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      // Auth stage change will be handled by AuthContext listener
    } catch (err) {
      setError('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 min-h-[80vh] flex flex-col justify-center">
      <Seo title={PAGE_SEO.login.title} description={PAGE_SEO.login.description} noindex />
      <div id="recaptcha-container"></div>
      
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-8 text-center bg-slate-50 border-b border-slate-100 flex flex-col items-center">
           <AnimatePresence mode="wait">
             <motion.div 
               key={step}
               initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
               animate={{ scale: 1, opacity: 1, rotate: step === 'options' ? 3 : 0 }}
               exit={{ scale: 0.8, opacity: 0 }}
               className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6"
             >
                {step === 'options' && <Globe size={40} />}
                {step === 'email' && <Mail size={40} />}
                {step === 'phone' && <Phone size={40} />}
                {(step === 'otp' || step === 'emailOtp') && <ShieldCheck size={40} />}
             </motion.div>
           </AnimatePresence>
           
           <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
             {step === 'options' && 'Welcome to GemBook'}
             {step === 'email' && 'Enter Email Address'}
             {step === 'phone' && 'Enter Mobile Number'}
             {(step === 'otp' || step === 'emailOtp') && 'Verify Code'}
           </h1>
           <p className="text-slate-500 text-sm font-medium">
             {step === 'options' && "The world's premier digital gemstone exchange"}
             {step === 'email' && "We'll email you a one-time verification code"}
             {step === 'phone' && "We'll send a one-time verification code"}
             {step === 'otp' && `Sent to ${phone}`}
             {step === 'emailOtp' && `Sent to ${email}`}
           </p>
        </div>
        
        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 'options' && (
              <motion.div 
                key="options"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="space-y-4"
              >
                <button 
                  onClick={async () => {
                    setGoogleError('');
                    try {
                      await login();
                    } catch (err) {
                      setGoogleError(err.message || 'Google sign-in failed.');
                    }
                  }}
                  className="w-full py-4 bg-white border border-slate-200 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 active:scale-95 transition-all shadow-sm group"
                >
                  <LoadingImage src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
                  Sign in with Google
                </button>
                {accountDeleted && (
                  <p className="text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    Your account has been deleted. Thanks for the feedback.
                  </p>
                )}
                {(googleError || authError) && (
                  <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{googleError || authError}</p>
                )}

                <button
                  onClick={() => { setError(''); setStep('email'); }}
                  className="w-full py-4 bg-white border border-slate-200 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                >
                  <Mail size={20} />
                  Sign in with Email
                </button>
                
                <button 
                  onClick={() => setStep('phone')}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 active:scale-95 transition-all shadow-xl"
                >
                  <Phone size={20} />
                  Sign in with Contact Number
                </button>
              </motion.div>
            )}

            {step === 'email' && (
              <motion.form
                key="email"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                onSubmit={handleSendEmailOtp}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full py-4 px-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                    required
                    autoFocus
                  />
                </div>

                {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    disabled={loading || !email.includes('@')}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'Email OTP Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setError(''); setStep('options'); }}
                    className="w-full py-3 text-slate-500 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={14} /> Back to Sign in
                  </button>
                </div>
              </motion.form>
            )}

            {step === 'emailOtp' && (
              <motion.form
                key="emailOtp"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                onSubmit={handleVerifyEmailOtp}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">6-Digit Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="· · · · · ·"
                    className="w-full py-5 text-center text-3xl tracking-[0.5em] bg-slate-50 border-2 border-slate-100 rounded-2xl font-black focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                    required
                    autoFocus
                  />
                </div>

                {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    disabled={loading || otp.length !== 6}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-primary/90 disabled:opacity-50 transition-all shadow-xl"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'Verify & Continue'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setError(''); setOtp(''); setStep('email'); }}
                    className="w-full py-3 text-slate-500 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={14} /> Use a different email
                  </button>
                </div>
              </motion.form>
            )}

            {step === 'phone' && (
              <motion.form 
                key="phone"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                onSubmit={handleSendOtp}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">+94</span>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="77 123 4567"
                      className="w-full py-4 pl-14 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

                <div className="flex flex-col gap-3 pt-2">
                  <button 
                    disabled={loading || phone.length < 9}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'Get OTP Code'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep('options')}
                    className="w-full py-3 text-slate-500 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={14} /> Back to Sign in
                  </button>
                </div>
              </motion.form>
            )}

            {step === 'otp' && (
              <motion.form 
                key="otp"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                onSubmit={handleVerifyOtp}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">6-Digit Verification Code</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="· · · · · ·"
                    className="w-full py-5 text-center text-3xl tracking-[0.5em] bg-slate-50 border-2 border-slate-100 rounded-2xl font-black focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                    required
                    autoFocus
                  />
                </div>

                {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

                <div className="flex flex-col gap-3 pt-2">
                  <button 
                    disabled={loading || otp.length !== 6}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-primary/90 disabled:opacity-50 transition-all shadow-xl"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'Verify & Continue'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep('phone')}
                    className="w-full py-3 text-slate-500 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={14} /> Use different number
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="pt-8 border-t border-slate-100 mt-8">
            <div className="flex items-center gap-3 text-slate-400 mb-4 justify-center">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Enterprise Security Verified</span>
            </div>
            <p className="text-[10px] text-center text-slate-400 leading-relaxed">
              By continuing, you agree to GemBook's Terms of Service and{' '}
              <Link to="/privacy" className="text-primary font-bold hover:underline whitespace-nowrap">Privacy Policy</Link>.
              All accounts undergo professional verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
