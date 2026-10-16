import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

// Auth API re-exports — pages import these from '../firebase' so the
// auth implementation stays swappable behind a single module.
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
} from 'firebase/auth';
export type { User } from 'firebase/auth';

/** A visitor-friendly message for a failed Google/Facebook popup sign-in,
 *  or '' when the visitor simply closed the popup. */
export function socialSignInErrorMessage(err: any, provider: 'Google' | 'Facebook'): string {
  const code: string = err?.code || '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
  console.error(`${provider} sign-in failed:`, code, err?.message);
  switch (code) {
    case 'auth/popup-blocked':
      return `Your browser blocked the ${provider} sign-in window. Allow pop-ups for this site and try again.`;
    // This web address isn't on the Firebase authorized-domains list, or the
    // provider isn't switched on in Firebase Authentication → Sign-in method.
    case 'auth/unauthorized-domain':
    case 'auth/operation-not-allowed':
      return `${provider} sign-in isn't available right now. Please use your email and password instead.`;
    case 'auth/account-exists-with-different-credential':
      return `You already have an account with this email. Sign in the way you did before — with your email and password, or with ${provider === 'Google' ? 'Facebook' : 'Google'}.`;
    case 'auth/network-request-failed':
      return 'Network problem — check your connection and try again.';
    default:
      return `${provider} sign-in didn't work. Please try again, or use your email and password.`;
  }
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Reads (GET/LIST) fall back to the caller's default value (e.g. `return []`)
  // instead of throwing, so a permissions/network blip doesn't break public pages
  // with an unhandled rejection. Writes still throw so the caller's UI can react.
  if (operationType === OperationType.CREATE || operationType === OperationType.UPDATE || operationType === OperationType.DELETE || operationType === OperationType.WRITE) {
    throw new Error(JSON.stringify(errInfo));
  }
}
