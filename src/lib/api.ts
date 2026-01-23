import axios from 'axios';
import { 
  User, Case, Document, Invitation, Decision, Request, Comment, Task, 
  Hearing, Appeal, InternalNote, DocumentVersion, RelatedCase, Reminder, Expense,
  DiscussionSession, Protocol, Annotation
} from '@/types';

// Determine API URL based on environment
const getApiUrl = () => {
  // If explicitly set via environment variable, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // In production (not localhost), use the production API
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://monkfish-app-wqzyb.ondigitalocean.app/api';
  }
  // Default to localhost for development
  return 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Separate instance for file uploads (without Content-Type header)
const fileApi = axios.create({
  baseURL: API_URL
});

// Add token to requests
const addAuthToken = (config: any) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
};

api.interceptors.request.use(addAuthToken);
fileApi.interceptors.request.use(addAuthToken);

// Handle auth errors
const handleAuthError = (error: any) => {
  if (error.response?.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Use router instead of window.location for Next.js App Router
      if (window.location) {
        window.location.href = '/login';
      }
    }
  }
  return Promise.reject(error);
};

api.interceptors.response.use(
  (response) => response,
  handleAuthError
);
fileApi.interceptors.response.use(
  (response) => response,
  handleAuthError
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },
  register: async (email: string, password: string, name: string, token: string) => {
    const { data } = await api.post('/auth/register', { email, password, name, token });
    return data;
  },
  getMe: async (): Promise<User> => {
    const { data } = await api.get('/auth/me');
    return data;
  }
};

// Cases API
export const casesAPI = {
  getAll: async (): Promise<Case[]> => {
    const { data } = await api.get('/cases');
    return data;
  },
  getById: async (caseId: string): Promise<Case> => {
    const { data } = await api.get(`/cases/${caseId}`);
    return data;
  },
  create: async (caseData: any): Promise<any> => {
    const { data } = await api.post('/cases', caseData);
    return data;
  },
  update: async (caseId: string, updates: Partial<Case>): Promise<Case> => {
    const { data } = await api.patch(`/cases/${caseId}`, updates);
    return data;
  },
  addLawyer: async (caseId: string, lawyerId: string): Promise<Case> => {
    const { data } = await api.post(`/cases/${caseId}/lawyers`, { lawyerId });
    return data;
  },
  addParty: async (caseId: string, partyId: string): Promise<Case> => {
    const { data } = await api.post(`/cases/${caseId}/parties`, { partyId });
    return data;
  }
};

// Documents API
export const documentsAPI = {
  getByCase: async (caseId: string): Promise<Document[]> => {
    const { data } = await api.get(`/documents/case/${caseId}`);
    return data;
  },
  getById: async (documentId: string): Promise<Document> => {
    const { data } = await api.get(`/documents/${documentId}`);
    return data;
  },
  upload: async (caseId: string, file: File, permission: string, visibleTo?: string[], documentType?: string, isSecret?: boolean): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caseId', caseId);
    formData.append('permission', permission);
    if (visibleTo) {
      formData.append('visibleTo', JSON.stringify(visibleTo));
    }
    if (documentType) {
      formData.append('documentType', documentType);
    }
    if (isSecret !== undefined) {
      formData.append('isSecret', String(isSecret));
    }

    const { data } = await fileApi.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  },
  download: async (documentId: string, fileName?: string): Promise<Blob> => {
    const { data } = await api.get(`/documents/${documentId}/download`, {
      responseType: 'blob'
    });
    // If fileName is provided, trigger download automatically
    if (fileName && typeof window !== 'undefined') {
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
    return data;
  },
  update: async (documentId: string, updates: Partial<Document>): Promise<Document> => {
    const { data } = await api.patch(`/documents/${documentId}`, updates);
    return data;
  },
  delete: async (documentId: string): Promise<void> => {
    await api.delete(`/documents/${documentId}`);
  }
};

// Audit API
export const auditAPI = {
  getCaseLogs: async (caseId: string): Promise<any[]> => {
    const { data } = await api.get(`/audit/case/${caseId}`);
    return data;
  }
};

// Invitations API
export const invitationsAPI = {
  create: async (invitationData: Partial<Invitation>): Promise<Invitation> => {
    const { data } = await api.post('/invitations', invitationData);
    return data;
  },
  getAll: async (): Promise<Invitation[]> => {
    const { data } = await api.get('/invitations');
    return data;
  },
  getByToken: async (token: string): Promise<Invitation> => {
    const { data } = await api.get(`/invitations/token/${token}`);
    return data;
  }
};

