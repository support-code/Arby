'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI, invitationsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    if (token) {
      loadInvitation();
    } else {
      setError('חסר טוקן הזמנה');
      setLoadingInvitation(false);
    }
  }, [token]);

  const loadInvitation = async () => {
    try {
      const data = await invitationsAPI.getByToken(token!);
      setInvitation(data);
      setEmail(data.email);
    } catch (err: any) {
      setError(err.response?.data?.error || 'הזמנה לא תקינה או פגה');
    } finally {
      setLoadingInvitation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('חסר טוקן הזמנה');
      return;
    }

    setLoading(true);

    try {
      const { token: authToken, user } = await authAPI.register(email, password, name, token);
      setAuth(user, authToken);

      // Redirect based on role
      if (user.role === UserRole.ADMIN) {
        router.push('/admin');
      } else if (user.role === UserRole.ARBITRATOR) {
        router.push('/arbitrator');
      } else if (user.role === UserRole.LAWYER) {
        router.push('/lawyer');
      } else {
        router.push('/party');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  };

  if (loadingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">טוען...</div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-center mb-6">הזמנה לא תקינה</h1>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <a href="/login" className="text-blue-600 hover:underline block text-center">
            חזרה להתחברות
          </a>
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2">הרשמה</h1>
        <p className="text-center text-gray-600 mb-6">
          הוזמנת כ-{roleLabels[invitation.role]}
        </p>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              אימייל
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              שם מלא *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              סיסמה (מינימום 8 תווים) *
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'נרשם...' : 'הרשם'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          כבר יש לך חשבון?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            התחבר
          </a>
        </p>
      </div>
    </div>
  );
}

