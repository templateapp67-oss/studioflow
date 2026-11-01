import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../lib/adminSchemas';

export interface AdminAuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  expired: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearExpired: () => void;
  reauthenticate: (email: string, password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}
export const AdminAuthContext = createContext<AdminAuthState | null>(null);
