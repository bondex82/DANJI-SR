import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-election-key-2027';

// Load Firebase applet configuration
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
} else {
  console.error('CRITICAL: firebase-applet-config.json is missing!');
}

// Initialize Firebase Admin SDK
const appAdmin = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});
import { db } from './src/db_bridge.ts';
const bucket = getStorage(appAdmin).bucket(firebaseConfig.storageBucket);

// Seed database on launch
async function seedDatabase() {
  try {
    const usersSnap = await db.collection('users').limit(1).get();
    if (usersSnap.empty) {
      console.log('Seeding initial users to Firestore...');
      const adminHash = bcrypt.hashSync('password123', 10);
      const agentHash = bcrypt.hashSync('password123', 10);
      
      await db.collection('users').doc('admin_user').set({
        name: 'Coordination Admin',
        email: 'coordination@profjerome2027.org',
        password: adminHash,
        role: 'super_admin',
        phone: '+2348001234567',
        polling_unit: 'PU-001',
        ward: 'Jalingo Ward A',
        lga: 'Jalingo',
        photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        status: 'active'
      });

      await db.collection('users').doc('agent_user_1').set({
        name: 'John Agent',
        email: 'agent1@profjerome2027.org',
        password: agentHash,
        role: 'agent',
        phone: '+2348009876543',
        polling_unit: 'Main Central Square',
        ward: 'Jalingo Mall',
        lga: 'Jalingo',
        photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        status: 'active'
      });

      await db.collection('users').doc('agent_user_2').set({
        name: 'Mary Agent',
        email: 'agent2@profjerome2027.org',
        password: agentHash,
        role: 'agent',
        phone: '+2348005554444',
        polling_unit: 'Kona Central PU',
        ward: 'Kona',
        lga: 'Jalingo',
        photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
        status: 'active'
      });
      console.log('Seeded initial users successfully');
    } else {
      // Unconditionally update existing seeded users to use the corrected @profjerome2027.org email domain
      console.log('Ensuring default users use the APGA Campaign email domain...');
      const defaultUsers = [
        { id: 'admin_user', email: 'coordination@profjerome2027.org' },
        { id: 'agent_user_1', email: 'agent1@profjerome2027.org' },
        { id: 'agent_user_2', email: 'agent2@profjerome2027.org' }
      ];
      for (const du of defaultUsers) {
        try {
          const docRef = db.collection('users').doc(du.id);
          const snap = await docRef.get();
          if (snap.exists) {
            await docRef.update({ email: du.email });
          }
        } catch (uErr) {
          console.error(`Could not auto-update email for ${du.id}:`, uErr);
        }
      }

      // Migrate the existing seeded candidate document to APGA party and rooster logo if not already set
      try {
        console.log('Checking APGA candidate migration...');
        const candidateRef = db.collection('contestants').doc('accord_candidate');
        const snap = await candidateRef.get();
        if (snap.exists) {
          const data = snap.data() || {};
          const updates: any = {};
          
          // Only update if it was unset or set to the old 'Accord' party
          if (!data.party || data.party.trim().toUpperCase() === 'ACCORD') {
            updates.party = 'APGA';
          }
          if (!data.party_logo) {
            updates.party_logo = 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&q=80&w=200';
          }
          if (!data.candidate_picture) {
            updates.candidate_picture = '/uploads/prof_jerome_portrait.jpg';
          }
          
          if (Object.keys(updates).length > 0) {
            await candidateRef.update(updates);
            console.log('Updated APGA candidate with defaults:', updates);
          }
        } else {
          await candidateRef.set({
            name: 'Prof. Jerome Nyame',
            party: 'APGA',
            party_logo: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&q=80&w=200',
            candidate_picture: '/uploads/prof_jerome_portrait.jpg'
          });
          console.log('Seeded initial APGA candidate.');
        }
      } catch (cErr) {
        console.error('Could not migrate candidate to APGA:', cErr);
      }
    }

    const contestantSnap = await db.collection('contestants').limit(1).get();
    if (contestantSnap.empty) {
      console.log('Seeding candidates...');
      await db.collection('contestants').doc('accord_candidate').set({
        name: 'Prof. Jerome Nyame',
        party: 'APGA',
        party_logo: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&q=80&w=200',
        candidate_picture: '/uploads/prof_jerome_portrait.jpg'
      });

      await db.collection('contestants').doc('pdp_candidate').set({
        name: 'Sen. Kefas Agbu',
        party: 'PDP',
        party_logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=100',
        candidate_picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
      });

      await db.collection('contestants').doc('lp_candidate').set({
        name: 'Comrade Joe Ajaero',
        party: 'LP',
        party_logo: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=100',
        candidate_picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200'
      });
      console.log('Seeded and synced all contestants successfully');
    }

    const puSnap = await db.collection('polling_units').limit(1).get();
    if (puSnap.empty) {
      console.log('Seeding initial polling units...');
      await db.collection('polling_units').doc('pu_1').set({
        name: 'Main Central Square',
        ward: 'Jalingo Mall',
        lga: 'Jalingo',
        total_registered: 1200
      });

      await db.collection('polling_units').doc('pu_2').set({
        name: 'Kona Central PU',
        ward: 'Kona',
        lga: 'Jalingo',
        total_registered: 850
      });

      await db.collection('polling_units').doc('pu_3').set({
        name: 'Mile Six Primary School',
        ward: 'Mile Six',
        lga: 'Jalingo',
        total_registered: 1540
      });

      await db.collection('polling_units').doc('pu_4').set({
        name: 'Sarki Area Square',
        ward: 'Sarki',
        lga: 'Jalingo',
        total_registered: 920
      });
      console.log('Seeded initial polling units successfully');
    }
  } catch (err) {
    console.error('Error seeding Firestore database:', err);
  }
}
seedDatabase();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
    }
  });
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Auth Middleware
  const authenticate = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      const userDoc = await db.collection('users').doc(decoded.id).get();

      if (!userDoc.exists || userDoc.data()?.status !== 'active') {
        return res.status(403).json({ error: 'Account is blocked or inactive' });
      }

      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Admin Middleware
  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };

  // Super Admin Middleware
  const isSuperAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };

  // File Upload Route (Persistent via Firestore)
  app.post('/api/upload', authenticate, upload.single('file'), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const file = req.file;
      const fileExt = path.extname(file.originalname);
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;

      // We will store the file in Firestore in a dedicated 'uploads' collection
      // Ensure the client compresses the image before uploading to keep it < 1MB
      const docRef = db.collection('uploads').doc();
      await docRef.set({
        data: file.buffer.toString('base64'),
        contentType: file.mimetype,
        filename: file.originalname,
        createdAt: new Date().toISOString()
      });

      const publicUrl = `/api/files/${docRef.id}`;
      return res.json({ url: publicUrl });

    } catch (err: any) {
      console.error('Upload route error:', err);
      
      // Fallback to local storage if Firestore size limit is exceeded
      try {
        const file = req.file;
        const fileExt = path.extname(file.originalname);
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const localFilePath = path.join(uploadDir, fileName);
        fs.writeFileSync(localFilePath, file.buffer);
        const localUrl = `/uploads/${fileName}`;
        return res.json({ url: localUrl });
      } catch (fallbackErr: any) {
        res.status(500).json({ error: 'Upload completely failed: ' + err.message });
      }
    }
  });

  // Serve uploaded files from Firestore
  app.get('/api/files/:id', async (req, res) => {
    try {
      const doc = await db.collection('uploads').doc(req.params.id).get();
      if (!doc.exists) {
        return res.status(404).send('Not found');
      }
      const data = doc.data() as any;
      const buffer = Buffer.from(data.data, 'base64');
      res.setHeader('Content-Type', data.contentType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(buffer);
    } catch (err) {
      console.error('File fetch error:', err);
      res.status(500).send('Error loading file');
    }
  });
  // Socket.IO Connection
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('join_room', (userId) => {
      socket.join(`user_${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // --- API Routes ---

  // Login
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      let usersSnap = await db.collection('users').where('email', '==', email).limit(1).get();
      
      if (usersSnap.empty && email && email.trim().toLowerCase().endsWith('@kefas2027.org')) {
        const mappedEmail = email.trim().toLowerCase().replace('@kefas2027.org', '@profjerome2027.org');
        usersSnap = await db.collection('users').where('email', '==', mappedEmail).limit(1).get();
      }
      
      if (usersSnap.empty) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const userDoc = usersSnap.docs[0];
      const user = { id: userDoc.id, ...userDoc.data() } as any;

      if (!bcrypt.compareSync(password, user.password as string)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.status === 'blocked') {
        return res.status(403).json({ error: 'Your account has been blocked. Contact administrator.' });
      }

      const token = jwt.sign({ 
        id: user.id, 
        role: user.role, 
        name: user.name, 
        polling_unit: user.polling_unit, 
        ward: user.ward, 
        lga: user.lga 
      }, JWT_SECRET, { expiresIn: '24h' });

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          name: user.name, 
          role: user.role, 
          polling_unit: user.polling_unit,
          ward: user.ward,
          lga: user.lga,
          photo_url: user.photo_url
        } 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get Current User Status
  app.get('/api/auth/me', authenticate, async (req: any, res: any) => {
    try {
      const userDoc = await db.collection('users').doc(req.user.id).get();

      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
      const user = { id: userDoc.id, ...userDoc.data() } as any;
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        polling_unit: user.polling_unit,
        ward: user.ward,
        lga: user.lga,
        photo_url: user.photo_url
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get Contestants
  app.get('/api/contestants', async (req, res) => {
    try {
      const contestantsSnap = await db.collection('contestants').get();
      const data = contestantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get All Users (Public/Dashboard)
  app.get('/api/users', async (req, res) => {
    try {
      const usersSnap = await db.collection('users').get();
      const data = usersSnap.docs.map(doc => {
        const u = doc.data();
        return {
          id: doc.id,
          name: u.name,
          email: u.email,
          role: u.role,
          phone: u.phone,
          polling_unit: u.polling_unit,
          ward: u.ward,
          lga: u.lga,
          photo_url: u.photo_url,
          status: u.status
        };
      });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get Dashboard Stats
  app.get('/api/stats', async (req, res) => {
    try {
      const [
        pusSnap,
        resultsSnap,
        accreditationsSnap,
        contestantsSnap
      ] = await Promise.all([
        db.collection('polling_units').get(),
        db.collection('results').get(),
        db.collection('accreditations').get(),
        db.collection('contestants').get()
      ]);

      const puData = pusSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const resultsData = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const accTotals = accreditationsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const contestants = contestantsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      // Approved results only for valid votes
      const validVotes = resultsData.filter((r: any) => r.status === 'approved');

      // Process reported PUs
      const reportedPUs = new Set();
      resultsData.forEach((r: any) => {
        if (r.polling_unit && r.ward && r.lga) {
          reportedPUs.add(`${r.polling_unit}|${r.ward}|${r.lga}`);
        }
      });
      
      // Process reported agents
      const reportedAgents = new Set(resultsData.map((r: any) => r.agent_id));

      // Process totals
      const totalAccredited = accTotals.reduce((sum, r) => sum + (Number(r.total_accredited) || 0), 0);
      const totalVotes = validVotes.reduce((sum, r) => sum + (Number(r.votes) || 0), 0);
      const totalInvalid = accTotals.reduce((sum, r) => sum + (Number(r.invalid_votes) || 0), 0);
      const totalRegistered = puData.reduce((sum, r) => sum + (Number(r.total_registered) || 0), 0);
      const totalActiveVoters = accTotals.reduce((sum, r) => sum + (Number(r.total_active_voters) || 0), 0);
      const totalVotesCast = accTotals.reduce((sum, r) => sum + (Number(r.total_votes_cast) || 0), 0);

      // LGAs and Wards
      const totalLgas = new Set(puData.map((r: any) => r.lga)).size;
      const reportedLgas = new Set(resultsData.map((r: any) => r.lga)).size;
      
      const totalWards = new Set(puData.map((r: any) => `${r.ward}|${r.lga}`)).size;
      const reportedWards = new Set(resultsData.map((r: any) => `${r.ward}|${r.lga}`)).size;

      // Candidate votes
      const candidateVotes = contestants.map((c: any) => ({
        ...c,
        total_votes: validVotes.filter((r: any) => r.contestant_id === c.id).reduce((sum, r) => sum + (Number(r.votes) || 0), 0)
      })).sort((a, b) => {
        if (totalVotes === 0) {
          const isAApga = a.id === 'accord_candidate' || a.party?.trim().toUpperCase() === 'APGA';
          const isBApga = b.id === 'accord_candidate' || b.party?.trim().toUpperCase() === 'APGA';
          if (isAApga && !isBApga) return -1;
          if (!isAApga && isBApga) return 1;
        }
        return b.total_votes - a.total_votes;
      });

      // Compute LGA Performance of APGA Party (accord_candidate)
      const TARABA_LGAS = [
        "Ardo Kola", "Bali", "Donga", "Gashaka", "Gassol", "Ibi", "Jalingo", 
        "Karim Lamido", "Kurmi", "Lau", "Sardauna", "Takum", "Ussa", "Wukari", "Yorro", "Zing"
      ];

      const lgaPerformance = TARABA_LGAS.map(lga => {
        const puInLga = puData.filter((pu: any) => pu.lga?.trim().toLowerCase() === lga.trim().toLowerCase());
        const totalRegisteredInLga = puInLga.reduce((sum, pu) => sum + (Number(pu.total_registered) || 0), 0);
        const totalPusInLga = puInLga.length;

        const validVotesInLga = validVotes.filter((r: any) => r.lga?.trim().toLowerCase() === lga.trim().toLowerCase());
        const accordVotesInLga = validVotesInLga
          .filter((r: any) => r.contestant_id === 'accord_candidate')
          .reduce((sum, r) => sum + (Number(r.votes) || 0), 0);
        
        const totalValidVotesInLga = validVotesInLga.reduce((sum, r) => sum + (Number(r.votes) || 0), 0);
        const reportedPusInLga = new Set(
          validVotesInLga.map((r: any) => `${r.polling_unit}|${r.ward}`)
        ).size;

        const percentage = totalValidVotesInLga > 0 
          ? (accordVotesInLga / totalValidVotesInLga) * 100 
          : 0;

        // Determine if APGA is winning or trailing, and calculate complete ranking of all contestants
        const contestantsRanking = contestants.map((c: any) => {
          const votes = validVotesInLga
            .filter((r: any) => r.contestant_id === c.id)
            .reduce((sum, r) => sum + (Number(r.votes) || 0), 0);
          const pct = totalValidVotesInLga > 0 ? (votes / totalValidVotesInLga) * 100 : 0;
          return {
            id: c.id,
            name: c.name,
            party: c.party,
            color: c.color || '#94a3b8',
            votes,
            percentage: pct
          };
        }).sort((a, b) => {
          if (totalValidVotesInLga === 0) {
            const isAApga = a.id === 'accord_candidate' || a.party?.trim().toUpperCase() === 'APGA';
            const isBApga = b.id === 'accord_candidate' || b.party?.trim().toUpperCase() === 'APGA';
            if (isAApga && !isBApga) return -1;
            if (!isAApga && isBApga) return 1;
          }
          return b.votes - a.votes;
        });

        const leadingCandidateId = contestantsRanking[0]?.id || '';
        const maxVotes = contestantsRanking[0]?.votes || 0;

        const isWinning = maxVotes > 0 && leadingCandidateId === 'accord_candidate';
        const isTrailing = maxVotes > 0 && leadingCandidateId !== 'accord_candidate';

        return {
          lga,
          accordVotes: accordVotesInLga,
          totalValidVotes: totalValidVotesInLga,
          percentage,
          totalRegistered: totalRegisteredInLga,
          totalPus: totalPusInLga,
          reportedPus: reportedPusInLga,
          isWinning,
          isTrailing,
          contestantsRanking
        };
      });

      res.json({
        totalPu: puData.length || 0,
        reportedPu: reportedPUs.size,
        reportedAgents: reportedAgents.size,
        totalAccredited,
        totalVotes,
        totalInvalid,
        totalRegistered,
        totalActiveVoters,
        totalVotesCast,
        totalLgas,
        reportedLgas,
        totalWards,
        reportedWards,
        candidateVotes,
        lgaPerformance
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get All Evidence (Admin)
  app.get('/api/admin/evidence', authenticate, isAdmin, async (req, res) => {
    try {
      const [
        resultsSnap,
        accSnap,
        contestantsSnap,
        usersSnap
      ] = await Promise.all([
        db.collection('results').get(),
        db.collection('accreditations').get(),
        db.collection('contestants').get(),
        db.collection('users').get()
      ]);

      const contestants = contestantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const resEvidence = resultsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }) as any)
        .filter(r => r.evidence_url)
        .map(r => {
          const contestant: any = contestants.find(c => c.id === r.contestant_id);
          const user: any = users.find(u => u.id === r.agent_id);
          return {
            ...r,
            type: 'Result Sheet',
            agent_name: user?.name,
            candidate: contestant?.name,
            party: contestant?.party
          };
        });

      const accEvidence = accSnap.docs
        .map(d => ({ id: d.id, ...d.data() }) as any)
        .filter(r => r.evidence_url)
        .map(r => {
          const user: any = users.find(u => u.id === r.agent_id);
          return {
            ...r,
            type: 'Accreditation/Final Sheet',
            agent_name: user?.name
          };
        });

      const combined = [...resEvidence, ...accEvidence].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      res.json(combined);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Get Detailed Polling Unit Reports (Admin)
  app.get('/api/admin/reports/units', authenticate, isAdmin, async (req, res) => {
    try {
      const [accSnap, usersSnap] = await Promise.all([
        db.collection('accreditations').get(),
        db.collection('users').get()
      ]);

      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const reports = accSnap.docs.map(doc => {
        const r = doc.data() as any;
        const user: any = users.find(u => u.id === r.agent_id);
        return {
          id: doc.id,
          ...r,
          agent_name: user?.name,
          reported_at: r.created_at
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/reports/unit-details/:pu/:ward/:lga', authenticate, isAdmin, async (req: any, res: any) => {
    const { pu, ward, lga } = req.params;
    try {
      const resultsSnap = await db.collection('results')
        .where('polling_unit', '==', pu)
        .where('ward', '==', ward)
        .where('lga', '==', lga)
        .where('status', '==', 'approved')
        .get();

      const contestantsSnap = await db.collection('contestants').get();
      const contestants = contestantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const data = resultsSnap.docs.map(doc => {
        const r = doc.data() as any;
        const contestant: any = contestants.find(c => c.id === r.contestant_id);
        return {
          id: doc.id,
          ...r,
          contestants: contestant ? { name: contestant.name, party: contestant.party } : null
        };
      });
      
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get Detailed Unit Stats
  app.get('/api/units/stats', async (req, res) => {
    try {
      const [
        puSnap,
        accSnap,
        resSnap,
        usersSnap
      ] = await Promise.all([
        db.collection('polling_units').get(),
        db.collection('accreditations').get(),
        db.collection('results').where('status', '==', 'approved').get(),
        db.collection('users').where('role', '==', 'agent').get()
      ]);

      const puData = puSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const accData = accSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const resData = resSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const userData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      const unitMap = new Map();

      puData.forEach(pu => {
        const key = `${pu.name}|${pu.ward}|${pu.lga}`.trim();
        unitMap.set(key, {
          name: pu.name,
          ward: pu.ward,
          lga: pu.lga,
          total_registered: pu.total_registered || 0,
          agent_name: userData.find(u => u.polling_unit === pu.name && u.ward === pu.ward && u.lga === pu.lga)?.name || null,
          accredited: 0,
          active_voters: 0,
          votes_cast: 0,
          invalid: 0,
          valid: 0,
          evidence_url: null,
          reported: 0,
          materials_arrival_time: null,
          security_count: null,
          materials_departure_time: null,
          collation_arrival_time: null,
          apo_count: null,
          agent_presence_picture: null,
          agent_presence_time: null,
          created_at: null
        });
      });

      accData.forEach(acc => {
        const key = `${acc.polling_unit}|${acc.ward}|${acc.lga}`.trim();
        if (!unitMap.has(key)) {
          unitMap.set(key, {
            name: acc.polling_unit,
            ward: acc.ward,
            lga: acc.lga,
            total_registered: 0,
            agent_name: userData.find(u => u.polling_unit === acc.polling_unit && u.ward === acc.ward && u.lga === acc.lga)?.name || null,
            accredited: 0,
            active_voters: 0,
            votes_cast: 0,
            invalid: 0,
            valid: 0,
            evidence_url: null,
            reported: 1,
            materials_arrival_time: null,
            security_count: null,
            materials_departure_time: null,
            collation_arrival_time: null,
            apo_count: null,
            agent_presence_picture: null,
            agent_presence_time: null,
            created_at: null
          });
        }
        const unit = unitMap.get(key);
        unit.accredited += acc.total_accredited || 0;
        unit.active_voters += acc.total_active_voters || 0;
        unit.votes_cast += acc.total_votes_cast || 0;
        unit.invalid += acc.invalid_votes || 0;
        unit.evidence_url = acc.evidence_url || unit.evidence_url;
        unit.reported = 1;
        if (acc.materials_arrival_time) {
          unit.materials_arrival_time = acc.materials_arrival_time;
        }
        if (acc.security_count !== undefined && acc.security_count !== null) {
          unit.security_count = acc.security_count;
        }
        if (acc.materials_departure_time) {
          unit.materials_departure_time = acc.materials_departure_time;
        }
        if (acc.collation_arrival_time) {
          unit.collation_arrival_time = acc.collation_arrival_time;
        }
        if (acc.apo_count !== undefined && acc.apo_count !== null) {
          unit.apo_count = acc.apo_count;
        }
        if (acc.agent_presence_picture) {
          unit.agent_presence_picture = acc.agent_presence_picture;
        }
        if (acc.agent_presence_time) {
          unit.agent_presence_time = acc.agent_presence_time;
        }
        if (acc.created_at) {
          unit.created_at = acc.created_at;
        }
      });

      resData.forEach(r => {
        const key = `${r.polling_unit}|${r.ward}|${r.lga}`.trim();
        if (!unitMap.has(key)) {
          unitMap.set(key, {
            name: r.polling_unit,
            ward: r.ward,
            lga: r.lga,
            total_registered: 0,
            agent_name: userData.find(u => u.polling_unit === r.polling_unit && u.ward === r.ward && u.lga === r.lga)?.name || null,
            accredited: 0,
            active_voters: 0,
            votes_cast: 0,
            invalid: 0,
            valid: 0,
            evidence_url: null,
            reported: 1
          });
        }
        const unit = unitMap.get(key);
        unit.valid += r.votes || 0;
        unit.reported = 1;
      });

      const units = Array.from(unitMap.values()).sort((a, b) => {
        if (a.lga !== b.lga) return a.lga.localeCompare(b.lga);
        if (a.ward !== b.ward) return a.ward.localeCompare(b.ward);
        return a.name.localeCompare(b.name);
      });

      res.json(units);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Admin API ---

  app.get('/api/admin/units', authenticate, isAdmin, async (req, res) => {
    try {
      const snap = await db.collection('polling_units').get();
      const units = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => {
        if (a.lga !== b.lga) return a.lga.localeCompare(b.lga);
        if (a.ward !== b.ward) return a.ward.localeCompare(b.ward);
        return a.name.localeCompare(b.name);
      });
      res.json(units);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/units', authenticate, isAdmin, async (req, res) => {
    const { name, ward, lga, total_registered } = req.body;
    try {
      await db.collection('polling_units').add({ 
        name, 
        ward, 
        lga, 
        total_registered: Number(total_registered) 
      });
      io.emit('stats_updated');
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/admin/units/bulk', authenticate, isAdmin, async (req, res) => {
    const { units } = req.body;
    try {
      const batch = db.batch();
      units.forEach((u: any) => {
        const ref = db.collection('polling_units').doc();
        batch.set(ref, {
          name: u.name,
          ward: u.ward,
          lga: u.lga,
          total_registered: Number(u.total_registered)
        });
      });
      await batch.commit();

      io.emit('stats_updated');
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/admin/units/:id', authenticate, isAdmin, async (req, res) => {
    const { name, ward, lga, total_registered } = req.body;
    try {
      await db.collection('polling_units').doc(req.params.id).update({
        name,
        ward,
        lga,
        total_registered: Number(total_registered)
      });
      io.emit('stats_updated');
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/units/:id', authenticate, isAdmin, async (req, res) => {
    try {
      await db.collection('polling_units').doc(req.params.id).delete();
      io.emit('stats_updated');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
    try {
      const usersSnap = await db.collection('users').get();
      const users = usersSnap.docs.map(doc => {
        const u = doc.data();
        return {
          id: doc.id,
          name: u.name,
          email: u.email,
          role: u.role,
          phone: u.phone,
          polling_unit: u.polling_unit,
          ward: u.ward,
          lga: u.lga,
          photo_url: u.photo_url,
          status: u.status
        };
      });
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get specific agent submissions - ONLY Admin can view
  app.get('/api/admin/users/:id/submissions', authenticate, isAdmin, async (req: any, res: any) => {
    try {
      const agentId = req.params.id;
      const [resultsSnap, accSnap, incidentsSnap] = await Promise.all([
        db.collection('results').where('agent_id', '==', agentId).get(),
        db.collection('accreditations').where('agent_id', '==', agentId).get(),
        db.collection('incidents').where('agent_id', '==', agentId).get()
      ]);

      const results = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const accreditations = accSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const incidents = incidentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.json({ results, accreditations, incidents });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/users', authenticate, isAdmin, async (req, res) => {
    const { name, email, password, role, phone, polling_unit, ward, lga, photo_url } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    try {
      await db.collection('users').add({
        name,
        email,
        password: hash,
        role,
        phone,
        polling_unit,
        ward,
        lga,
        photo_url,
        status: 'active'
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/admin/users/:id', authenticate, isAdmin, async (req, res) => {
    const { name, email, password, role, phone, polling_unit, ward, lga, photo_url } = req.body;
    const updateData: any = { name, email, role, phone, polling_unit, ward, lga, photo_url };
    if (password) updateData.password = bcrypt.hashSync(password, 10);
    
    try {
      await db.collection('users').doc(req.params.id).update(updateData);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/admin/users/:id/status', authenticate, isAdmin, async (req, res) => {
    const { status } = req.body;
    try {
      await db.collection('users').doc(req.params.id).update({ status });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/users/:id', authenticate, isAdmin, async (req, res) => {
    try {
      await db.collection('users').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Broadcast Message (Admin)
  app.post('/api/admin/broadcast', authenticate, isAdmin, async (req, res) => {
    const { message, target_user_id, target_user_ids } = req.body;
    
    try {
      if (target_user_ids && Array.isArray(target_user_ids)) {
        const batch = db.batch();
        target_user_ids.forEach(id => {
          const docRef = db.collection('broadcasts').doc();
          batch.set(docRef, {
            message,
            target_user_id: id,
            created_at: new Date().toISOString()
          });
        });
        await batch.commit();

        target_user_ids.forEach(id => {
          io.to(`user_${id}`).emit('broadcast_alert', { message });
        });
      } else {
        const finalTargetId = (target_user_id === null || target_user_id === undefined || target_user_id === 'all') ? null : target_user_id;
        
        await db.collection('broadcasts').add({
          message,
          target_user_id: finalTargetId,
          created_at: new Date().toISOString()
        });

        if (finalTargetId !== null) {
          io.to(`user_${finalTargetId}`).emit('broadcast_alert', { message });
        } else {
          io.emit('broadcast_alert', { message });
        }
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/contestants', authenticate, isAdmin, async (req, res) => {
    const { name, party, party_logo, candidate_picture } = req.body;
    try {
      await db.collection('contestants').add({
        name,
        party,
        party_logo,
        candidate_picture
      });
      io.emit('stats_updated');
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/admin/contestants/:id', authenticate, isAdmin, async (req, res) => {
    const { name, party, party_logo, candidate_picture } = req.body;
    try {
      await db.collection('contestants').doc(req.params.id).update({
        name,
        party,
        party_logo,
        candidate_picture
      });
      io.emit('stats_updated');
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/contestants/:id', authenticate, isAdmin, async (req, res) => {
    try {
      await db.collection('contestants').doc(req.params.id).delete();
      io.emit('stats_updated');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reset Submissions Route - Admin or Super Admin can delete transmitted data (results, accreditations, incidents)
  app.post('/api/admin/reset-submissions', authenticate, isAdmin, async (req, res) => {
    try {
      console.log('Administrator requested a complete reset of all transmitted submissions (results, accreditations, incidents)...');
      
      const collectionsToReset = ['results', 'accreditations', 'incidents'];
      
      for (const colName of collectionsToReset) {
        const snap = await db.collection(colName).get();
        await Promise.all(snap.docs.map(doc => db.collection(colName).doc(doc.id).delete()));
        console.log(`Successfully cleared all documents in '${colName}'`);
      }
      
      io.emit('stats_updated');
      res.json({ success: true, message: 'All transmitted data (results, accreditations, incidents) has been successfully reset.' });
    } catch (err: any) {
      console.error('Error resetting submissions:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Reset SPECIFIC agent submissions Route - Admin or Super Admin can delete a specific agent's transmitted data
  app.post('/api/admin/reset-agent-submissions/:agentId', authenticate, isAdmin, async (req, res) => {
    try {
      const { agentId } = req.params;
      console.log(`Administrator requested reset of submissions for agent with ID: ${agentId}`);
      
      const collectionsToReset = ['results', 'accreditations', 'incidents'];
      let deletedCount = 0;
      
      for (const colName of collectionsToReset) {
        const snap = await db.collection(colName).where('agent_id', '==', agentId).get();
        await Promise.all(snap.docs.map(doc => db.collection(colName).doc(doc.id).delete()));
        deletedCount += snap.docs.length;
        console.log(`Successfully cleared ${snap.docs.length} documents in '${colName}' for agent ${agentId}`);
      }
      
      io.emit('stats_updated');
      res.json({ 
        success: true, 
        message: `Successfully reset submissions for this agent. ${deletedCount} records deleted. The agent's portal has been unlocked and they can now re-enter data.` 
      });
    } catch (err: any) {
      console.error('Error resetting agent submissions:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a specific individual submission document (result, accreditation, or incident) - Admin or Super Admin
  app.post('/api/admin/delete-single-submission', authenticate, isAdmin, async (req, res) => {
    try {
      const { collection, id } = req.body;
      if (!['results', 'accreditations', 'incidents'].includes(collection)) {
        return res.status(400).json({ error: 'Invalid collection type' });
      }
      
      console.log(`Superadmin requested deletion of single document ${id} from collection '${collection}'`);
      
      const docRef = db.collection(collection).doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: 'Submission not found' });
      }
      
      await docRef.delete();
      io.emit('stats_updated');
      res.json({ success: true, message: 'Submission successfully deleted.' });
    } catch (err: any) {
      console.error('Error deleting single submission:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Agent API ---

  app.get('/api/agent/submissions', authenticate, async (req: any, res: any) => {
    try {
      const [resultsSnap, accSnap, incidentsSnap] = await Promise.all([
        db.collection('results').where('agent_id', '==', req.user.id).get(),
        db.collection('accreditations').where('agent_id', '==', req.user.id).get(),
        db.collection('incidents').where('agent_id', '==', req.user.id).get()
      ]);

      const results = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const accreditations = accSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const incidents = incidentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.json({ results, accreditations, incidents });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get Broadcasts for Agent
  app.get('/api/agent/broadcasts', authenticate, async (req: any, res: any) => {
    try {
      const snap = await db.collection('broadcasts').get();
      const broadcasts = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as any)
        .filter(b => b.target_user_id === null || b.target_user_id === req.user.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      res.json(broadcasts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/results', authenticate, async (req: any, res: any) => {
    const { contestant_id, votes, evidence_url } = req.body;
    try {
      const agentDoc = await db.collection('users').doc(req.user.id).get();
      if (!agentDoc.exists) return res.status(404).json({ error: 'Agent profile not found' });
      const agent = agentDoc.data() as any;

      await db.collection('results').add({ 
        polling_unit: agent.polling_unit || '', 
        ward: agent.ward || '', 
        lga: agent.lga || '', 
        contestant_id, 
        votes: Number(votes), 
        agent_id: req.user.id,
        status: 'pending',
        evidence_url: evidence_url || null,
        created_at: new Date().toISOString()
      });

      io.emit('new_result_pending', {
        polling_unit: agent.polling_unit,
        agent_name: req.user.name,
        agent_photo: agent.photo_url || null,
        ward: agent.ward
      });
      io.emit('stats_updated');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/results/pending', authenticate, async (req: any, res: any) => {
    try {
      const resultsSnap = await db.collection('results').where('status', '==', 'pending').get();
      const contestantsSnap = await db.collection('contestants').get();
      const usersSnap = await db.collection('users').get();

      const contestants = contestantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const mapped = resultsSnap.docs.map(doc => {
        const r = doc.data() as any;
        const contestant: any = contestants.find(c => c.id === r.contestant_id);
        const user: any = users.find(u => u.id === r.agent_id);
        return {
          id: doc.id,
          ...r,
          candidate_name: contestant?.name,
          party: contestant?.party,
          agent_name: user?.name
        };
      });
      
      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/results/:id/status', authenticate, isAdmin, async (req, res) => {
    const { status } = req.body;
    try {
      await db.collection('results').doc(req.params.id).update({ status });
      io.emit('stats_updated');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/accreditations', authenticate, async (req: any, res: any) => {
    const { 
      total_accredited, 
      total_active_voters, 
      total_votes_cast, 
      invalid_votes, 
      evidence_url,
      materials_arrival_time,
      security_count,
      materials_departure_time,
      collation_arrival_time,
      apo_count,
      agent_presence_picture,
      agent_presence_time
    } = req.body;
    try {
      const agentDoc = await db.collection('users').doc(req.user.id).get();
      if (!agentDoc.exists) return res.status(404).json({ error: 'Agent profile not found' });
      const agent = agentDoc.data() as any;

      await db.collection('accreditations').add({ 
        polling_unit: agent.polling_unit || '', 
        ward: agent.ward || '', 
        lga: agent.lga || '', 
        total_accredited: Number(total_accredited) || 0, 
        total_active_voters: Number(total_active_voters) || 0, 
        total_votes_cast: Number(total_votes_cast) || 0, 
        invalid_votes: Number(invalid_votes) || 0, 
        agent_id: req.user.id,
        evidence_url: evidence_url || null,
        materials_arrival_time: materials_arrival_time || null,
        security_count: security_count !== undefined && security_count !== null ? Number(security_count) : null,
        materials_departure_time: materials_departure_time || null,
        collation_arrival_time: collation_arrival_time || null,
        apo_count: apo_count !== undefined && apo_count !== null ? Number(apo_count) : null,
        agent_presence_picture: agent_presence_picture || null,
        agent_presence_time: agent_presence_time || null,
        created_at: new Date().toISOString()
      });

      io.emit('stats_updated');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Incident Reporting ---
  app.post('/api/incidents', authenticate, async (req: any, res: any) => {
    const { description, is_quick_alert, evidence_url } = req.body;
    try {
      const agentDoc = await db.collection('users').doc(req.user.id).get();
      if (!agentDoc.exists) return res.status(404).json({ error: 'Agent profile not found' });
      const agent = agentDoc.data() as any;

      await db.collection('incidents').add({ 
        polling_unit: agent.polling_unit || '', 
        ward: agent.ward || '', 
        lga: agent.lga || '', 
        agent_id: req.user.id,
        description,
        is_quick_alert: !!is_quick_alert,
        evidence_url: evidence_url || null,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      
      io.emit('incident_alert', {
        polling_unit: agent.polling_unit,
        ward: agent.ward,
        agent_name: req.user.name,
        agent_photo: agent.photo_url || null,
        description,
        is_quick_alert: !!is_quick_alert,
        evidence_url: evidence_url || null
      });
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/incidents', authenticate, isAdmin, async (req, res) => {
    try {
      const [incidentsSnap, usersSnap] = await Promise.all([
        db.collection('incidents').get(),
        db.collection('users').get()
      ]);
      
      const incidents = incidentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const mapped = incidents.map((i: any) => {
        const agent: any = users.find(u => u.id === i.agent_id);
        return {
          ...i,
          agent_name: agent?.name || 'Field Personnel',
          agent_photo: agent?.photo_url || null
        };
      }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      res.json(mapped);
    } catch (err: any) {
      console.error('Incident Fetch Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/incidents/:id/status', authenticate, isAdmin, async (req: any, res: any) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      await db.collection('incidents').doc(id).update({ status });
      io.emit('incident_updated');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist', 'client');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
