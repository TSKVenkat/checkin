'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientText } from '@/components/ui/GradientText';
import Card, { CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const { left, top, width, height } = heroRef.current.getBoundingClientRect();
        const x = (e.clientX - left) / width;
        const y = (e.clientY - top) / height;
        
        heroRef.current.style.setProperty('--x', x.toString());
        heroRef.current.style.setProperty('--y', y.toString());
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-dark-bg-primary border-b border-dark-border py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <span className="text-gradient-green">CheckIn</span>
          </h1>
          <div className="space-x-2">
            <Link href="/login">
              <Button variant="outline" size="sm">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="sm">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-dark-bg-primary to-dark-bg-secondary z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_30%,rgba(52,211,153,0.1)_0%,rgba(12,15,19,0)_100%)] z-0" />
        
        <div className="relative z-10 container mx-auto px-4 py-16 flex flex-col items-center text-center">
          <div className="max-w-3xl mx-auto mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gradient-green">
              Streamline Your Event Check-in Process
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8">
              A modern, secure, and efficient platform for event registration,
              check-in management, and resource distribution.
            </p>
            
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-16">
            <Card variant="elevated" className="text-center">
              <CardBody className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">QR Code Check-In</h3>
                <p className="text-gray-400">
                  Fast and efficient check-in process using QR codes for a seamless attendee experience.
                </p>
              </CardBody>
            </Card>
            
            <Card variant="elevated" className="text-center">
              <CardBody className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-secondary/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">Real-time Analytics</h3>
                <p className="text-gray-400">
                  Monitor attendance, resource distribution, and other key metrics in real-time.
                </p>
              </CardBody>
            </Card>
            
            <Card variant="elevated" className="text-center">
              <CardBody className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-accent/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">Secure Access</h3>
                <p className="text-gray-400">
                  Role-based permissions and secure authentication protect your event data.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="bg-dark-bg-secondary py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg-primary to-transparent opacity-50 z-0" />
        <div className="relative z-10 container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">
            Trusted by Event Organizers
          </h2>
          
          <div className="max-w-4xl mx-auto">
            <GlassCard variant="green" className="p-8">
              <div className="flex flex-col items-center text-center">
                <p className="text-xl italic text-gray-200 mb-6">
                  "CheckIn transformed how we manage our tech conferences. The streamlined check-in process and real-time analytics have saved us countless hours and improved the attendee experience dramatically."
                </p>
                <div className="mt-4">
                  <p className="font-semibold text-white">Sarah Johnson</p>
                  <p className="text-gray-400 text-sm">Event Director, TechSummit Global</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-bg-primary border-t border-dark-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h2 className="text-xl font-bold text-gradient-green">CheckIn</h2>
              <p className="text-gray-400 mt-2">Simple. Secure. Efficient.</p>
            </div>
            
            
              
              
              
              
              
          
          </div>
          
          <div className="mt-8 pt-8 border-t border-dark-border text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} CheckIn. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
