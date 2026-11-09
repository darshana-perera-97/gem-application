import { getApp, initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, RecaptchaVerifier, setPersistence, signInWithPhoneNumber, signOut } from 'firebase/auth';
import firebaseConfig from './firebaseConfig';

let ready;
let verifier;

function verificationAuth() {
  let app;
  try {
    app = getApp('phone-verify');
  } catch {
    app = initializeApp(firebaseConfig, 'phone-verify');
  }
  const phoneAuth = getAuth(app);
  if (!ready) ready = setPersistence(phoneAuth, inMemoryPersistence);
  return ready.then(() => phoneAuth);
}

export async function requestPhoneCode(phoneNumber, containerId) {
  const phoneAuth = await verificationAuth();
  if (verifier) {
    try {
      verifier.clear();
    } catch {
      // A previous widget may already be gone.
    }
    verifier = null;
  }

  verifier = new RecaptchaVerifier(phoneAuth, containerId, { size: 'invisible' });
  try {
    return await signInWithPhoneNumber(phoneAuth, phoneNumber, verifier);
  } catch (error) {
    try {
      verifier.clear();
    } catch {
      // The widget failed before it was rendered.
    }
    verifier = null;
    throw error;
  }
}

export async function confirmPhoneCode(confirmation, code) {
  const result = await confirmation.confirm(code);
  const idToken = await result.user.getIdToken();
  const phone = result.user.phoneNumber;
  const phoneAuth = await verificationAuth();
  await signOut(phoneAuth).catch(() => {});
  return { idToken, phone };
}
