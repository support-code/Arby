'use client';

import { useState } from 'react';
import { Protocol, Document, Decision, Attendee, DocumentType } from '@/types';

interface FloatingSidebarProps {
  protocols: Protocol[];
  documents: Document[];
  decisions: Decision[];
  attendees: Attendee[];
  sessionTitle: string;
  sessionStatus: string;
  selectedProtocolId?: string;
  selectedDecisionId?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onProtocolClick?: (protocol: Protocol) => void;
  onDocumentClick?: (document: Document) => void;
  onDecisionClick?: (decision: Decision) => void;
  onClose?: () => void;
}

export default function FloatingSidebar({
  protocols,
  documents,
  decisions,
  attendees,
  sessionTitle,
  sessionStatus,
  selectedProtocolId,
  selectedDecisionId,
  isOpen: externalIsOpen,
  onOpenChange,
  onProtocolClick,
  onDocumentClick,
  onDecisionClick,
  onClose
}: FloatingSidebarProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };
  const [activeTab, setActiveTab] = useState<'protocols' | 'documents' | 'decisions' | 'attendees' | 'info'>('protocols');
  const [documentFilter, setDocumentFilter] = useState<DocumentType | 'all'>('all');

  // Group documents by type
  const documentsByType = documents.reduce((acc, doc) => {
    const type = doc.documentType || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  const documentTypes = Object.keys(documentsByType);
  const filteredDocuments = documentFilter === 'all' 
    ? documents 
    : documents.filter(d => d.documentType === documentFilter);

  const getDocumentTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      'pleading': 'טענות',
      'decision': 'החלטות',
      'attachment': 'נספחים',
      'protocol': 'פרוטוקולים',
      'expert_opinion': 'חוות דעת מומחה',
      'affidavit': 'תצהירים',
      'other': 'אחר'
    };
    return labels[type || 'other'] || 'אחר';
  };

  return (
    <>
      {/* Toggle Button - Right Side - Hidden when sidebar is open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 bg-orange-600 text-white p-4 rounded-full shadow-lg hover:bg-orange-700 transition-all duration-300"
          title="פתח סיידבר"
          style={{ direction: 'ltr' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ direction: 'rtl' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold mb-2">{sessionTitle}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  sessionStatus === 'active' ? 'bg-green-100 text-green-800' :
                  sessionStatus === 'completed' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {sessionStatus === 'active' ? 'פעיל' :
                   sessionStatus === 'completed' ? 'הושלם' : 'בוטל'}
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('protocols')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'protocols' ? 'bg-white text-orange-600' : 'bg-orange-500 text-white hover:bg-orange-400'
                }`}
              >
                פרוטוקולים ({protocols.length})
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'documents' ? 'bg-white text-orange-600' : 'bg-orange-500 text-white hover:bg-orange-400'
                }`}
              >
                מסמכים ({documents.length})
              </button>
              <button
                onClick={() => setActiveTab('decisions')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'decisions' ? 'bg-white text-orange-600' : 'bg-orange-500 text-white hover:bg-orange-400'
                }`}
              >
                החלטות ({decisions.length})
              </button>
              <button
                onClick={() => setActiveTab('attendees')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'attendees' ? 'bg-white text-orange-600' : 'bg-orange-500 text-white hover:bg-orange-400'
                }`}
              >
                נוכחים ({attendees.length})
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'info' ? 'bg-white text-orange-600' : 'bg-orange-500 text-white hover:bg-orange-400'
                }`}
              >
                מידע
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Protocols Tab */}
            {activeTab === 'protocols' && (
              <div className="space-y-3">
                {protocols.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>אין פרוטוקולים</p>
                  </div>
                ) : (
                  protocols.map((protocol) => {
                    const createdBy = typeof protocol.createdBy === 'object' ? protocol.createdBy.name : 'משתמש';
                    return (
                      <div
                        key={protocol._id}
                        onClick={() => {
                          onProtocolClick?.(protocol);
                          // Close sidebar on mobile after selection
                          if (window.innerWidth < 768) {
                            setIsOpen(false);
                            onClose?.();
                          }
                        }}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedProtocolId === protocol._id
                            ? 'bg-orange-50 border-orange-400 shadow-md'
                            : 'bg-gray-50 border-gray-200 hover:border-orange-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                              <span className="text-orange-600 font-bold text-sm">ג{protocol.version}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">גרסה {protocol.version}</p>
                              <p className="text-xs text-gray-600">{createdBy}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(protocol.createdAt).toLocaleDateString('he-IL', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div
                          className="text-sm text-gray-700 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: protocol.content.substring(0, 150) + '...' }}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                {/* Filter by Type */}
                {documentTypes.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">סינון לפי סוג:</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setDocumentFilter('all')}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          documentFilter === 'all'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        הכל
                      </button>
                      {documentTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => setDocumentFilter(type as DocumentType)}
                          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                            documentFilter === type
                              ? 'bg-orange-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {getDocumentTypeLabel(type)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>אין מסמכים</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredDocuments.map((document) => {
                      const uploadedBy = typeof document.uploadedBy === 'object' ? document.uploadedBy.name : 'משתמש';
                      return (
                        <div
                          key={document._id}
                          onClick={() => onDocumentClick?.(document)}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-md cursor-pointer transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{document.originalName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                                  {getDocumentTypeLabel(document.documentType)}
                                </span>
                                <span className="text-xs text-gray-500">{uploadedBy}</span>
                                <span className="text-xs text-gray-500">
                                  {(document.fileSize / 1024).toFixed(1)} KB
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Decisions Tab */}
            {activeTab === 'decisions' && (
              <div className="space-y-3">
                {decisions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>אין החלטות</p>
                  </div>
                ) : (
                  decisions.map((decision) => (
                    <div
                      key={decision._id}
                      onClick={() => {
                        onDecisionClick?.(decision);
                        // Close sidebar on mobile after selection
                        if (window.innerWidth < 768) {
                          setIsOpen(false);
                          onClose?.();
                        }
                      }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedDecisionId === decision._id
                          ? 'bg-orange-50 border-orange-400 shadow-md'
                          : 'bg-gray-50 border-gray-200 hover:border-orange-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{decision.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded flex-shrink-0 ${
                          decision.status === 'published' ? 'bg-green-100 text-green-700' :
                          decision.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {decision.status === 'published' ? 'פורסם' :
                           decision.status === 'draft' ? 'טיוטה' : 'בוטל'}
                        </span>
                      </div>
                      {decision.content && (
                        <p className="text-sm text-gray-700 line-clamp-2">{decision.content}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(decision.createdAt).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Attendees Tab */}
            {activeTab === 'attendees' && (
              <div className="space-y-3">
                {attendees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p>אין נוכחים</p>
                  </div>
                ) : (
                  attendees.map((attendee, index) => {
                    const getTypeLabel = (type: string) => {
                      const labels: Record<string, string> = {
                        'witness': 'עד',
                        'expert': 'מומחה',
                        'court_clerk': 'יכל',
                        'secretary': 'מנני',
                        'other': 'אחר'
                      };
                      return labels[type] || 'אחר';
                    };
                    
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                          {attendee.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{attendee.name}</p>
                          <p className="text-sm text-gray-600">{getTypeLabel(attendee.type)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Info Tab */}
            {activeTab === 'info' && (
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    מידע על הדיון
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">סטטוס:</span>
                      <span className="font-semibold text-gray-900">
                        {sessionStatus === 'active' ? 'פעיל' :
                         sessionStatus === 'completed' ? 'הושלם' : 'בוטל'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">פרוטוקולים:</span>
                      <span className="font-semibold text-gray-900">{protocols.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">מסמכים:</span>
                      <span className="font-semibold text-gray-900">{documents.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">החלטות:</span>
                      <span className="font-semibold text-gray-900">{decisions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">נוכחים:</span>
                      <span className="font-semibold text-gray-900">{attendees.length}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    קישורים מהירים
                  </h3>
                  <div className="space-y-2">
                    <button className="w-full text-right p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors text-sm">
                      📄 צפה בכל המסמכים
                    </button>
                    <button className="w-full text-right p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors text-sm">
                      📋 הורד פרוטוקול
                    </button>
                    <button className="w-full text-right p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors text-sm">
                      📊 דוח דיון
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

