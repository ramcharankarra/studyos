import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Signup with Email & Password
  async function signup(email, password, name, role) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile
    await updateProfile(user, { displayName: name });

    // Store user data in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name,
      email,
      role,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });

    setUserRole(role);
    return userCredential;
  }

  // Login with Email & Password
  async function login(email, password, rememberMe = false) {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserRole(userCredential.user.uid);
    
    // Update lastLogin
    import('firebase/firestore').then(({ doc, updateDoc, serverTimestamp }) => {
      updateDoc(doc(db, 'users', userCredential.user.uid), {
        lastLogin: serverTimestamp()
      }).catch(console.error);
    });
    
    return userCredential;
  }

  // Google Authentication
  async function loginWithGoogle(role, rememberMe = false) {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user document already exists
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // New Google User: Create Firestore Document
      await setDoc(docRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        role: role || 'student', // Fallback to student if role isn't provided
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
      setUserRole(role || 'student');
    } else {
      // Existing User: Fetch role and update lastLogin
      setUserRole(docSnap.data().role);
      import('firebase/firestore').then(({ updateDoc, serverTimestamp }) => {
        updateDoc(docRef, {
          lastLogin: serverTimestamp()
        }).catch(console.error);
      });
    }
    
    return result;
  }

  // Logout
  function logout() {
    setUserRole(null);
    return signOut(auth);
  }

  // Helper to fetch role
  async function fetchUserRole(uid) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setUserRole(docSnap.data().role);
      return docSnap.data().role;
    }
    return null;
  }

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserRole(user.uid);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#14b8a6] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-bold">Verifying Session...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
