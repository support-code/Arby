'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import CaseSidebar from '@/components/case/CaseSidebar';
import ModuleRenderer from '@/components/case/modules/ModuleRenderer';
import { casesAPI } from '@/lib/api';
import { Case, CaseModule, UserRole } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { getStatusConfig } from '@/utils/caseStatus';
import { useToastStore } from '@/store/toastStore';

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = params.id as string;
  const { user, hasRole } = useAuthStore();
  const { showToast } = useToastStore();
  
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<CaseModule>('general-details');

  useEffect(() => {
    if (caseId) {
      loadCaseData();
    }
  }, [caseId]);

  useEffect(() => {
    const moduleParam = searchParams.get('module') as CaseModule;
    if (moduleParam) {
      setActiveModule(moduleParam);
    }
  }, [searchParams]);

  const loadCaseData = async (showError = true) => {
    try {
      const caseRes = await casesAPI.getById(caseId);
      setCaseData(caseRes);
    } catch (error: any) {
      console.error('Failed to load case:', error);
      if (showError) {
        showToast(error?.response?.data?.error || 'שגיאה בטעינת התיק', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModuleChange = (module: CaseModule) => {
    setActiveModule(module);
    router.push(`/cases/${caseId}?module=${module}`, { scroll: false });
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">טוען...</div>
      </Layout>
    );
  }

  if (!caseData) {
    return (
      <Layout>
        <div className="text-center py-12">תיק לא נמצא</div>
      </Layout>
    );
  }

  const statusConfig = getStatusConfig(caseData.status);
  const arbitratorName = typeof caseData.arbitratorId === 'object' && caseData.arbitratorId
    ? caseData.arbitratorId.name
    : 'לא הוגדר';

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <CaseSidebar
          activeModule={activeModule}
          onModuleChange={handleModuleChange}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => router.back()}
                      className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      חזרה
                    </button>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 text-sm">תיק בוררות</span>
                    <span className="text-gray-400">#</span>
                    <span className="font-mono text-sm text-gray-600">{caseId.slice(-6).toUpperCase()}</span>
                  </div>
                  <h1 className="text-3xl font-bold mb-3 text-gray-900">{caseData.title}</h1>
                  {caseData.description && (
                    <p className="text-gray-600 text-lg">{caseData.description}</p>
                  )}
                </div>
                {statusConfig && (
                  <div className={`${statusConfig.bgColor} ${statusConfig.color} px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 border border-gray-200`}>
                    <span>{statusConfig.icon}</span>
                    <span>{statusConfig.label}</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div>
                  <span className="text-gray-500 text-sm">בורר:</span>
                  <p className="font-semibold text-lg text-gray-900">{arbitratorName}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">נפתח:</span>
                  <p className="font-semibold text-lg text-gray-900">
                    {new Date(caseData.createdAt).toLocaleDateString('he-IL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">עודכן לאחרונה:</span>
                  <p className="font-semibold text-lg text-gray-900">
                    {new Date(caseData.updatedAt).toLocaleDateString('he-IL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Module Content */}
            <ModuleRenderer
              module={activeModule}
              caseId={caseId}
              caseData={caseData}
              onCaseUpdate={loadCaseData}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

