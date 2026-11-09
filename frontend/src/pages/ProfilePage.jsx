import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, Mail, Phone, Shield, LogOut, ChevronRight, Store, AlertCircle, Trash2, MapPin, Globe, FileText } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiPost } from '../lib/api';
import { PhoneVerifyDialog } from '../components/profile/PhoneVerifyDialog';
import { SellerProfileView } from '../components/profile/SellerProfileView';
import { usePageReady } from '../contexts/PageLoadingContext';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO } from '../lib/seo';

const DELETE_REASONS = [
  { id: 'not_using', label: 'I don’t use GemBook anymore' },
  { id: 'privacy', label: 'I have privacy concerns' },
  { id: 'notifications', label: 'Too many notifications' },
  { id: 'marketplace_problem', label: 'I had a problem with the marketplace' },
  { id: 'new_account', label: 'I want to start over with a new account' },
  { id: 'other', label: 'Something else' },
];

export const ProfilePage = () => {
  const { userProfile, logout, deleteAccount, refreshSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [applied, setApplied] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [profileReady, setProfileReady] = useState(!userProfile?.uid);
  const [profileVersion, setProfileVersion] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isGuest = !userProfile;
  const requestedTab = String(searchParams.get('tab') || '').trim().toLowerCase();
  usePageReady(isGuest || profileReady);

  useEffect(() => {
    if (!isGuest) return;
    if (requestedTab === 'collection' || requestedTab === 'reviews') {
      navigate('/login', { replace: true });
    }
  }, [isGuest, navigate, requestedTab]);

  const profile = {
    ...(userProfile ?? {
    displayName: 'Guest User',
    email: 'Sign in to sync your account',
    phone: null,
    photoURL: null,
    googlePhotoURL: null,
    role: 'GUEST',
  }),
    ...overrides,
  };

  const handleBecomeVendor = async () => {
    if (!userProfile) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/api/users/vendor', {
        userId: userProfile.uid,
        displayName: userProfile.displayName,
        email: userProfile.email,
        photoURL: userProfile.photoURL,
      });
      try {
        const userRef = doc(db, 'users', userProfile.uid);
        await updateDoc(userRef, {
          role: 'VENDOR',
          vendorStatus: 'PENDING'
        });
      } catch (firestoreError) {
        console.error('Error applying for vendor:', firestoreError);
      }
      setApplied(true);
      setNotice('Application submitted. Our team will review your vendor profile.');
    } catch (error) {
      console.error('Error applying for vendor:', error);
      setNotice('Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };

  const saveField = async (field, value) => {
    if (!userProfile) {
      navigate('/login');
      return;
    }
    try {
      const saved = await apiPost('/api/users/profile', { userId: userProfile.uid, [field]: value });
      const nextValue = saved?.[field] !== undefined ? saved[field] : value;
      try {
        await updateDoc(doc(db, 'users', userProfile.uid), { [field]: nextValue });
      } catch (firestoreError) {
        console.error(firestoreError);
      }
      setOverrides((current) => ({ ...current, [field]: nextValue }));
      if (field === 'photoURL' || field === 'coverImage' || field === 'displayName' || field === 'description' || field === 'bio' || field === 'location' || field === 'website') {
        try {
          await refreshSession();
        } catch (sessionError) {
          console.error(sessionError);
        }
        setProfileVersion((version) => version + 1);
      }
      setNotice('Saved to your account.');
      setEditing(null);
      return nextValue;
    } catch (error) {
      setNotice(error.message || 'Could not save that change.');
      return null;
    }
  };

  const accountSettings = (
    <div className="w-full space-y-8">
      {isGuest && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-700 font-medium">
            You are browsing as a guest. Sign in to save settings and manage your listings.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="shrink-0 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg"
          >
            Sign In
          </button>
        </div>
      )}

      {notice && <p className="text-sm font-medium text-primary">{notice}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="font-black text-slate-900 uppercase tracking-widest text-sm px-2">Account Settings</h2>
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <SettingsItem icon={User} label="Display Name" value={profile.displayName} onClick={() => { setEditing('displayName'); setEditValue(profile.displayName || ''); }} />
            <SettingsItem icon={FileText} label="About" value={profile.description || profile.bio || 'Add a short bio'} onClick={() => { setEditing('description'); setEditValue(profile.description || profile.bio || ''); }} />
            <SettingsItem icon={MapPin} label="Location" value={profile.location || 'Add your city'} onClick={() => { setEditing('location'); setEditValue(profile.location || ''); }} />
            <SettingsItem icon={Globe} label="Website" value={profile.website || 'Add a website'} onClick={() => { setEditing('website'); setEditValue(profile.website || ''); }} />
            <SettingsItem icon={Mail} label="Email Address" value={profile.email} onClick={() => { setEditing('email'); setEditValue(profile.email || ''); }} />
            <SettingsItem
              icon={Phone}
              label="Phone Number"
              value={profile.phone || 'Not linked'}
              hint={profile.phone ? 'Saved' : ''}
              onClick={() => {
                if (!userProfile) {
                  navigate('/login');
                  return;
                }
                setEditing(null);
                setPhoneOpen(true);
              }}
            />
            <SettingsItem icon={Shield} label="Security" value={profile.twoFactor ? 'Two-factor on' : 'Two-factor off'} last onClick={() => saveField('twoFactor', !profile.twoFactor)} />
            {editing && editing !== 'phone' && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  saveField(editing, editValue);
                }}
                className="p-4 flex gap-2 border-t border-slate-100"
              >
                {editing === 'description' ? (
                  <textarea value={editValue} onChange={(event) => setEditValue(event.target.value)} rows={3} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none" />
                ) : (
                  <input value={editValue} onChange={(event) => setEditValue(event.target.value)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none" />
                )}
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold self-start">Save</button>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-black text-slate-900 uppercase tracking-widest text-sm px-2">Business Portal</h2>
          <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Store size={120} />
            </div>
            <div className="relative z-10">
              {profile.role === 'VENDOR' || applied ? (
                <>
                  <h3 className="text-xl font-bold mb-2">Vendor Dashboard</h3>
                  <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                    Access your business analytics, manage inventory, and respond to inquiries.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/vendor/dashboard')}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                  >
                    Go to Command Center
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold mb-2">Grow Your Business</h3>
                  <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                    Join the premier network of Sri Lankan gemstone dealers. Start listing today.
                  </p>
                  <button
                    type="button"
                    onClick={handleBecomeVendor}
                    disabled={loading}
                    className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Apply'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
            <AlertCircle className="text-amber-500 shrink-0" size={20} />
            <p className="text-[10px] text-amber-700 font-medium leading-relaxed uppercase tracking-wider">
              Identity verification is required for all vendors to maintain the highest standards of trust in the marketplace.
            </p>
          </div>
        </div>
      </div>

      {!isGuest && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
                <LogOut size={20} />
              </div>
              <div>
                <h2 className="font-black text-slate-900 uppercase tracking-widest text-sm">Sign out</h2>
                <p className="text-sm text-slate-500 mt-1 max-w-xl">
                  End your session on this device. You can sign back in anytime.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:text-red-500 hover:border-red-200 transition-colors"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-red-100 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-50 rounded-xl text-red-500">
                <Trash2 size={20} />
              </div>
              <div>
                <h2 className="font-black text-slate-900 uppercase tracking-widest text-sm">Delete account</h2>
                <p className="text-sm text-slate-500 mt-1 max-w-xl">
                  Remove your profile, listings, and messages. You’ll be asked why you’re leaving, then asked to confirm.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="shrink-0 px-5 py-3 rounded-2xl border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors"
            >
              Delete account
            </button>
          </div>
        </div>
      )}

      {phoneOpen && (
        <PhoneVerifyDialog
          initialPhone={profile.phone}
          userId={userProfile?.uid}
          onClose={() => setPhoneOpen(false)}
          onVerified={async (phone) => {
            setOverrides((current) => ({ ...current, phone, phoneVerified: true }));
            setNotice('Phone number saved.');
            setPhoneOpen(false);
            try {
              await refreshSession();
            } catch (error) {
              console.error(error);
            }
          }}
        />
      )}

      {deleteOpen && (
        <DeleteAccountDialog
          onClose={() => setDeleteOpen(false)}
          onDelete={async (feedback) => {
            await deleteAccount(feedback);
            navigate('/login?deleted=1', { replace: true });
          }}
        />
      )}
    </div>
  );

  if (isGuest) {
    return (
      <>
        <Seo title={PAGE_SEO.profile.title} description={PAGE_SEO.profile.description} noindex />
        {accountSettings}
      </>
    );
  }

  return (
    <SellerProfileView
      key={`${userProfile.uid}-${profileVersion}`}
      profileId={userProfile.uid}
      onLoaded={() => setProfileReady(true)}
      settings={accountSettings}
      onProfileUpdated={(saved) => {
        if (!saved) return;
        setOverrides((current) => ({
          ...current,
          displayName: saved.displayName ?? current.displayName,
          photoURL: saved.photoURL ?? current.photoURL,
          coverImage: saved.coverImage ?? current.coverImage,
          description: saved.description ?? current.description,
          bio: saved.bio ?? current.bio,
          location: saved.location ?? current.location,
          website: saved.website ?? current.website,
        }));
      }}
    />
  );
};

const DeleteAccountDialog = ({ onClose, onDelete }) => {
  const [step, setStep] = useState('feedback');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const detailsRequired = reason === 'other';
  const feedbackReady = Boolean(reason) && (!detailsRequired || details.trim().length >= 3);
  const confirmed = confirmation.trim() === 'DELETE' && acknowledged;

  const handleDelete = async () => {
    if (!confirmed || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await onDelete({ reason, details: details.trim(), confirmation: confirmation.trim() });
    } catch (err) {
      setError(err.message || 'Could not delete the account.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-6 sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="delete-account-title" className="text-2xl font-black text-slate-900 tracking-tight">
          {step === 'feedback' ? 'Why are you leaving?' : 'Confirm deletion'}
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          {step === 'feedback'
            ? 'Your feedback is saved without your name, email, or account id.'
            : 'This permanently deletes the account. Your name is removed from posts, comments, and reviews. Listings, the vendor profile, and conversations are deleted.'}
        </p>

        {step === 'feedback' ? (
          <fieldset className="mt-6 space-y-3">
            <legend className="sr-only">Reason for leaving</legend>
            {DELETE_REASONS.map((option) => (
              <label key={option.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 cursor-pointer hover:border-primary/40">
                <input
                  type="radio"
                  name="delete-reason"
                  value={option.id}
                  checked={reason === option.id}
                  onChange={() => setReason(option.id)}
                  className="accent-primary"
                />
                <span className="text-sm font-semibold text-slate-800">{option.label}</span>
              </label>
            ))}
            <label className="block pt-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {detailsRequired ? 'Tell us more' : 'Anything else? (optional)'}
              </span>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={1000}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                placeholder={detailsRequired ? 'What should we know?' : 'Optional details'}
              />
            </label>
          </fieldset>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type DELETE to confirm</span>
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold tracking-widest outline-none focus:border-red-400"
                placeholder="DELETE"
              />
            </label>
            <label className="flex items-start gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-1 accent-red-600"
              />
              I understand this cannot be undone.
            </label>
          </div>
        )}

        {error && (
          <p className="mt-4 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={step === 'confirm' ? () => { setStep('feedback'); setError(''); } : onClose}
            disabled={submitting}
            className="px-5 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {step === 'confirm' ? 'Back' : 'Cancel'}
          </button>
          {step === 'feedback' ? (
            <button
              type="button"
              disabled={!feedbackReady}
              onClick={() => setStep('confirm')}
              className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={!confirmed || submitting}
              onClick={handleDelete}
              className="px-5 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm disabled:opacity-40"
            >
              {submitting ? 'Deleting…' : 'Delete my account'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SettingsItem = ({ icon: Icon, label, value, hint, last, onClick }) => (
  <button type="button" onClick={onClick} className={cn(
    "w-full text-left p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group",
    !last && "border-b border-slate-100"
  )}>
    <div className="flex items-center gap-4">
      <div className="p-2 bg-slate-100 rounded-xl text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-all">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="font-bold text-slate-900">{value}</p>
        {hint && <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{hint}</p>}
      </div>
    </div>
    <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
  </button>
);

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
