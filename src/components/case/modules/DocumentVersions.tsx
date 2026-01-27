'use client';

import { useEffect, useState } from 'react';
import { documentsAPI, documentVersionsAPI } from '@/lib/api';
import { Document, DocumentVersion, UserRole } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

interface DocumentVersionsProps {
  caseId: string;
}

export default function DocumentVersions({ caseId }: DocumentVersionsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const { hasRole } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    loadDocuments();
  }, [caseId]);

  useEffect(() => {
    if (selectedDoc) {
      loadVersions(selectedDoc._id);
    }
  }, [selectedDoc]);

  const loadDocuments = async () => {
    try {
      const data = await documentsAPI.getByCase(caseId);
      setDocuments(data);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (documentId: string) => {
    setLoadingVersions(true);
    try {
      const data = await documentVersionsAPI.getByDocument(documentId);
      setVersions(data);
    } catch (error: any) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleDownloadVersion = async (versionId: string, fileName: string) => {
    try {
      await documentVersionsAPI.download(versionId, fileName);
    } catch (error: any) {
      console.error('Download failed:', error);
    }
  };

  const handleCreateVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDoc) return;

    try {
      const changes = prompt('תאר את השינויים בגרסה זו (אופציונלי):');
      await documentVersionsAPI.create(selectedDoc._id, file, changes || undefined);
      showToast('גרסה חדשה נוצרה בהצלחה', 'success');
      await loadVersions(selectedDoc._id);
      e.target.value = '';
    } catch (error: any) {
      console.error('Failed to create version:', error);
      showToast(error?.response?.data?.error || 'שגיאה ביצירת גרסה חדשה', 'error');
    }
  };

  const canView = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR, UserRole.LAWYER]);
  const canCreateVersion = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-center py-12">טוען...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-bold mb-6 text-gray-900">גרסאות מסמך</h2>

        {documents.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין מסמכים בתיק</h3>
            <p className="text-gray-600">בחר מסמך כדי לראות את הגרסאות שלו</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Documents List */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">בחר מסמך:</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {documents.map((doc) => (
                  <button
                    key={doc._id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`w-full text-right p-3 border rounded-lg transition-colors ${
                      selectedDoc?._id === doc._id
                        ? 'bg-orange-50 border-orange-300 font-semibold'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-sm text-gray-900">{doc.originalName}</p>
                    <p className="text-xs text-gray-500 mt-1">גרסה נוכחית: {doc.version}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Versions List */}
            <div>
              {selectedDoc ? (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900">
                      גרסאות: {selectedDoc.originalName}
                    </h3>
                    {canCreateVersion && (
                      <label className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 cursor-pointer font-semibold text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        גרסה חדשה
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleCreateVersion}
                        />
                      </label>
                    )}
                  </div>
                  {loadingVersions ? (
                    <div className="text-center py-8">טוען גרסאות...</div>
                  ) : versions.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-600">אין גרסאות נוספות למסמך זה</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {/* Current Version */}
                      <div className="p-3 border-2 border-orange-300 rounded-lg bg-orange-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-900">גרסה נוכחית {selectedDoc.version}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(selectedDoc.createdAt).toLocaleDateString('he-IL', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <span className="px-2 py-1 text-xs rounded bg-orange-600 text-white">
                            נוכחי
                          </span>
                        </div>
                      </div>

                      {/* Previous Versions */}
                      {versions.map((version) => {
                        const createdBy = typeof version.createdBy === 'object' ? version.createdBy.name : 'משתמש';
                        return (
                          <div
                            key={version._id}
                            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">גרסה {version.version}</p>
                                {version.changes && (
                                  <p className="text-xs text-gray-600 mt-1">{version.changes}</p>
                                )}
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                  <span>{createdBy}</span>
                                  <span>•</span>
                                  <span>
                                    {new Date(version.createdAt).toLocaleDateString('he-IL', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDownloadVersion(version._id, selectedDoc.originalName)}
                                className="text-orange-600 hover:text-orange-700 p-1"
                                title="הורד גרסה"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <p className="text-gray-600">בחר מסמך כדי לראות את הגרסאות שלו</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

