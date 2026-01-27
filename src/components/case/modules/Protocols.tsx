'use client';

import { useEffect, useState } from 'react';
import { documentsAPI, protocolsAPI } from '@/lib/api';
import { Document, DocumentType, Protocol } from '@/types';

interface ProtocolsProps {
  caseId: string;
}

export default function Protocols({ caseId }: ProtocolsProps) {
  const [protocols, setProtocols] = useState<Document[]>([]);
  const [discussionProtocols, setDiscussionProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProtocols();
  }, [caseId]);

  const loadProtocols = async () => {
    try {
      // Load document protocols
      const allDocs = await documentsAPI.getByCase(caseId);
      const filtered = allDocs.filter((doc: Document) => 
        doc.documentType === DocumentType.PROTOCOL || 
        doc.originalName.toLowerCase().includes('פרוטוקול') ||
        doc.originalName.toLowerCase().includes('protocol')
      );
      setProtocols(filtered);

      // Load discussion session protocols
      try {
        const discussionProtocolsData = await protocolsAPI.getByCase(caseId);
        setDiscussionProtocols(discussionProtocolsData);
      } catch (error: any) {
        console.error('Failed to load discussion protocols:', error);
      }
    } catch (error: any) {
      console.error('Failed to load protocols:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (documentId: string, fileName: string) => {
    try {
      await documentsAPI.download(documentId, fileName);
    } catch (error: any) {
      console.error('Download failed:', error);
    }
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
          <h2 className="text-xl font-bold text-gray-900 border-b-2 border-orange-500 pb-2">פרוטוקולים</h2>
        </div>

        {(protocols.length === 0 && discussionProtocols.length === 0) ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין פרוטוקולים בתיק</h3>
            <p className="text-gray-600 mb-6">פרוטוקולי דיונים יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Discussion Session Protocols */}
            {discussionProtocols.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">פרוטוקולי דיונים</h3>
                <div className="space-y-3">
                  {discussionProtocols.map((protocol) => {
                    const createdBy = typeof protocol.createdBy === 'object' ? protocol.createdBy.name : 'משתמש';
                    const sessionTitle = 'דיון';

                    return (
                      <div
                        key={protocol._id}
                        className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50 hover:bg-orange-100 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded font-semibold">
                                גרסה {protocol.version}
                              </span>
                              <span className="font-semibold text-gray-900">{sessionTitle}</span>
                            </div>
                            <p className="text-sm text-gray-600">
                              נוצר על ידי: {createdBy} • {new Date(protocol.createdAt).toLocaleString('he-IL')}
                            </p>
                          </div>
                        </div>
                        <div
                          className="prose max-w-none mt-2 text-sm"
                          dangerouslySetInnerHTML={{ __html: protocol.content.substring(0, 200) + (protocol.content.length > 200 ? '...' : '') }}
                          style={{ direction: 'rtl', textAlign: 'right' }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Document Protocols */}
            {protocols.length > 0 && (
              <div>
                {discussionProtocols.length > 0 && (
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">פרוטוקולים שהועלו ידנית</h3>
                )}
                <div className="space-y-3">
                  {protocols.map((protocol) => {
                    const uploadedBy = typeof protocol.uploadedBy === 'object' && protocol.uploadedBy
                      ? protocol.uploadedBy.name
                      : 'משתמש';

                    return (
                      <div
                        key={protocol._id}
                        className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-orange-300 transition-all"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="bg-purple-100 p-3 rounded-lg">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 mb-1">{protocol.originalName}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>הועלה על ידי: {uploadedBy}</span>
                              <span>•</span>
                              <span>{new Date(protocol.createdAt).toLocaleDateString('he-IL', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                              <span>•</span>
                              <span>{(protocol.fileSize / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(protocol._id, protocol.originalName)}
                          className="bg-orange-50 text-orange-600 px-4 py-2 rounded-lg hover:bg-orange-100 font-semibold transition-colors flex items-center gap-2"
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

