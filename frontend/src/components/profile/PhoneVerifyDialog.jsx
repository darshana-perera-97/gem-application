import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Phone } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { apiPost } from '../../lib/api';

function localPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.startsWith('94') ? digits.slice(2) : digits;
}

export function PhoneVerifyDialog({
  initialPhone,
  userId,
  onClose,
  onVerified,
  title = 'Add phone number',
  description = 'Enter a valid mobile number.',
}) {
  const [phone, setPhone] = useState(() => localPhone(initialPhone));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const alive = useRef(true);

  useEffect(() => () => {
    alive.current = false;
  }, []);

  const close = () => {
    alive.current = false;
    onClose();
  };

  const savePhone = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const formatted = `+94${phone}`;
      const saved = await apiPost('/api/users/phone', { phone: formatted }, { credentials: 'include' });
      if (!alive.current) return;
      const phoneNumber = saved.user?.phone || formatted;
      if (userId) {
        try {
          await updateDoc(doc(db, 'users', userId), { phone: phoneNumber, phoneVerified: true });
        } catch (firestoreError) {
          console.error(firestoreError);
        }
      }
      await onVerified(phoneNumber);
    } catch (err) {
      console.error(err);
      if (!alive.current) return;
      setError(err?.message || 'Could not save that phone number.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/60 flex items-end sm:items-center justify-center p-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-phone-title"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-5">
          <Phone size={28} />
        </div>
        <h2 id="verify-phone-title" className="text-2xl font-black text-slate-900 tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-slate-500 mt-2">{description}</p>

        <form onSubmit={savePhone} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile number</span>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">+94</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="77 123 4567"
                autoFocus
                className="w-full py-4 pl-14 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary"
              />
            </div>
          </label>
          {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="px-5 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={submitting || phone.length < 9} className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Save number'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
