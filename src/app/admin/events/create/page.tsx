'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { useAuthSession } from '@/lib/query/auth-hooks';
import { useCreateEvent } from '@/lib/query/admin-hooks';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';

export default function CreateEventPage() {
  const router = useRouter();
  const { user, status } = useAuthSession();
  const createEventMutation = useCreateEvent();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    capacity: '',
    type: 'Conference',
    status: 'draft'
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Check authorization
  useEffect(() => {
    if (status === 'loading') {
      return;
    } else if (!user) {
      router.push('/login');
    } else if (user.role !== 'admin') {
      router.push('/admin');
    }
  }, [status, user, router]);
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Validate form data
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required';
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date cannot be before start date';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (!formData.capacity) {
      newErrors.capacity = 'Capacity is required';
    } else if (isNaN(Number(formData.capacity)) || Number(formData.capacity) <= 0) {
      newErrors.capacity = 'Capacity must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setSubmitError(null);
    setSubmitSuccess(false);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data for API
      const eventData = {
        ...formData,
        capacity: Number(formData.capacity),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString()
      };
      
      // Call the mutation hook
      await createEventMutation.mutateAsync(eventData);
      
      // Show success message
      setSubmitSuccess(true);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        location: '',
        capacity: '',
        type: 'Conference',
        status: 'draft'
      });
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/admin/events');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating event:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (status === 'authenticated' && user?.role !== 'admin') {
    return (
      <Card className="w-full">
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">
            You do not have permission to create events.
          </p>
          <Button onClick={() => router.push('/admin')}>
            Return to Admin Dashboard
          </Button>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Create New Event</h1>
        <Link href="/admin/events">
          <Button variant="outline">
            Back to Events
          </Button>
        </Link>
      </div>
      
      <Card className="w-full">
        <div className="p-6">
          {submitSuccess && (
            <div className="mb-6 p-4 bg-green-900/20 border border-green-800/30 rounded-md text-green-400">
              Event created successfully! Redirecting to events list...
            </div>
          )}
          
          {submitError && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800/30 rounded-md text-red-400">
              {submitError}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Event Name*
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-dark-bg-tertiary border rounded-md text-white ${
                  errors.name ? 'border-red-500' : 'border-dark-border'
                }`}
                placeholder="Annual Tech Conference"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-white"
                placeholder="Describe the event details here..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 mb-1">
                  Start Date*
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-dark-bg-tertiary border rounded-md text-white ${
                    errors.startDate ? 'border-red-500' : 'border-dark-border'
                  }`}
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 mb-1">
                  End Date*
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-dark-bg-tertiary border rounded-md text-white ${
                    errors.endDate ? 'border-red-500' : 'border-dark-border'
                  }`}
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1">
                Location*
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-dark-bg-tertiary border rounded-md text-white ${
                  errors.location ? 'border-red-500' : 'border-dark-border'
                }`}
                placeholder="Convention Center, Downtown"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-500">{errors.location}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-300 mb-1">
                  Capacity*
                </label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-dark-bg-tertiary border rounded-md text-white ${
                    errors.capacity ? 'border-red-500' : 'border-dark-border'
                  }`}
                  placeholder="500"
                  min="1"
                />
                {errors.capacity && (
                  <p className="mt-1 text-sm text-red-500">{errors.capacity}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">
                  Event Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-white"
                >
                  <option value="Conference">Conference</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Product Launch">Product Launch</option>
                  <option value="Networking">Networking</option>
                  <option value="Training">Training</option>
                  <option value="Hackathon">Hackathon</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/events')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <Spinner size="sm" className="mr-2" />
                    Creating...
                  </span>
                ) : (
                  'Create Event'
                )}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
} 