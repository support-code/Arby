'use client';

import { useEffect, useState } from 'react';
import { documentsAPI } from '@/lib/api';
import { Document, UserRole, DocumentPermission, DocumentType, Case, User } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

interface DocumentsProps {
  caseId: string;
  caseData: Case;
}

export default function Documents({ caseId, caseData }: DocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [formData, setFormData] = useState({
    file: null as File | null,
    permission: DocumentPermission.ALL_PARTIES,
    documentType: DocumentType.OTHER,
    visibleTo: [] as string[],
    isSecret: false
  });
  const { hasRole, user } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    loadDocuments();
  }, [caseId]);

  const loadDocuments = async () => {
    try {
      const data = await documentsAPI.getByCase(caseId);
      setDocuments(data);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) return;

    setUploading(true);
    try {
      await documentsAPI.upload(
        caseId,
        formData.file,
        formData.permission,
        formData.visibleTo.length > 0 ? formData.visibleTo : undefined,
        formData.documentType,
        formData.isSecret
      );
      showToast('מסמך הועלה בהצלחה', 'success');
      await loadDocuments();
      setShowForm(false);
      setFormData({
        file: null,
        permission: DocumentPermission.ALL_PARTIES,
        documentType: DocumentType.OTHER,
        visibleTo: [],
        isSecret: false
      });
    } catch (error: any) {
      console.error('Upload failed:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'שגיאה בהעלאת הקובץ';
      showToast(errorMessage, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המסמך?')) return;
    
    try {
      await documentsAPI.delete(documentId);
      showToast('מסמך נמחק בהצלחה', 'success');
      await loadDocuments();
    } catch (error: any) {
      console.error('Delete failed:', error);
      showToast(error?.response?.data?.error || 'שגיאה במחיקת המסמך', 'error');
    }
  };

  const handleUpdatePermission = async (documentId: string, permission: DocumentPermission) => {
    try {
      await documentsAPI.update(documentId, { permission });
      showToast('הרשאות המסמך עודכנו בהצלחה', 'success');
      await loadDocuments();
    } catch (error: any) {
      console.error('Update failed:', error);
      showToast(error?.response?.data?.error || 'שגיאה בעדכון ההרשאות', 'error');
    }
  };

  const getAllCaseUsers = (): User[] => {
    const users: User[] = [];
    
    if (typeof caseData.arbitratorId === 'object' && caseData.arbitratorId) {
      users.push(caseData.arbitratorId);
    }
    
    const lawyers = Array.isArray(caseData.lawyers) ? caseData.lawyers : [];
    lawyers.forEach(lawyer => {
      if (typeof lawyer === 'object' && lawyer) {
        users.push(lawyer);
      }
    });
    
    const parties = Array.isArray(caseData.parties) ? caseData.parties : [];
    parties.forEach(party => {
      if (typeof party === 'object' && party) {
        users.push(party);
      }
    });
    
    return users;
  };

  const getPermissionLabel = (permission: DocumentPermission) => {
    switch (permission) {
      case DocumentPermission.ARBITRATOR_ONLY:
        return 'בורר בלבד';
      case DocumentPermission.ALL_PARTIES:
        return 'כל הצדדים';
      case DocumentPermission.LAWYERS_ONLY:
        return 'עורכי דין בלבד';
      case DocumentPermission.SPECIFIC_PARTY:
        return 'צד ספציפי';
      default:
        return permission;
    }
  };

  const getDocumentTypeLabel = (type?: DocumentType) => {
    if (!type) return 'אחר';
    switch (type) {
      case DocumentType.PLEADING:
        return 'כתב טענות';
      case DocumentType.DECISION:
        return 'החלטה';
      case DocumentType.ATTACHMENT:
        return 'נספח';
      case DocumentType.PROTOCOL:
        return 'פרוטוקול';
      case DocumentType.EXPERT_OPINION:
        return 'חוות דעת מומחה';
      case DocumentType.AFFIDAVIT:
        return 'תצהיר';
      case DocumentType.OTHER:
        return 'אחר';
      default:
        return type;
    }
  };

  const getFileIcon = (fileName: string, mimeType?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word') || ['doc', 'docx'].includes(ext || '')) return '📝';
    if (mimeType?.includes('image') || ['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return '🖼️';
    if (mimeType?.includes('excel') || ['xls', 'xlsx'].includes(ext || '')) return '📊';
    return '📎';
  };

  const filteredDocuments = documents.filter(doc => {
    if (filterType === 'all') return true;
    return doc.documentType === filterType;
  });

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
  const canManage = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);

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
          <h2 className="text-xl font-bold text-gray-900 border-b-2 border-blue-500 pb-2">מסמכי התיק</h2>
          {canUpload && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              העלאת מסמך
            </button>
          )}
        </div>

        {/* Upload Form */}
        {showForm && canUpload && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-4">העלאת מסמך חדש</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">קובץ *</label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
                {formData.file && (
                  <p className="text-sm text-gray-600 mt-1">נבחר: {formData.file.name}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">סוג מסמך</label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value as DocumentType })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value={DocumentType.PLEADING}>כתב טענות</option>
                    <option value={DocumentType.DECISION}>החלטה</option>
                    <option value={DocumentType.ATTACHMENT}>נספח</option>
                    <option value={DocumentType.PROTOCOL}>פרוטוקול</option>
                    <option value={DocumentType.EXPERT_OPINION}>חוות דעת מומחה</option>
                    <option value={DocumentType.AFFIDAVIT}>תצהיר</option>
                    <option value={DocumentType.OTHER}>אחר</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">הרשאות</label>
                  <select
                    value={formData.permission}
                    onChange={(e) => setFormData({ ...formData, permission: e.target.value as DocumentPermission, visibleTo: [] })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value={DocumentPermission.ALL_PARTIES}>כל הצדדים</option>
                    <option value={DocumentPermission.LAWYERS_ONLY}>עורכי דין בלבד</option>
                    <option value={DocumentPermission.SPECIFIC_PARTY}>צד ספציפי</option>
                    {canManage && (
                      <option value={DocumentPermission.ARBITRATOR_ONLY}>בורר בלבד</option>
                    )}
                  </select>
                </div>
              </div>
              {formData.permission === DocumentPermission.SPECIFIC_PARTY && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">בחר משתמשים</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                    {getAllCaseUsers().map((u) => (
                      <label key={u.id || (u as any)._id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.visibleTo.includes(u.id || (u as any)._id)}
                          onChange={(e) => {
                            const userId = u.id || (u as any)._id;
                            if (e.target.checked) {
                              setFormData({ ...formData, visibleTo: [...formData.visibleTo, userId] });
                            } else {
                              setFormData({ ...formData, visibleTo: formData.visibleTo.filter(id => id !== userId) });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{u.name} ({u.role === 'arbitrator' ? 'בורר' : u.role === 'lawyer' ? 'עורך דין' : 'צד'})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {canManage && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isSecret}
                      onChange={(e) => setFormData({ ...formData, isSecret: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-semibold text-gray-700">מסמך סודי</span>
                  </label>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={uploading || !formData.file}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
              >
                {uploading ? 'מעלה...' : 'העלה מסמך'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    file: null,
                    permission: DocumentPermission.ALL_PARTIES,
                    documentType: DocumentType.OTHER,
                    visibleTo: [],
                    isSecret: false
                  });
                }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {/* Filter Tabs */}
        {documents.length > 0 && (
          <div className="flex gap-2 mb-4 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap ${
                filterType === 'all'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              הכל ({documents.length})
            </button>
            {Object.values(DocumentType).map((type) => {
              const count = documents.filter(d => d.documentType === type).length;
              if (count === 0) return null;
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap ${
                    filterType === type
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {getDocumentTypeLabel(type)} ({count})
                </button>
              );
            })}
          </div>
        )}

        {documents.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="mb-4">
              <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין מסמכים בתיק</h3>
            <p className="text-gray-600 mb-6">העלה כתב טענות / ראיות / נספחים</p>
            {canUpload && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                העלאת מסמך
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-600">אין מסמכים בקטגוריה זו</p>
              </div>
            ) : (
              filteredDocuments.map((doc) => {
                const uploadedBy = typeof doc.uploadedBy === 'object' && doc.uploadedBy
                  ? doc.uploadedBy.name
                  : 'משתמש';

                return (
                  <div
                    key={doc._id}
                    className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-3xl">{getFileIcon(doc.originalName, doc.mimeType)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{doc.originalName}</p>
                          {doc.documentType && (
                            <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
                              {getDocumentTypeLabel(doc.documentType)}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            doc.permission === DocumentPermission.ARBITRATOR_ONLY ? 'bg-red-100 text-red-700' :
                            doc.permission === DocumentPermission.LAWYERS_ONLY ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {getPermissionLabel(doc.permission)}
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
                          {doc.version && doc.version > 1 && (
                            <>
                              <span>•</span>
                              <span>גרסה {doc.version}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManage && (
                        <select
                          value={doc.permission}
                          onChange={(e) => handleUpdatePermission(doc._id, e.target.value as DocumentPermission)}
                          className="text-xs p-1 border border-gray-300 rounded"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value={DocumentPermission.ALL_PARTIES}>כל הצדדים</option>
                          <option value={DocumentPermission.LAWYERS_ONLY}>עורכי דין בלבד</option>
                          <option value={DocumentPermission.SPECIFIC_PARTY}>צד ספציפי</option>
                          <option value={DocumentPermission.ARBITRATOR_ONLY}>בורר בלבד</option>
                        </select>
                      )}
                      <button
                        onClick={() => handleDownload(doc._id, doc.originalName)}
                        className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 font-semibold transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        הורד
                      </button>
                      {canManage && (
                        <button
                          onClick={() => handleDelete(doc._id)}
                          className="bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors"
                          title="מחק מסמך"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

