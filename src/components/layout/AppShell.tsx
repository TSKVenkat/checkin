'use client';

import { useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiMenu, FiX, FiUser, FiSettings, FiLogOut, FiHome, FiClipboard, FiUsers, FiCalendar, FiActivity, FiBarChart2, FiCheckCircle, FiBell, FiSun, FiMoon } from 'react-icons/fi';
import { HiOutlineChartBar, HiOutlineDocumentReport } from 'react-icons/hi';
import { useTheme } from '@/components/ThemeProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthKeys, tokenStorage } from '@/lib/query/auth-hooks';

// Main AppShell component
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('dark');

  // Fetch user data from the query cache
  const { data: user } = useQuery({
    queryKey: AuthKeys.user,
    queryFn: async () => {
      // Return user from cache if available
      const cachedUser = tokenStorage.getUser();
      if (cachedUser) {
        return cachedUser;
      }
      return null;
    },
    enabled: isMounted,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Check if user is on login or public page
  const isPublicPage = 
    pathname === '/login' || 
    pathname === '/signup' || 
    pathname === '/forgot-password' || 
    pathname === '/' ||
    pathname.startsWith('/auth');

  // Check if user is on admin page
  const isAdminPage = pathname.startsWith('/admin');

  // Set isMounted after client-side hydration
  useEffect(() => {
    setIsMounted(true);
    
    // Get theme from localStorage or default to dark
    const storedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (storedTheme) {
      setCurrentTheme(storedTheme);
    }
  }, []);

  // Handle theme toggle
  const toggleTheme = () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Apply theme to document
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
  };

  // Handle log out
  const handleLogout = () => {
    // Clear auth data
    tokenStorage.clearAll();
    
    // Reset auth query data
    queryClient.setQueryData(AuthKeys.session, { isAuthenticated: false });
    queryClient.setQueryData(AuthKeys.user, null);
    
    // Redirect to login
    router.push('/login');
  };

  // Don't render the shell for public pages
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Get navigation items based on user role
  const navItems = getNavigationItems(user?.role);

  return (
    <div className="flex h-screen bg-dark-bg-primary">
      {/* Mobile sidebar toggle */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg hover:bg-primary-dark transition-all duration-200"
        >
          {isSidebarOpen ? (
            <FiX className="h-6 w-6 text-white" />
          ) : (
            <FiMenu className="h-6 w-6 text-white" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out bg-dark-bg-secondary border-r border-dark-border md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-dark-border">
          <Link href="/dashboard">
            <div className="flex items-center">
              <img src="/logo-white.svg" alt="Logo" className="h-8 w-auto" />
              <span className="ml-2 text-lg font-semibold text-white">CheckIn</span>
            </div>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden rounded-md p-1 text-gray-400 hover:bg-dark-bg-tertiary hover:text-white"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar content */}
        <div className="flex flex-col h-[calc(100%-4rem)] overflow-y-auto py-4">
          <nav className="flex-1 space-y-1 px-2">
            {navItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                pathname={pathname}
                onClick={() => setIsSidebarOpen(false)}
              />
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className="mt-auto p-4 border-t border-dark-border">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-dark-bg-tertiary flex items-center justify-center text-primary">
                  <FiUser className="h-5 w-5" />
                </div>
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {/* Settings - only show for non-admin pages */}
              {!isAdminPage && (
                <Link href="/settings">
                  <div 
                    className="flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-300 hover:bg-dark-bg-tertiary hover:text-white transition-colors"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <FiSettings className="mr-2 h-5 w-5 text-primary" />
                    <span>Settings</span>
                  </div>
                </Link>
              )}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-300 hover:bg-dark-bg-tertiary hover:text-white transition-colors"
              >
                <FiLogOut className="mr-2 h-5 w-5 text-red-500" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col md:pl-64">
        {/* Page content */}
        <main className="flex-1 overflow-auto bg-dark-bg-primary">
          <div className="py-6">
            <div className="mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Navigation item component
function NavItem({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick: () => void }) {
  // Use a more precise isActive check that won't persist across different sections
  const isActive = 
    pathname === item.path || 
    (item.path !== '/dashboard' && pathname.startsWith(item.path) && pathname.split('/').length === item.path.split('/').length);
  
  return (
    <Link href={item.path}>
      <div
        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all ${
          isActive
            ? 'bg-primary text-white'
            : 'text-gray-300 hover:bg-dark-bg-tertiary hover:text-white'
        }`}
        onClick={onClick}
      >
        <item.icon
          className={`mr-3 h-5 w-5 flex-shrink-0 ${
            isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
          }`}
        />
        {item.name}
      </div>
    </Link>
  );
}

// Navigation item interface
interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Get navigation items based on user role
function getNavigationItems(role?: string): NavItem[] {
  // Common navigation items
  const commonItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: FiHome },
  ];

  // Admin-specific navigation items
  const adminItems: NavItem[] = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: FiBarChart2 },
    { name: 'Activity', path: '/admin/activity', icon: FiActivity },
    { name: 'Staff', path: '/admin/staff', icon: FiUsers },
    { name: 'Attendees', path: '/admin', icon: FiUsers },
    { name: 'Events', path: '/admin/events', icon: FiCalendar },
    { name: 'Reports', path: '/admin/reports', icon: HiOutlineDocumentReport },
    { name: 'Upload Data', path: '/admin/upload', icon: FiClipboard },
    { name: 'Emergency', path: '/admin/emergency', icon: FiCheckCircle },
    { name: 'Check-In', path: '/check-in', icon: FiCheckCircle },
  ];

  // Manager-specific navigation items
  const managerItems: NavItem[] = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: FiBarChart2 },
    { name: 'Attendees', path: '/admin', icon: FiUsers },
    { name: 'Check-ins', path: '/admin/checkins', icon: FiCheckCircle },
    { name: 'Events', path: '/admin/events', icon: FiCalendar },
    { name: 'Reports', path: '/admin/reports', icon: HiOutlineDocumentReport },
  ];

  // Staff navigation items
  const staffItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: FiHome },
    { name: 'Check-In', path: '/check-in', icon: FiCheckCircle },
    { name: 'Distribution', path: '/distribution', icon: FiClipboard },
    { name: 'Settings', path: '/settings', icon: FiSettings },
  ];

  // Attendee navigation items
  const attendeeItems: NavItem[] = [
    { name: 'Dashboard', path: '/attendee', icon: FiHome },
    { name: 'My Events', path: '/attendee/events', icon: FiCalendar },
    { name: 'Resources', path: '/attendee/resources', icon: FiClipboard },
    { name: 'Profile', path: '/attendee/profile', icon: FiUser },
  ];

  // Speaker navigation items
  const speakerItems: NavItem[] = [
    { name: 'Dashboard', path: '/attendee', icon: FiHome },
    { name: 'My Sessions', path: '/attendee/sessions', icon: FiCalendar },
    { name: 'Attendees', path: '/attendee/my-attendees', icon: FiUsers },
    { name: 'Materials', path: '/attendee/materials', icon: FiClipboard },
    { name: 'Profile', path: '/attendee/profile', icon: FiUser },
  ];

  // Return the appropriate navigation items based on user role
  switch (role) {
    case 'admin':
      return adminItems;
    case 'manager':
      return managerItems;
    case 'staff':
      return staffItems;
    case 'attendee':
      return attendeeItems;
    case 'speaker':
      return speakerItems;
    default:
      return commonItems;
  }
} 