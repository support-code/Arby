'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { UserRole } from '@/types';
import { casesAPI } from '@/lib/api';
import { CaseStatus } from '@/types';

export default function NewCasePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lawyerEmails, setLawyerEmails] = useState<string[]>(['']);
  const [partyEmails, setPartyEmails] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdPasswords, setCreatedPasswords] = useState<Array<{ email: string; password: string; role: string }>>([]);

  const addLawyerEmail = () => {
    setLawyerEmails([...lawyerEmails, '']);
  };

  const removeLawyerEmail = (index: number) => {
    setLawyerEmails(lawyerEmails.filter((_, i) => i !== index));
  };

  const updateLawyerEmail = (index: number, value: string) => {
    const updated = [...lawyerEmails];
    updated[index] = value;
    setLawyerEmails(updated);
  };

  const addPartyEmail = () => {
    setPartyEmails([...partyEmails, '']);
  };

  const removePartyEmail = (index: number) => {
    setPartyEmails(partyEmails.filter((_, i) => i !== index));
  };

  const updatePartyEmail = (index: number, value: string) => {
    const updated = [...partyEmails];
    updated[index] = value;
    setPartyEmails(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setCreatedPasswords([]);

    try {
      const validLawyerEmails = lawyerEmails.filter(email => email.trim() !== '');
      const validPartyEmails = partyEmails.filter(email => email.trim() !== '');

      const result = await casesAPI.create({
        title,
        description,
        status: CaseStatus.DRAFT,
        lawyerEmails: validLawyerEmails,
        partyEmails: validPartyEmails
      });

      if (result.createdPasswords && result.createdPasswords.length > 0) {
        setCreatedPasswords(result.createdPasswords);
        // Store case ID for navigation
        (window as any).lastCreatedCaseId = result.case._id;
      } else {
        router.push(`/cases/${result.case?._id || result._id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה ביצירת התיק');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout allowedRoles={[UserRole.ARBITRATOR]}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">יצירת תיק בוררות חדש</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              כותרת התיק *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              תיאור
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Lawyer Emails */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              מיילים של עורכי דין (ייווצרו משתמשים אוטומטית)
            </label>
            {lawyerEmails.map((email, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => updateLawyerEmail(index, e.target.value)}
                  placeholder="lawyer@example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {lawyerEmails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLawyerEmail(index)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addLawyerEmail}
              className="text-sm text-blue-600 hover:underline"
            >
              + הוסף עורך דין
            </button>
          </div>

          {/* Party Emails */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              מיילים של צדדים (ייווצרו משתמשים אוטומטית)
            </label>
            {partyEmails.map((email, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => updatePartyEmail(index, e.target.value)}
                  placeholder="party@example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {partyEmails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePartyEmail(index)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addPartyEmail}
              className="text-sm text-blue-600 hover:underline"
            >
              + הוסף צד
            </button>
          </div>

          {/* Created Passwords Display */}
          {createdPasswords.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">סיסמאות שנוצרו:</h3>
              <div className="space-y-2">
                {createdPasswords.map((item, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{item.email}</span> ({item.role}): 
                    <span className="font-mono bg-white px-2 py-1 rounded ml-2">{item.password}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-600 mt-2">הסיסמאות נשמרו גם בלוג של השרת</p>
              <button
                type="button"
                onClick={() => router.push(`/cases/${(window as any).lastCreatedCaseId}`)}
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                המשך לתיק
              </button>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'יוצר...' : 'צור תיק'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

