'use client';

import { CaseModule, Case } from '@/types';
import GeneralDetails from './GeneralDetails';
import Parties from './Parties';
import Lawyers from './Lawyers';
import Arbitrator from './Arbitrator';
import CaseStatus from './CaseStatus';
import Timeline from './Timeline';
import Decisions from './Decisions';
import Documents from './Documents';
import Hearings from './Hearings';
import Requests from './Requests';
import Comments from './Comments';
import Appeals from './Appeals';
import Expenses from './Expenses';
import Protocols from './Protocols';
import Attachments from './Attachments';
import InternalDocuments from './InternalDocuments';
import DocumentVersions from './DocumentVersions';
import Tasks from './Tasks';
import Reminders from './Reminders';
import HearingCalendar from './HearingCalendar';
import InternalNotes from './InternalNotes';
import Permissions from './Permissions';
import ShareParties from './ShareParties';
import RelatedCases from './RelatedCases';
import CaseSettings from './CaseSettings';

interface ModuleRendererProps {
  module: CaseModule;
  caseId: string;
  caseData: Case;
  onCaseUpdate?: () => void;
}

export default function ModuleRenderer({ module, caseId, caseData, onCaseUpdate }: ModuleRendererProps) {
  switch (module) {
    case 'general-details':
      return <GeneralDetails caseData={caseData} />;
    case 'parties':
      return <Parties caseData={caseData} />;
    case 'lawyers':
      return <Lawyers caseData={caseData} />;
    case 'arbitrator':
      return <Arbitrator caseData={caseData} />;
    case 'case-status':
      return <CaseStatus caseData={caseData} onUpdate={onCaseUpdate} />;
    case 'timeline':
      return <Timeline caseId={caseId} />;
    case 'decisions':
      return <Decisions caseId={caseId} />;
    case 'documents':
      return <Documents caseId={caseId} caseData={caseData} />;
    case 'hearings':
      return <Hearings caseId={caseId} />;
    case 'requests':
      return <Requests caseId={caseId} />;
    case 'comments':
      return <Comments caseId={caseId} />;
    case 'appeals':
      return <Appeals caseId={caseId} />;
    case 'expenses':
      return <Expenses caseId={caseId} />;
    case 'protocols':
      return <Protocols caseId={caseId} />;
    case 'attachments':
      return <Attachments caseId={caseId} />;
    case 'internal-documents':
      return <InternalDocuments caseId={caseId} />;
    case 'document-versions':
      return <DocumentVersions caseId={caseId} />;
    case 'tasks':
      return <Tasks caseId={caseId} caseData={caseData} />;
    case 'reminders':
      return <Reminders caseId={caseId} caseData={caseData} />;
    case 'hearing-calendar':
      return <HearingCalendar caseId={caseId} />;
    case 'internal-notes':
      return <InternalNotes caseId={caseId} />;
    case 'permissions':
      return <Permissions caseData={caseData} />;
    case 'share-parties':
      return <ShareParties caseData={caseData} />;
    case 'related-cases':
      return <RelatedCases caseId={caseId} />;
    case 'case-settings':
      return <CaseSettings caseData={caseData} onUpdate={onCaseUpdate} />;
    default:
      return (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">מודול לא נמצא</h3>
            <p className="text-gray-600">המודול המבוקש לא קיים</p>
          </div>
        </div>
      );
  }
}

