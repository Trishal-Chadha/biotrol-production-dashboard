import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'employee' | 'viewer';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, role?: UserRole, fullName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isEmployee: boolean;
  isViewer: boolean;
  hasUsers: boolean | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const initializing = useRef(true);

  const checkHasUsers = async (): Promise<boolean> => {
    try {
      const { count, error: countError } = await supabase
        .from('user_roles')
        .select('id', { count: 'exact', head: true });
      if (countError) return false;
      return (count ?? 0) > 0;
    } catch {
      return false;
    }
  };

  const fetchUserRole = async (userId: string): Promise<{ role: UserRole; fullName: string | null } | null> => {
    const { data, error: roleError } = await supabase
      .from('user_roles')
      .select('role, full_name')
      .eq('user_id', userId)
      .maybeSingle();
    if (roleError || !data?.role) return null;
    return { role: data.role as UserRole, fullName: data.full_name ?? null };
  };

  const buildAuthUser = async (sessionUser: User): Promise<AuthUser | null> => {
    const roleData = await fetchUserRole(sessionUser.id);
    if (!roleData) return null;
    return {
      id: sessionUser.id,
      email: sessionUser.email || '',
      role: roleData.role,
      fullName: roleData.fullName,
    };
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      const usersExist = await checkHasUsers();
      setHasUsers(usersExist);

      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (currentSession?.user) {
        const authUser = await buildAuthUser(currentSession.user);
        if (authUser) {
          setUser(authUser);
          setSession(currentSession);
        } else {
          await supabase.auth.signOut();
          setError('Your account is not configured. Please contact an administrator.');
        }
      }

      initializing.current = false;
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (initializing.current) return;
      (async () => {
        if (event === 'SIGNED_IN' && newSession?.user) {
          setLoading(true);
          const authUser = await buildAuthUser(newSession.user);
          if (authUser) {
            setUser(authUser);
            setSession(newSession);
          } else {
            await supabase.auth.signOut();
            setError('Your account is not configured. Please contact an administrator.');
          }
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setError(null);
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setLoading(false);
      const msg = signInError.message === 'Invalid login credentials'
        ? 'Invalid email or password. Please try again.'
        : signInError.message;
      setError(msg);
      return { error: msg };
    }

    if (data.user) {
      const authUser = await buildAuthUser(data.user);
      if (!authUser) {
        await supabase.auth.signOut();
        setLoading(false);
        const msg = 'Your account is not configured. Please contact an administrator.';
        setError(msg);
        return { error: msg };
      }
      setUser(authUser);
      setSession(data.session);
    }

    setLoading(false);
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    role: UserRole = 'employee',
    fullName?: string,
  ): Promise<{ error: string | null }> => {
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
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role, full_name: fullName?.trim() || null });

      if (roleError) {
        console.error('Error creating user role:', roleError);
      }

      setUser({
        id: data.user.id,
        email: data.user.email || '',
        role,
        fullName: fullName?.trim() || null,
      });
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
    setError(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, error,
      signIn, signUp, signOut,
      isAdmin: user?.role === 'admin',
      isEmployee: user?.role === 'employee',
      isViewer: user?.role === 'viewer',
      hasUsers,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