// Users API
export const usersAPI = {
  getAll: async (): Promise<User[]> => {
    const { data } = await api.get('/users');
    return data;
  },
  getById: async (userId: string): Promise<User> => {
    const { data } = await api.get(`/users/${userId}`);
    return data;
  },
  create: async (userData: { email: string; name: string; role: string }): Promise<any> => {
    const { data } = await api.post('/users', userData);
    return data;
  },
  createBulk: async (users: Array<{ email: string; name: string; role: string }>): Promise<any> => {
    const { data } = await api.post('/users/bulk', { users });
    return data;
  },
  updateStatus: async (userId: string, status: string): Promise<User> => {
    const { data } = await api.patch(`/users/${userId}/status`, { status });
    return data;
  },
  delete: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}`);
  }
};

// Decisions API
export const decisionsAPI = {
  getByCase: async (caseId: string): Promise<Decision[]> => {
    const { data } = await api.get(`/decisions/case/${caseId}`);
    return data;
  },
  getById: async (decisionId: string): Promise<Decision> => {
    const { data } = await api.get(`/decisions/${decisionId}`);
    return data;
  },
  create: async (decisionData: Partial<Decision>): Promise<Decision> => {
    const { data } = await api.post('/decisions', decisionData);
    return data;
  },
  update: async (decisionId: string, updates: Partial<Decision>): Promise<Decision> => {
    const { data } = await api.patch(`/decisions/${decisionId}`, updates);
    return data;
  },
  revoke: async (decisionId: string, revokingDecisionId: string): Promise<{ revokedDecision: Decision; revokingDecision: Decision }> => {
    const { data } = await api.post(`/decisions/${decisionId}/revoke`, { revokingDecisionId });
    return data;
  },
  delete: async (decisionId: string): Promise<void> => {
    await api.delete(`/decisions/${decisionId}`);
  },
  generateAnnotatedPdf: async (decisionId: string): Promise<Decision> => {
    const { data } = await api.post(`/decisions/${decisionId}/generate-annotated-pdf`);
    return data;
  }
};

// Requests API
export const requestsAPI = {
  getByCase: async (caseId: string): Promise<Request[]> => {
    const { data } = await api.get(`/requests/case/${caseId}`);
    return data;
  },
  getById: async (requestId: string): Promise<Request> => {
    const { data } = await api.get(`/requests/${requestId}`);
    return data;
  },
  create: async (requestData: Partial<Request>, pdfFiles?: File[]): Promise<Request> => {
    if (pdfFiles && pdfFiles.length > 0) {
      // Use FormData for file uploads
      const formData = new FormData();
      formData.append('caseId', requestData.caseId!);
      formData.append('type', requestData.type!);
      formData.append('title', requestData.title!);
      formData.append('content', requestData.content!);
      
      pdfFiles.forEach(file => {
        formData.append('pdfs', file);
      });

      const { data } = await fileApi.post('/requests', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return data;
    } else {
      // Regular JSON request without files
      const { data } = await api.post('/requests', requestData);
      return data;
    }
  },
  getAttachments: async (requestId: string): Promise<Document[]> => {
    const { data } = await api.get(`/requests/${requestId}/attachments`);
    return data;
  },
  respond: async (requestId: string, response: { status: string; response?: string }): Promise<Request> => {
    const { data } = await api.patch(`/requests/${requestId}/respond`, response);
    return data;
  },
  createDecision: async (requestId: string, decisionData: { title: string; content: string; isFinalDecision?: boolean; closesCase?: boolean }): Promise<Decision> => {
    const { data } = await api.post(`/requests/${requestId}/decision`, decisionData);
    return data;
  }
};

// Annotations API
export const annotationsAPI = {
  create: async (annotation: Partial<Annotation>): Promise<Annotation> => {
    const { data } = await api.post('/annotations', annotation);
    return data;
  },
  getByRequest: async (requestId: string): Promise<Annotation[]> => {
    const { data } = await api.get(`/annotations/request/${requestId}`);
    return data;
  },
  getByDocument: async (requestId: string, documentId: string): Promise<Annotation[]> => {
    const { data } = await api.get(`/annotations/request/${requestId}/document/${documentId}`);
    return data;
  },
  update: async (annotationId: string, updates: Partial<Annotation>): Promise<Annotation> => {
    const { data } = await api.put(`/annotations/${annotationId}`, updates);
    return data;
  },
  delete: async (annotationId: string): Promise<void> => {
    await api.delete(`/annotations/${annotationId}`);
  }
};

// Comments API
export const commentsAPI = {
  getByCase: async (caseId: string): Promise<Comment[]> => {
    const { data } = await api.get(`/comments/case/${caseId}`);
    return data;
  },
  getByDocument: async (documentId: string): Promise<Comment[]> => {
    const { data } = await api.get(`/comments/document/${documentId}`);
    return data;
  },
  create: async (commentData: Partial<Comment>): Promise<Comment> => {
    const { data } = await api.post('/comments', commentData);
    return data;
  },
  delete: async (commentId: string): Promise<void> => {
    await api.delete(`/comments/${commentId}`);
  }
};

// Tasks API
export const tasksAPI = {
  getByCase: async (caseId: string): Promise<Task[]> => {
    const { data } = await api.get(`/tasks/case/${caseId}`);
    return data;
  },
  getById: async (taskId: string): Promise<Task> => {
    const { data } = await api.get(`/tasks/${taskId}`);
    return data;
  },
  create: async (taskData: Partial<Task>): Promise<Task> => {
    const { data } = await api.post('/tasks', taskData);
    return data;
  },
  update: async (taskId: string, updates: Partial<Task>): Promise<Task> => {
    const { data } = await api.patch(`/tasks/${taskId}`, updates);
    return data;
  }
};

// Hearings API
export const hearingsAPI = {
  getByCase: async (caseId: string): Promise<Hearing[]> => {
    const { data } = await api.get(`/hearings/case/${caseId}`);
    return data;
  },
  getById: async (hearingId: string): Promise<Hearing> => {
    const { data } = await api.get(`/hearings/${hearingId}`);
    return data;
  },
  create: async (hearingData: Partial<Hearing>): Promise<Hearing> => {
    const { data } = await api.post('/hearings', hearingData);
    return data;
  },
  update: async (hearingId: string, updates: Partial<Hearing>): Promise<Hearing> => {
    const { data } = await api.patch(`/hearings/${hearingId}`, updates);
    return data;
  }
};

// Discussion Sessions API
export const discussionSessionsAPI = {
  getByCase: async (caseId: string): Promise<DiscussionSession[]> => {
    const { data } = await api.get(`/discussion-sessions/case/${caseId}`);
    return data;
  },
  getByHearing: async (hearingId: string): Promise<DiscussionSession[]> => {
    const { data } = await api.get(`/discussion-sessions/hearing/${hearingId}`);
    return data;
  },
  getById: async (sessionId: string): Promise<DiscussionSession> => {
    const { data } = await api.get(`/discussion-sessions/${sessionId}`);
    return data;
  },
  create: async (sessionData: Partial<DiscussionSession>): Promise<DiscussionSession> => {
    const { data } = await api.post('/discussion-sessions', sessionData);
    return data;
  },
  update: async (sessionId: string, updates: Partial<DiscussionSession>): Promise<DiscussionSession> => {
    const { data } = await api.patch(`/discussion-sessions/${sessionId}`, updates);
    return data;
  },
  addAttendee: async (sessionId: string, attendee: { type: string; name: string; userId?: string }): Promise<DiscussionSession> => {
    const { data } = await api.post(`/discussion-sessions/${sessionId}/attendees`, attendee);
    return data;
  },
  removeAttendee: async (sessionId: string, index: number): Promise<DiscussionSession> => {
    const { data } = await api.delete(`/discussion-sessions/${sessionId}/attendees/${index}`);
    return data;
  },
  startSession: async (sessionId: string): Promise<DiscussionSession> => {
    const { data } = await api.post(`/discussion-sessions/${sessionId}/start`);
    return data;
  },
  endSession: async (sessionId: string): Promise<DiscussionSession> => {
    const { data } = await api.post(`/discussion-sessions/${sessionId}/end`);
    return data;
  },
  signProtocol: async (sessionId: string): Promise<DiscussionSession> => {
    const { data } = await api.post(`/discussion-sessions/${sessionId}/sign`);
    return data;
  }
};

// Protocols API
export const protocolsAPI = {
  getBySession: async (sessionId: string): Promise<Protocol[]> => {
    const { data } = await api.get(`/protocols/session/${sessionId}`);
    return data;
  },
  getByCase: async (caseId: string): Promise<Protocol[]> => {
    const { data } = await api.get(`/protocols/case/${caseId}`);
    return data;
  },
  getById: async (protocolId: string): Promise<Protocol> => {
    const { data } = await api.get(`/protocols/${protocolId}`);
    return data;
  },
  create: async (protocolData: Partial<Protocol>): Promise<Protocol> => {
    const { data } = await api.post('/protocols', protocolData);
    return data;
  },
  update: async (protocolId: string, updates: Partial<Protocol>): Promise<Protocol> => {
    const { data } = await api.patch(`/protocols/${protocolId}`, updates);
    return data;
  },
  saveProtocol: async (sessionId: string, content: string): Promise<Protocol> => {
    const { data } = await api.post(`/protocols/session/${sessionId}/save`, { content });
    return data;
  }
};

// Appeals API
export const appealsAPI = {
  getByCase: async (caseId: string): Promise<Appeal[]> => {
    const { data } = await api.get(`/appeals/case/${caseId}`);
    return data;
  },
  getById: async (appealId: string): Promise<Appeal> => {
    const { data } = await api.get(`/appeals/${appealId}`);
    return data;
  },
  create: async (appealData: Partial<Appeal>): Promise<Appeal> => {
    const { data } = await api.post('/appeals', appealData);
    return data;
  },
  respond: async (appealId: string, response: { status: string; response?: string }): Promise<Appeal> => {
    const { data } = await api.patch(`/appeals/${appealId}/respond`, response);
    return data;
  }
};

// Internal Notes API
export const internalNotesAPI = {
  getByCase: async (caseId: string): Promise<InternalNote[]> => {
    const { data } = await api.get(`/internal-notes/case/${caseId}`);
    return data;
  },
  getById: async (noteId: string): Promise<InternalNote> => {
    const { data } = await api.get(`/internal-notes/${noteId}`);
    return data;
  },
  create: async (noteData: Partial<InternalNote>): Promise<InternalNote> => {
    const { data } = await api.post('/internal-notes', noteData);
    return data;
  },
  update: async (noteId: string, updates: Partial<InternalNote>): Promise<InternalNote> => {
    const { data } = await api.patch(`/internal-notes/${noteId}`, updates);
    return data;
  },
  delete: async (noteId: string): Promise<void> => {
    await api.delete(`/internal-notes/${noteId}`);
  }
};

// Expenses API
export const expensesAPI = {
  getByCase: async (caseId: string): Promise<Expense[]> => {
    const { data } = await api.get(`/expenses/case/${caseId}`);
    return data;
  },
  getById: async (expenseId: string): Promise<Expense> => {
    const { data } = await api.get(`/expenses/${expenseId}`);
    return data;
  },
  create: async (expenseData: Partial<Expense>): Promise<Expense> => {
    const { data } = await api.post('/expenses', expenseData);
    return data;
  },
  update: async (expenseId: string, updates: Partial<Expense>): Promise<Expense> => {
    const { data } = await api.patch(`/expenses/${expenseId}`, updates);
    return data;
  },
  delete: async (expenseId: string): Promise<void> => {
    await api.delete(`/expenses/${expenseId}`);
  }
};

// Document Versions API
export const documentVersionsAPI = {
  getByDocument: async (documentId: string): Promise<DocumentVersion[]> => {
    const { data } = await api.get(`/document-versions/document/${documentId}`);
    return data;
  },
  create: async (documentId: string, file: File, changes?: string): Promise<DocumentVersion> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentId', documentId);
    if (changes) {
      formData.append('changes', changes);
    }
    const { data } = await fileApi.post('/document-versions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  },
  download: async (versionId: string, fileName: string): Promise<void> => {
    const blob = await api.get(`/document-versions/${versionId}/download`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(blob.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};

// Reminders API
export const remindersAPI = {
  getByCase: async (caseId: string): Promise<Reminder[]> => {
    const { data } = await api.get(`/reminders/case/${caseId}`);
    return data;
  },
  getById: async (reminderId: string): Promise<Reminder> => {
    const { data } = await api.get(`/reminders/${reminderId}`);
    return data;
  },
  create: async (reminderData: Partial<Reminder>): Promise<Reminder> => {
    const { data } = await api.post('/reminders', reminderData);
    return data;
  },
  update: async (reminderId: string, updates: Partial<Reminder>): Promise<Reminder> => {
    const { data } = await api.patch(`/reminders/${reminderId}`, updates);
    return data;
  },
  delete: async (reminderId: string): Promise<void> => {
    await api.delete(`/reminders/${reminderId}`);
  }
};

// Related Cases API
export const relatedCasesAPI = {
  getByCase: async (caseId: string): Promise<RelatedCase[]> => {
    const { data } = await api.get(`/related-cases/case/${caseId}`);
    return data;
  },
  create: async (relatedCaseData: Partial<RelatedCase>): Promise<RelatedCase> => {
    const { data } = await api.post('/related-cases', relatedCaseData);
    return data;
  },
  delete: async (relatedCaseId: string): Promise<void> => {
    await api.delete(`/related-cases/${relatedCaseId}`);
  }
};

export default api;

