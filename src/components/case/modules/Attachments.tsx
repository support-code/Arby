'use client';

import { useEffect, useState } from 'react';
import { documentsAPI } from '@/lib/api';
import { Document, UserRole, DocumentType } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

interface AttachmentsProps {
  caseId: string;
}

export default function Attachments({ caseId }: AttachmentsProps) {
  const [attachments, setAttachments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { hasRole } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    loadAttachments();
  }, [caseId]);

  const loadAttachments = async () => {
    try {
      const allDocs = await documentsAPI.getByCase(caseId);
      // Filter attachments - documents with type 'attachment' or not protocols/decisions
      const filtered = allDocs.filter((doc: Document) => 
        doc.documentType === DocumentType.ATTACHMENT ||
        (doc.documentType !== DocumentType.PROTOCOL && 
         doc.documentType !== DocumentType.DECISION &&
         !doc.originalName.toLowerCase().includes('פרוטוקול') &&
         !doc.originalName.toLowerCase().includes('protocol'))
      );
      setAttachments(filtered);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await documentsAPI.upload(caseId, file, 'all_parties', undefined, DocumentType.ATTACHMENT);
      showToast('נספח הועלה בהצלחה', 'success');
      await loadAttachments();
      e.target.value = '';
    } catch (error: any) {
      console.error('Upload failed:', error);
      showToast(error?.response?.data?.error || 'שגיאה בהעלאת הנספח', 'error');
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

  const canUpload = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR, UserRole.LAWYER]);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
      return '🖼️';
    } else if (['pdf'].includes(ext || '')) {
      return '📄';
    } else if (['doc', 'docx'].includes(ext || '')) {
      return '📝';
    } else if (['xls', 'xlsx'].includes(ext || '')) {
      return '📊';
    }
    return '📎';
  };

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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 border-b-2 border-green-500 pb-2">נספחים</h2>
          {canUpload && (
            <label className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 cursor-pointer font-semibold flex items-center gap-2 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {uploading ? 'מעלה...' : 'העלאת נספח'}
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {attachments.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-6xl mb-4">📎</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין נספחים בתיק</h3>
            <p className="text-gray-600 mb-6">נספחים וראיות יופיעו כאן</p>
            {canUpload && (
              <label className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 cursor-pointer font-semibold transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                העלאת נספח
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attachments.map((attachment) => {
              const uploadedBy = typeof attachment.uploadedBy === 'object' && attachment.uploadedBy
                ? attachment.uploadedBy.name
                : 'משתמש';

              return (
                <div
                  key={attachment._id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-green-300 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{getFileIcon(attachment.originalName)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 mb-1 truncate">{attachment.originalName}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        <span>{uploadedBy}</span>
                        <span>•</span>
                        <span>{(attachment.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(attachment.createdAt).toLocaleDateString('he-IL', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownload(attachment._id, attachment.originalName)}
                      className="text-green-600 hover:text-green-700 p-1"
                      title="הורד"
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
      </div>
    </div>
  );
}

