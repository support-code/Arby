'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { discussionSessionsAPI, protocolsAPI, decisionsAPI, usersAPI, documentsAPI, hearingsAPI } from '@/lib/api';
import { DiscussionSession, Protocol, User, Decision, UserRole, Document, Attendee, AttendeeType, DecisionType, DecisionStatus, Hearing } from '@/types';
import { useAuthStore } from '@/store/authStore';
import FloatingSidebar from '@/components/discussion/FloatingSidebar';

export default function DiscussionSessionPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  const discussionId = params.discussionId as string;
  const { user, hasRole } = useAuthStore();

  const [session, setSession] = useState<DiscussionSession | null>(null);
  const [hearing, setHearing] = useState<Hearing | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [protocolContent, setProtocolContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [attendeeType, setAttendeeType] = useState<AttendeeType>(AttendeeType.WITNESS);
  const [attendeeName, setAttendeeName] = useState('');
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [decisionTitle, setDecisionTitle] = useState('');
  const [decisionContent, setDecisionContent] = useState('');
  const [decisionProtocol, setDecisionProtocol] = useState('');
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showUploadDocument, setShowUploadDocument] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState('');
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const canEdit = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);

  useEffect(() => {
    if (discussionId) {
      loadSession();
      loadProtocols();
      loadDecisions();
      loadDocuments();
    }
  }, [discussionId, caseId]);

  // Timer effect
  useEffect(() => {
    if (!session || session.status !== 'active') return;
    
    const interval = setInterval(() => {
      const start = new Date(session.startedAt);
      const now = new Date();
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000); // seconds
      setElapsedTime(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Timer effect
  useEffect(() => {
    if (!session || session.status !== 'active') return;
    
    const interval = setInterval(() => {
      const start = new Date(session.startedAt);
      const now = new Date();
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000); // seconds
      setElapsedTime(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const loadSession = async () => {
    try {
      const data = await discussionSessionsAPI.getById(discussionId);
      setSession(data);
      
      // Legal Requirement #1: Load hearing to check date
      if (data.hearingId) {
        try {
          const hearingData = await hearingsAPI.getById(data.hearingId);
          setHearing(hearingData);
        } catch (error) {
          console.error('Failed to load hearing:', error);
        }
      }
      if (data.protocol) {
        // Legal Principle #4: Participants header is locked and system-generated
        // For editing, we extract content without header (server will re-inject on save)
        // For display, we show full content including header
        const contentWithoutHeader = data.protocol.replace(
          /<div class="protocol-participants-header"[^>]*>.*?<\/div>\s*/g,
          ''
        ).trim();
        setProtocolContent(contentWithoutHeader);
      } else {
        setProtocolContent('');
      }
      // Legal Requirement #13: Decisions are not time-bound to hearing duration
      // Show all decisions for the case (not filtered by session time)
      if (data) {
        const decisionsData = await decisionsAPI.getByCase(caseId);
        // Filter out soft-deleted decisions
        const activeDecisions = decisionsData.filter(d => !d.isDeleted);
        setDecisions(activeDecisions);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProtocols = async () => {
    try {
      const data = await protocolsAPI.getBySession(discussionId);
      setProtocols(data);
    } catch (error) {
      console.error('Failed to load protocols:', error);
    }
  };


  const loadDecisions = async () => {
    try {
      const data = await decisionsAPI.getByCase(caseId);
      // Legal Requirement #13: Decisions are not time-bound to hearing duration
      // Filter out soft-deleted decisions only
      const activeDecisions = data.filter(d => !d.isDeleted);
      setDecisions(activeDecisions);
    } catch (error) {
      console.error('Failed to load decisions:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await documentsAPI.getByCase(caseId);
      setDocuments(data);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleProtocolClick = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    // Scroll to protocol section
    const element = document.getElementById('protocols-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDocumentClick = async (document: Document) => {
    try {
      await documentsAPI.download(document._id, document.originalName);
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('שגיאה בהורדת המסמך');
    }
  };

  const handleDecisionClick = (decision: Decision) => {
    setSelectedDecision(decision);
    // Scroll to decisions section
    const element = document.getElementById('decisions-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSaveProtocol = async () => {
    if (!session) return;
    
    // Legal Principle #1 & #2: Check if protocol write is allowed
    if (!canWriteProtocol) {
      alert(blockReason || 'לא ניתן לשמור פרוטוקול במצב זה');
      return;
    }
    
    if (!protocolContent.trim()) {
      alert('אנא הזן תוכן פרוטוקול לפני השמירה');
      return;
    }
    
    setSaving(true);
    try {
      // Legal Principle #4: Participants header is injected server-side
      // Extract content without header (if user somehow removed it, server will re-add)
      const contentWithoutHeader = protocolContent.replace(
        /<div class="protocol-participants-header"[^>]*>.*?<\/div>\s*/g,
        ''
      ).trim();
      
      // Save as protocol version (server will inject participants header)
      await protocolsAPI.saveProtocol(discussionId, contentWithoutHeader);
      await loadSession(); // Reload to get updated protocol with header
      await loadProtocols();
      alert('הפרוטוקול נשמר בהצלחה');
    } catch (error: any) {
      console.error('Failed to save protocol:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'שגיאה בשמירת הפרוטוקול';
      alert(`שגיאה בשמירת הפרוטוקול: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAttendee = async () => {
    if (!attendeeName.trim()) {
      alert('אנא הזן שם נוכח');
      return;
    }
    try {
      await discussionSessionsAPI.addAttendee(discussionId, {
        type: attendeeType,
        name: attendeeName.trim()
      });
      await loadSession();
      setShowAddAttendee(false);
      setAttendeeName('');
      setAttendeeType(AttendeeType.WITNESS);
    } catch (error) {
      console.error('Failed to add attendee:', error);
      alert('שגיאה בהוספת נוכח');
    }
  };

  const handleRemoveAttendee = async (index: number) => {
    if (!confirm('האם אתה בטוח שברצונך להסיר נוכח זה?')) return;
    try {
      await discussionSessionsAPI.removeAttendee(discussionId, index);
      await loadSession();
    } catch (error) {
      console.error('Failed to remove attendee:', error);
      alert('שגיאה בהסרת נוכח');
    }
  };

  const handleEndSession = async () => {
    if (!confirm('האם אתה בטוח שברצונך לסיים את הדיון?')) return;
    try {
      await discussionSessionsAPI.endSession(discussionId);
      await loadSession();
      alert('הדיון הסתיים');
    } catch (error) {
      console.error('Failed to end session:', error);
      alert('שגיאה בסיום הדיון');
    }
  };

  const handleCreateDecision = async () => {
    if (!decisionTitle || !decisionContent || !decisionProtocol) {
      alert('אנא מלא את כל השדות כולל הפרוטוקול');
      return;
    }
    try {
      // Save protocol first
      await protocolsAPI.saveProtocol(discussionId, decisionProtocol);
      
      // Update session protocol - append decision protocol
      if (session) {
        const updatedProtocol = protocolContent 
          ? protocolContent + '\n\n' + decisionProtocol 
          : decisionProtocol;
        await discussionSessionsAPI.update(discussionId, { protocol: updatedProtocol });
        setProtocolContent(updatedProtocol);
      }
      
      // Create decision (discussion decision type)
      await decisionsAPI.create({
        caseId,
        type: DecisionType.DISCUSSION_DECISION,
        title: decisionTitle,
        content: decisionContent,
        discussionSessionId: discussionId,
        status: DecisionStatus.DRAFT
      });
      
      setShowDecisionForm(false);
      setDecisionTitle('');
      setDecisionContent('');
      setDecisionProtocol('');
      await loadDecisions();
      await loadProtocols();
      alert('החלטה ופרוטוקול נשמרו בהצלחה');
    } catch (error: any) {
      console.error('Failed to create decision:', error);
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה ביצירת החלטה';
      alert(`שגיאה ביצירת החלטה: ${errorMessage}`);
    }
  };

  const handleUploadDocument = async () => {
    if (!documentFile && !documentText.trim()) {
      alert('אנא בחר קובץ או הזן טקסט');
      return;
    }

    try {
      if (documentFile) {
        // Upload file
        await documentsAPI.upload(
          caseId,
          documentFile,
          'all_parties',
          undefined,
          'protocol',
          false
        );
      } else if (documentText.trim()) {
        // Create text document - convert to blob
        const blob = new Blob([documentText], { type: 'text/plain' });
        const file = new File([blob], `מסמך טקסט - ${new Date().toLocaleDateString('he-IL')}.txt`, {
          type: 'text/plain'
        });
        await documentsAPI.upload(
          caseId,
          file,
          'all_parties',
          undefined,
          'protocol',
          false
        );
      }

      setShowUploadDocument(false);
      setDocumentFile(null);
      setDocumentText('');
      setShowTextEditor(false);
      await loadDocuments();
      alert('מסמך הועלה בהצלחה');
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בהעלאת מסמך';
      alert(`שגיאה בהעלאת מסמך: ${errorMessage}`);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSessionDuration = () => {
    if (!session) return 0;
    const start = new Date(session.startedAt);
    const end = session.endedAt ? new Date(session.endedAt) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  };

  const handleExportToWord = async () => {
    if (!session || !session.protocol) {
      alert('אין פרוטוקול לייצוא');
      return;
    }

    try {
      // Create HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <title>${session.title}</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; }
            h1 { color: #333; }
            .header { margin-bottom: 30px; }
            .protocol { margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${session.title}</h1>
            <p>תאריך: ${new Date(session.startedAt).toLocaleString('he-IL')}</p>
            ${session.endedAt ? `<p>הסתיים: ${new Date(session.endedAt).toLocaleString('he-IL')}</p>` : ''}
          </div>
          <div class="protocol">
            ${session.protocol}
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.doc`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export to Word:', error);
      alert('שגיאה בייצוא לוורד');
    }
  };

  const handleExportToPDF = async () => {
    if (!session || !session.protocol) {
      alert('אין פרוטוקול לייצוא');
      return;
    }

    try {
      // Use window.print() for PDF export
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('לא ניתן לפתוח חלון הדפסה. אנא בדוק את חסימת החלונות הקופצים.');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <title>${session.title}</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 40px; }
            h1 { color: #333; margin-bottom: 20px; }
            .header { margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .protocol { margin-top: 20px; line-height: 1.6; }
            @media print {
              body { margin: 0; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${session.title}</h1>
            <p><strong>תאריך:</strong> ${new Date(session.startedAt).toLocaleString('he-IL')}</p>
            ${session.endedAt ? `<p><strong>הסתיים:</strong> ${new Date(session.endedAt).toLocaleString('he-IL')}</p>` : ''}
            <p><strong>נוכחים:</strong> ${attendees.map(a => a.name).join(', ')}</p>
          </div>
          <div class="protocol">
            ${session.protocol}
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (error) {
      console.error('Failed to export to PDF:', error);
      alert('שגיאה בייצוא ל-PDF');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">טוען...</div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="text-center py-12">דיון לא נמצא</div>
      </Layout>
    );
  }

  const attendees = session.attendees || [];
  
  // Legal Requirement #1: Check if today is the hearing date
  const isHearingDate = (): boolean => {
    if (!hearing && !session) return false;
    const hearingDate = hearing?.scheduledDate ? new Date(hearing.scheduledDate) : new Date(session.startedAt);
    const today = new Date();
    
    // Compare dates (ignore time)
    const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const hearingStr = `${hearingDate.getFullYear()}-${hearingDate.getMonth()}-${hearingDate.getDate()}`;
    
    return todayStr === hearingStr;
  };
  
  // Legal Requirement #1: Protocol may ONLY be opened and edited on the hearing day itself
  // Legal Principle #2: Protocol may ONLY be written during ACTIVE hearing
  // Legal Principle #3: Protocol may ONLY be written if at least ONE participant is registered
  const canWriteProtocol = isHearingDate() && session.status === 'active' && attendees.length > 0;
  const isReadOnly = !canWriteProtocol;
  
  // Legal warnings for blocked editing
  const getBlockReason = (): string | null => {
    // Legal Requirement #1: Check hearing date first
    if (!isHearingDate()) {
      const hearingDate = hearing?.scheduledDate ? new Date(hearing.scheduledDate) : session.startedAt ? new Date(session.startedAt) : null;
      if (hearingDate) {
        return `פרוטוקול ניתן לפתיחה ועריכה רק ביום הדיון עצמו. תאריך הדיון: ${hearingDate.toLocaleDateString('he-IL')}. תאריך נוכחי: ${new Date().toLocaleDateString('he-IL')}.`;
      }
    }
    if (session.status !== 'active') {
      const statusLabels: Record<string, string> = {
        'completed': 'הושלם',
        'cancelled': 'בוטל',
        'ended': 'נסתיים',
        'signed': 'נחתם'
      };
      const statusLabel = statusLabels[session.status] || session.status;
      return `פרוטוקול נעול. סטטוס נוכחי: ${statusLabel}. פרוטוקול ניתן לעריכה רק במהלך דיון פעיל (ACTIVE).`;
    }
    if (attendees.length === 0) {
      return 'לא ניתן לכתוב פרוטוקול ללא נוכחים רשומים. יש להוסיף לפחות נוכח אחד לפני כתיבת הפרוטוקול.';
    }
    return null;
  };
  
  const blockReason = getBlockReason();
  
  const getAttendeeTypeLabel = (type: AttendeeType) => {
    const labels: Record<AttendeeType, string> = {
      [AttendeeType.WITNESS]: 'עד',
      [AttendeeType.EXPERT]: 'מומחה',
      [AttendeeType.COURT_CLERK]: 'יכל',
      [AttendeeType.SECRETARY]: 'מנני',
      [AttendeeType.OTHER]: 'אחר'
    };
    return labels[type] || 'אחר';
  };

  return (
    <Layout>
      {/* Floating Sidebar */}
      <FloatingSidebar
        protocols={protocols}
        documents={documents}
        decisions={decisions}
        attendees={attendees}
        sessionTitle={session.title}
        sessionStatus={session.status}
        selectedProtocolId={selectedProtocol?._id}
        selectedDecisionId={selectedDecision?._id}
        isOpen={sidebarOpen}
        onOpenChange={setSidebarOpen}
        onProtocolClick={handleProtocolClick}
        onDocumentClick={handleDocumentClick}
        onDecisionClick={handleDecisionClick}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="max-w-7xl mx-auto p-6 space-y-6" style={{ marginRight: '0' }}>
        {/* Header */}
        <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                חזרה
              </button>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2 text-gray-900">{session.title}</h1>
                  <div className="flex items-center gap-4 text-gray-600 flex-wrap">
                    <span>
                      התחיל: {new Date(session.startedAt).toLocaleString('he-IL')}
                    </span>
                    {session.endedAt && (
                      <span>
                        הסתיים: {new Date(session.endedAt).toLocaleString('he-IL')}
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      session.status === 'active' ? 'bg-green-100 text-green-700' :
                      session.status === 'completed' || session.status === 'ended' ? 'bg-blue-100 text-blue-700' :
                      session.status === 'signed' ? 'bg-purple-100 text-purple-700' :
                      session.status === 'created' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {session.status === 'active' ? 'פעיל' :
                       session.status === 'completed' || session.status === 'ended' ? 'נסתיים' :
                       session.status === 'signed' ? 'נחתם' :
                       session.status === 'created' ? 'נוצר' : 'בוטל'}
                    </span>
                    {/* Timer */}
                    {session.status === 'active' && (
                      <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                        <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-mono font-bold text-blue-700">{formatTime(elapsedTime)}</span>
                      </div>
                    )}
                    {/* Duration for completed sessions */}
                    {session.status !== 'active' && session.endedAt && (
                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-mono font-semibold text-gray-700">משך זמן: {formatTime(getSessionDuration())}</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="flex flex-col gap-2 items-end">
                  {/* Legal Principle #5: State machine transitions */}
                  {canEdit && session.status === 'created' && (
                    <button
                      onClick={async () => {
                        try {
                          await discussionSessionsAPI.startSession(discussionId);
                          await loadSession();
                          alert('הדיון הופעל');
                        } catch (error: any) {
                          alert(`שגיאה בהפעלת הדיון: ${error.response?.data?.message || error.message}`);
                        }
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold"
                    >
                      התחל דיון
                    </button>
                  )}
                  {canEdit && session.status === 'active' && (
                    <button
                      onClick={handleEndSession}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
                    >
                      סיים דיון
                    </button>
                  )}
                  {canEdit && session.status === 'ended' && (
                    <button
                      onClick={async () => {
                        if (!confirm('האם אתה בטוח שברצונך לחתום על הפרוטוקול? לאחר החתימה הפרוטוקול יהיה נעול לצמיתות.')) return;
                        try {
                          await discussionSessionsAPI.signProtocol(discussionId);
                          await loadSession();
                          alert('הפרוטוקול נחתם');
                        } catch (error: any) {
                          alert(`שגיאה בחתימה על הפרוטוקול: ${error.response?.data?.message || error.message}`);
                        }
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
                    >
                      חתום על הפרוטוקול
                    </button>
                  )}
                  {/* Export Buttons - Show for all sessions with protocol */}
                  {session.protocol && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleExportToWord}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2 text-sm"
                        title="ייצוא לוורד"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Word
                      </button>
                      <button
                        onClick={handleExportToPDF}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold flex items-center gap-2 text-sm"
                        title="ייצוא ל-PDF"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        PDF
                      </button>
                      {/* AI Summary Button (UI only) */}
                      <button
                        onClick={() => alert('תכונת סיכום AI תהיה זמינה בקרוב')}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold flex items-center gap-2 text-sm"
                        title="סיכום AI"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI
                      </button>
                    </div>
                  )}
                  {/* Show "דיון סגור" badge for completed sessions */}
                  {session.status !== 'active' && (
                    <div className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold text-sm">
                      דיון סגור
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Attendees Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">נוכחים בחדר</h2>
              {/* Allow adding attendees when session is created or active (before ending) */}
              {canEdit && (session.status === 'active' || session.status === 'created') && (
                <button
                  onClick={() => {
                    setShowAddAttendee(!showAddAttendee);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  הוסף נוכח
                </button>
              )}
            </div>
            
            {showAddAttendee && canEdit && (session.status === 'active' || session.status === 'created') && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">סוג נוכח:</label>
                  <select
                    value={attendeeType}
                    onChange={(e) => setAttendeeType(e.target.value as AttendeeType)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value={AttendeeType.WITNESS}>עד</option>
                    <option value={AttendeeType.EXPERT}>מומחה</option>
                    <option value={AttendeeType.COURT_CLERK}>יכל</option>
                    <option value={AttendeeType.SECRETARY}>מנני</option>
                    <option value={AttendeeType.OTHER}>אחר</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">שם:</label>
                  <input
                    type="text"
                    value={attendeeName}
                    onChange={(e) => setAttendeeName(e.target.value)}
                    placeholder="הזן שם נוכח"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddAttendee}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    הוסף
                  </button>
                  <button
                    onClick={() => {
                      setShowAddAttendee(false);
                      setAttendeeName('');
                      setAttendeeType(AttendeeType.WITNESS);
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-semibold"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}

            {/* Show attendees list - always visible, including for closed sessions */}
            {attendees.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {attendees.map((attendee, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {attendee.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{attendee.name}</p>
                        <p className="text-sm text-gray-600">{getAttendeeTypeLabel(attendee.type)}</p>
                      </div>
                    </div>
                    {canEdit && !isReadOnly && (
                      <button
                        onClick={() => handleRemoveAttendee(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>אין נוכחים רשומים בדיון</p>
              </div>
            )}
          </div>
        </div>

        {/* Legal Warning - Show when protocol editing is blocked */}
        {blockReason && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg shadow-sm p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 mb-2">פרוטוקול נעול לעריכה</h3>
                <p className="text-red-800">{blockReason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Protocol Editor */}
        {canWriteProtocol && canEdit ? (
          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">כתיבת פרוטוקול</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDecisionForm(!showDecisionForm)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  החלטה חדשה
                </button>
                <button
                  onClick={() => setShowUploadDocument(!showUploadDocument)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-semibold flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  הוסף מסמך
                </button>
                <button
                  onClick={handleSaveProtocol}
                  disabled={saving || !protocolContent.trim()}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      שומר...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      שמור פרוטוקול
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Decision Form Accordion - Above Protocol */}
            {showDecisionForm && (
              <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 shadow-md">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  יצירת החלטה חדשה
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">כותרת החלטה:</label>
                    <input
                      type="text"
                      value={decisionTitle}
                      onChange={(e) => setDecisionTitle(e.target.value)}
                      placeholder="הזן כותרת החלטה"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">תוכן החלטה:</label>
                    <textarea
                      value={decisionContent}
                      onChange={(e) => setDecisionContent(e.target.value)}
                      placeholder="הזן תוכן החלטה"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">פרוטוקול החלטה:</label>
                    <RichTextEditor
                      value={decisionProtocol}
                      onChange={setDecisionProtocol}
                      placeholder="הזן את הפרוטוקול של ההחלטה..."
                      className="min-h-[200px]"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handleCreateDecision}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    שמור החלטה ופרוטוקול
                  </button>
                  <button
                    onClick={() => {
                      setShowDecisionForm(false);
                      setDecisionTitle('');
                      setDecisionContent('');
                      setDecisionProtocol('');
                    }}
                    className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-semibold"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
            
            {/* Upload Document Form */}
            {showUploadDocument && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <h3 className="font-semibold text-gray-900 mb-4">הוספת מסמך לדיון</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">העלאת קובץ:</label>
                    <input
                      type="file"
                      onChange={(e) => {
                        setDocumentFile(e.target.files?.[0] || null);
                        setShowTextEditor(false);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      accept=".pdf,.doc,.docx,.txt"
                    />
                  </div>
                  <div className="text-center text-gray-600">או</div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">יצירת מסמך טקסט:</label>
                    <button
                      onClick={() => {
                        setShowTextEditor(!showTextEditor);
                        setDocumentFile(null);
                      }}
                      className="w-full p-3 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-50 font-semibold text-purple-700"
                    >
                      {showTextEditor ? 'ביטול עריכת טקסט' : 'פתח עורך טקסט'}
                    </button>
                    {showTextEditor && (
                      <div className="mt-3">
                        <RichTextEditor
                          value={documentText}
                          onChange={setDocumentText}
                          placeholder="התחל לכתוב מסמך טקסט..."
                          className="min-h-[200px]"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUploadDocument}
                      disabled={!documentFile && !documentText.trim()}
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50 flex items-center gap-2"
                    >
                      העלה מסמך
                    </button>
                    <button
                      onClick={() => {
                        setShowUploadDocument(false);
                        setDocumentFile(null);
                        setDocumentText('');
                        setShowTextEditor(false);
                      }}
                      className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Legal Principle #4: Participants header is automatically injected and locked */}
            {/* Note: Header is injected server-side, but we ensure it's visible here */}
            <RichTextEditor
              value={protocolContent}
              onChange={setProtocolContent}
              placeholder="התחל לכתוב את הפרוטוקול..."
              disabled={!canWriteProtocol}
            />
          </div>
        ) : canEdit && (
          /* Show read-only view when protocol exists but editing is blocked */
          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">פרוטוקול הדיון (קריאה בלבד)</h2>
            </div>
            {session.protocol ? (
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: session.protocol }}
                style={{ direction: 'rtl', textAlign: 'right' }}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>אין פרוטוקול לדיון זה</p>
              </div>
            )}
          </div>
        )}

        {/* View Protocol - Show for completed sessions - Always show if protocol exists */}
        {session.status !== 'active' && (
          <>
            {session.protocol && (
              <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">פרוטוקול הדיון</h2>
                  {session.endedAt && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">משך זמן: {formatTime(getSessionDuration())}</span>
                    </div>
                  )}
                </div>
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: session.protocol }}
                  style={{ direction: 'rtl', textAlign: 'right' }}
                />
              </div>
            )}
            {!session.protocol && (
              <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6">
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-semibold">אין פרוטוקול לדיון זה</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Previous Protocols */}
        {protocols.length > 0 && (
          <div id="protocols-section" className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">פרוטוקולים קודמים</h2>
            <div className="space-y-4">
              {protocols.map((protocol) => {
                const createdBy = typeof protocol.createdBy === 'object' ? protocol.createdBy.name : 'משתמש';
                return (
                  <div key={protocol._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">גרסה {protocol.version}</p>
                        <p className="text-sm text-gray-600">
                          נוצר על ידי: {createdBy} • {new Date(protocol.createdAt).toLocaleString('he-IL')}
                        </p>
                      </div>
                    </div>
                    <div
                      className="prose max-w-none mt-2"
                      dangerouslySetInnerHTML={{ __html: protocol.content }}
                      style={{ direction: 'rtl', textAlign: 'right' }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Decisions Section - Display only, form is above protocol */}
        <div id="decisions-section" className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">החלטות</h2>
          </div>

          {decisions.length > 0 ? (
            <div className="space-y-3">
              {decisions.map((decision) => (
                <div key={decision._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{decision.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${
                      decision.status === 'published' ? 'bg-green-100 text-green-700' :
                      decision.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {decision.status === 'published' ? 'פורסם' :
                       decision.status === 'draft' ? 'טיוטה' : 'בוטל'}
                    </span>
                  </div>
                  {decision.content && <p className="text-gray-700">{decision.content}</p>}
                  {decision.summary && <p className="text-sm text-gray-600 mt-2">{decision.summary}</p>}
                  <p className="text-xs text-gray-500 mt-2">
                    נוצר: {new Date(decision.createdAt).toLocaleString('he-IL')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">אין החלטות בדיון זה</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

