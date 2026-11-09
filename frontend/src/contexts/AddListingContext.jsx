import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddListingModal } from '../components/marketplace/AddListingModal';
import { PhoneVerifyDialog } from '../components/profile/PhoneVerifyDialog';
import { hasVerifiedPhone } from '../lib/phone';
import { useAuth } from './AuthContext';

const AddListingContext = createContext(undefined);

export function AddListingProvider({ children }) {
  const { userProfile, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [listingId, setListingId] = useState(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [pendingListingId, setPendingListingId] = useState(null);

  const openListingForm = useCallback((id = null) => {
    setListingId(id || null);
    setOpen(true);
    return true;
  }, []);

  const openAddListing = useCallback((id = null) => {
    if (!userProfile) {
      navigate('/login');
      return false;
    }
    if (!hasVerifiedPhone(userProfile)) {
      setPendingListingId(id || null);
      setPhoneOpen(true);
      return false;
    }
    return openListingForm(id);
  }, [navigate, openListingForm, userProfile]);

  const closeAddListing = useCallback(() => {
    setOpen(false);
    setListingId(null);
  }, []);

  const value = useMemo(() => ({
    openAddListing,
    closeAddListing,
    isAddListingOpen: open,
  }), [closeAddListing, open, openAddListing]);

  return (
    <AddListingContext.Provider value={value}>
      {children}
      <AddListingModal
        open={open}
        listingId={listingId}
        onClose={closeAddListing}
      />
      {phoneOpen && (
        <PhoneVerifyDialog
          initialPhone={userProfile?.phone}
          userId={userProfile?.uid}
          title="Add a phone number"
          description="Enter a valid mobile number before listing a gem."
          onClose={() => {
            setPhoneOpen(false);
            setPendingListingId(null);
          }}
          onVerified={async () => {
            await refreshSession();
            setPhoneOpen(false);
            const nextId = pendingListingId;
            setPendingListingId(null);
            openListingForm(nextId);
          }}
        />
      )}
    </AddListingContext.Provider>
  );
}

export function useAddListing() {
  const context = useContext(AddListingContext);
  if (!context) {
    throw new Error('useAddListing must be used within AddListingProvider');
  }
  return context;
}
