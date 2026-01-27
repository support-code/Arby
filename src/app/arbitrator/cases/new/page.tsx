'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { UserRole, PartyStatus, User } from '@/types';
import { casesAPI, usersAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

interface PartyData {
  isCompany: boolean;
  status: PartyStatus;
  // Person fields
  firstName?: string;
  lastName?: string;
  idNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  // Company fields
  companyName?: string;
  companyNumber?: string;
  authorizedSignatories?: Array<{
    firstName: string;
    lastName: string;
    idNumber: string;
    address?: string;
    phone?: string;
    email?: string;
  }>;
  signatureDocumentReceived?: boolean;
  // Lawyers for this party
  lawyers?: Array<{
    firstName: string;
    lastName: string;
    idNumber?: string;
    address?: string;
    phone?: string;
    email: string;
    profession?: string;
  }>;
}

export default function NewCasePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const [description, setDescription] = useState('');
  const [isSingleArbitrator, setIsSingleArbitrator] = useState(true);
  const [arbitratorIds, setArbitratorIds] = useState<string[]>([]);
  const [availableArbitrators, setAvailableArbitrators] = useState<User[]>([]);
  const [loadingArbitrators, setLoadingArbitrators] = useState(false);
  const [parties, setParties] = useState<PartyData[]>([
    {
      isCompany: false,
      status: PartyStatus.PLAINTIFF,
      lawyers: []
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [createdPasswords, setCreatedPasswords] = useState<Array<{ email: string; password: string; role: string }>>([]);

  // Load available arbitrators
  useEffect(() => {
    const loadArbitrators = async () => {
      try {
        setLoadingArbitrators(true);
        const users = await usersAPI.getAll();
        const arbitrators = users.filter(u => u.role === UserRole.ARBITRATOR);
        setAvailableArbitrators(arbitrators);
      } catch (error) {
        console.error('Failed to load arbitrators:', error);
      } finally {
        setLoadingArbitrators(false);
      }
    };
    loadArbitrators();
  }, []);

  // Initialize with current user if single arbitrator
  useEffect(() => {
    if (isSingleArbitrator && user) {
      setArbitratorIds([]);
    }
  }, [isSingleArbitrator, user]);

  const toggleArbitratorMode = (single: boolean) => {
    setIsSingleArbitrator(single);
    if (single) {
      setArbitratorIds([]);
    } else {
      // Start with current user if switching to panel
      if (user) {
        setArbitratorIds([user.id]);
      }
    }
  };

  const addArbitrator = (arbitratorId: string) => {
    if (!arbitratorIds.includes(arbitratorId)) {
      setArbitratorIds([...arbitratorIds, arbitratorId]);
    }
  };

  const removeArbitrator = (arbitratorId: string) => {
    setArbitratorIds(arbitratorIds.filter(id => id !== arbitratorId));
  };

  const addParty = () => {
    setParties([...parties, {
      isCompany: false,
      status: PartyStatus.DEFENDANT,
      lawyers: []
    }]);
  };

  const removeParty = (index: number) => {
    setParties(parties.filter((_, i) => i !== index));
  };

  const updateParty = (index: number, field: keyof PartyData, value: any) => {
    const updated = [...parties];
    updated[index] = { ...updated[index], [field]: value };
    setParties(updated);
  };

  const addLawyer = (partyIndex: number) => {
    const updated = [...parties];
    if (!updated[partyIndex].lawyers) {
      updated[partyIndex].lawyers = [];
    }
    updated[partyIndex].lawyers!.push({
      firstName: '',
      lastName: '',
      email: '',
      profession: 'עורך דין'
    });
    setParties(updated);
  };

  const removeLawyer = (partyIndex: number, lawyerIndex: number) => {
    const updated = [...parties];
    if (updated[partyIndex].lawyers) {
      updated[partyIndex].lawyers = updated[partyIndex].lawyers!.filter((_, i) => i !== lawyerIndex);
    }
    setParties(updated);
  };

  const updateLawyer = (partyIndex: number, lawyerIndex: number, field: string, value: any) => {
    const updated = [...parties];
    if (updated[partyIndex].lawyers) {
      updated[partyIndex].lawyers![lawyerIndex] = {
        ...updated[partyIndex].lawyers![lawyerIndex],
        [field]: value
      };
    }
    setParties(updated);
  };

  const addAuthorizedSignatory = (partyIndex: number) => {
    const updated = [...parties];
    if (!updated[partyIndex].authorizedSignatories) {
      updated[partyIndex].authorizedSignatories = [];
    }
    updated[partyIndex].authorizedSignatories!.push({
      firstName: '',
      lastName: '',
      idNumber: ''
    });
    setParties(updated);
  };

  const removeAuthorizedSignatory = (partyIndex: number, signatoryIndex: number) => {
    const updated = [...parties];
    if (updated[partyIndex].authorizedSignatories) {
      updated[partyIndex].authorizedSignatories = updated[partyIndex].authorizedSignatories!.filter((_, i) => i !== signatoryIndex);
    }
    setParties(updated);
  };

  const updateAuthorizedSignatory = (partyIndex: number, signatoryIndex: number, field: string, value: any) => {
    const updated = [...parties];
    if (updated[partyIndex].authorizedSignatories) {
      updated[partyIndex].authorizedSignatories![signatoryIndex] = {
        ...updated[partyIndex].authorizedSignatories![signatoryIndex],
        [field]: value
      };
    }
    setParties(updated);
  };

  const fillDummyData = () => {
    const dummyParties: PartyData[] = [
      {
        isCompany: false,
        status: PartyStatus.PLAINTIFF,
        firstName: 'יוסי',
        lastName: 'כהן',
        idNumber: '123456789',
        address: 'רחוב הרצל 10, תל אביב',
        phone: '050-1234567',
        email: 'yossi.cohen@example.com',
        lawyers: [
          {
            firstName: 'דני',
            lastName: 'לוי',
            idNumber: '987654321',
            address: 'רחוב דיזנגוף 20, תל אביב',
            phone: '050-9876543',
            email: 'danny.levy@law.com',
            profession: 'עורך דין'
          }
        ]
      },
      {
        isCompany: false,
        status: PartyStatus.DEFENDANT,
        firstName: 'שרה',
        lastName: 'ישראל',
        idNumber: '111222333',
        address: 'רחוב בן יהודה 5, ירושלים',
        phone: '052-1112233',
        email: 'sara.israel@example.com',
        lawyers: [
          {
            firstName: 'מיכל',
            lastName: 'דוד',
            idNumber: '444555666',
            address: 'רחוב יפו 15, ירושלים',
            phone: '052-4445556',
            email: 'michal.david@law.com',
            profession: 'עורך דין'
          }
        ]
      }
    ];

    setParties(dummyParties);
    setDescription('תיק בוררות לדוגמה - סכסוך מסחרי בין שני צדדים');
    showToast('פרטי דמה הוזנו בהצלחה', 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCreatedPasswords([]);

    try {
      // Validate arbitrators
      if (!isSingleArbitrator) {
        if (arbitratorIds.length === 0) {
          throw new Error('יש לבחור לפחות בורר אחד בהרכב');
        }
        if (arbitratorIds.length % 2 === 0) {
          throw new Error('מספר הבוררים חייב להיות אי-זוגי (1, 3, 5...)');
        }
      }

      // Validate parties
      if (parties.length === 0) {
        throw new Error('יש להוסיף לפחות צד אחד');
      }

      // Validate parties
      for (const party of parties) {
        if (party.isCompany) {
          if (!party.companyName || !party.companyNumber) {
            throw new Error('חברה חייבת לכלול שם ומספר תאגיד');
          }
        } else {
          if (!party.firstName || !party.lastName) {
            throw new Error('צד חייב לכלול שם פרטי ושם משפחה');
          }
        }
        // Each party must have at least one lawyer
        if (!party.lawyers || party.lawyers.length === 0) {
          throw new Error('כל צד חייב לכלול לפחות עורך דין אחד');
        }
      }

      // Helper function to remove undefined/null/empty string values
      const cleanObject = (obj: any): any => {
        const cleaned: any = {};
        for (const key in obj) {
          const value = obj[key];
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              cleaned[key] = value;
            } else if (typeof value === 'object') {
              const cleanedObj = cleanObject(value);
              if (Object.keys(cleanedObj).length > 0) {
                cleaned[key] = cleanedObj;
              }
            } else {
              cleaned[key] = value;
            }
          }
        }
        return cleaned;
      };

      // Prepare parties data - filter out empty lawyers and ensure required fields
      const preparedParties = parties.map(p => {
        const partyData: any = {
          isCompany: p.isCompany,
          status: p.status
        };

        if (p.isCompany) {
          if (p.companyName) partyData.companyName = p.companyName;
          if (p.companyNumber) partyData.companyNumber = p.companyNumber;
          if (p.address) partyData.address = p.address;
          if (p.phone) partyData.phone = p.phone;
          if (p.email) partyData.email = p.email;
          if (p.authorizedSignatories && p.authorizedSignatories.length > 0) {
            partyData.authorizedSignatories = p.authorizedSignatories;
          }
          if (p.signatureDocumentReceived !== undefined) {
            partyData.signatureDocumentReceived = p.signatureDocumentReceived;
          }
        } else {
          if (p.firstName) partyData.firstName = p.firstName;
          if (p.lastName) partyData.lastName = p.lastName;
          if (p.idNumber) partyData.idNumber = p.idNumber;
          if (p.address) partyData.address = p.address;
          if (p.phone) partyData.phone = p.phone;
          if (p.email) partyData.email = p.email;
        }

        // Add lawyers - only if they have required fields
        const validLawyers = (p.lawyers || [])
          .filter(l => l.firstName && l.lastName && l.email)
          .map(l => {
            const lawyer: any = {
              firstName: l.firstName.trim(),
              lastName: l.lastName.trim(),
              email: l.email.trim()
            };
            if (l.idNumber) lawyer.idNumber = l.idNumber;
            if (l.address) lawyer.address = l.address;
            if (l.phone) lawyer.phone = l.phone;
            if (l.profession) lawyer.profession = l.profession;
            return lawyer;
          });

        if (validLawyers.length > 0) {
          partyData.lawyers = validLawyers;
        }

        return cleanObject(partyData);
      });

      // Ensure we have arbitrator IDs
      if (!user) {
        throw new Error('משתמש לא מזוהה');
      }

      const finalArbitratorIds = isSingleArbitrator ? [user.id] : arbitratorIds;

      // Prepare request data
      const requestData: any = {
        arbitratorIds: finalArbitratorIds,
        parties: preparedParties
      };

      if (description && description.trim()) {
        requestData.description = description.trim();
      }

      console.log('Sending case data:', JSON.stringify(requestData, null, 2));

      const result = await casesAPI.create(requestData);

      const createdCaseId = result.case?._id || result._id;
      (window as any).lastCreatedCaseId = createdCaseId;
      
      if (result.createdPasswords && result.createdPasswords.length > 0) {
        setCreatedPasswords(result.createdPasswords);
      } else {
        // If no passwords were created, navigate directly to the case
        router.push(`/cases/${createdCaseId}`);
      }
    } catch (err: any) {
      console.error('Error creating case:', err);
      console.error('Error response:', err.response?.data);
      
      let errorMessage = 'שגיאה ביצירת התיק';
      
      if (err.response?.data) {
        if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          // Validation errors from express-validator
          const validationErrors = err.response.data.errors.map((e: any) => 
            `${e.param}: ${e.msg}`
          ).join(', ');
          errorMessage = `שגיאת ולידציה: ${validationErrors}`;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout allowedRoles={[UserRole.ARBITRATOR]}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">יצירת תיק בוררות חדש</h1>
          <button
            type="button"
            onClick={fillDummyData}
            className="text-sm bg-accent text-accent-foreground px-4 py-2 rounded hover:opacity-90 transition-opacity"
          >
            📝 מלא פרטי דמה לבדיקה
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-card p-6 rounded-lg shadow-card space-y-6">
          {/* Arbitrators Section */}
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold mb-4">בוררים</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="arbitratorMode"
                    checked={isSingleArbitrator}
                    onChange={() => toggleArbitratorMode(true)}
                    className="rounded"
                  />
                  <span>בורר יחיד (אני)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="arbitratorMode"
                    checked={!isSingleArbitrator}
                    onChange={() => toggleArbitratorMode(false)}
                    className="rounded"
                  />
                  <span>הרכב בוררים</span>
                </label>
              </div>

              {!isSingleArbitrator && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      מספר הבוררים חייב להיות אי-זוגי (1, 3, 5...)
                    </p>
                    <span className={`text-sm font-medium ${arbitratorIds.length % 2 === 0 && arbitratorIds.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {arbitratorIds.length} בוררים
                    </span>
                  </div>

                  {loadingArbitrators ? (
                    <p className="text-sm text-muted-foreground">טוען בוררים...</p>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        בחר בוררים נוספים:
                      </label>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addArbitrator(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                      >
                        <option value="">-- בחר בורר להוספה --</option>
                        {availableArbitrators
                          .filter(a => !arbitratorIds.includes(a.id))
                          .map(arbitrator => (
                            <option key={arbitrator.id} value={arbitrator.id}>
                              {arbitrator.name} ({arbitrator.email})
                            </option>
                          ))}
                      </select>

                      {arbitratorIds.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-foreground">בוררים נבחרים:</p>
                          {arbitratorIds.map(id => {
                            const arbitrator = availableArbitrators.find(a => a.id === id);
                            return arbitrator ? (
                              <div key={id} className="flex items-center justify-between bg-muted p-2 rounded">
                                <span className="text-sm text-foreground">{arbitrator.name} ({arbitrator.email})</span>
                                <button
                                  type="button"
                                  onClick={() => removeArbitrator(id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  × הסר
                                </button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
              תיאור התיק
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
            />
          </div>

          {/* Parties Section */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">צדדים</h2>
              <button
                type="button"
                onClick={addParty}
                className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded hover:opacity-90 transition-opacity"
              >
                + הוסף צד
              </button>
            </div>

            {parties.map((party, partyIndex) => (
              <div key={partyIndex} className="border border-border rounded-lg p-4 mb-4 space-y-4 bg-background">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">צד {partyIndex + 1}</h3>
                  {parties.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParty(partyIndex)}
                      className="text-red-600 hover:text-red-800"
                    >
                      × הסר
                    </button>
                  )}
                </div>

                {/* Is Company Checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={party.isCompany}
                    onChange={(e) => updateParty(partyIndex, 'isCompany', e.target.checked)}
                    className="rounded"
                  />
                  <label>חברה/תאגיד משפטי</label>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    סטטוס *
                  </label>
                  <select
                    value={party.status}
                    onChange={(e) => updateParty(partyIndex, 'status', e.target.value as PartyStatus)}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                  >
                    <option value={PartyStatus.PLAINTIFF}>תובע</option>
                    <option value={PartyStatus.PLAINTIFF_FEMALE}>תובעת</option>
                    <option value={PartyStatus.DEFENDANT}>נתבע</option>
                    <option value={PartyStatus.DEFENDANT_FEMALE}>נתבעת</option>
                  </select>
                </div>

                {party.isCompany ? (
                  /* Company Fields */
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        שם התאגיד *
                      </label>
                      <input
                        type="text"
                        value={party.companyName || ''}
                        onChange={(e) => updateParty(partyIndex, 'companyName', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        מספר תאגיד *
                      </label>
                      <input
                        type="text"
                        value={party.companyNumber || ''}
                        onChange={(e) => updateParty(partyIndex, 'companyNumber', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        כתובת *
                      </label>
                      <input
                        type="text"
                        value={party.address || ''}
                        onChange={(e) => updateParty(partyIndex, 'address', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          טלפון
                        </label>
                        <input
                          type="tel"
                          value={party.phone || ''}
                          onChange={(e) => updateParty(partyIndex, 'phone', e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          דוא&quot;ל
                        </label>
                        <input
                          type="email"
                          value={party.email || ''}
                          onChange={(e) => updateParty(partyIndex, 'email', e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        />
                      </div>
                    </div>

                    {/* Authorized Signatories */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-foreground">
                          מורשי חתימה
                        </label>
                        <button
                          type="button"
                          onClick={() => addAuthorizedSignatory(partyIndex)}
                          className="text-sm text-primary hover:text-accent transition-colors"
                        >
                          + הוסף מורשה חתימה
                        </button>
                      </div>
                      {party.authorizedSignatories?.map((signatory, signatoryIndex) => (
                        <div key={signatoryIndex} className="border border-border rounded p-3 mb-2 space-y-2 bg-muted/50">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">מורשה חתימה {signatoryIndex + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeAuthorizedSignatory(partyIndex, signatoryIndex)}
                              className="text-red-600 text-sm"
                            >
                              × הסר
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="שם פרטי *"
                              value={signatory.firstName}
                              onChange={(e) => updateAuthorizedSignatory(partyIndex, signatoryIndex, 'firstName', e.target.value)}
                              required
                              className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <input
                              type="text"
                              placeholder="שם משפחה *"
                              value={signatory.lastName}
                              onChange={(e) => updateAuthorizedSignatory(partyIndex, signatoryIndex, 'lastName', e.target.value)}
                              required
                              className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <input
                              type="text"
                              placeholder="ת.ז. *"
                              value={signatory.idNumber}
                              onChange={(e) => updateAuthorizedSignatory(partyIndex, signatoryIndex, 'idNumber', e.target.value)}
                              required
                              className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <input
                              type="text"
                              placeholder="כתובת"
                              value={signatory.address || ''}
                              onChange={(e) => updateAuthorizedSignatory(partyIndex, signatoryIndex, 'address', e.target.value)}
                              className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <input
                              type="tel"
                              placeholder="טלפון"
                              value={signatory.phone || ''}
                              onChange={(e) => updateAuthorizedSignatory(partyIndex, signatoryIndex, 'phone', e.target.value)}
                              className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <input
                              type="email"
                              placeholder="דוא&quot;ל"
                              value={signatory.email || ''}
                              onChange={(e) => updateAuthorizedSignatory(partyIndex, signatoryIndex, 'email', e.target.value)}
                              className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={party.signatureDocumentReceived || false}
                          onChange={(e) => updateParty(partyIndex, 'signatureDocumentReceived', e.target.checked)}
                          className="rounded"
                        />
                        <label className="text-sm">התקבל מסמך מורשי חתימה</label>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Person Fields */
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          שם פרטי *
                        </label>
                        <input
                          type="text"
                          value={party.firstName || ''}
                          onChange={(e) => updateParty(partyIndex, 'firstName', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          שם משפחה *
                        </label>
                        <input
                          type="text"
                          value={party.lastName || ''}
                          onChange={(e) => updateParty(partyIndex, 'lastName', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          ת.ז. *
                        </label>
                        <input
                          type="text"
                          value={party.idNumber || ''}
                          onChange={(e) => updateParty(partyIndex, 'idNumber', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          כתובת *
                        </label>
                        <input
                          type="text"
                          value={party.address || ''}
                          onChange={(e) => updateParty(partyIndex, 'address', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          טלפון
                        </label>
                        <input
                          type="tel"
                          value={party.phone || ''}
                          onChange={(e) => updateParty(partyIndex, 'phone', e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          דוא&quot;ל
                        </label>
                        <input
                          type="email"
                          value={party.email || ''}
                          onChange={(e) => updateParty(partyIndex, 'email', e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Lawyers Section */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      עורכי דין/מייצגים *
                    </label>
                    <button
                      type="button"
                      onClick={() => addLawyer(partyIndex)}
                      className="text-sm text-primary hover:text-accent transition-colors"
                    >
                      + הוסף עורך דין
                    </button>
                  </div>
                  {party.lawyers?.map((lawyer, lawyerIndex) => (
                    <div key={lawyerIndex} className="border border-border rounded p-3 mb-2 space-y-2 bg-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">עורך דין {lawyerIndex + 1}</span>
                        {party.lawyers!.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLawyer(partyIndex, lawyerIndex)}
                            className="text-red-600 text-sm"
                          >
                            × הסר
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="שם פרטי *"
                          value={lawyer.firstName}
                          onChange={(e) => updateLawyer(partyIndex, lawyerIndex, 'firstName', e.target.value)}
                          required
                          className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="text"
                          placeholder="שם משפחה *"
                          value={lawyer.lastName}
                          onChange={(e) => updateLawyer(partyIndex, lawyerIndex, 'lastName', e.target.value)}
                          required
                          className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="text"
                          placeholder="ת.ז."
                          value={lawyer.idNumber || ''}
                          onChange={(e) => updateLawyer(partyIndex, lawyerIndex, 'idNumber', e.target.value)}
                          className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="text"
                          placeholder="כתובת"
                          value={lawyer.address || ''}
                          onChange={(e) => updateLawyer(partyIndex, lawyerIndex, 'address', e.target.value)}
                          className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="tel"
                          placeholder="טלפון"
                          value={lawyer.phone || ''}
                          onChange={(e) => updateLawyer(partyIndex, lawyerIndex, 'phone', e.target.value)}
                          className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="email"
                          placeholder="דוא&quot;ל *"
                          value={lawyer.email}
                          onChange={(e) => updateLawyer(partyIndex, lawyerIndex, 'email', e.target.value)}
                          required
                          className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="text"
                          placeholder="מקצוע (ברירת מחדל: עורך דין)"
                          value={lawyer.profession || 'עורך דין'}
                          onChange={(e) => updateLawyer(partyIndex, lawyerIndex, 'profession', e.target.value)}
                          className="px-2 py-1 border border-border rounded text-sm col-span-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Created Passwords Display */}
          {createdPasswords.length > 0 && (
            <div className="bg-secondary/20 border border-secondary/40 rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2">סיסמאות שנוצרו:</h3>
              <div className="space-y-2">
                {createdPasswords.map((item, index) => (
                  <div key={index} className="text-sm text-foreground">
                    <span className="font-medium">{item.email}</span> ({item.role}): 
                    <span className="font-mono bg-background px-2 py-1 rounded ml-2">{item.password}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">הסיסמאות נשמרו גם בלוג של השרת</p>
              <button
                type="button"
                onClick={() => {
                  const caseId = (window as any).lastCreatedCaseId;
                  if (caseId) {
                    router.push(`/cases/${caseId}`);
                  }
                }}
                className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition-opacity font-semibold"
              >
                קח אותי אל התיק
              </button>
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t border-border">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'יוצר...' : 'צור תיק'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-muted text-muted-foreground px-6 py-2 rounded-lg hover:bg-muted/80 transition-colors"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
