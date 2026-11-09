import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, RecaptchaVerifier, signInWithPhoneNumber, deleteUser } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { API_BASE, apiFetch, apiPost } from '../lib/api';
import { removeFirestoreAccount } from '../lib/accountCleanup';

const AuthContext = createContext(undefined);

async function loadFirestoreProfile(user) {
  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    return userDoc.data();
  }

  const newProfile = {
    uid: user.uid,
    email: user.email || null,
    phone: user.phoneNumber || null,
    displayName: user.displayName || 'Guest User',
    photoURL: user.photoURL || '',
    role: 'USER',
    followersCount: 0,
    followingCount: 0,
    lastActive: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(userDocRef, {
      ...newProfile,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to create user profile:', err);
  }

  return newProfile;
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const sessionRef = useRef(null);
  const firebaseRef = useRef(undefined);
  const readyRef = useRef({ firebase: false, session: false });
  const generation = useRef(0);

  const publish = () => {
    if (!readyRef.current.firebase || !readyRef.current.session) return;

    if (firebaseRef.current) {
      const session = sessionRef.current;
      const profile = {
        ...firebaseRef.current.profile,
        photoURL: session?.photoURL || firebaseRef.current.profile.photoURL,
        googlePhotoURL: session?.googlePhotoURL || firebaseRef.current.profile.googlePhotoURL || null,
        displayName: session?.displayName || firebaseRef.current.profile.displayName,
        phone: session?.phone || firebaseRef.current.profile.phone,
        phoneVerified: Boolean(session?.phoneVerified || firebaseRef.current.profile.phoneVerified),
      };
      setCurrentUser(firebaseRef.current.user);
      setUserProfile(profile);
    } else if (sessionRef.current) {
      setCurrentUser(sessionRef.current);
      setUserProfile(sessionRef.current);
    } else {
      setCurrentUser(null);
      setUserProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const ticket = ++generation.current;
      if (user) {
        try {
          const profile = await loadFirestoreProfile(user);
          if (ticket !== generation.current) return;
          firebaseRef.current = { user, profile };
        } catch (err) {
          console.error('Failed to load user profile:', err);
          if (ticket !== generation.current) return;
          firebaseRef.current = {
            user,
            profile: {
              uid: user.uid,
              email: user.email || null,
              phone: user.phoneNumber || null,
              displayName: user.displayName || 'Guest User',
              photoURL: user.photoURL || '',
              role: 'USER',
            },
          };
        }
      } else {
        firebaseRef.current = null;
      }
      readyRef.current.firebase = true;
      publish();
    });

    apiFetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((data) => {
        sessionRef.current = data.user || null;
      })
      .catch((err) => {
        console.error('Failed to load Google session:', err);
        sessionRef.current = null;
      })
      .finally(() => {
        readyRef.current.session = true;
        publish();
      });

    return unsubscribe;
  }, []);

  const refreshSession = async () => {
    const response = await apiFetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
    const data = response.ok ? await response.json() : { user: null };
    sessionRef.current = data.user || null;
    if (firebaseRef.current) {
      const profile = {
        ...firebaseRef.current.profile,
        photoURL: sessionRef.current?.photoURL || firebaseRef.current.profile.photoURL,
        googlePhotoURL: sessionRef.current?.googlePhotoURL || firebaseRef.current.profile.googlePhotoURL || null,
        displayName: sessionRef.current?.displayName || firebaseRef.current.profile.displayName,
        phone: sessionRef.current?.phone || firebaseRef.current.profile.phone,
        phoneVerified: Boolean(sessionRef.current?.phoneVerified || firebaseRef.current.profile.phoneVerified),
      };
      firebaseRef.current = { ...firebaseRef.current, profile };
      setUserProfile(profile);
    } else {
      setCurrentUser(sessionRef.current);
      setUserProfile(sessionRef.current);
    }
    return sessionRef.current;
  };

  const login = () => {
    setAuthError('');
    window.location.assign(`${API_BASE}/api/auth/google`);
  };

  const loginWithPhone = async (phoneNumber, recaptchaId) => {
    const verifier = new RecaptchaVerifier(auth, recaptchaId, {
      size: 'invisible',
    });
    return await signInWithPhoneNumber(auth, phoneNumber, verifier);
  };

  const deleteAccount = async ({ reason, details, confirmation }) => {
    const session = sessionRef.current || await refreshSession();
    const firebaseUser = auth.currentUser;
    const uid = session?.uid || firebaseUser?.uid;
    if (!uid) {
      throw new Error('Sign in to delete your account.');
    }

    const phoneOnly = Boolean(
      firebaseUser
      && firebaseUser.providerData.length > 0
      && firebaseUser.providerData.every((provider) => provider.providerId === 'phone')
    );

    if (session) {
      await apiPost('/api/account/delete', { reason, details, confirmation }, { credentials: 'include' });
      sessionRef.current = null;
      const failures = await removeFirestoreAccount(db, uid);
      if (failures.length) {
        console.error('Some profile data could not be removed:', failures.map((error) => error.message));
      }
      if (firebaseUser) {
        try {
          await deleteUser(firebaseUser);
        } catch (error) {
          console.error('The sign-in provider kept the login. The GemBook account was still removed.', error);
        }
      }
      await logout();
      return;
    }

    if (!phoneOnly) {
      throw new Error('Sign in again, then delete your account.');
    }

    await apiPost('/api/account/feedback', { reason, details, confirmation });

    try {
      await deleteUser(firebaseUser);
    } catch (error) {
      if (error?.code === 'auth/requires-recent-login') {
        throw new Error('Sign out, sign in again, and then delete your account.');
      }
      throw error;
    }

    const failures = await removeFirestoreAccount(db, uid);
    if (failures.length) {
      console.error('Some profile data could not be removed:', failures.map((item) => item.message));
    }
    generation.current += 1;
    firebaseRef.current = null;
    setCurrentUser(null);
    setUserProfile(null);
  };

  const logout = async () => {
    generation.current += 1;
    sessionRef.current = null;
    try {
      await apiFetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Failed to clear Google session:', err);
    }
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
    if (!auth.currentUser) {
      firebaseRef.current = null;
      setCurrentUser(null);
      setUserProfile(null);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, authError, login, loginWithPhone, refreshSession, logout, deleteAccount }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
