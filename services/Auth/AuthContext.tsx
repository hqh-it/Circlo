// AuthContext.tsx
import { useRouter } from 'expo-router';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../../firebaseConfig';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  logout: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      router.replace('/screens/Auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const isBanned = userData?.isBanned === true;
            const isSuspended = userData?.isSuspended === true;
            const suspendedUntil = userData?.suspendedUntil?.toDate();
            
            if (isBanned) {
              await signOut(auth);
              setUser(null);
              return;
            }
            
            if (isSuspended && suspendedUntil) {
              const now = new Date();
              if (now < suspendedUntil) {
                await signOut(auth);
                setUser(null);
                return;
              } else {
                await updateDoc(doc(db, "users", user.uid), {
                  isSuspended: false,
                  suspendReason: null,
                  suspendedUntil: null,
                  isActive: true,
                  updatedAt: new Date()
                });
              }
            }
            
            setUser(user);
          } else {
            setUser(user);
          }
        } catch (error) {
          console.error('Error checking user status:', error);
          setUser(user);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);