import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, ShieldCheck, ArrowLeft, Bell, X, User, AlertTriangle, Search, FileText,
  Map, Percent, TrendingUp, MapPin, Info, ArrowRight, Award, CheckCircle2
} from 'lucide-react';

export default function LiveResults({ socket }: { socket: any }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPu: 0,
    reportedPu: 0,
    totalAccredited: 0,
    totalVotes: 0,
    totalInvalid: 0,
    totalRegistered: 0,
    totalActiveVoters: 0,
    totalVotesCast: 0,
    totalWards: 0,
    reportedWards: 0,
    candidateVotes: [] as any[],
    lgaPerformance: [] as any[]
  });
  const [unitStats, setUnitStats] = useState<any[]>([]);
  const [unitFilter, setUnitFilter] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedLga, setSelectedLga] = useState<string | null>(null);
  const [lgaSearch, setLgaSearch] = useState('');
  const [mapSortBy, setMapSortBy] = useState<'votes' | 'percentage' | 'alphabetical'>('percentage');

  const fetchStats = async () => {
    try {
      const [statsRes, unitsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/units/stats')
      ]);
      
      if (!statsRes.ok) throw new Error('Failed to fetch stats');
      if (!unitsRes.ok) throw new Error('Failed to fetch unit stats');
      
      const statsData = await statsRes.json();
      const unitsData = await unitsRes.json();
      
      setStats(statsData);
      setUnitStats(unitsData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch data in LiveResults', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    socket.on('stats_updated', fetchStats);
    socket.on('new_result_pending', (data: any) => {
      fetchStats();
      const newNotif = { 
        id: Date.now(), 
        type: 'report',
        message: `New result from ${data.agent_name}`,
        agent_name: data.agent_name,
        agent_photo: data.agent_photo,
        ward: data.ward,
        polling_unit: data.polling_unit
      };
      setNotifications(prev => [newNotif, ...prev]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
      }, 6000);
    });

    socket.on('incident_alert', (data: any) => {
      const newNotif = { 
        id: Date.now(), 
        type: 'incident',
        message: data.description,
        agent_name: data.agent_name,
        agent_photo: data.agent_photo,
        ward: data.ward,
        polling_unit: data.polling_unit
      };
      setNotifications(prev => [newNotif, ...prev]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
      }, 10000);
    });
    const interval = setInterval(fetchStats, 30000); // Auto refresh every 30s

    return () => {
      socket.off('stats_updated');
      socket.off('new_result_pending');
      clearInterval(interval);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full mb-8"
        />
        <h2 className="text-2xl font-black uppercase tracking-[0.3em] animate-pulse">Synchronizing Live Data</h2>
      </div>
    );
  }

  const winner = stats.candidateVotes[0];
  const runnerUp = stats.candidateVotes[1];
  const apgaCandidate = stats.candidateVotes?.find((c: any) => 
    c.party?.trim().toUpperCase() === 'APGA' || 
    c.id === 'accord_candidate'
  );

  const filteredUnits = unitStats.filter(unit => {
    const q = unitFilter.toLowerCase();
    return (
      (unit.name || '').toLowerCase().includes(q) ||
      (unit.lga || '').toLowerCase().includes(q) ||
      (unit.ward || '').toLowerCase().includes(q) ||
      (unit.agent_name || '').toLowerCase().includes(q)
    );
  });

  const LGA_MAP_DATA = [
    { id: 'ardo_kola', name: 'Ardo Kola', points: '220,160 300,140 310,210 320,260 250,260 210,210', textX: 270, textY: 200 },
    { id: 'bali', name: 'Bali', points: '210,330 250,260 320,260 370,210 430,270 410,380 320,400 240,390', textX: 330, textY: 330 },
    { id: 'donga', name: 'Donga', points: '240,390 320,400 320,480 270,490 220,460', textX: 270, textY: 440 },
    { id: 'gashaka', name: 'Gashaka', points: '430,270 520,300 550,420 480,440 410,380', textX: 470, textY: 360 },
    { id: 'gassol', name: 'Gassol', points: '110,190 160,200 210,210 250,260 210,330 140,320 100,260', textX: 170, textY: 260 },
    { id: 'ibi', name: 'Ibi', points: '50,330 140,320 150,390 90,410 40,380', textX: 95, textY: 360 },
    { id: 'jalingo', name: 'Jalingo', points: '300,140 360,150 370,210 310,210', textX: 335, textY: 175 },
    { id: 'karim_lamido', name: 'Karim Lamido', points: '80,140 180,110 220,160 160,200 110,190', textX: 150, textY: 155 },
    { id: 'kurmi', name: 'Kurmi', points: '320,400 410,380 430,470 380,510 320,480', textX: 370, textY: 450 },
    { id: 'lau', name: 'Lau', points: '180,110 280,90 300,140 220,160', textX: 235, textY: 125 },
    { id: 'sardauna', name: 'Sardauna', points: '480,440 550,420 540,540 460,530 430,470', textX: 490, textY: 490 },
    { id: 'takum', name: 'Takum', points: '140,480 220,460 270,490 240,550 160,540', textX: 200, textY: 510 },
    { id: 'ussa', name: 'Ussa', points: '80,460 140,480 160,540 100,550', textX: 120, textY: 515 },
    { id: 'wukari', name: 'Wukari', points: '90,410 150,390 240,390 230,470 140,480 80,460', textX: 160, textY: 440 },
    { id: 'yorro', name: 'Yorro', points: '360,150 420,140 490,160 450,220 370,210', textX: 420, textY: 180 },
    { id: 'zing', name: 'Zing', points: '410,70 510,90 490,160 420,140', textX: 460, textY: 115 }
  ];

  const filteredLgas = (stats.lgaPerformance || []).filter((item: any) =>
    item.lga.toLowerCase().includes(lgaSearch.toLowerCase())
  );

  const sortedLgas = [...filteredLgas].sort((a: any, b: any) => {
    if (mapSortBy === 'votes') return b.accordVotes - a.accordVotes;
    if (mapSortBy === 'percentage') return b.percentage - a.percentage;
    return a.lga.localeCompare(b.lga);
  });

  const activeLgaName = selectedLga || (stats.lgaPerformance?.[0]?.lga || 'Jalingo');
  const currentLgaData = stats.lgaPerformance?.find(
    (item: any) => item.lga.toLowerCase() === activeLgaName.toLowerCase()
  ) || stats.lgaPerformance?.[0];

  const currentStatus = !currentLgaData || currentLgaData.totalValidVotes === 0
    ? 'AWAITING'
    : currentLgaData.isWinning
      ? 'WINNING'
      : 'TRAILING';

  const badgeClass = currentStatus === 'WINNING'
    ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400'
    : currentStatus === 'TRAILING'
      ? 'bg-rose-500/15 border-rose-500/25 text-rose-400'
      : 'bg-slate-500/15 border-slate-500/25 text-slate-400';

  const progressBg = currentStatus === 'WINNING'
    ? 'from-emerald-600 to-emerald-400'
    : currentStatus === 'TRAILING'
      ? 'from-rose-600 to-rose-400'
      : 'from-slate-600 to-slate-400';

  const shareTextColor = currentStatus === 'WINNING'
    ? 'text-emerald-400'
    : currentStatus === 'TRAILING'
      ? 'text-rose-400'
      : 'text-slate-400';

  return (
    <div className="min-h-screen bg-[#05080a] text-white font-sans selection:bg-emerald-500 selection:text-white flex flex-col relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] -mr-96 -mt-96"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] -ml-64 -mb-64"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      {/* Real-time Notifications */}
      <div className="fixed top-24 right-4 md:right-6 z-50 space-y-3 w-[calc(100%-2rem)] md:w-80">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div 
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`bg-white border-l-4 shadow-2xl p-4 rounded-r-xl flex items-start gap-3 ${n.type === 'incident' ? 'border-rose-600' : 'border-emerald-500'}`}
            >
              <div className={`w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden border ${n.type === 'incident' ? 'bg-rose-50 border-rose-100' : 'bg-slate-100 border-slate-200'}`}>
                {n.agent_photo ? (
                  <img src={n.agent_photo} alt={n.agent_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${n.type === 'incident' ? 'text-rose-400' : 'text-slate-400'}`}>
                    <User size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 flex items-center gap-1 ${n.type === 'incident' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {n.type === 'incident' ? (
                    <>
                      <AlertTriangle size={10} className="animate-pulse" />
                      CRITICAL INCIDENT
                    </>
                  ) : 'Live Report'}
                </p>
                <p className="text-sm font-bold text-slate-900 truncate">{n.agent_name}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate">Ward: {n.ward}</p>
                {n.type === 'incident' && (
                  <p className="text-[9px] text-rose-500 font-bold mt-1 line-clamp-2 italic">"{n.message}"</p>
                )}
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
                className="text-slate-300 hover:text-slate-500"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="relative z-10 p-4 md:p-5 max-w-[1400px] mx-auto w-full flex-1 flex flex-col space-y-3">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group w-fit"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Dashboard</span>
          </button>

          <header className="flex flex-col xl:flex-row justify-between items-center gap-8 border-b border-white/10 pb-6">
            <div className="flex items-center gap-5 w-full xl:w-auto">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] shrink-0">
                <ShieldCheck size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase font-display leading-none">
                  DANJI SS 2027 <span className="text-emerald-500">Live Results</span>
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-2 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Live Collation</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Update: {lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="w-full xl:w-auto grid grid-cols-2 sm:grid-cols-3 xl:flex xl:justify-start gap-4 md:gap-6 bg-white/5 backdrop-blur-2xl p-5 md:p-6 rounded-[2rem] border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.3)]">
              <div className="text-center xl:min-w-[100px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Registered</p>
                <p className="text-2xl md:text-3xl xl:text-4xl font-black text-white font-display tracking-tighter leading-none">{stats.totalRegistered.toLocaleString()}</p>
              </div>
              <div className="hidden xl:block w-px h-10 md:h-12 bg-white/20 self-center"></div>
              <div className="text-center xl:min-w-[100px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Accredited</p>
                <p className="text-2xl md:text-3xl xl:text-4xl font-black text-blue-400 font-display tracking-tighter leading-none">{stats.totalAccredited.toLocaleString()}</p>
              </div>
              <div className="hidden xl:block w-px h-10 md:h-12 bg-white/20 self-center"></div>
              <div className="text-center xl:min-w-[100px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Votes Cast</p>
                <p className="text-2xl md:text-3xl xl:text-4xl font-black text-amber-400 font-display tracking-tighter leading-none">{stats.totalVotesCast.toLocaleString()}</p>
              </div>
              <div className="hidden xl:block w-px h-10 md:h-12 bg-white/20 self-center"></div>
              <div className="text-center xl:min-w-[100px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Votes Polled</p>
                <p className="text-2xl md:text-3xl xl:text-4xl font-black text-white font-display tracking-tighter leading-none">{stats.totalVotes.toLocaleString()}</p>
              </div>
              <div className="hidden xl:block w-px h-10 md:h-12 bg-white/20 self-center"></div>
              <div className="text-center xl:min-w-[100px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Invalid</p>
                <p className="text-2xl md:text-3xl xl:text-4xl font-black text-rose-500 font-display tracking-tighter leading-none">{stats.totalInvalid.toLocaleString()}</p>
              </div>
              <div className="hidden xl:block w-px h-10 md:h-12 bg-white/20 self-center"></div>
              <div className="text-center xl:min-w-[100px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Progress</p>
                <p className="text-2xl md:text-3xl xl:text-4xl font-black text-emerald-400 font-display tracking-tighter leading-none">
                  {Math.round((stats.reportedWards / stats.totalWards) * 100) || 0}%
                </p>
              </div>
            </div>
          </header>
        </div>

        {/* Top 3 Podium Section */}
        <div className="flex-1 flex flex-col justify-center min-h-0 py-8 lg:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end max-w-lg lg:max-w-none mx-auto w-full">
            {/* 2nd Place (Shown on left on Desktop, 2nd on Mobile) */}
            {runnerUp && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/5 backdrop-blur-xl p-5 rounded-[2rem] border border-white/10 relative group hover:bg-white/10 transition-all duration-500 order-2 lg:order-1"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-400 text-slate-950 px-3 py-1 rounded-full font-black uppercase tracking-widest text-[8px] shadow-lg">
                  2nd Position
                </div>
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-xl group-hover:scale-105 transition-transform duration-500">
                    {runnerUp.candidate_picture ? (
                      <img src={runnerUp.candidate_picture} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 font-black text-2xl">{runnerUp.name.charAt(0)}</div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter font-display">{runnerUp.name}</h3>
                    <div className="flex items-center justify-center gap-2 mt-0.5">
                      <div className="w-5 h-5 rounded bg-white/10 p-1">
                        {runnerUp.party_logo && <img src={runnerUp.party_logo} className="w-full h-full object-contain" referrerPolicy="no-referrer" />}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{runnerUp.party}</span>
                    </div>
                  </div>
                  <div className="w-full pt-3 border-t border-white/10">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Total Votes</p>
                    <p className="text-3xl font-black text-white font-mono tracking-tighter">{runnerUp.total_votes.toLocaleString()}</p>
                    <p className="text-emerald-500 font-black text-[10px] mt-0.5">
                      {stats.totalVotes > 0 ? ((runnerUp.total_votes / stats.totalVotes) * 100).toFixed(1) : '0.0'}% Share
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Winner (1st Place) (Center on Desktop, 1st on Mobile) */}
            {winner && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 backdrop-blur-2xl p-6 rounded-[2.5rem] border-2 border-emerald-500/30 relative group shadow-[0_0_60px_rgba(16,185,129,0.05)] order-1 lg:order-2"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-2 rounded-full font-black uppercase tracking-[0.2em] text-[9px] shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-2">
                  <Trophy size={14} /> Leading
                </div>
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-28 h-28 rounded-[2rem] bg-emerald-900/20 border-4 border-emerald-500/50 overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.15)] group-hover:scale-105 transition-transform duration-700">
                    {winner.candidate_picture ? (
                      <img src={winner.candidate_picture} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-emerald-500 font-black text-4xl">{winner.name.charAt(0)}</div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter font-display text-emerald-400">{winner.name}</h3>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <div className="w-6 h-6 rounded-lg bg-white/10 p-1 border border-white/10">
                        {winner.party_logo && <img src={winner.party_logo} className="w-full h-full object-contain" referrerPolicy="no-referrer" />}
                      </div>
                      <span className="text-sm font-black text-white uppercase tracking-[0.2em]">{winner.party}</span>
                    </div>
                  </div>
                  <div className="w-full pt-3 border-t border-emerald-500/20">
                    <p className="text-[7px] font-black text-emerald-500/60 uppercase tracking-widest mb-0.5">Total Votes Polled</p>
                    <p className="text-5xl font-black text-white font-mono tracking-tighter leading-none">{winner.total_votes.toLocaleString()}</p>
                    <div className="mt-2 flex items-center justify-center gap-3">
                      <div className="px-2 py-0.5 bg-emerald-500 text-white rounded-lg font-black text-sm">
                        {stats.totalVotes > 0 ? ((winner.total_votes / stats.totalVotes) * 100).toFixed(1) : '0.0'}%
                      </div>
                      <div className="text-left">
                        <p className="text-[6px] font-black text-slate-500 uppercase tracking-widest">Lead Margin</p>
                        <p className="text-sm font-black text-emerald-400 font-mono">
                          +{stats.candidateVotes.length > 1 ? (winner.total_votes - stats.candidateVotes[1].total_votes).toLocaleString() : '0'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3rd Place (Right on Desktop, 3rd on Mobile) */}
            {stats.candidateVotes[2] && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 backdrop-blur-xl p-5 rounded-[2rem] border border-white/10 relative group hover:bg-white/10 transition-all duration-500 order-3 lg:order-3"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-800 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest text-[8px] shadow-lg">
                  3rd Position
                </div>
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-amber-900/30 overflow-hidden shadow-xl group-hover:scale-105 transition-transform duration-500">
                    {stats.candidateVotes[2].candidate_picture ? (
                      <img src={stats.candidateVotes[2].candidate_picture} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 font-black text-2xl">{stats.candidateVotes[2].name.charAt(0)}</div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter font-display">{stats.candidateVotes[2].name}</h3>
                    <div className="flex items-center justify-center gap-2 mt-0.5">
                      <div className="w-5 h-5 rounded bg-white/10 p-1">
                        {stats.candidateVotes[2].party_logo && <img src={stats.candidateVotes[2].party_logo} className="w-full h-full object-contain" referrerPolicy="no-referrer" />}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stats.candidateVotes[2].party}</span>
                    </div>
                  </div>
                  <div className="w-full pt-3 border-t border-white/10">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Total Votes</p>
                    <p className="text-3xl font-black text-white font-mono tracking-tighter">{stats.candidateVotes[2].total_votes.toLocaleString()}</p>
                    <p className="text-amber-600 font-black text-[10px] mt-0.5">
                      {stats.totalVotes > 0 ? ((stats.candidateVotes[2].total_votes / stats.totalVotes) * 100).toFixed(1) : '0.0'}% Share
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Complete Standings Section (Accommodates all contestants) */}
        {stats.candidateVotes && stats.candidateVotes.length > 0 && (
          <div className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-6 md:p-8 mt-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                  <TrendingUp size={20} />
                </div>
                <div className="text-left">
                  <h3 className="font-black text-lg uppercase tracking-wider font-display text-white">Statewide Leaderboard</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Complete standings of all {stats.candidateVotes.length} contestants</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {stats.candidateVotes.map((candidate, index) => {
                const isWinner = index === 0;
                const isRunnerUp = index === 1;
                const isThird = index === 2;
                
                // Style based on rank
                const rankColor = isWinner 
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                  : isRunnerUp 
                    ? 'text-slate-300 bg-slate-400/10 border-slate-400/20' 
                    : isThird 
                      ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' 
                      : 'text-slate-400 bg-white/5 border-white/10';

                const pctShare = stats.totalVotes > 0 ? (candidate.total_votes / stats.totalVotes) * 100 : 0;
                const progressColor = candidate.color || '#10b981';

                return (
                  <div 
                    key={candidate.id}
                    className="relative overflow-hidden p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between gap-4 bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04] group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank */}
                        <div className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center border shrink-0 ${rankColor}`}>
                          #{index + 1}
                        </div>
                        {/* Candidate Photo / Initials */}
                        <div className="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 overflow-hidden shrink-0 relative group-hover:scale-105 transition-transform duration-300">
                          {candidate.candidate_picture ? (
                            <img src={candidate.candidate_picture} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={candidate.name} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 font-black text-sm">
                              {candidate.name ? candidate.name.charAt(0) : '?'}
                            </div>
                          )}
                        </div>
                        {/* Candidate Name & Party */}
                        <div className="text-left min-w-0">
                          <p className="text-xs font-black text-white truncate max-w-[120px] group-hover:text-emerald-400 transition-colors">
                            {candidate.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {candidate.party_logo && (
                              <img src={candidate.party_logo} className="w-3 h-3 object-contain" referrerPolicy="no-referrer" alt="" />
                            )}
                            <span 
                              className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border"
                              style={{ 
                                backgroundColor: `${candidate.color || '#94a3b8'}10`, 
                                color: candidate.color || '#94a3b8',
                                borderColor: `${candidate.color || '#94a3b8'}20`
                              }}
                            >
                              {candidate.party}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-black font-mono text-white">
                          {candidate.total_votes.toLocaleString()}
                        </p>
                        <p className="text-[10px] font-black font-mono text-slate-400 mt-0.5">
                          {pctShare.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar inside Card */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(pctShare, 100)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: progressColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Taraba State Map & APGA Party Performance Dashboard */}
        <div className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl mt-12 mb-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-950/40 to-slate-900/40 p-6 md:p-8 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                <Map size={24} />
              </div>
              <div className="text-left">
                <h2 className="font-black text-xl uppercase tracking-widest font-display text-white">Taraba State Geopolitical Map</h2>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">APGA Party Performance & Vote Share Across All 16 LGAs</p>
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="flex items-center gap-4 bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-2.5">
              <div className="text-left border-r border-white/10 pr-4">
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">APGA Leaderboard</p>
                <p className="text-lg font-black text-emerald-400 font-mono">
                  {stats.lgaPerformance?.length > 0 
                    ? [...stats.lgaPerformance].sort((a,b)=>b.percentage - a.percentage)[0]?.lga 
                    : 'N/A'}
                </p>
              </div>
              <div className="text-left">
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Statewide Support</p>
                <p className="text-lg font-black text-white font-mono">
                  {stats.totalVotes > 0 
                    ? `${((stats.candidateVotes.find(c => c.party?.trim().toUpperCase() === 'APGA')?.total_votes || 0) / stats.totalVotes * 100).toFixed(1)}%` 
                    : '0.0%'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-0 md:divide-x md:divide-white/10">
            {/* Left Column: Interactive Vector Map (Col-span-12 lg:col-span-7) */}
            <div className="col-span-12 lg:col-span-7 p-6 md:p-8 flex flex-col items-center justify-center relative bg-slate-950/25">
              <div className="absolute top-4 left-6 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Interactive Map View</span>
              </div>
              <div className="absolute top-4 right-6 flex flex-col items-end gap-1.5">
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em]">Map Legend</p>
                <div className="flex flex-wrap items-center gap-3 bg-[#0c1217]/90 border border-white/10 px-3 py-2 rounded-2xl text-[9px] font-black uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-emerald-400">Winning</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    <span className="text-rose-400">Trailing</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                    <span className="text-slate-400">Awaiting</span>
                  </div>
                </div>
              </div>

              {/* Vector SVG Stage */}
              <div className="relative w-full aspect-square max-w-[660px] flex items-center justify-center p-3 rounded-[2rem] mt-6 bg-slate-950/40 border border-white/5 shadow-inner">
                <svg viewBox="0 0 600 600" className="w-full h-full max-h-[660px] select-none">
                  <defs>
                    <filter id="glow-selected-green" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#10b981" floodOpacity="0.5" />
                    </filter>
                    <filter id="glow-selected-red" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#ef4444" floodOpacity="0.5" />
                    </filter>
                    <filter id="glow-selected-neutral" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#94a3b8" floodOpacity="0.4" />
                    </filter>
                    <filter id="glow-unselected" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
                    </filter>
                  </defs>

                  {/* LGA Polygons */}
                  <g>
                    {LGA_MAP_DATA.map((item) => {
                      const perf = stats.lgaPerformance?.find(
                        (p: any) => p.lga.trim().toLowerCase() === item.name.trim().toLowerCase()
                      );
                      const isSelected = activeLgaName.trim().toLowerCase() === item.name.trim().toLowerCase();

                      // Dynamic color calculation for Winning (Green), Trailing (Red), or Awaiting (Slate/Gray)
                      let fillStyle = 'rgba(47, 55, 69, 0.15)'; // neutral/awaiting default
                      let strokeColor = 'rgba(255, 255, 255, 0.15)';
                      let filterStyle = 'url(#glow-unselected)';

                      if (perf && perf.totalValidVotes > 0) {
                        if (perf.isWinning) {
                          fillStyle = isSelected ? 'rgba(16, 185, 129, 0.85)' : 'rgba(16, 185, 129, 0.45)';
                          strokeColor = isSelected ? '#34d399' : 'rgba(52, 211, 153, 0.35)';
                          filterStyle = isSelected ? 'url(#glow-selected-green)' : 'url(#glow-unselected)';
                        } else if (perf.isTrailing) {
                          fillStyle = isSelected ? 'rgba(239, 68, 68, 0.85)' : 'rgba(239, 68, 68, 0.45)';
                          strokeColor = isSelected ? '#f87171' : 'rgba(248, 113, 113, 0.35)';
                          filterStyle = isSelected ? 'url(#glow-selected-red)' : 'url(#glow-unselected)';
                        } else {
                          // Tie or neutral
                          fillStyle = isSelected ? 'rgba(245, 158, 11, 0.85)' : 'rgba(245, 158, 11, 0.45)';
                          strokeColor = isSelected ? '#fbbf24' : 'rgba(251, 191, 36, 0.35)';
                          filterStyle = isSelected ? 'url(#glow-selected-neutral)' : 'url(#glow-unselected)';
                        }
                      } else {
                        // Awaiting votes
                        if (isSelected) {
                          fillStyle = 'rgba(148, 163, 184, 0.25)';
                          strokeColor = '#cbd5e1';
                          filterStyle = 'url(#glow-selected-neutral)';
                        }
                      }

                      return (
                        <g key={item.id} className="group">
                          <polygon
                            points={item.points}
                            className="transition-all duration-300 cursor-pointer focus:outline-none"
                            style={{
                              fill: fillStyle,
                              stroke: strokeColor,
                              strokeWidth: isSelected ? '3.5' : '1.5',
                              filter: filterStyle,
                              strokeLinejoin: 'round'
                            }}
                            onClick={() => setSelectedLga(item.name)}
                          />
                          {/* Inner Shadow Glow Pattern on Hover */}
                          <polygon
                            points={item.points}
                            className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 fill-white/[0.04] stroke-white/40 stroke-[1.5]"
                            style={{ strokeLinejoin: 'round' }}
                          />
                        </g>
                      );
                    })}
                  </g>

                  {/* LGA Labels & Stat Percentages with Enhanced Sizing & Color Coding */}
                  {LGA_MAP_DATA.map((item) => {
                    const perf = stats.lgaPerformance?.find(
                      (p: any) => p.lga.trim().toLowerCase() === item.name.trim().toLowerCase()
                    );
                    const isSelected = activeLgaName.trim().toLowerCase() === item.name.trim().toLowerCase();

                    let nameColor = 'fill-slate-100';
                    let rateColor = 'fill-slate-400';

                    if (perf && perf.totalValidVotes > 0) {
                      if (perf.isWinning) {
                        nameColor = isSelected ? 'fill-emerald-200' : 'fill-emerald-300/90';
                        rateColor = 'fill-emerald-400';
                      } else if (perf.isTrailing) {
                        nameColor = isSelected ? 'fill-rose-200' : 'fill-rose-300/90';
                        rateColor = 'fill-rose-400';
                      } else {
                        nameColor = isSelected ? 'fill-amber-200' : 'fill-amber-300/90';
                        rateColor = 'fill-amber-400';
                      }
                    } else if (isSelected) {
                      nameColor = 'fill-white';
                      rateColor = 'fill-slate-300';
                    }

                    return (
                      <g key={`${item.id}-labels`} className="pointer-events-none">
                        {/* LGA Name */}
                        <text
                          x={item.textX}
                          y={item.textY - 3}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className={`font-sans font-black tracking-wider pointer-events-none select-none transition-all duration-300 ${
                            isSelected ? 'text-[12px]' : 'text-[10px]'
                          } ${nameColor}`}
                          style={{
                            textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.95)'
                          }}
                        >
                          {item.name === 'Karim Lamido' ? 'Karim L.' : item.name}
                        </text>

                        {/* APGA Percentage */}
                        <text
                          x={item.textX}
                          y={item.textY + 11}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className={`font-mono pointer-events-none select-none transition-all duration-300 ${
                            isSelected ? 'font-extrabold text-[11px]' : 'font-bold text-[9px]'
                          } ${rateColor}`}
                          style={{
                            textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.95)'
                          }}
                        >
                          {perf && perf.totalValidVotes > 0 ? `${perf.percentage.toFixed(1)}%` : '0.0%'}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Map Footer Prompt */}
              <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-white/[0.02] border border-white/5 rounded-full px-4 py-1.5">
                <Info size={12} className="text-emerald-400" />
                Click any region on the map to inspect detail analytics
              </div>
            </div>

            {/* Right Column: Detailed Analytics & Leaderboard (Col-span-12 lg:col-span-5) */}
            <div className="col-span-12 lg:col-span-5 flex flex-col h-full bg-white/[0.01]">
              {/* Selected LGA Detail Block with dynamic color theme based on winning/trailing */}
              <div className="p-6 md:p-8 border-b border-white/10 bg-gradient-to-br from-slate-950/40 to-slate-900/20">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={`px-2.5 py-1 border rounded-md text-[8px] font-black uppercase tracking-widest ${badgeClass}`}>
                      {currentStatus}
                    </span>
                    <h3 className="text-2xl font-black font-display text-white mt-1.5 tracking-tight uppercase">
                      {currentLgaData ? currentLgaData.lga : activeLgaName}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">APGA Share</p>
                    <p className={`text-3xl font-black font-mono mt-0.5 ${shareTextColor}`}>
                      {currentLgaData && currentLgaData.totalValidVotes > 0 
                        ? `${currentLgaData.percentage.toFixed(1)}%` 
                        : '0.0%'}
                    </p>
                  </div>
                </div>

                {/* Progress bar visual */}
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 mb-6 relative">
                  <motion.div
                    key={currentLgaData?.lga}
                    initial={{ width: 0 }}
                    animate={{ width: currentLgaData ? `${Math.min(currentLgaData.percentage, 100)}%` : '0%' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full bg-gradient-to-r rounded-full ${progressBg}`}
                  />
                </div>

                {/* Grid of details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">APGA Votes</p>
                    <p className="text-lg font-black text-white font-mono mt-0.5">
                      {currentLgaData ? currentLgaData.accordVotes.toLocaleString() : '0'}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Total Valid Votes</p>
                    <p className="text-lg font-black text-white font-mono mt-0.5">
                      {currentLgaData ? currentLgaData.totalValidVotes.toLocaleString() : '0'}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">PUs Reported</p>
                    <p className="text-lg font-black text-white font-mono mt-0.5">
                      {currentLgaData ? `${currentLgaData.reportedPus} / ${currentLgaData.totalPus}` : '0 / 0'}
                    </p>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-1.5">
                      <div 
                        className="bg-sky-400 h-full rounded-full" 
                        style={{ width: currentLgaData && currentLgaData.totalPus > 0 ? `${(currentLgaData.reportedPus / currentLgaData.totalPus) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Registered Voters</p>
                    <p className="text-lg font-black text-white font-mono mt-0.5">
                      {currentLgaData ? currentLgaData.totalRegistered.toLocaleString() : '0'}
                    </p>
                  </div>
                </div>

                {/* Rankings of all contestants in this LGA */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-emerald-400" />
                    Contestant Standings in {currentLgaData?.lga || activeLgaName}
                  </h4>
                  <div className="space-y-2">
                    {currentLgaData && currentLgaData.contestantsRanking && currentLgaData.contestantsRanking.length > 0 ? (
                      currentLgaData.contestantsRanking.map((contestant: any, index: number) => {
                        const isApga = contestant.id === 'accord_candidate';
                        return (
                          <div 
                            key={contestant.id} 
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                              isApga 
                                ? 'bg-emerald-500/10 border-emerald-500/25 shadow-sm shadow-emerald-500/5' 
                                : 'bg-white/[0.02] border-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-[10px] font-black text-slate-500 w-4">
                                #{index + 1}
                              </span>
                              {/* Party badge */}
                              <div 
                                className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-center min-w-[50px]"
                                style={{ 
                                  backgroundColor: `${contestant.color}15`, 
                                  color: contestant.color,
                                  borderColor: `${contestant.color}30`,
                                  borderWidth: '1px'
                                }}
                              >
                                {contestant.party}
                              </div>
                              <div className="text-left">
                                <p className={`text-xs font-black tracking-wide ${isApga ? 'text-emerald-400' : 'text-slate-200'}`}>
                                  {contestant.name}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-xs font-black font-mono text-white">
                                {contestant.votes.toLocaleString()}{' '}
                                <span className="text-[9px] text-slate-400 font-sans font-medium">votes</span>
                              </p>
                              <p className="text-[10px] font-bold font-mono text-slate-400 mt-0.5">
                                {contestant.percentage.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 bg-white/[0.02] border border-dashed border-white/10 rounded-xl">
                        <p className="text-[10px] text-slate-500 italic font-bold uppercase tracking-wider">Awaiting Results for this LGA</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Leaderboard Section */}
              <div className="p-6 md:p-8 flex flex-col flex-1">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-300 flex items-center gap-2">
                    <Award size={14} className="text-emerald-400" />
                    LGA Leaderboard
                  </h4>

                  {/* Filter and sorting UI */}
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <div className="relative flex-1 sm:w-40">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                      <input
                        type="text"
                        placeholder="Search LGA..."
                        className="w-full pl-8 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 text-[10px] text-white placeholder:text-slate-500"
                        value={lgaSearch}
                        onChange={(e) => setLgaSearch(e.target.value)}
                      />
                    </div>
                    <select
                      className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-[10px] text-slate-300 font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                      value={mapSortBy}
                      onChange={(e) => setMapSortBy(e.target.value as any)}
                    >
                      <option value="percentage" className="bg-slate-900">Sort by Support %</option>
                      <option value="votes" className="bg-slate-900">Sort by Votes</option>
                      <option value="alphabetical" className="bg-slate-900">Alphabetical</option>
                    </select>
                  </div>
                </div>

                {/* Scrollable Leaderboard List */}
                <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-1 space-y-2">
                  {sortedLgas.length > 0 ? (
                    sortedLgas.map((item: any, idx: number) => {
                      const isSelected = activeLgaName.trim().toLowerCase() === item.lga.trim().toLowerCase();

                      const rank = stats.lgaPerformance 
                        ? [...stats.lgaPerformance].sort((a: any, b: any) => b.percentage - a.percentage).findIndex(l => l.lga === item.lga) + 1 
                        : idx + 1;

                      const rowStatus = item.totalValidVotes === 0 
                        ? 'AWAITING' 
                        : item.isWinning 
                          ? 'WINNING' 
                          : 'TRAILING';

                      const rowBadgeClass = rowStatus === 'WINNING'
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : rowStatus === 'TRAILING'
                          ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                          : 'text-slate-400 bg-slate-500/10 border-slate-500/20';

                      return (
                        <div
                          key={item.lga}
                          onClick={() => setSelectedLga(item.lga)}
                          className={`group cursor-pointer p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 ${
                            isSelected
                              ? 'bg-white/[0.04] border-white/20 shadow-md shadow-black/40'
                              : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center border shrink-0 ${
                              isSelected 
                                ? 'bg-white/10 text-white border-white/20' 
                                : 'bg-white/5 text-slate-400 border-white/10'
                            }`}>
                              {rank}
                            </div>
                            <div className="text-left">
                              <p className={`font-black font-display text-xs tracking-wide uppercase ${
                                isSelected ? 'text-emerald-300' : 'text-white'
                              }`}>
                                {item.lga}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">
                                  {item.reportedPus}/{item.totalPus} PUs
                                </p>
                                <span className={`px-1.5 py-0.5 rounded border text-[7px] font-black tracking-widest ${rowBadgeClass}`}>
                                  {rowStatus}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-white font-mono">
                              {item.accordVotes.toLocaleString()} <span className="text-[10px] font-bold text-slate-400 font-sans">votes</span>
                            </p>
                            <div className="flex items-center gap-1.5 justify-end mt-0.5">
                              <span className="text-[10px] font-black font-mono text-emerald-400">
                                {item.percentage.toFixed(1)}%
                              </span>
                              <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-400 rounded-full" 
                                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-slate-500 italic text-xs font-bold uppercase tracking-widest py-12">
                      No local governments found matching query
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10 pt-4 pb-2 text-center">
          <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.5em]">
            Powered by DANJI SS 2027 Campaign Organization
          </p>
        </footer>
      </div>
    </div>
  );
}
