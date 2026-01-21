export enum UserRole {
  ADMIN = 'admin',
  ARBITRATOR = 'arbitrator',
  LAWYER = 'lawyer',
  PARTY = 'party'
}

export enum CaseStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PENDING_DECISION = 'pending_decision',
  CLOSED = 'closed',
  ARCHIVED = 'archived'
}

export enum DocumentPermission {
  ARBITRATOR_ONLY = 'arbitrator_only',
  ALL_PARTIES = 'all_parties',
  SPECIFIC_PARTY = 'specific_party',
  LAWYERS_ONLY = 'lawyers_only'
}

export enum DocumentType {
  PLEADING = 'pleading',
  DECISION = 'decision',
  ATTACHMENT = 'attachment',
  PROTOCOL = 'protocol',
  EXPERT_OPINION = 'expert_opinion',
  AFFIDAVIT = 'affidavit',
  OTHER = 'other'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status?: string;
}

export interface Case {
  _id: string;
  title: string;
  description?: string;
  arbitratorId: User | string;
  lawyers: User[] | string[];
  parties: User[] | string[];
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  // Extended fields
  caseNumber?: string;
  caseType?: string;
  claimAmount?: number;
  confidentialityLevel?: 'public' | 'confidential' | 'secret' | 'top_secret';
}

export interface Document {
  _id: string;
  caseId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: User | string;
  permission: DocumentPermission;
  visibleTo?: User[] | string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  // Extended fields
  documentType?: 'pleading' | 'decision' | 'attachment' | 'protocol' | 'expert_opinion' | 'affidavit' | 'other';
  belongsToProcedure?: string;
  isLocked?: boolean;
  isSecret?: boolean;
  parentDocumentId?: string;
}

export interface Invitation {
  _id: string;
  email: string;
  role: UserRole;
  caseId?: string;
  invitedBy: User | string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
}

// New types for advanced case management

export enum DecisionStatus {
  DRAFT = 'draft',
  SENT_FOR_SIGNATURE = 'sent_for_signature',
  SIGNED = 'signed',
  PUBLISHED = 'published', // Keep for backward compatibility
  REVOKED = 'revoked' // Keep for backward compatibility
  // Legal lifecycle: DRAFT → SENT_FOR_SIGNATURE → SIGNED (not editable after SIGNED)
}

export enum DecisionType {
  NOTE_DECISION = 'note_decision', // החלטה בפיתקית - על גבי בקשה
  FINAL_DECISION = 'final_decision', // החלטה סופית - סוגרת דיון
  DISCUSSION_DECISION = 'discussion_decision' // החלטה דיונית - נוצרת דרך דיונים
}

export interface Decision {
  _id: string;
  caseId: string;
  type: DecisionType;
  title: string;
  summary?: string;
  content?: string;
  documentId?: string | Document;
  requestId?: string | Request; // For NOTE_DECISION - link to request
  discussionSessionId?: string; // For DISCUSSION_DECISION and FINAL_DECISION (Legal Requirement #13: Not time-bound)
  closesDiscussion?: boolean; // For FINAL_DECISION - indicates if this closes the discussion
  publishedAt?: string;
  status: DecisionStatus;
  // Legal Requirement #12: Deletion is controlled system action (soft delete)
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: User | string;
  // Legal Requirement #14: Signed decision can only be revoked by "revoking decision"
  revokingDecisionId?: string; // Decision that revoked this one
  revokedByDecisionId?: string; // Decision that was revoked by this one
  createdBy: User | string;
  createdAt: string;
  updatedAt: string;
}

export enum RequestType {
  INSTRUCTION = 'instruction',
  TEMPORARY_RELIEF = 'temporary_relief',
  AFTER_CLOSURE = 'after_closure',
  OTHER = 'other'
}

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  UNDER_REVIEW = 'under_review'
}

