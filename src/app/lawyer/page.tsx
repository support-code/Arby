'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { UserRole, Case, CaseStatus } from '@/types';
import { casesAPI } from '@/lib/api';
import { getStatusConfig } from '@/utils/caseStatus';

export default function LawyerPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const data = await casesAPI.getAll();
      setCases(data);
    } catch (error) {
      console.error('Failed to load cases:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const active = cases.filter(c => c.status === CaseStatus.ACTIVE).length;
    const pending = cases.filter(c => c.status === CaseStatus.PENDING_DECISION).length;
    const closed = cases.filter(c => c.status === CaseStatus.CLOSED).length;
    const totalAmount = cases.reduce((sum, c) => sum + (c.claimAmount || 0), 0);
    
    return {
      total: cases.length,
      active,
      pending,
      closed,
      totalAmount
    };
  }, [cases]);

  if (loading) {
    return (
      <Layout allowedRoles={[UserRole.LAWYER]}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">טוען תיקים...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout allowedRoles={[UserRole.LAWYER]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">תיקים שלי</h1>
          <p className="text-gray-600">ניהול ותצוגה של כל התיקים שלך</p>
        </div>

        {/* Statistics Cards */}
        {cases.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100 text-sm font-medium">סה"כ תיקים</span>
                <svg className="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-100 text-sm font-medium">תיקים פעילים</span>
                <svg className="w-8 h-8 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-3xl font-bold">{stats.active}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-100 text-sm font-medium">ממתין להחלטה</span>
                <svg className="w-8 h-8 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-3xl font-bold">{stats.pending}</div>
            </div>

            {stats.totalAmount > 0 && (
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-orange-100 text-sm font-medium">סכום כולל</span>
                  <svg className="w-8 h-8 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(stats.totalAmount)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cases Grid */}
        {cases.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">אין תיקים עדיין</h3>
              <p className="text-gray-600">אין תיקים מוקצים לך עדיין</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((caseItem) => {
              const statusConfig = getStatusConfig(caseItem.status);
              const arbitratorName = typeof caseItem.arbitratorId === 'object' && caseItem.arbitratorId
                ? caseItem.arbitratorId.name
                : 'לא הוגדר';
              const lawyersCount = Array.isArray(caseItem.lawyers) ? caseItem.lawyers.length : 0;
              const partiesCount = Array.isArray(caseItem.parties) ? caseItem.parties.length : 0;

              return (
                <div
                  key={caseItem._id}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-200 overflow-hidden group"
                  onClick={() => router.push(`/cases/${caseItem._id}`)}
                >
                  {/* Status Badge */}
                  <div className={`${statusConfig.bgColor} px-4 py-3 border-b ${statusConfig.color} flex items-center gap-2`}>
                    <span className="text-lg">{statusConfig.icon}</span>
                    <span className="font-semibold text-sm">{statusConfig.label}</span>
                  </div>

                  <div className="p-6">
                    {/* Title */}
                    <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {caseItem.title}
                    </h2>

                    {/* Description */}
                    {caseItem.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                        {caseItem.description}
                      </p>
                    )}

                    {/* Case Info */}
                    <div className="space-y-3 mb-4">
                      {caseItem.caseNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">מספר תיק:</span>
                          <span className="font-semibold text-gray-900 font-mono">{caseItem.caseNumber}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-gray-500">בורר:</span>
                        <span className="font-semibold text-gray-900">{arbitratorName}</span>
                      </div>

                      {(lawyersCount > 0 || partiesCount > 0) && (
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {lawyersCount > 0 && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {lawyersCount} עורכי דין
                            </span>
                          )}
                          {partiesCount > 0 && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                              {partiesCount} צדדים
                            </span>
                          )}
                        </div>
                      )}

                      {caseItem.claimAmount && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-gray-500">סכום תביעה:</span>
                          <span className="font-bold text-green-600">
                            {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(caseItem.claimAmount)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(caseItem.createdAt).toLocaleDateString('he-IL', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      {caseItem.updatedAt !== caseItem.createdAt && (
                        <span className="text-gray-400">
                          עודכן {new Date(caseItem.updatedAt).toLocaleDateString('he-IL', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

