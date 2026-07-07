import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'employee';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, role?: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isEmployee: boolean;
  hasUsers: boolean | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);

  // Check if any users exist in the system
  const checkHasUsers = async (): Promise<boolean> => {
    try {
      const { count, error } = await supabase
        .from('user_roles')
        .select('id', { count: 'exact', head: true });

      if (error) {
        console.error('Error checking users:', error);
        return false;
      }
      return (count ?? 0) > 0;
    } catch {
      return false;
    }
  };

  const fetchUserRole = async (userId: string): Promise<UserRole | null> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
    return data?.role as UserRole || null;
  };

  const buildAuthUser = async (sessionUser: User): Promise<AuthUser | null> => {
    const role = await fetchUserRole(sessionUser.id);
    if (!role) return null;
    return {
      id: sessionUser.id,
      email: sessionUser.email || '',
      role,
    };
  };

  const initializeAuth = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check if any users exist
    const usersExist = await checkHasUsers();
    setHasUsers(usersExist);

    const { data: { session: currentSession } } = await supabase.auth.getSession();

    if (currentSession?.user) {
      const authUser = await buildAuthUser(currentSession.user);
      if (authUser) {
        setUser(authUser);
        setSession(currentSession);
      } else {
        // User exists but has no role - sign them out
        await supabase.auth.signOut();
        setError('Your account is not configured. Please contact administrator.');
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_IN' && newSession?.user) {
        setLoading(true);
        const authUser = await buildAuthUser(newSession.user);
        if (authUser) {
          setUser(authUser);
          setSession(newSession);
        } else {
          await supabase.auth.signOut();
          setError('Your account is not configured. Please contact administrator.');
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(newSession);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initializeAuth]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setLoading(false);
      const errorMessage = signInError.message === 'Invalid login credentials'
        ? 'Invalid email or password. Please try again.'
        : signInError.message;
      setError(errorMessage);
      return { error: errorMessage };
    }

    if (data.user) {
      const authUser = await buildAuthUser(data.user);
      if (!authUser) {
        await supabase.auth.signOut();
        setLoading(false);
        const errorMsg = 'Your account is not configured. Please contact administrator.';
        setError(errorMsg);
        return { error: errorMsg };
      }
      setUser(authUser);
      setSession(data.session);
    }

    setLoading(false);
    return { error: null };
  };

  const signUp = async (email: string, password: string, role: UserRole = 'employee'): Promise<{ error: string | null }> => {
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return { error: signUpError.message };
    }

    if (data.user) {
      // Insert the role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role });

      if (roleError) {
        console.error('Error creating user role:', roleError);
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || '',
        role,
      };
      setUser(authUser);
      setSession(data.session);
      setHasUsers(true);
    }

    setLoading(false);
    return { error: null };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isAdmin: user?.role === 'admin',
    isEmployee: user?.role === 'employee',
    hasUsers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
