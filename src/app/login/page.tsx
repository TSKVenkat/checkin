'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLogin, tokenStorage, useAuthSession } from '@/lib/query/auth-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';

// Component that uses useSearchParams
function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '';
  const errorParam = searchParams.get('error') || '';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userType: 'staff' // Default to staff login
  });

  const [errorMessage, setErrorMessage] = useState(errorParam || '');
  
  // Check if user is already authenticated
  const { data: sessionData } = useAuthSession({
    onUnauthenticated: () => {/* Do nothing, we're already on login page */},
    // Don't auto-redirect on login page
    refetchOnMount: true,
  });
  
  // Redirect if already authenticated
  useEffect(() => {
    if (sessionData?.isAuthenticated) {
      const user = tokenStorage.getUser();
      if (user) {
        if (callbackUrl) {
          router.push(callbackUrl);
        } else if (user.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (user.role === 'manager') {
          router.push('/admin/dashboard');
        } else if (user.role === 'attendee' || user.role === 'speaker') {
          router.push('/attendee');
        } else {
          router.push('/dashboard');
        }
      }
    }
  }, [sessionData, router, callbackUrl]);

  // Standard staff login mutation
  const staffLoginMutation = useLogin();

  // Attendee login mutation
  const attendeeLoginMutation = useMutation({
    mutationFn: async (email: string) => {
      try {
        // In a production app, this would be a real API call
        const response = await fetch('/api/auth/attendee-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });
        
        if (!response.ok) {
          throw new Error('Authentication failed');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        tokenStorage.setUser(data.user);
        queryClient.setQueryData(['auth', 'user'], data.user);
        queryClient.setQueryData(['auth', 'session'], { isAuthenticated: true });
        router.push(data.redirectUrl || '/attendee');
      } else {
        setErrorMessage(data.message || 'Authentication failed');
      }
    },
    onError: () => {
      setErrorMessage('Attendee not found. Please check your email.');
    }
  });

  // Speaker login mutation
  const speakerLoginMutation = useMutation({
    mutationFn: async (email: string) => {
      try {
        // In a production app, this would be a real API call
        const response = await fetch('/api/auth/speaker-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });
        
        if (!response.ok) {
          throw new Error('Authentication failed');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        tokenStorage.setUser(data.user);
        queryClient.setQueryData(['auth', 'user'], data.user);
        queryClient.setQueryData(['auth', 'session'], { isAuthenticated: true });
        router.push(data.redirectUrl || '/attendee');
      } else {
        setErrorMessage(data.message || 'Authentication failed');
      }
    },
    onError: () => {
      setErrorMessage('Authentication failed. Please verify your email.');
    }
  });

  // Combined loading state from all mutations
  const isLoading = useMemo(() => 
    staffLoginMutation.isPending || 
    attendeeLoginMutation.isPending || 
    speakerLoginMutation.isPending, 
    [staffLoginMutation.isPending, attendeeLoginMutation.isPending, speakerLoginMutation.isPending]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      if (formData.userType === 'attendee') {
        attendeeLoginMutation.mutate(formData.email);
      } else if (formData.userType === 'speaker') {
        speakerLoginMutation.mutate(formData.email);
      } else {
        // Staff, admin, or manager authentication
        if (!formData.email || !formData.password) {
          setErrorMessage('Email and password are required');
          return;
        }
        
        staffLoginMutation.mutate({
          email: formData.email,
          password: formData.password
        });
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-dark-bg-primary">
      <div className="mb-12 flex items-center justify-center relative">
        <div className="absolute -z-10 h-[300px] w-[300px] bg-gradient-radial from-primary/20 to-transparent opacity-80 blur-3xl"></div>
        <img src="/logo-white.svg" alt="CheckIn" className="h-12 relative z-10" />
      </div>
      
      <Card 
        className="w-full max-w-md shadow-xl shadow-dark-bg-primary/50" 
        padding="lg"
        variant="elevated"
        spotlight={true}
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-3">
            Sign in to your account
          </h2>
          <p className="text-gray-400 text-sm">
            Welcome to the CheckIn Event Management System
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-md bg-error/10 border-l-4 border-error text-red-300">
            <p>{errorMessage}</p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="userType" className="block text-sm font-medium text-gray-300 mb-1.5">
                Login as
              </label>
              <select
                id="userType"
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                className="w-full rounded-md border border-dark-border bg-dark-bg-tertiary text-white py-2 px-3 focus:outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/30"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="speaker">Speaker</option>
                <option value="attendee">Attendee</option>
              </select>
            </div>

            <Input
              label="Email address"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@company.com"
              required
              leftAddon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              }
            />

            {formData.userType !== 'attendee' && formData.userType !== 'speaker' && (
              <Input
                label="Password"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required={formData.userType !== 'attendee' && formData.userType !== 'speaker'}
                leftAddon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                }
              />
            )}
          </div>

          {formData.userType !== 'attendee' && formData.userType !== 'speaker' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary/50 border-dark-border rounded bg-dark-bg-tertiary"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-primary hover:text-primary-light transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>
          )}

          {formData.userType === 'attendee' && (
            <div className="text-sm py-3 px-4 rounded-md bg-dark-bg-tertiary/50 border border-dark-border">
              <p className="text-gray-300 mb-1 font-medium">
                Attendees only need to provide their email
              </p>
              <p className="text-gray-400 text-xs">
                Your email must be registered for an event to log in
              </p>
            </div>
          )}

          {formData.userType === 'speaker' && (
            <div className="text-sm py-3 px-4 rounded-md bg-dark-bg-tertiary/50 border border-dark-border">
              <p className="text-gray-300 mb-1 font-medium">
                Speakers only need to provide their email
              </p>
              <p className="text-gray-400 text-xs">
                Your email must be registered by an admin for an event
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full hover-button"
            size="lg"
            disabled={isLoading}
            leftIcon={isLoading ? <Spinner size="xs" variant="white" /> : undefined}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
          
          <div className="mt-4 text-center">
            <span className="text-sm text-gray-400">
              Don't have an account?{' '}
              <Link href="/signup" className="font-medium text-primary hover:text-primary-light transition-colors">
                Sign up now
              </Link>
            </span>
          </div>
        </form>
      </Card>
      
      <div className="absolute bottom-4 right-4">
        <div className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} CheckIn System
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function LoadingLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg-primary">
      <div className="flex flex-col items-center">
        <div className="mb-8 relative">
          <div className="absolute -z-10 h-[200px] w-[200px] bg-gradient-radial from-primary/20 to-transparent opacity-80 blur-3xl"></div>
          <img src="/logo-white.svg" alt="CheckIn" className="h-12 relative z-10" />
        </div>
        <div className="flex justify-center">
          <Spinner size="lg" variant="primary" />
        </div>
        <p className="mt-4 text-gray-400">Loading login form...</p>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingLogin />}>
      <LoginForm />
    </Suspense>
  );
} 