export interface Request {
  _id: string;
  caseId: string;
  type: RequestType;
  title: string;
  content: string;
  status: RequestStatus;
  submittedBy: User | string;
  respondedBy?: User | string;
  responseDate?: string;
  response?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  caseId: string;
  documentId?: string | Document;
  content: string;
  createdBy: User | string;
  isInternal: boolean;
  parentId?: string | Comment;
  createdAt: string;
  updatedAt: string;
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Task {
  _id: string;
  caseId: string;
  title: string;
  description?: string;
  assignedTo: User | string;
  dueDate?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdBy: User | string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export enum HearingType {
  PRELIMINARY = 'preliminary',
  MAIN = 'main',
  CLOSING = 'closing',
  OTHER = 'other'
}

export enum HearingStatus {
  CREATED = 'created',
  ACTIVE = 'active',
  ENDED = 'ended',
  SIGNED = 'signed'
  // Legal state machine: CREATED → ACTIVE → ENDED → SIGNED (one-way, no rollback)
}

export interface Hearing {
  _id: string;
  caseId: string;
  scheduledDate: string;
  duration?: number;
  location?: string;
  type: HearingType;
  participants: (User | string)[];
  notes?: string;
  status: HearingStatus;
  createdBy: User | string;
  createdAt: string;
  updatedAt: string;
}

export enum AttendeeType {
  WITNESS = 'witness', // עד
  EXPERT = 'expert', // מומחה
  COURT_CLERK = 'court_clerk', // יכל
  SECRETARY = 'secretary', // מנני
  OTHER = 'other' // אחר
}

export interface Attendee {
  type: AttendeeType;
  name: string;
  userId?: string; // Optional user ID if it's a system user
}

export interface DiscussionSession {
  _id: string;
  hearingId: string;
  caseId: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  attendees: Attendee[];
  protocol?: string; // HTML content of the protocol
  decisions?: Decision[];
  status: 'created' | 'active' | 'ended' | 'signed' | 'completed' | 'cancelled';
  createdBy: User | string;
  createdAt: string;
  updatedAt: string;
}

export interface Protocol {
  _id: string;
  discussionSessionId: string;
  caseId: string;
  content: string; // HTML content (append-only, immutable after creation)
  version: number; // Incremental version number (never decreases)
  isSigned?: boolean; // Whether this version was signed (immutable)
  signedAt?: string; // Timestamp when signed
  signedBy?: User | string; // User ID who signed
  isCurrentVersion?: boolean; // Legal Requirement #10: Only one current version exists at any time
  createdBy: User | string;
  createdAt: string;
  updatedAt: string; // Should match createdAt (immutable after creation)
}

export enum AppealType {
  APPEAL = 'appeal',
  OBJECTION = 'objection',
  REQUEST_REVIEW = 'request_review'
}

export enum AppealStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface Appeal {
  _id: string;
  caseId: string;
  decisionId?: string | Decision;
  type: AppealType;
  content: string;
  submittedBy: User | string;
  status: AppealStatus;
  responseDate?: string;
  response?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InternalNote {
  _id: string;
  caseId: string;
  content: string;
  createdBy: User | string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  _id: string;
  documentId: string;
  version: number;
  filePath: string;
  changes?: string;
  createdBy: User | string;
  createdAt: string;
}

export enum RelationType {
  RELATED = 'related',
  APPEAL = 'appeal',
  MERGER = 'merger',
  SPLIT = 'split'
}

export interface RelatedCase {
  _id: string;
  caseId: string;
  relatedCaseId: string | Case;
  relationType: RelationType;
  notes?: string;
  createdAt: string;
}

export interface Reminder {
  _id: string;
  caseId: string;
  title: string;
  dueDate: string;
  assignedTo: User | string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export enum ExpenseCategory {
  ARBITRATOR_FEE = 'arbitrator_fee',
  ADMINISTRATIVE = 'administrative',
  EXPERT_FEE = 'expert_fee',
  LEGAL_FEE = 'legal_fee',
  TRAVEL = 'travel',
  DOCUMENTATION = 'documentation',
  OTHER = 'other'
}

export interface Expense {
  _id: string;
  caseId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  createdBy: User | string;
  createdAt: string;
  updatedAt: string;
}

// Module types for sidebar navigation
export type CaseModule = 
  | 'general-details'
  | 'parties'
  | 'lawyers'
  | 'arbitrator'
  | 'case-status'
  | 'timeline'
  | 'decisions'
  | 'hearings'
  | 'requests'
  | 'comments'
  | 'expenses'
  | 'appeals'
  | 'documents'
  | 'protocols'
  | 'attachments'
  | 'internal-documents'
  | 'document-versions'
  | 'tasks'
  | 'reminders'
  | 'hearing-calendar'
  | 'internal-notes'
  | 'permissions'
  | 'share-parties'
  | 'related-cases'
  | 'case-settings'
  | 'discussions';

