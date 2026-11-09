/**
 * Firebase web client config from REACT_APP_* env vars (see frontend/.env.example).
 * Do not commit real API keys; restrict the key in Google Cloud Console.
 */
const firebaseConfig = {
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '',
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
  firestoreDatabaseId: process.env.REACT_APP_FIREBASE_FIRESTORE_DATABASE_ID || '',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || '',
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn(
    'Firebase env is incomplete. Copy frontend/.env.example to frontend/.env and set REACT_APP_FIREBASE_* values.'
  );
}

export default firebaseConfig;
