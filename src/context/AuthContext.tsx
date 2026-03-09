import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, signInAnonymously, onAuthStateChanged } from '../lib/firebase';
import type { User } from '../lib/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (name: string) => Promise<void>;
    updateDisplayName: (name: string) => void;
    displayName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [displayName, setDisplayName] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                // We can store the chosen display name in localStorage or Firestore
                const storedName = localStorage.getItem('poker_display_name_v1');
                if (storedName) {
                    setDisplayName(storedName);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const handleUnload = () => {
            if (auth.currentUser) {
                // Best effort to delete anonymous account on session close
                auth.currentUser.delete().catch(() => { });
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, []);

    const signIn = async (name: string) => {
        try {
            await signInAnonymously(auth);
            handleUpdateDisplayName(name);
        } catch (error) {
            console.error("Error signing in anonymously:", error);
        }
    };

    const handleUpdateDisplayName = (name: string) => {
        setDisplayName(name);
        localStorage.setItem('poker_display_name_v1', name);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, updateDisplayName: handleUpdateDisplayName, displayName }}>
            {children}
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
