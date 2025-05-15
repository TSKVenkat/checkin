// Auth types for consistent usage across the app

// Define status type for auth session
export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

// User type definition
export interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  permissions?: string[];
}

// Auth session return type
export interface AuthSession {
  user: User | null;
  status: SessionStatus;
  data: { isAuthenticated: boolean; };
  error: Error | null;
  isError: boolean;
  isPending: boolean;
  isLoading: boolean;
}

// UI component prop types
export interface CardProps {
  id?: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
} 