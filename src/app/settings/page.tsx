'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession, tokenStorage } from '@/lib/query/auth-hooks';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function SettingsPage() {
  const router = useRouter();
  const { user, status } = useAuthSession();
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [appSettings, setAppSettings] = useState({
    notifications: true,
    emailUpdates: false,
    darkMode: true,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  // Load user data
  useEffect(() => {
    if (user) {
      setProfileData({
        ...profileData,
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);
  
  // Handle profile form changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
  };
  
  // Handle settings form changes
  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setAppSettings({ ...appSettings, [name]: checked });
  };
  
  // Handle profile save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      // Validate passwords if changing
      if (profileData.password) {
        if (profileData.password !== profileData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        if (profileData.password.length < 8) {
          throw new Error('Password must be at least 8 characters long');
        }
      }
      
      // In a real app, this would be an API call
      // await axios.put('/api/users/profile', profileData);
      
      // Update local storage
      if (user) {
        const updatedUser = {
          ...user,
          name: profileData.name,
        };
        tokenStorage.setUser(updatedUser);
      }
      
      setSuccessMessage('Profile updated successfully');
      
      // Clear password fields after successful update
      setProfileData({
        ...profileData,
        password: '',
        confirmPassword: '',
      });
    } catch (error) {
      setErrorMessage((error as Error).message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle settings save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      // In a real app, this would be an API call
      // await axios.put('/api/users/settings', appSettings);
      
      // Save settings to local storage
      localStorage.setItem('appSettings', JSON.stringify(appSettings));
      
      setSuccessMessage('Settings updated successfully');
    } catch (error) {
      setErrorMessage((error as Error).message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };
  
  // If loading or not authenticated
  if (status === 'loading' || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-dark-bg-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-white">Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <Card>
            <div className="flex flex-col">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
                  {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{user.name || 'User'}</h2>
                  <p className="text-sm text-gray-400">{user.email}</p>
                  <span className="inline-block px-2 py-1 bg-primary/20 text-primary rounded text-xs mt-1">
                    {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'User'}
                  </span>
                </div>
              </div>
              
              <nav className="space-y-1">
                <a href="#profile" className="px-3 py-2 rounded-md bg-primary/10 text-primary block">
                  Profile Settings
                </a>
                <a href="#security" className="px-3 py-2 rounded-md hover:bg-dark-bg-tertiary text-gray-300 block">
                  Security
                </a>
                <a href="#notifications" className="px-3 py-2 rounded-md hover:bg-dark-bg-tertiary text-gray-300 block">
                  Notifications
                </a>
                <a href="#theme" className="px-3 py-2 rounded-md hover:bg-dark-bg-tertiary text-gray-300 block">
                  Theme & Display
                </a>
              </nav>
            </div>
          </Card>
        </div>
        
        {/* Main content */}
        <div className="md:col-span-2 space-y-8">
          {/* Profile Section */}
          <Card id="profile" title="Profile Settings" description="Update your personal information">
            {successMessage && (
              <div className="mb-4 p-3 bg-primary/10 border-l-4 border-primary rounded text-primary">
                {successMessage}
              </div>
            )}
            
            {errorMessage && (
              <div className="mb-4 p-3 bg-error/10 border-l-4 border-error rounded text-error">
                {errorMessage}
              </div>
            )}
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                    Full Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    placeholder="Your name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    placeholder="your.email@example.com"
                    disabled={true}
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-dark-border">
                <h3 className="text-md font-medium text-white mb-3">Change Password</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                      New Password
                    </label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={profileData.password}
                      onChange={handleProfileChange}
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                      Confirm Password
                    </label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={profileData.confirmPassword}
                      onChange={handleProfileChange}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                
                <p className="mt-2 text-xs text-gray-500">
                  Leave blank to keep your current password. New password must be at least 8 characters long.
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSaving}
                  loading={isSaving}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
          
          {/* App Settings Section */}
          <Card title="Application Settings" description="Configure your application preferences">
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-dark-border">
                  <div>
                    <h3 className="text-md font-medium text-white">Enable Notifications</h3>
                    <p className="text-sm text-gray-400">Receive in-app notifications for important updates</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="notifications"
                      className="sr-only peer"
                      checked={appSettings.notifications}
                      onChange={handleSettingsChange}
                    />
                    <div className="w-11 h-6 bg-dark-bg-tertiary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-dark-border">
                  <div>
                    <h3 className="text-md font-medium text-white">Email Updates</h3>
                    <p className="text-sm text-gray-400">Receive email notifications about account activity</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="emailUpdates"
                      className="sr-only peer"
                      checked={appSettings.emailUpdates}
                      onChange={handleSettingsChange}
                    />
                    <div className="w-11 h-6 bg-dark-bg-tertiary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between py-3">
                  <div>
                    <h3 className="text-md font-medium text-white">Dark Mode</h3>
                    <p className="text-sm text-gray-400">Use dark theme for the application</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="darkMode"
                      className="sr-only peer"
                      checked={appSettings.darkMode}
                      onChange={handleSettingsChange}
                    />
                    <div className="w-11 h-6 bg-dark-bg-tertiary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSaving}
                  loading={isSaving}
                >
                  Save Settings
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
} 