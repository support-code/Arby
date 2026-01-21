'use client';

import { useEffect, useState } from 'react';
import { documentsAPI } from '@/lib/api';
import { Document, UserRole, DocumentPermission } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

interface InternalDocumentsProps {
  caseId: string;
}

export default function InternalDocuments({ caseId }: InternalDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { hasRole } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    loadDocuments();
  }, [caseId]);

  const loadDocuments = async () => {
    try {
      const allDocs = await documentsAPI.getByCase(caseId);
      // Filter internal documents - arbitrator only or secret documents
      const filtered = allDocs.filter((doc: Document) => 
        doc.permission === DocumentPermission.ARBITRATOR_ONLY ||
        doc.isSecret === true
      );
      setDocuments(filtered);
    } catch (error) {
      console.error('Failed to load internal documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await documentsAPI.upload(caseId, file, 'arbitrator_only', undefined, undefined, true);
      showToast('מסמך פנימי הועלה בהצלחה', 'success');
      await loadDocuments();
      e.target.value = '';
    } catch (error: any) {
      console.error('Upload failed:', error);
      showToast(error?.response?.data?.error || 'שגיאה בהעלאת המסמך הפנימי', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId: string, fileName: string) => {
    try {
      const blob = await documentsAPI.download(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const canUpload = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);

  if (!canUpload) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">אין הרשאה</h3>
          <p className="text-gray-600">מסמכים פנימיים זמינים לבורר בלבד</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-center py-12">טוען...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 border-r-4 border-r-red-500">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">מסמכים פנימיים</h2>
            <p className="text-sm text-gray-600 mt-1">מסמכים זמינים לבורר בלבד</p>
          </div>
          {canUpload && (
            <label className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 cursor-pointer font-semibold flex items-center gap-2 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {uploading ? 'מעלה...' : 'העלאת מסמך פנימי'}
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין מסמכים פנימיים</h3>
            <p className="text-gray-600 mb-6">מסמכים פנימיים לבורר יופיעו כאן</p>
            {canUpload && (
              <label className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 cursor-pointer font-semibold transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                העלאת מסמך פנימי
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const uploadedBy = typeof doc.uploadedBy === 'object' && doc.uploadedBy
                ? doc.uploadedBy.name
                : 'משתמש';

              return (
                <div
                  key={doc._id}
                  className="flex justify-between items-center p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-all bg-red-50/50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="bg-red-100 p-3 rounded-lg">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{doc.originalName}</p>
                        <span className="px-2 py-0.5 text-xs rounded bg-red-200 text-red-800">
                          פנימי
                        </span>
                        {doc.isSecret && (
                          <span className="px-2 py-0.5 text-xs rounded bg-yellow-200 text-yellow-800">
                            סודי
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>הועלה על ידי: {uploadedBy}</span>
                        <span>•</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString('he-IL', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                        <span>•</span>
                        <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(doc._id, doc.originalName)}
                    className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 font-semibold transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    הורד
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

