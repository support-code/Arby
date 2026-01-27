'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { ToastContainer } from '@/components/ui/Toast';
import { useToastStore } from '@/store/toastStore';
import Image from 'next/image';

interface LayoutProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function Layout({ children, allowedRoles }: LayoutProps) {
  const router = useRouter();
  const { user, logout, hasRole, isAuthenticated } = useAuthStore();
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && (!isAuthenticated || !user)) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">טוען...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">אין הרשאה</h1>
          <p className="text-gray-600">אין לך הרשאה לגשת לדף זה</p>
        </div>
      </div>
    );
  }

  const roleLabels: Record<UserRole, string> = {
    admin: 'מנהל מערכת',
    arbitrator: 'בורר',
    lawyer: 'עורך דין',
    party: 'צד'
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/" className="flex items-center">
                <Image 
                  src="/images/logo.PNG" 
                  alt="Negotify" 
                  width={120} 
                  height={40}
                  className="h-10 w-auto"
                />
              </a>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <span className="text-sm text-gray-600">
                {user.name} ({roleLabels[user.role]})
              </span>
              <button
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                התנתק
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-100">
        {children}
      </main>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

