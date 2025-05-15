'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff' // Default role is staff now
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field when user changes it
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name) errors.name = 'Name is required';
    else if (formData.name.length < 2) errors.name = 'Name must be at least 2 characters';
    
    if (!formData.email) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email format is invalid';
    
    if (!formData.password) errors.password = 'Password is required';
    else {
      if (formData.password.length < 8) 
        errors.password = 'Password must be at least 8 characters';
      if (!/[A-Z]/.test(formData.password)) 
        errors.password = 'Password must contain at least one uppercase letter';
      if (!/[a-z]/.test(formData.password)) 
        errors.password = 'Password must contain at least one lowercase letter';
      if (!/[0-9]/.test(formData.password)) 
        errors.password = 'Password must contain at least one number';
    }
    
    if (formData.password !== formData.confirmPassword) 
      errors.confirmPassword = 'Passwords do not match';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate the form
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/auth/signup', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });

      if (response.data.success) {
        // Registration successful, show success message
        setSuccess(true);
        // Redirect to verification page
        router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
      } else {
        setError(response.data.message || 'Registration failed');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.data.details) {
          // Handle validation errors from the API
          const apiErrors = err.response.data.details;
          const formattedErrors: Record<string, string> = {};
          
          Object.keys(apiErrors).forEach(field => {
            if (apiErrors[field]._errors) {
              formattedErrors[field] = apiErrors[field]._errors[0];
            }
          });
          
          setValidationErrors(formattedErrors);
        } else {
          setError(err.response.data.message || 'Registration failed');
        }
      } else {
        setError('An unexpected error occurred during registration');
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-slate-800 p-10 rounded-xl shadow-2xl text-center">
          <h2 className="text-3xl font-extrabold text-white">Registration Successful!</h2>
          <p className="mt-2 text-gray-300">
            Please check your email to verify your account. A verification code has been sent to {formData.email}.
          </p>
          <div className="mt-5">
            <Link href={`/verify-email?email=${encodeURIComponent(formData.email)}`} className="font-medium text-blue-400 hover:text-blue-300">
              Go to email verification page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-slate-800 p-10 rounded-xl shadow-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Create a staff account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Join the CheckIn event management team
          </p>
          
          <div className="mt-4 bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded-md">
            <p className="text-sm text-blue-200">
              <strong>Note:</strong> This form is for staff, managers, and admin accounts. 
              Attendees and speakers are registered by admin via CSV upload or manual entry.
            </p>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-900/50 border-l-4 border-red-500 text-red-100 p-4 rounded-md" role="alert">
            <p>{error}</p>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.name ? 'border-red-500' : 'border-gray-600'
                } placeholder-gray-500 text-white bg-gray-700 rounded-md focus:outline-none
                focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.name}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.email ? 'border-red-500' : 'border-gray-600'
                } placeholder-gray-500 text-white bg-gray-700 rounded-md focus:outline-none
                focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-600 
                placeholder-gray-500 text-white bg-gray-700 rounded-md focus:outline-none 
                focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Attendees and speakers are registered by admin via CSV upload or manual entry.
              </p>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.password ? 'border-red-500' : 'border-gray-600'
                } placeholder-gray-500 text-white bg-gray-700 rounded-md focus:outline-none
                focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.password}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Password must be at least 8 characters with uppercase, lowercase and numbers
              </p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                } placeholder-gray-500 text-white bg-gray-700 rounded-md focus:outline-none
                focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium
              rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2
              focus:ring-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
          
          <div className="text-center">
            <span className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300">
                Sign in
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
} 