import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from './firebaseConfig';

const app = initializeApp(firebaseConfig);
console.log("Firebase initialized with projectId:", firebaseConfig.projectId);
console.log("Firestore database ID:", (firebaseConfig).firestoreDatabaseId || 'default');

// Use initializeFirestore with experimentalForceLongPolling for better connectivity in iframes
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (firebaseConfig).firestoreDatabaseId);

export const auth = getAuth(app);

// Error handling utility skill

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error?.message || String(error),
    code: error?.code,
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    }
  };
  console.error('Firestore Error:', JSON.stringify(errInfo, null, 2));
  return error;
}

export default app;
