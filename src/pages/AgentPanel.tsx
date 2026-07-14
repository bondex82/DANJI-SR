import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Upload, CheckCircle, AlertCircle, ShieldCheck, Users, FileText, TrendingUp, AlertTriangle, Camera, Ban, Megaphone, Bell, X, Clock, Download, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import syncManager from '../offlineSync';

export default function AgentPanel({ user, setUser }: { user: any, setUser: (u: any) => void }) {
  const navigate = useNavigate();
  const [contestants, setContestants] = useState<any[]>([]);
  const [accredited, setAccredited] = useState('');
  const [activeVoters, setActiveVoters] = useState('');
  const [materialsArrivalTime, setMaterialsArrivalTime] = useState('');
  const [securityCount, setSecurityCount] = useState('');
  const [materialsDepartureTime, setMaterialsDepartureTime] = useState('');
  const [collationArrivalTime, setCollationArrivalTime] = useState('');
  const [apoCount, setApoCount] = useState('');
  const [submittingArrival, setSubmittingArrival] = useState(false);
  const [submittingDeparture, setSubmittingDeparture] = useState(false);
  const [submittingCollationArrival, setSubmittingCollationArrival] = useState(false);
  const [submittingApo, setSubmittingApo] = useState(false);
  const [totalVotesCast, setTotalVotesCast] = useState('');
  const [invalidVotes, setInvalidVotes] = useState('');
  const [votes, setVotes] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const uploading = uploadCount > 0;
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});
  const [submittingInvalid, setSubmittingInvalid] = useState(false);
  const [submittingTotalVotes, setSubmittingTotalVotes] = useState(false);
  const [submittingResultSheet, setSubmittingResultSheet] = useState(false);
  const [submittingAccreditation, setSubmittingAccreditation] = useState(false);
  const [accreditationEvidence, setAccreditationEvidence] = useState('');
  const [resultEvidence, setResultEvidence] = useState<Record<number, string>>({});
  const [invalidEvidence, setInvalidEvidence] = useState('');
  const [submissions, setSubmissions] = useState<{results: any[], accreditations: any[], incidents: any[]}>({results: [], accreditations: [], incidents: []});
  
  // Agent Presence
  const [submittingPresence, setSubmittingPresence] = useState(false);
  const [agentSelfie, setAgentSelfie] = useState<File | null>(null);
  const [agentSelfiePreview, setAgentSelfiePreview] = useState<string>('');
  
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [showInbox, setShowInbox] = useState(false);
  const [newBroadcastAlert, setNewBroadcastAlert] = useState<string | null>(null);
  const [hasIncident, setHasIncident] = useState<boolean | null>(null);
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentEvidence, setIncidentEvidence] = useState('');
  const [submittingIncident, setSubmittingIncident] = useState(false);
  const [quickAlertSent, setQuickAlertSent] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const [syncStatus, setSyncStatus] = useState({
    isOnline: navigator.onLine,
    pendingCount: 0,
    isSyncing: false,
    lastSyncTime: null as string | null,
    error: null as string | null,
  });
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const prevSyncingRef = useRef(false);
  useEffect(() => {
    if (prevSyncingRef.current && !syncStatus.isSyncing) {
      // Sync completed! Update submissions data automatically
      fetchSubmissions();
      fetchBroadcasts();
    }
    prevSyncingRef.current = syncStatus.isSyncing;
  }, [syncStatus.isSyncing]);

  useEffect(() => {
    if (syncStatus.pendingCount > 0) {
      import('../offlineSync').then(({ getPendingRequests }) => {
        getPendingRequests().then(setPendingRequests);
      });
    } else {
      setPendingRequests([]);
    }
  }, [syncStatus.pendingCount]);

  const handleForceSync = async () => {
    if (syncStatus.isOnline) {
      await syncManager.triggerSync();
    }
  };

  const downloadMyLogisticsPDF = () => {
    try {
      const doc = new jsPDF();
      
      const materials_arrival = submissions.accreditations.find(a => a.materials_arrival_time)?.materials_arrival_time || 'Awaiting Submission';
      const security = submissions.accreditations.find(a => a.security_count !== null && a.security_count !== undefined);
      const security_val = security ? `${security.security_count} Security Officers` : 'Awaiting Submission';
      const apo = submissions.accreditations.find(a => a.apo_count !== null && a.apo_count !== undefined);
      const apo_val = apo ? `${apo.apo_count} Staff Present` : 'Awaiting Submission';
      const materials_departure = submissions.accreditations.find(a => a.materials_departure_time)?.materials_departure_time || 'Awaiting Submission';
      const collation_arrival = submissions.accreditations.find(a => a.collation_arrival_time)?.collation_arrival_time || 'Awaiting Submission';

      // Header
      doc.setFillColor(13, 148, 136); // teal-600
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('OFFICIAL FIELD LOGISTICS MANIFEST', 105, 18, { align: 'center' });
      doc.setFontSize(11);
      doc.text(`${user.polling_unit?.toUpperCase() || 'MY'} POLLING UNIT RECEIPT`, 105, 28, { align: 'center' });
      doc.setFontSize(8);
      doc.text('Taraba State Verification Portal - Field Agent Log Copy', 105, 34, { align: 'center' });

      // Info Section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('POLLING STATION DETAILS', 20, 52);
      doc.setFont('helvetica', 'normal');
      doc.text(`Local Government Area: ${user.lga || 'N/A'}`, 20, 58);
      doc.text(`Registration Area (Ward): ${user.ward || 'N/A'}`, 20, 64);
      doc.text(`Polling Unit: ${user.polling_unit || 'N/A'}`, 20, 70);

      doc.setFont('helvetica', 'bold');
      doc.text('ASSIGNED AGENT', 130, 52);
      doc.setFont('helvetica', 'normal');
      doc.text(`Agent Name: ${user.name || 'N/A'}`, 130, 58);
      doc.text(`Phone: ${user.phone || 'N/A'}`, 130, 64);
      doc.text(`Role: Polling Unit Agent`, 130, 70);

      // Section divider line
      doc.setDrawColor(226, 232, 240); // border-slate-200
      doc.setLineWidth(1);
      doc.line(20, 78, 190, 78);

      // Milestone timeline headers and details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('SUBMITTED TIMELINES & CODES', 20, 88);

      // Let's build a beautiful table for the 5 key milestones
      autoTable(doc, {
        startY: 94,
        head: [['Logistics Milestone', 'Logged Value', 'Status']],
        body: [
          [
            '1. Election Materials Arrival Time', 
            materials_arrival,
            materials_arrival !== 'Awaiting Submission' ? 'LOGGED & LOCKED' : 'AWAITING LOG'
          ],
          [
            '2. Security Personnel Count on Ground', 
            security_val,
            security_val !== 'Awaiting Submission' ? 'LOGGED & LOCKED' : 'AWAITING LOG'
          ],
          [
            '3. Assistant Presiding Officers (APOs) Count', 
            apo_val,
            apo_val !== 'Awaiting Submission' ? 'LOGGED & LOCKED' : 'AWAITING LOG'
          ],
          [
            '4. Materials Departure Time from Polling Unit', 
            materials_departure,
            materials_departure !== 'Awaiting Submission' ? 'LOGGED & LOCKED' : 'AWAITING LOG'
          ],
          [
            '5. Arrival at Ward Collation Center', 
            collation_arrival,
            collation_arrival !== 'Awaiting Submission' ? 'LOGGED & LOCKED' : 'AWAITING LOG'
          ]
        ],
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] },
        styles: { fontSize: 10 },
        columnStyles: {
          2: { fontStyle: 'bold', textColor: [31, 41, 55] }
        },
        didDrawCell: (data) => {
          if (data.column.index === 2 && data.cell.text[0] === 'LOGGED & LOCKED') {
            doc.setTextColor(13, 148, 136); // teal-600
          } else if (data.column.index === 2 && data.cell.text[0] === 'AWAITING LOG') {
            doc.setTextColor(220, 38, 38); // red-600
          }
        }
      });

      const nextY = (doc as any).lastAutoTable.finalY + 15;
      
      // Footer and verification copy
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('FIELD COPY VERIFICATION', 20, nextY);
      doc.setFont('helvetica', 'normal');
      doc.text('This logistics log is a legal field copy of submissions uploaded directly by the agent via secure web portal. It contains verified timestamps and field records which cannot be modified after initial lock.', 20, nextY + 6, { maxWidth: 170 });

      doc.text(`Downloaded: ${new Date().toLocaleString()}`, 20, nextY + 25);

      doc.save(`My_Logistics_Receipt_${user.polling_unit?.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate logistics receipt PDF.');
    }
  };

  const fetchBroadcasts = async () => {
    try {
      const res = await syncManager.safeFetch('/api/agent/broadcasts', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      });
      const data = await res.json();
      setBroadcasts(data);
    } catch (err) {
      console.error('Failed to fetch broadcasts:', err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await syncManager.safeFetch('/api/agent/submissions', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      });
      const data = await res.json();
      setSubmissions(data);
      
      // Reset all form states to empty/default first so that if submissions are deleted, agents can re-submit!
      setAccredited('');
      setActiveVoters('');
      setTotalVotesCast('');
      setInvalidVotes('');
      setInvalidEvidence('');
      setAccreditationEvidence('');
      setMaterialsArrivalTime('');
      setSecurityCount('');
      setMaterialsDepartureTime('');
      setCollationArrivalTime('');
      setApoCount('');
      setVotes({});
      setResultEvidence({});
      setHasIncident(false);
      setIncidentDescription('');
      setIncidentEvidence('');
      setQuickAlertSent(false);
      
      // Pre-fill accreditation and results
      data.accreditations.forEach((acc: any) => {
        if (acc.total_accredited > 0) {
          setAccredited(acc.total_accredited.toString());
          setActiveVoters(acc.total_active_voters.toString());
        }
        if (acc.total_votes_cast > 0) {
          setTotalVotesCast(acc.total_votes_cast.toString());
        }
        if (acc.invalid_votes > 0) {
          setInvalidVotes(acc.invalid_votes.toString());
          setInvalidEvidence(acc.evidence_url || '');
        }
        if (acc.evidence_url && !acc.total_accredited && !acc.invalid_votes) {
          setAccreditationEvidence(acc.evidence_url);
        } else if (acc.evidence_url && acc.total_accredited) {
          setAccreditationEvidence(acc.evidence_url);
        }
        
        // Load logistics fields
        if (acc.materials_arrival_time) {
          setMaterialsArrivalTime(acc.materials_arrival_time);
        }
        if (acc.security_count !== undefined && acc.security_count !== null) {
          setSecurityCount(acc.security_count.toString());
        }
        if (acc.materials_departure_time) {
          setMaterialsDepartureTime(acc.materials_departure_time);
        }
        if (acc.collation_arrival_time) {
          setCollationArrivalTime(acc.collation_arrival_time);
        }
        if (acc.apo_count !== undefined && acc.apo_count !== null) {
          setApoCount(acc.apo_count.toString());
        }
      });
      
      // Pre-fill results
      const resultVotes: Record<number, string> = {};
      const resultEv: Record<number, string> = {};
      data.results.forEach((r: any) => {
        resultVotes[r.contestant_id] = r.votes.toString();
        resultEv[r.contestant_id] = r.evidence_url || '';
      });
      setVotes(resultVotes);
      setResultEvidence(resultEv);

      if (data.incidents && data.incidents.length > 0) {
        const lastIncident = data.incidents[data.incidents.length - 1];
        setHasIncident(true);
        setIncidentDescription(lastIncident.description);
        setIncidentEvidence(lastIncident.evidence_url || '');
        if (lastIncident.is_quick_alert) {
          setQuickAlertSent(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    }
  };

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height *= MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width *= MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }));
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.8);
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleFileUpload = async (rawFile: File): Promise<string | null> => {
    setUploadCount(prev => prev + 1);
    
    // Compress image
    const file = await compressImage(rawFile);
    
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await syncManager.safeFetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
        body: formData
      });
      const data = await res.json();
      setUploadCount(prev => prev - 1);
      if (!res.ok) {
        alert(data.error || 'Upload failed');
        return null;
      }
      return data.url;
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadCount(prev => prev - 1);
      alert('Upload failed. Please check your connection.');
      return null;
    }
  };

  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    // Check if user is still active
    syncManager.safeFetch('/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    })
    .then(res => {
      if (res.status === 403) setIsBlocked(true);
      return res.json();
    })
    .catch(() => {});

    syncManager.safeFetch('/api/contestants')
      .then(res => res.json())
      .then(data => setContestants(data));
    
    fetchSubmissions();
    fetchBroadcasts();

    // Socket.IO Setup
    socketRef.current = io();
    socketRef.current.on('connect', () => {
      console.log('Agent connected to socket, joining room:', user.id);
      socketRef.current?.emit('join_room', user.id);
    });
    
    socketRef.current.on('broadcast_alert', (data: { message: string }) => {
      setNewBroadcastAlert(data.message);
      fetchBroadcasts();
    });

    socketRef.current.on('stats_updated', () => {
      console.log('Real-time database update received, syncing agent submissions...');
      fetchSubmissions();
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAgentSelfie(file);
      const reader = new FileReader();
      reader.onload = (e) => setAgentSelfiePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePresenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingPresence) return;
    setStatus(null);
    if (!agentSelfie) {
      setStatus({ type: 'error', msg: 'Please capture a selfie to log your presence' });
      return;
    }
    setSubmittingPresence(true);
    try {
      let selfieUrl = '';
      if (agentSelfie) {
        const formData = new FormData();
        formData.append('file', agentSelfie);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
          body: formData
        });
        if (!uploadRes.ok) throw new Error('Failed to upload selfie');
        const uploadData = await uploadRes.json();
        selfieUrl = uploadData.url;
      }
      
      const currentTime = new Date().toISOString();

      const res = await syncManager.safeFetch('/api/accreditations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({
          agent_presence_picture: selfieUrl,
          agent_presence_time: currentTime,
          total_accredited: 0,
          total_active_voters: 0,
          total_votes_cast: 0,
          invalid_votes: 0,
        })
      }, 'Agent Presence Log');
      const data = await res.json();
      if (data.status === 'queued') {
        setStatus({ type: 'success', msg: data.message });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit presence data');
      }
      setStatus({ type: 'success', msg: 'Presence logged successfully' });
      fetchSubmissions();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSubmittingPresence(false);
    }
  };

  const handleArrivalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingArrival) return;
    setStatus(null);
    if (!materialsArrivalTime || !securityCount) {
      setStatus({ type: 'error', msg: 'Please fill in both Arrival Time and Security Count' });
      return;
    }
    setSubmittingArrival(true);
    try {
      const res = await syncManager.safeFetch('/api/accreditations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({
          total_accredited: 0,
          total_active_voters: 0,
          total_votes_cast: 0,
          invalid_votes: 0,
          materials_arrival_time: materialsArrivalTime,
          security_count: parseInt(securityCount) || 0
        })
      }, 'Arrival & Security Logistics');
      const data = await res.json();
      if (data.status === 'queued') {
        setStatus({ type: 'success', msg: data.message });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit logistics data');
      }
      setStatus({ type: 'success', msg: 'Arrival & Security data submitted successfully' });
      fetchSubmissions();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSubmittingArrival(false);
    }
  };

  const handleApoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingApo) return;
    setStatus(null);
    if (!apoCount) {
      setStatus({ type: 'error', msg: 'Please enter total number of APOs present' });
      return;
    }
    setSubmittingApo(true);
    try {
      const res = await syncManager.safeFetch('/api/accreditations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({
          total_accredited: 0,
          total_active_voters: 0,
          total_votes_cast: 0,
          invalid_votes: 0,
          apo_count: parseInt(apoCount) || 0
        })
      }, 'APO Staff Count');
      const data = await res.json();
      if (data.status === 'queued') {
        setStatus({ type: 'success', msg: data.message });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit APO count');
      }
      setStatus({ type: 'success', msg: 'Total APOs present submitted successfully' });
      fetchSubmissions();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSubmittingApo(false);
    }
  };

  const handleDepartureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingDeparture) return;
    setStatus(null);
    if (!materialsDepartureTime) {
      setStatus({ type: 'error', msg: 'Please select Departure Time' });
      return;
    }
    setSubmittingDeparture(true);
    try {
      const res = await syncManager.safeFetch('/api/accreditations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({
          total_accredited: 0,
          total_active_voters: 0,
          total_votes_cast: 0,
          invalid_votes: 0,
          materials_departure_time: materialsDepartureTime
        })
      }, 'Departure Logistics');
      const data = await res.json();
      if (data.status === 'queued') {
        setStatus({ type: 'success', msg: data.message });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit departure data');
      }
      setStatus({ type: 'success', msg: 'Materials departure time submitted successfully' });
      fetchSubmissions();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSubmittingDeparture(false);
    }
  };

  const handleCollationArrivalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingCollationArrival) return;
    setStatus(null);
    if (!collationArrivalTime) {
      setStatus({ type: 'error', msg: 'Please select Collation Arrival Time' });
      return;
    }
    setSubmittingCollationArrival(true);
    try {
      const res = await syncManager.safeFetch('/api/accreditations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({
          total_accredited: 0,
          total_active_voters: 0,
          total_votes_cast: 0,
          invalid_votes: 0,
          collation_arrival_time: collationArrivalTime
        })
      }, 'Collation Arrival Logistics');
      const data = await res.json();
      if (data.status === 'queued') {
        setStatus({ type: 'success', msg: data.message });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit collation arrival data');
      }
      setStatus({ type: 'success', msg: 'Collation arrival time submitted successfully' });
      fetchSubmissions();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSubmittingCollationArrival(false);
    }
  };

  const handleAccreditationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingAccreditation) return;
    setStatus(null);
    setSubmittingAccreditation(true);
    try {
      const res = await syncManager.safeFetch('/api/accreditations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ 
          total_accredited: parseInt(accredited) || 0,
          total_active_voters: parseInt(activeVoters) || 0,
          total_votes_cast: 0,
          invalid_votes: 0,
          evidence_url: accreditationEvidence || null
        })
      }, 'Accreditation data');
      const data = await res.json();
      if (data.status === 'queued') {
        setStatus({ type: 'success', msg: data.message });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit accreditation');
      }
      setStatus({ type: 'success', msg: 'Accreditation data submitted successfully' });
      fetchSubmissions();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSubmittingAccreditation(false);
    }
  };

  const handleTotalVotesCastSubmit = async () => {
    if (submittingTotalVotes) return;
    setStatus(null);
    if (!totalVotesCast) {
      setStatus({ type: 'error', msg: 'Please enter total votes cast' });
      return;
    }

    setSubmittingTotalVotes(true);
    try {
      const res = await syncManager.safeFetch('/api/accreditations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ 
          total_accredited: 0,
          total_active_voters: 0,
          total_votes_cast: parseInt(totalVotesCast) || 0,
          invalid_votes: 0,
          evidence_url: accreditationEvidence || null
        })
      }, 'Total Votes Cast');
      const data = await res.json();
      if (data.status === 'queued') {
        setStatus({ type: 'success', msg: data.message });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit total votes cast');
      }
      setStatus({ type: 'success', msg: 'Total votes cast submitted successfully' });
      fetchSubmissions();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSubmittingTotalVotes(false);
    }
  };

  const handleInvalidVotesSubmit = async () => {
    if (submittingInvalid) return;
    setStatus(null);
    if (!invalidVotes) {
      setStatus({ type: 'error', msg: 'Please enter invalid ballot count' });
      return;
    }

    setSubmittingInvalid(true);
    try {
      const res = await syncManager.safeFetch('/api/accreditations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ 
          total_accredited: 0,
          total_active_voters: 0,
          total_votes_cast: 0,
          invalid_votes: parseInt(invalidVotes) || 0,
          evidence_url: invalidEvidence || null
        })
      }, 'Invalid Ballots count');
      const data = await res.json();
      if (data.status === 'queued') {
        setStatus({ type: 'success', msg: data.message });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit invalid ballots');
      }
      setStatus({ type: 'success', msg: 'Invalid ballots submitted successfully' });
      fetchSubmissions();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSubmittingInvalid(false);
    }
  };

  const handleResultSubmit = async (contestantId: number) => {
    if (submitting[contestantId]) return;
    setStatus(null);
    const voteCount = parseInt(votes[contestantId]);
    if (isNaN(voteCount)) {
      setStatus({ type: 'error', msg: 'Please enter a valid vote count' });
      return;
    }

    setSubmitting(prev => ({ ...prev, [contestantId]: true }));
    try {
      const partyName = contestants.find(c => c.id === contestantId)?.party || `Contestant ${contestantId}`;
      const res = await syncManager.safeFetch('/api/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ 
          contestant_id: contestantId, 
          votes: voteCount,
          evidence_url: resultEvidence[contestantId] || null
        })
      }, `Result for ${partyName}`);
      const data = await res.json();
      if (data.status === 'queued') {
        setStatus({ type: 'success', msg: data.message });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit result');
      }
      setStatus({ type: 'success', msg: `Result for ${partyName} submitted successfully` });
      fetchSubmissions();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSubmitting(prev => ({ ...prev, [contestantId]: false }));
    }
  };

  const handleResultSheetSubmit = async () => {
    if (submittingResultSheet) return;
    setStatus(null);
    if (!accreditationEvidence) {
      setStatus({ type: 'error', msg: 'Please upload result sheet photo' });
      return;
    }

    setSubmittingResultSheet(true);
    try {
      const res = await syncManager.safeFetch('/api/accreditations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ 
          total_accredited: 0,
          total_active_voters: 0,
          total_votes_cast: 0,
          invalid_votes: 0,
          evidence_url: accreditationEvidence
        })
      }, 'Official Result Sheet');
      const data = await res.json();
      if (data.status === 'queued') {
        setStatus({ type: 'success', msg: data.message });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit result sheet');
      }
      setStatus({ type: 'success', msg: 'Official result sheet submitted successfully' });
      fetchSubmissions();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSubmittingResultSheet(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingIncident || !incidentDescription) return;
    setStatus(null);
    setSubmittingIncident(true);
    try {
      const res = await syncManager.safeFetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ 
          description: incidentDescription,
          evidence_url: incidentEvidence || null
        })
      }, 'Incident Report');
      const data = await res.json();
      if (data.status === 'queued') {
        setStatus({ type: 'success', msg: data.message });
        setIncidentDescription('');
        setIncidentEvidence('');
        setHasIncident(false);
        return;
      }
      if (!res.ok) {
        if (data.error?.includes('public.incidents')) {
          throw new Error('Database Error: The "incidents" table has not been created in Supabase yet. Please contact your administrator.');
        }
        throw new Error(data.error || 'Failed to submit incident report');
      }
      setStatus({ type: 'success', msg: 'Incident report submitted to situation room' });
      setIncidentDescription('');
      setIncidentEvidence('');
      setHasIncident(false);
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSubmittingIncident(false);
    }
  };

  const handleQuickAlert = async () => {
    if (submittingIncident) return;
    setStatus(null);
    setSubmittingIncident(true);
    try {
      const res = await syncManager.safeFetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ 
          description: 'EMERGENCY: Field agent has triggered a rapid incident alert. Immediate attention required.',
          is_quick_alert: true 
        })
      }, 'EMERGENCY ALERT');
      const data = await res.json();
      if (data.status === 'queued') {
        setStatus({ type: 'success', msg: data.message });
        setQuickAlertSent(true);
        return;
      }
      if (!res.ok) {
        if (data.error?.includes('public.incidents')) {
          throw new Error('Database Error: The "incidents" table has not been created in Supabase yet. Please contact your administrator.');
        }
        throw new Error(data.error || 'Failed to send quick alert');
      }
      setStatus({ type: 'success', msg: 'Emergency alert broadcasted to Situation Room!' });
      setQuickAlertSent(true);
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSubmittingIncident(false);
    }
  };

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-[3rem] shadow-2xl border-4 border-rose-600 max-w-lg w-full text-center"
        >
          <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-rose-100">
            <Ban className="text-rose-600" size={48} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4 font-display">Access Revoked</h2>
          <p className="text-slate-600 font-bold mb-10 leading-relaxed font-display">
            Your field agent credentials have been suspended by the central administration. You no longer have authorization to submit or view election data.
          </p>
          <button 
            onClick={handleLogout}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-rose-600 transition-all flex items-center justify-center gap-3"
          >
            <LogOut size={20} /> Exit Portal
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      <header className="bg-slate-900 text-white p-8 shadow-2xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 overflow-hidden">
              {user.photo_url ? (
                <img 
                  src={user.photo_url} 
                  alt={user.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <ShieldCheck className="text-white w-8 h-8" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase font-display">DANJI SS 2027 <span className="text-emerald-400">Agent Portal</span></h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-black font-display">
                  {user.polling_unit} &bull; {user.ward} &bull; {user.lga}
                </p>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-slate-800 px-6 py-3 rounded-xl hover:bg-red-950 hover:text-red-400 transition-all text-sm font-black uppercase tracking-widest border border-slate-700 hover:border-red-900 shadow-xl">
            <LogOut size={18} /> Secure Logout
          </button>
        </div>
      </header>

      <AnimatePresence>
        {newBroadcastAlert && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-8 right-8 md:left-auto md:right-8 md:w-96 bg-rose-600 text-white p-6 rounded-[2rem] shadow-2xl z-[100] border-4 border-rose-400"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Megaphone size={20} />
                </div>
                <h4 className="font-black uppercase tracking-widest text-xs">Priority Command</h4>
              </div>
              <button onClick={() => setNewBroadcastAlert(null)} className="text-white/60 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="font-bold text-sm leading-relaxed mb-6">{newBroadcastAlert}</p>
            <button 
              onClick={() => {
                setShowInbox(true);
                setNewBroadcastAlert(null);
              }}
              className="w-full bg-white text-rose-600 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-50 transition-colors"
            >
              Open Command Center
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 md:top-32 md:right-8 md:bottom-auto z-40">
        <button 
          onClick={() => setShowInbox(true)}
          className="w-14 h-14 md:w-16 md:h-16 bg-slate-900 text-white rounded-2xl shadow-xl md:shadow-2xl flex items-center justify-center hover:bg-blue-600 transition-all relative group"
        >
          <Bell size={28} />
          {broadcasts.length > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
              {broadcasts.length}
            </span>
          )}
          <div className="absolute right-full mr-4 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Command Center
          </div>
        </button>
      </div>

      <AnimatePresence>
        {showInbox && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                    <Megaphone size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight font-display">Command Center</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Official Directives & Broadcasts</p>
                  </div>
                </div>
                <button onClick={() => setShowInbox(false)} className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {broadcasts.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Bell size={32} className="text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No active directives</p>
                  </div>
                ) : (
                  broadcasts.map((b) => (
                    <div key={b.id} className="p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl space-y-3 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-slate-900"></div>
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          {new Date(b.created_at).toLocaleString()}
                        </span>
                        {b.target_user_id && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[7px] font-black uppercase tracking-widest">
                            Direct Message
                          </span>
                        )}
                      </div>
                      <p className="text-slate-900 font-bold leading-relaxed">{b.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="p-8 border-t border-slate-100 bg-slate-50">
                <button 
                  onClick={() => setShowInbox(false)}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all"
                >
                  Acknowledge & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto p-4 md:p-12 space-y-8 md:space-y-12">
        {/* Offline & Synchronization Status Banner */}
        <div id="offline-sync-panel" className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${syncStatus.isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                {syncStatus.isOnline ? <Wifi size={24} /> : <WifiOff size={24} />}
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight font-display flex items-center gap-2">
                  Network Connection: 
                  <span className={syncStatus.isOnline ? 'text-emerald-600' : 'text-slate-500'}>
                    {syncStatus.isOnline ? 'Online' : 'Offline'}
                  </span>
                </h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-display">
                  {syncStatus.isOnline ? 'Live central server synchronization is active' : 'Offline caching mode is active'}
                </p>
              </div>
            </div>

            {/* Quick action button */}
            {syncStatus.pendingCount > 0 && (
              <button
                onClick={handleForceSync}
                disabled={!syncStatus.isOnline || syncStatus.isSyncing}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 transition-all text-sm font-black uppercase tracking-widest shadow-lg font-display"
              >
                <RefreshCw size={16} className={syncStatus.isSyncing ? 'animate-spin' : ''} />
                {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>

          {/* Sync status indicator */}
          {syncStatus.isSyncing && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3">
              <RefreshCw size={20} className="animate-spin text-emerald-600" />
              <p className="text-xs font-bold uppercase tracking-tight font-display">
                Synchronizing {syncStatus.pendingCount} pending submission{syncStatus.pendingCount > 1 ? 's' : ''} in the background... Please do not close this window.
              </p>
            </div>
          )}

          {/* Offline warning explanation */}
          {!syncStatus.isOnline && (
            <div className="p-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-3xl space-y-2">
              <p className="text-sm font-bold leading-relaxed font-display">
                ⚠️ <strong>Offline Mode Active:</strong> You can continue to fill out forms and record election data normally. All submissions will be securely buffered locally in your browser's persistent storage database and synced automatically as soon as an active internet connection is detected.
              </p>
            </div>
          )}

          {/* List of pending requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center justify-between font-display">
                <span>Pending Outbox Queue ({pendingRequests.length} items)</span>
                {syncStatus.lastSyncTime && (
                  <span className="normal-case text-[10px] font-medium text-slate-400">Last sync attempt: {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}</span>
                )}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto pr-2">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-3 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                    <div className="pl-2">
                      <p className="text-xs font-black uppercase tracking-tight text-slate-800 font-display">
                        {req.label || req.url.split('/').pop() || 'Data Record'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Saved {new Date(req.timestamp).toLocaleTimeString()} &bull; {req.method}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[9px] font-black uppercase tracking-widest font-display">
                      Queued
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {status && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={"p-6 rounded-2xl flex items-center gap-4 border-2 shadow-xl " + (status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800')}
          >
            {status.type === 'success' ? <CheckCircle size={28} className="text-emerald-600" /> : <AlertCircle size={28} className="text-red-600" />}
            <span className="font-black uppercase tracking-tight font-display">{status.msg}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Logistics, Accreditation, and Departure */}
          <div className="lg:col-span-5 space-y-8">
            {/* 0. Agent Presence */}
            <section className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
              <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-6">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Camera size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase font-display">Agent Presence</h2>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Selfie Verification</p>
                </div>
              </div>
              <form onSubmit={handlePresenceSubmit} className="space-y-6">
                {submissions.accreditations.some(a => a.agent_presence_picture) && (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-4">
                    <CheckCircle size={16} /> Presence Logged & Verified
                  </div>
                )}
                {!submissions.accreditations.some(a => a.agent_presence_picture) && (
                  <>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                      <input 
                        type="file" 
                        id="selfie" 
                        accept="image/*" 
                        capture="user" 
                        onChange={handleSelfieChange} 
                        className="hidden" 
                      />
                      <label htmlFor="selfie" className="cursor-pointer block">
                        {agentSelfiePreview ? (
                          <div className="space-y-4">
                            <img src={agentSelfiePreview} alt="Selfie Preview" className="w-32 h-32 object-cover rounded-full mx-auto shadow-lg border-4 border-white" />
                            <p className="text-sm font-bold text-slate-500">Tap to retake photo</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Camera size={24} />
                            </div>
                            <p className="font-bold text-slate-900">Take a selfie at the polling unit</p>
                            <p className="text-xs text-slate-500">Must show you at the polling unit location</p>
                          </div>
                        )}
                      </label>
                    </div>
                    <button 
                      type="submit" 
                      disabled={submittingPresence || !agentSelfie}
                      className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-5 rounded-2xl hover:bg-slate-800 disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
                    >
                      {submittingPresence ? 'Uploading...' : 'Log Presence'}
                    </button>
                  </>
                )}
                {submissions.accreditations.some(a => a.agent_presence_picture) && (
                  <div className="flex justify-center">
                    <img 
                      src={submissions.accreditations.find(a => a.agent_presence_picture)?.agent_presence_picture} 
                      alt="Agent Presence" 
                      className="w-32 h-32 object-cover rounded-full shadow-lg border-4 border-slate-100" 
                    />
                  </div>
                )}
              </form>
            </section>

            {/* 1. Materials Arrival & Security */}
            <section className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
              <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-6">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase font-display">1. Arrival & Security</h2>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Election Materials Log</p>
                </div>
              </div>
              <form onSubmit={handleArrivalSubmit} className="space-y-6">
                {submissions.accreditations.some(a => a.materials_arrival_time) && (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-4">
                    <CheckCircle size={16} /> Logged & Confirmed
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest">Materials Arrival Time</label>
                  <input 
                    type="time" 
                    required
                    disabled={submissions.accreditations.some(a => a.materials_arrival_time)}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono text-xl font-black disabled:opacity-70"
                    value={materialsArrivalTime}
                    onChange={(e) => setMaterialsArrivalTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest">Security Personnel on Ground</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    disabled={submissions.accreditations.some(a => a.materials_arrival_time)}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono text-2xl font-black disabled:opacity-70"
                    value={securityCount}
                    onChange={(e) => setSecurityCount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                {!submissions.accreditations.some(a => a.materials_arrival_time) && (
                  <button 
                    type="submit" 
                    disabled={submittingArrival || uploading}
                    className="w-full bg-slate-900 text-white px-8 py-5 rounded-2xl hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                  >
                    {submittingArrival ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <CheckCircle size={24} />
                    )}
                    {submittingArrival ? 'Logging...' : 'Log Arrival & Security'}
                  </button>
                )}
              </form>
            </section>

            {/* 2. Accreditation Section */}
            <section className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
              <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-6">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Users size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase font-display">2. Accreditation</h2>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Voter Turnout Data</p>
                </div>
              </div>
              <form onSubmit={handleAccreditationSubmit} className="space-y-6">
                {submissions.accreditations.some(a => a.total_accredited > 0) && (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-4">
                    <CheckCircle size={16} /> Data Locked & Verified
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest">Total Accredited Voters</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    disabled={submissions.accreditations.some(a => a.total_accredited > 0)}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono text-2xl font-black disabled:opacity-70"
                    value={accredited}
                    onChange={(e) => setAccredited(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest">Total Active Voters</label>
                    <input 
                      type="number" 
                      min="0"
                      disabled={submissions.accreditations.some(a => a.total_accredited > 0)}
                      className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono text-2xl font-black disabled:opacity-70"
                      value={activeVoters}
                      onChange={(e) => setActiveVoters(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                {!submissions.accreditations.some(a => a.total_accredited > 0) && (
                  <button 
                    type="submit" 
                    disabled={submittingAccreditation || uploading}
                    className="w-full bg-slate-900 text-white px-8 py-5 rounded-2xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                  >
                    {submittingAccreditation ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <TrendingUp size={24} />
                    )}
                    {submittingAccreditation ? 'Processing...' : 'Submit Collation Data'}
                  </button>
                )}
              </form>
            </section>

            {/* 3. Polling Staff (APOs Present) */}
            <section className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
              <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-6">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Users size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase font-display">3. Polling Staff</h2>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Assistant Presiding Officers</p>
                </div>
              </div>
              <form onSubmit={handleApoSubmit} className="space-y-4">
                {submissions.accreditations.some(a => a.apo_count !== null && a.apo_count !== undefined) && (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-4">
                    <CheckCircle size={16} /> Staff Count Locked
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest">Total number of APOs present</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    disabled={submissions.accreditations.some(a => a.apo_count !== null && a.apo_count !== undefined)}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono text-2xl font-black disabled:opacity-70"
                    value={apoCount}
                    onChange={(e) => setApoCount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                {!submissions.accreditations.some(a => a.apo_count !== null && a.apo_count !== undefined) && (
                  <button 
                    type="submit" 
                    disabled={submittingApo || uploading}
                    className="w-full bg-slate-900 text-white px-8 py-5 rounded-2xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                  >
                    {submittingApo ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <Users size={24} />
                    )}
                    {submittingApo ? 'Processing...' : 'Submit Staff Count'}
                  </button>
                )}
              </form>
            </section>
          </div>

          {/* Results Section */}
          <section className="lg:col-span-7 bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
            <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-6">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                <FileText size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase font-display">2. Candidate Results</h2>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Official Vote Count</p>
              </div>
            </div>
            <div className="space-y-6">
              {/* Total Votes Cast Section */}
              {(() => {
                const isSubmitted = submissions.accreditations.some(a => a.total_votes_cast > 0);
                return (
                  <div className={"flex flex-col sm:flex-row sm:items-center gap-6 p-6 border-2 rounded-3xl transition-all group " + (isSubmitted ? 'bg-blue-50/30 border-blue-100' : 'bg-blue-50/30 border-blue-100 hover:border-blue-500/30 hover:bg-white')}>
                    <div className="flex items-center gap-6 flex-1">
                      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center font-black text-blue-600 border-2 border-blue-100 shadow-lg text-xl font-display group-hover:scale-110 transition-transform">
                        TVC
                      </div>
                      <div>
                        <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight font-display">Total Votes Cast</h3>
                        <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Overall Ballots in Box</p>
                        {isSubmitted && (
                          <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[8px] font-black uppercase tracking-widest">
                            <CheckCircle size={10} /> Submitted
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 w-full sm:w-auto">
                      <div className="flex items-center gap-4">
                        <input 
                          type="number" 
                          placeholder="Count"
                          min="0"
                          disabled={isSubmitted}
                          className="w-full sm:w-36 p-5 border-2 border-slate-100 rounded-2xl text-center outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-mono text-2xl font-black shadow-inner text-blue-600 disabled:opacity-70"
                          value={totalVotesCast}
                          onChange={(e) => setTotalVotesCast(e.target.value)}
                        />
                      </div>
                      {!isSubmitted && (
                        <button 
                          onClick={handleTotalVotesCastSubmit}
                          disabled={!totalVotesCast || submittingTotalVotes || uploading}
                          className="bg-slate-900 text-white px-8 py-5 rounded-2xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 whitespace-nowrap"
                        >
                          {submittingTotalVotes ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <Upload size={20} />
                          )}
                          {submittingTotalVotes ? 'Sending...' : 'Send'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {contestants.map(c => {
                const isSubmitted = submissions.results.some(r => r.contestant_id === c.id);
                return (
                  <div key={c.id} className={"flex flex-col sm:flex-row sm:items-center gap-6 p-6 border-2 rounded-3xl transition-all group " + (isSubmitted ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50/50 border-slate-50 hover:border-emerald-500/30 hover:bg-white')}>
                    <div className="flex items-center gap-6 flex-1">
                      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center font-black text-slate-900 border-2 border-slate-100 shadow-lg text-xl font-display group-hover:scale-110 transition-transform">
                        {c.party}
                      </div>
                      <div>
                        <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight font-display">{c.name}</h3>
                        <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">{c.party}</p>
                        {isSubmitted && (
                          <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[8px] font-black uppercase tracking-widest">
                            <CheckCircle size={10} /> Submitted
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 w-full sm:w-auto">
                      <div className="flex items-center gap-4">
                        <input 
                          type="number" 
                          placeholder="Votes"
                          min="0"
                          disabled={isSubmitted}
                          className="w-full sm:w-36 p-5 border-2 border-slate-100 rounded-2xl text-center outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-mono text-2xl font-black shadow-inner disabled:opacity-70"
                          value={votes[c.id] || ''}
                          onChange={(e) => setVotes({...votes, [c.id]: e.target.value})}
                        />
                        <div className="flex flex-col gap-2">
                          <input 
                            type="file" 
                            accept="image/*"
                            disabled={isSubmitted}
                            className="hidden" 
                            id={`result-evidence-${c.id}`}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = await handleFileUpload(file);
                                if (url) setResultEvidence(prev => ({...prev, [c.id]: url}));
                              }
                            }}
                          />
                          {!isSubmitted ? (
                            <label htmlFor={`result-evidence-${c.id}`} className={`p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all flex items-center justify-center ${resultEvidence[c.id] ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-900'}`}>
                              <Camera size={20} />
                            </label>
                          ) : (
                            <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-100 text-emerald-600">
                              <ShieldCheck size={20} />
                            </div>
                          )}
                        </div>
                      </div>
                      {!isSubmitted && (
                        <button 
                          onClick={() => handleResultSubmit(c.id)}
                          disabled={!votes[c.id] || submitting[c.id] || uploading}
                          className="bg-slate-900 text-white px-8 py-5 rounded-2xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 whitespace-nowrap"
                        >
                          {submitting[c.id] ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <Upload size={20} />
                          )}
                          {submitting[c.id] ? 'Sending...' : 'Send'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Invalid Ballots Row */}
              {(() => {
                const isSubmitted = submissions.accreditations.some(a => a.invalid_votes > 0);
                return (
                  <div className={"flex flex-col sm:flex-row sm:items-center gap-6 p-6 border-2 rounded-3xl transition-all group " + (isSubmitted ? 'bg-rose-50/30 border-rose-100' : 'bg-rose-50/30 border-rose-100 hover:border-rose-500/30 hover:bg-white')}>
                    <div className="flex items-center gap-6 flex-1">
                      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center font-black text-rose-600 border-2 border-rose-100 shadow-lg text-xl font-display group-hover:scale-110 transition-transform">
                        INV
                      </div>
                      <div>
                        <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight font-display">Invalid Ballots</h3>
                        <p className="text-xs font-black text-rose-600 uppercase tracking-widest">Spoilt / Rejected</p>
                        {isSubmitted && (
                          <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-[8px] font-black uppercase tracking-widest">
                            <CheckCircle size={10} /> Submitted
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 w-full sm:w-auto">
                      <div className="flex items-center gap-4">
                        <input 
                          type="number" 
                          placeholder="Count"
                          min="0"
                          disabled={isSubmitted}
                          className="w-full sm:w-36 p-5 border-2 border-slate-100 rounded-2xl text-center outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 font-mono text-2xl font-black shadow-inner text-rose-600 disabled:opacity-70"
                          value={invalidVotes}
                          onChange={(e) => setInvalidVotes(e.target.value)}
                        />
                        <div className="flex flex-col gap-2">
                          <input 
                            type="file" 
                            accept="image/*"
                            disabled={isSubmitted}
                            className="hidden" 
                            id="invalid-evidence-upload"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = await handleFileUpload(file);
                                if (url) setInvalidEvidence(url);
                              }
                            }}
                          />
                          {!isSubmitted ? (
                            <label htmlFor="invalid-evidence-upload" className={`p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all flex items-center justify-center ${invalidEvidence ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-900'}`}>
                              <Camera size={20} />
                            </label>
                          ) : (
                            <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-100 text-rose-600">
                              <ShieldCheck size={20} />
                            </div>
                          )}
                        </div>
                      </div>
                      {!isSubmitted && (
                        <button 
                          onClick={handleInvalidVotesSubmit}
                          disabled={!invalidVotes || submittingInvalid || uploading}
                          className="bg-slate-900 text-white px-8 py-5 rounded-2xl hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 whitespace-nowrap"
                        >
                          {submittingInvalid ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <Upload size={20} />
                          )}
                          {submittingInvalid ? 'Sending...' : 'Send'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Official Result Sheet Evidence Row */}
              {(() => {
                const isSubmitted = submissions.accreditations.some(a => a.evidence_url && !a.total_accredited && !a.invalid_votes) || 
                                   submissions.accreditations.some(a => a.evidence_url && a.total_accredited);
                return (
                  <div className={"flex flex-col sm:flex-row sm:items-center gap-6 p-6 border-2 rounded-3xl transition-all group " + (isSubmitted ? 'bg-amber-50/30 border-amber-100' : 'bg-amber-50/30 border-amber-100 hover:border-amber-500/30 hover:bg-white')}>
                    <div className="flex items-center gap-6 flex-1">
                      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center font-black text-amber-600 border-2 border-amber-100 shadow-lg text-xl font-display group-hover:scale-110 transition-transform">
                        <Camera size={32} />
                      </div>
                      <div>
                        <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight font-display">Result Sheet</h3>
                        <p className="text-xs font-black text-amber-600 uppercase tracking-widest">Official Scanned Document</p>
                        {isSubmitted && (
                          <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[8px] font-black uppercase tracking-widest">
                            <CheckCircle size={10} /> Verified & Uploaded
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 w-full sm:w-auto">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 flex items-center gap-4">
                          <input 
                            type="file" 
                            accept="image/*"
                            disabled={isSubmitted}
                            className="hidden" 
                            id="final-result-sheet-upload"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = await handleFileUpload(file);
                                if (url) setAccreditationEvidence(url);
                              }
                            }}
                          />
                          {!isSubmitted ? (
                            <label htmlFor="final-result-sheet-upload" className={`flex-1 flex items-center justify-center gap-2 p-5 border-2 border-dashed rounded-2xl cursor-pointer transition-all font-bold ${accreditationEvidence ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-900'}`}>
                              <Upload size={20} /> {uploading ? 'Uploading...' : accreditationEvidence ? 'Change Sheet' : 'Upload Sheet'}
                            </label>
                          ) : (
                            <div className="flex-1 p-5 bg-emerald-50 border-2 border-emerald-100 rounded-2xl text-emerald-600 font-bold text-center flex items-center justify-center gap-2">
                              <ShieldCheck size={20} /> Document Secured
                            </div>
                          )}
                          {accreditationEvidence && (
                            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm">
                              <img src={accreditationEvidence} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}
                        </div>
                      </div>
                      {!isSubmitted && (
                        <button 
                          onClick={handleResultSheetSubmit}
                          disabled={!accreditationEvidence || submittingResultSheet || uploading}
                          className="bg-slate-900 text-white px-8 py-5 rounded-2xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 whitespace-nowrap"
                        >
                          {submittingResultSheet ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <ShieldCheck size={20} />
                          )}
                          {submittingResultSheet ? 'Securing...' : 'Submit Final Sheet'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="mt-10 bg-amber-50 border-2 border-amber-100 p-6 rounded-2xl flex gap-4 text-amber-900 text-xs font-black uppercase tracking-widest leading-relaxed">
              <AlertTriangle size={24} className="shrink-0 text-amber-500" />
              <p>Warning: All submitted results are final and subject to verification by the central situation room.</p>
            </div>
          </section>

          {/* Incident Reportage Section */}
          <section className="lg:col-span-12 bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 mt-12">
            <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-6">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase font-display">3. Incident Reportage</h2>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Field Security Updates</p>
              </div>
            </div>

            {submissions.incidents && submissions.incidents.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-6">
                <CheckCircle size={16} /> Incident Report Locked & Transmitted
              </div>
            )}

            <div className="space-y-8">
              <div className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-100">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Was there an incident at the polling unit?</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setHasIncident(true)}
                    disabled={submissions.incidents && submissions.incidents.length > 0}
                    className={`flex items-center justify-center gap-3 p-6 rounded-2xl font-black uppercase tracking-[0.2em] border-2 transition-all ${hasIncident === true ? 'bg-rose-600 text-white border-rose-600 shadow-xl' : 'bg-white text-slate-600 border-slate-100 hover:border-rose-600'} disabled:opacity-70`}
                  >
                    Yes
                  </button>
                  <button 
                    onClick={() => {
                      setHasIncident(false);
                      setIncidentDescription('');
                    }}
                    disabled={submissions.incidents && submissions.incidents.length > 0}
                    className={`flex items-center justify-center gap-3 p-6 rounded-2xl font-black uppercase tracking-[0.2em] border-2 transition-all ${hasIncident === false ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl' : 'bg-white text-slate-600 border-slate-100 hover:border-emerald-600'} disabled:opacity-70`}
                  >
                    No
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {hasIncident === true && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6 overflow-hidden"
                  >
                    {!quickAlertSent ? (
                      <button 
                        type="button" 
                        onClick={handleQuickAlert}
                        disabled={submittingIncident || (submissions.incidents && submissions.incidents.length > 0)}
                        className="w-full bg-rose-50 border-4 border-rose-600 text-rose-600 px-8 py-6 rounded-3xl hover:bg-rose-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-4 animate-pulse group"
                      >
                        <AlertTriangle size={32} className="group-hover:scale-125 transition-transform" />
                        <div className="text-left">
                          <p className="text-sm">Trigger Emergency Alert</p>
                          <p className="text-[10px] font-bold opacity-70">Immediate Situation Room Notification</p>
                        </div>
                      </button>
                    ) : (
                      <div className="bg-rose-600 text-white p-6 rounded-3xl flex items-center gap-4 shadow-xl border-4 border-rose-400">
                        <CheckCircle size={24} />
                        <p className="font-black uppercase tracking-widest text-xs">Emergency Alert Broadcasted!</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="h-[2px] bg-slate-100 flex-1"></div>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">or provide details</span>
                      <div className="h-[2px] bg-slate-100 flex-1"></div>
                    </div>

                    <form onSubmit={handleIncidentSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest">Detailed Incident Description</label>
                        <textarea 
                          required
                          rows={4}
                          disabled={submissions.incidents && submissions.incidents.length > 0}
                          className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-300 disabled:opacity-75"
                          placeholder="Provide details about the incident (e.g., violence, ballotbox snatching, late arrival of materials)..."
                          value={incidentDescription}
                          onChange={(e) => setIncidentDescription(e.target.value)}
                        />
                      </div>

                      <div className="space-y-4">
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden" 
                          id="incident-evidence-upload"
                          disabled={submissions.incidents && submissions.incidents.length > 0}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await handleFileUpload(file);
                              if (url) setIncidentEvidence(url);
                            }
                          }}
                        />
                        <label 
                          htmlFor={(submissions.incidents && submissions.incidents.length > 0) ? undefined : "incident-evidence-upload"} 
                          className={`w-full flex items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer font-black uppercase tracking-widest text-xs ${incidentEvidence ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-900 border-rose-200'} ${(submissions.incidents && submissions.incidents.length > 0) ? 'pointer-events-none opacity-70' : ''}`}
                        >
                          <Camera size={24} />
                          {uploading ? 'Uploading...' : incidentEvidence ? 'Image Captured' : 'Upload Evidence Photo (Optional)'}
                        </label>
                        {incidentEvidence && (
                          <div className="relative w-full h-64 rounded-3xl overflow-hidden shadow-2xl border-4 border-emerald-100">
                            <img src={incidentEvidence} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            {!(submissions.incidents && submissions.incidents.length > 0) && (
                              <button 
                                type="button"
                                onClick={() => setIncidentEvidence('')}
                                className="absolute top-4 right-4 w-10 h-10 bg-slate-900/80 text-white rounded-xl flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg"
                              >
                                <X size={20} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {!(submissions.incidents && submissions.incidents.length > 0) && (
                        <button 
                          type="submit" 
                          disabled={submittingIncident || !incidentDescription || uploading}
                          className="w-full bg-slate-900 text-white px-8 py-5 rounded-2xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-3"
                        >
                          {submittingIncident ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <Megaphone size={24} />
                          )}
                          {submittingIncident ? 'Reporting...' : 'Transmit Detailed Report'}
                        </button>
                      )}
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {hasIncident === false && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-3xl flex items-center gap-4 text-emerald-700"
                >
                  <CheckCircle size={24} />
                  <p className="font-black uppercase tracking-widest text-[10px]">No security issues reported. Continue with regular collation.</p>
                </motion.div>
              )}
            </div>
          </section>

          {/* 4. Departure & Collation */}
          <section className="lg:col-span-12 bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 mt-12">
            <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-6">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                <Clock size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase font-display">4. Departure & Collation</h2>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">End of Day Logistics Log</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Departure Form */}
              <form onSubmit={handleDepartureSubmit} className="space-y-4 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">Step A: Materials Left Polling Unit</h3>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest">Select Departure Time</label>
                  <div className="flex gap-4">
                    <input 
                      type="time" 
                      required
                      disabled={submissions.accreditations.some(a => a.materials_departure_time)}
                      className="flex-1 p-5 bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono text-xl font-black disabled:opacity-70"
                      value={materialsDepartureTime}
                      onChange={(e) => setMaterialsDepartureTime(e.target.value)}
                    />
                    {!submissions.accreditations.some(a => a.materials_departure_time) && (
                      <button 
                        type="submit"
                        disabled={submittingDeparture || uploading}
                        className="bg-slate-900 text-white px-8 rounded-2xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase tracking-widest text-xs shadow-xl transition-all"
                      >
                        {submittingDeparture ? '...' : 'Log'}
                      </button>
                    )}
                  </div>
                </div>
                {submissions.accreditations.some(a => a.materials_departure_time) && (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-2 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                    <CheckCircle size={16} /> Departure Logged & Locked
                  </div>
                )}
              </form>

              {/* Collation Arrival Form */}
              <form onSubmit={handleCollationArrivalSubmit} className="space-y-4 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">Step B: Arrival at Collation Center</h3>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest">Select Collation Arrival Time</label>
                  <div className="flex gap-4">
                    <input 
                      type="time" 
                      required
                      disabled={submissions.accreditations.some(a => a.collation_arrival_time)}
                      className="flex-1 p-5 bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono text-xl font-black disabled:opacity-70"
                      value={collationArrivalTime}
                      onChange={(e) => setCollationArrivalTime(e.target.value)}
                    />
                    {!submissions.accreditations.some(a => a.collation_arrival_time) && (
                      <button 
                        type="submit"
                        disabled={submittingCollationArrival || uploading}
                        className="bg-slate-900 text-white px-8 rounded-2xl hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase tracking-widest text-xs shadow-xl transition-all"
                      >
                        {submittingCollationArrival ? '...' : 'Log'}
                      </button>
                    )}
                  </div>
                </div>
                {submissions.accreditations.some(a => a.collation_arrival_time) && (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-2 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                    <CheckCircle size={16} /> Collation Arrival Logged & Locked
                  </div>
                )}
              </form>
            </div>
          </section>

          {/* My Polling Unit Logistics Receipt (Evidence Vault style for agent) */}
          <section className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-4 border-slate-900 mt-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-2 border-slate-100 pb-6 mb-8">
              <div>
                <span className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-[8px] font-black uppercase tracking-widest">
                  Official Verification
                </span>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight font-display mt-2">
                  My Logistics Manifest
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Verified field copy of your polling unit's logged logistics milestones.
                </p>
              </div>
              
              <button
                onClick={downloadMyLogisticsPDF}
                className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs shadow-xl transition-all"
              >
                <Download size={18} /> Download Receipt PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {[
                {
                  step: "1",
                  title: "Materials Arrival",
                  val: submissions.accreditations.find(a => a.materials_arrival_time)?.materials_arrival_time,
                  type: "time"
                },
                {
                  step: "2",
                  title: "Security Officers",
                  val: submissions.accreditations.find(a => a.security_count !== null && a.security_count !== undefined)?.security_count,
                  type: "count"
                },
                {
                  step: "3",
                  title: "APOs Count",
                  val: submissions.accreditations.find(a => a.apo_count !== null && a.apo_count !== undefined)?.apo_count,
                  type: "count"
                },
                {
                  step: "4",
                  title: "PU Departure",
                  val: submissions.accreditations.find(a => a.materials_departure_time)?.materials_departure_time,
                  type: "time"
                },
                {
                  step: "5",
                  title: "Collation Arrival",
                  val: submissions.accreditations.find(a => a.collation_arrival_time)?.collation_arrival_time,
                  type: "time"
                }
              ].map((m, idx) => {
                const isLogged = m.val !== undefined && m.val !== null && m.val !== '';
                return (
                  <div 
                    key={idx}
                    className={`p-6 rounded-2xl border-2 transition-all ${
                      isLogged 
                        ? 'bg-teal-50/40 border-teal-100 text-teal-900' 
                        : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isLogged ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {m.step}
                      </span>
                      <span className={`text-[8px] font-black uppercase tracking-widest ${
                        isLogged ? 'text-teal-600' : 'text-slate-400'
                      }`}>
                        {isLogged ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">{m.title}</p>
                    <p className="text-lg font-black font-mono">
                      {isLogged 
                        ? (m.type === 'count' ? `${m.val} Staff` : m.val) 
                        : 'Awaiting'}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
