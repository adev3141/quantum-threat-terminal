'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { AlertTriangle, TrendingUp, ChevronDown, Menu, X, Zap, Activity, Database, Gauge, DollarSign, FileDown, CheckCircle2, Info, Droplet, Clock } from 'lucide-react';
import { LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// ============= TYPES =============
interface Hardware {
  id: string;
  company: string;
  qubitsPhysical: number;
  qubitsLogical: number;
  algorithmicQubits: number;
  gateFidelity: number;
  coherenceLimit: number;
  modality: 'Neutral Atom (Tweezer)' | 'Trapped Ion' | 'Photonic' | 'Superconducting Transmon';
  errorRate: number;
  timeToRsaCrack: string;
  lastUpdate: string;
  benchmarkDate: string;
  whitepaperCitation: string;
  threatLevel: 'critical' | 'high' | 'medium';
  isFeatured?: boolean;
}

interface Signal {
  id: string;
  title: string;
  content: string;
  threatLevel: 'critical' | 'high' | 'medium';
  timestamp: string;
  source: string;
  isSponsored?: boolean;
}

interface StockTicker {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

// ============= MOCK DATA =============
const hardwareLeaderboard: Hardware[] = [
  {
    id: '1',
    company: 'Google Quantum AI',
    qubitsPhysical: 70,
    qubitsLogical: 12,
    algorithmicQubits: 8,
    gateFidelity: 99.8,
    coherenceLimit: 120,
    modality: 'Superconducting Transmon',
    errorRate: 0.002,
    timeToRsaCrack: '4,129 years',
    lastUpdate: '2026-02-28',
    benchmarkDate: '2026-02-28',
    whitepaperCitation: 'Quantum Error Correction via Willow Architecture (2026)',
    threatLevel: 'high',
  },
  {
    id: '2',
    company: 'Atom Computing',
    qubitsPhysical: 1225,
    qubitsLogical: 15,
    algorithmicQubits: 11,
    gateFidelity: 99.95,
    coherenceLimit: 850,
    modality: 'Neutral Atom (Tweezer)',
    errorRate: 0.0018,
    timeToRsaCrack: '3,456 years',
    lastUpdate: '2026-03-02',
    benchmarkDate: '2026-03-02',
    whitepaperCitation: 'Neutral Atom Quantum Computing with 1000+ Qubits (2026)',
    threatLevel: 'high',
  },
  {
    id: '3',
    company: 'IonQ',
    qubitsPhysical: 35,
    qubitsLogical: 8,
    algorithmicQubits: 6,
    gateFidelity: 99.98,
    coherenceLimit: 2400,
    modality: 'Trapped Ion',
    errorRate: 0.0008,
    timeToRsaCrack: '7,943 years',
    lastUpdate: '2026-03-02',
    benchmarkDate: '2026-03-02',
    whitepaperCitation: 'High-Fidelity Trapped Ion Quantum Computer (2026)',
    threatLevel: 'medium',
  },
  {
    id: '4',
    company: 'IBM',
    qubitsPhysical: 433,
    qubitsLogical: 21,
    algorithmicQubits: 18,
    gateFidelity: 99.75,
    coherenceLimit: 95,
    modality: 'Superconducting Transmon',
    errorRate: 0.0015,
    timeToRsaCrack: '2,847 years',
    lastUpdate: '2026-03-04',
    benchmarkDate: '2026-03-04',
    whitepaperCitation: 'Quantum Processor Roadmap 2026 (2026)',
    threatLevel: 'high',
  },
  {
    id: '5',
    company: 'D-Wave Systems',
    qubitsPhysical: 5000,
    qubitsLogical: 2,
    algorithmicQubits: 1,
    gateFidelity: 98.5,
    coherenceLimit: 20,
    modality: 'Superconducting Transmon',
    errorRate: 0.035,
    timeToRsaCrack: 'Not applicable (adiabatic)',
    lastUpdate: '2026-03-01',
    benchmarkDate: '2026-03-01',
    whitepaperCitation: 'Quantum Annealing Architecture (2026)',
    threatLevel: 'medium',
  },
];

const signalFeed: Signal[] = [
  {
    id: '1',
    title: 'CRITICAL: Google Willow Breakthrough',
    content: 'New error correction technique achieves quantum advantage on real-world circuits. Q-Day moved forward by ~18 months.',
    threatLevel: 'critical',
    timestamp: '2025-03-04 14:32 UTC',
    source: 'Google Research',
    isSponsored: false,
  },
  {
    id: '2',
    title: 'PARTNER SPOTLIGHT: PQShield Zero-Trust PQC',
    content: 'Enterprise-grade post-quantum cryptography now deployable without infrastructure overhaul. Trusted by Global 500 companies.',
    threatLevel: 'high',
    timestamp: '2025-03-04 12:15 UTC',
    source: 'PQShield',
    isSponsored: true,
  },
  {
    id: '3',
    title: 'ALERT: Quantum Key Distribution Adoption Accelerates',
    content: 'NSA mandates QKD integration for federal communications by Q2 2026. Expect supply chain pressure on quantum hardware.',
    threatLevel: 'high',
    timestamp: '2025-03-04 11:44 UTC',
    source: 'NSA Directive',
    isSponsored: false,
  },
  {
    id: '4',
    title: 'UPDATE: NIST PQC Standards Finalized',
    content: 'NIST finalizes post-quantum cryptography standards. Migration tooling now available for enterprise deployment.',
    threatLevel: 'medium',
    timestamp: '2025-03-03 18:44 UTC',
    source: 'NIST',
    isSponsored: false,
  },
];

const stockTickers: StockTicker[] = [
  { symbol: 'IONQ', price: 8.42, change: 0.34, changePercent: 4.21 },
  { symbol: 'QBTS', price: 24.19, change: -1.08, changePercent: -4.28 },
  { symbol: 'RGTI', price: 5.67, change: 0.22, changePercent: 4.04 },
];

const threatMatrixData = [
  { category: 'Logical Qubits', value: 45, fullMark: 100 },
  { category: 'Error Correction', value: 72, fullMark: 100 },
  { category: 'Gate Speed', value: 58, fullMark: 100 },
  { category: 'Coherence Time', value: 38, fullMark: 100 },
  { category: 'Scalability', value: 62, fullMark: 100 },
  { category: 'Algorithm Maturity', value: 55, fullMark: 100 },
];

// ============= COMPONENTS =============

// Glitch Effect Component
const GlitchClock = ({ timeRemaining }: { timeRemaining: string }) => {
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative">
      <motion.div
        animate={{ opacity: glitch ? 0.5 : 1 }}
        transition={{ duration: 0.1 }}
        className="font-mono text-5xl font-bold text-cyan-400 tracking-wider"
      >
        {timeRemaining}
      </motion.div>
      {glitch && (
        <>
          <div className="absolute inset-0 font-mono text-5xl font-bold text-cyan-400 tracking-wider opacity-50 translate-x-1">
            {timeRemaining}
          </div>
          <div className="absolute inset-0 font-mono text-5xl font-bold text-amber-400 tracking-wider opacity-30 -translate-x-1">
            {timeRemaining}
          </div>
        </>
      )}
    </div>
  );
};

// Market Ticker
const MarketTicker = () => {
  return (
    <div className="flex items-center gap-6 overflow-x-auto pb-2">
      {stockTickers.map((ticker) => (
        <motion.div
          key={ticker.symbol}
          className="flex items-center gap-2 whitespace-nowrap"
          whileHover={{ scale: 1.05 }}
        >
          <span className="font-mono text-sm font-bold text-cyan-400">{ticker.symbol}</span>
          <span className="font-mono text-sm text-white">${ticker.price.toFixed(2)}</span>
          <Badge
            variant="outline"
            className={`font-mono text-xs ${
              ticker.change > 0
                ? 'border-emerald-500 text-emerald-400'
                : 'border-red-500 text-red-400'
            }`}
          >
            {ticker.change > 0 ? '+' : ''}{ticker.change.toFixed(2)} ({ticker.changePercent.toFixed(2)}%)
          </Badge>
        </motion.div>
      ))}
    </div>
  );
};

// RSA-2048 Delta Gauge Component
const RSA2048Delta = () => {
  const currentLeaderLQ = 21; // IBM's logical qubits
  const requiredLQ = 4096;
  const deltaValue = requiredLQ - currentLeaderLQ;
  const isRedAlert = deltaValue < 1500;

  return (
    <div className={`p-6 rounded-lg border-2 transition-all ${
      isRedAlert 
        ? 'border-red-500 bg-red-950 bg-opacity-30 animate-pulse' 
        : 'border-cyan-500 bg-cyan-950 bg-opacity-20'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono font-bold text-sm text-cyan-400">THE RSA-2048 DELTA</h3>
        {isRedAlert && (
          <Badge className="bg-red-600 text-red-100 border-red-500 animate-pulse">HIGH VOLATILITY</Badge>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-gray-400 font-mono mb-2">CURRENT LEADER (LQ)</p>
          <p className={`font-mono text-3xl font-bold ${isRedAlert ? 'text-red-400' : 'text-cyan-400'}`}>{currentLeaderLQ}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 font-mono mb-2">DELTA TO RSA BREACH</p>
          <p className={`font-mono text-3xl font-bold ${isRedAlert ? 'text-red-400' : 'text-cyan-400'}`}>{deltaValue.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs text-gray-400 font-mono mb-2">REQUIRED: 4,096 LQ | STATUS: {((currentLeaderLQ / requiredLQ) * 100).toFixed(2)}%</p>
        <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-cyan-900">
          <motion.div
            className={`h-full ${isRedAlert ? 'bg-red-500' : 'bg-cyan-500'}`}
            style={{ width: `${(currentLeaderLQ / requiredLQ) * 100}%` }}
            animate={{ boxShadow: isRedAlert ? ['0 0 10px rgba(239, 68, 68, 0.8)', '0 0 20px rgba(239, 68, 68, 0.8)'] : 'none' }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        </div>
      </div>

      {isRedAlert && (
        <p className="text-xs text-red-400 font-mono mt-3 italic">⚠ CRITICAL: Delta below 1,500 threshold. Immediate PQC migration required.</p>
      )}
    </div>
  );
};

// HNDL Threat Tracker Component
const HNDLTracker = () => {
  const exabytesPerDay = 4.2;
  
  return (
    <div className="p-6 rounded-lg border border-amber-700 bg-amber-950 bg-opacity-20">
      <h3 className="font-mono font-bold text-sm text-amber-400 mb-4">HNDL STATUS (HARVEST NOW, DECRYPT LATER)</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-xs text-gray-400 font-mono mb-2">ESTIMATED DAILY DATA CAPTURE</p>
          <p className="font-mono text-2xl font-bold text-amber-400">{exabytesPerDay} EB/day</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-mono">DATA FLOW VISUALIZATION</p>
          <div className="flex gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="flex-1 h-8 bg-amber-900 rounded border border-amber-700"
                animate={{ 
                  y: [0, -4, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 1.5, 
                  delay: i * 0.1,
                  repeat: Infinity 
                }}
              >
                <Droplet className="w-4 h-4 text-amber-400 mx-auto mt-2" />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-black bg-opacity-50 p-3 rounded border border-amber-800">
          <p className="text-xs text-amber-300 font-mono leading-relaxed">
            Unknown actors storing encrypted data pending cryptanalysis capability. <strong>VULNERABILITY: 100% until PQC migration complete.</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

// Source/Whitepaper Modal
const SourceModal = ({ company, benchmarkDate, whitepaperCitation }: { company: string; benchmarkDate: string; whitepaperCitation: string }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950 font-mono text-xs px-2">
          <Info className="w-3 h-3 mr-1" />
          Source
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black border-cyan-900">
        <DialogHeader>
          <DialogTitle className="font-mono text-cyan-400">{company} - Hardware Benchmark</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-400 font-mono mb-1">Last Benchmark Date</p>
            <p className="font-mono text-sm text-cyan-400">{benchmarkDate}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-mono mb-1">Whitepaper Citation</p>
            <p className="font-mono text-sm text-cyan-300 break-words">{whitepaperCitation}</p>
          </div>
          <div className="bg-cyan-950 bg-opacity-30 p-3 rounded border border-cyan-900">
            <p className="text-xs text-gray-400 font-mono">Data sourced from official company publications and peer-reviewed quantum computing benchmarks.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Audit Request Modal Form
const AuditRequestModal = ({ company }: { company: string }) => {
  const [formData, setFormData] = useState({ name: '', email: '', company: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`[v0] Audit request from ${formData.name} for ${company}`);
    setFormData({ name: '', email: '', company: '' });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-cyan-700 text-cyan-400 hover:bg-cyan-950 hover:text-cyan-300 font-mono text-xs">
          Request Audit
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black border-cyan-900">
        <DialogHeader>
          <DialogTitle className="font-mono text-cyan-400">PQC Migration Audit for {company}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Let our experts assess your cryptographic posture.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-gray-400 mb-1 block">Your Name</label>
            <Input
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-black border-cyan-900 text-white font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-gray-400 mb-1 block">Email</label>
            <Input
              type="email"
              placeholder="analyst@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-black border-cyan-900 text-white font-mono"
            />
          </div>
          <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-mono font-bold">
            Submit Request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Hardware Leaderboard
const HardwareLeaderboard = ({ data }: { data: Hardware[] }) => {
  const [sortKey, setSortKey] = useState<keyof Hardware>('qubitsLogical');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-900 text-red-300 border-red-700';
      case 'high':
        return 'bg-amber-900 text-amber-300 border-amber-700';
      default:
        return 'bg-yellow-900 text-yellow-300 border-yellow-700';
    }
  };

  const handleSort = (key: keyof Hardware) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const ColumnHeader = ({ label, tooltip, sortable, sortKeyName }: { label: string; tooltip?: string; sortable?: boolean; sortKeyName?: keyof Hardware }) => {
    const content = (
      <th
        className={`px-4 py-3 text-right font-mono font-bold text-cyan-400 ${sortable ? 'cursor-pointer hover:text-cyan-300' : ''}`}
        onClick={() => sortable && sortKeyName && handleSort(sortKeyName)}
      >
        {label} {sortable && sortKeyName && sortKey === sortKeyName && (sortAsc ? '↑' : '↓')}
      </th>
    );

    if (tooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent className="bg-black border-cyan-900 text-cyan-300 font-mono text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return content;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cyan-900 bg-black bg-opacity-50">
            <th className="px-4 py-3 text-left font-mono font-bold text-cyan-400 cursor-pointer hover:text-cyan-300" onClick={() => handleSort('company')}>
              COMPANY {sortKey === 'company' && (sortAsc ? '↑' : '↓')}
            </th>
            <ColumnHeader label="LQ (LOGICAL)" tooltip="Error-corrected units. 4,096 required for cryptographic breach." sortable sortKeyName="qubitsLogical" />
            <ColumnHeader label="#AQ (ALGORITHMIC)" tooltip="IonQ/NIST standard for usable compute power across a circuit." sortable sortKeyName="algorithmicQubits" />
            <ColumnHeader label="GATE FIDELITY (2-Q)" tooltip="Precision of entanglement gate; floor for error correction." sortable sortKeyName="gateFidelity" />
            <ColumnHeader label="COHERENCE (μs)" tooltip="Duration system maintains quantum state before decoherence." sortable sortKeyName="coherenceLimit" />
            <ColumnHeader label="MODALITY" tooltip="Physical implementation: Neutral Atom, Trapped Ion, Photonic, or Superconducting." />
            <th className="px-4 py-3 text-center font-mono font-bold text-amber-400">THREAT</th>
            <th className="px-4 py-3 text-left font-mono font-bold text-cyan-400">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((hw) => (
            <motion.tr
              key={hw.id}
              className={`border-b border-cyan-950 transition-colors text-xs ${
                hw.isFeatured ? 'border-l-4 border-l-amber-400 bg-amber-950 bg-opacity-20 hover:bg-amber-900 hover:bg-opacity-30' : 'hover:bg-cyan-950 hover:bg-opacity-20'
              }`}
              whileHover={{ x: 4 }}
            >
              <td className="px-4 py-3 font-mono font-bold text-white">
                <div className="flex items-center gap-2">
                  {hw.company}
                  {hw.isFeatured && (
                    <Badge className="bg-amber-700 text-amber-200 border-amber-600 text-xs font-mono">
                      VERIFIED PARTNER
                    </Badge>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-cyan-400 text-right">{hw.qubitsLogical}</td>
              <td className="px-4 py-3 font-mono text-cyan-400 text-right">{hw.algorithmicQubits}</td>
              <td className="px-4 py-3 font-mono text-cyan-400 text-right">{hw.gateFidelity.toFixed(2)}%</td>
              <td className="px-4 py-3 font-mono text-cyan-400 text-right">{hw.coherenceLimit.toLocaleString()}</td>
              <td className="px-4 py-3 font-mono text-white text-xs">{hw.modality}</td>
              <td className="px-4 py-3 text-center">
                <Badge className={getThreatColor(hw.threatLevel)}>
                  {hw.threatLevel.toUpperCase()}
                </Badge>
              </td>
              <td className="px-4 py-3 flex gap-1">
                <SourceModal company={hw.company} benchmarkDate={hw.benchmarkDate} whitepaperCitation={hw.whitepaperCitation} />
                <AuditRequestModal company={hw.company} />
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Signal Feed with Sponsored Cards
const SignalFeed = ({ signals }: { signals: Signal[] }) => {
  return (
    <div className="space-y-3">
      {signals.map((signal) => (
        <motion.div
          key={signal.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card
            className={`transition-colors ${
              signal.isSponsored
                ? 'border-amber-700 bg-amber-950 bg-opacity-30 hover:border-amber-600'
                : 'border-cyan-900 bg-black bg-opacity-40 hover:border-cyan-700'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-0.5">
                  {signal.threatLevel === 'critical' ? (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  ) : signal.threatLevel === 'high' ? (
                    <Zap className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Activity className="w-5 h-5 text-cyan-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-mono font-bold text-white text-sm">{signal.title}</h4>
                    {signal.isSponsored && (
                      <Badge className="bg-amber-700 text-amber-200 text-xs font-mono">SPONSORED</Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        signal.threatLevel === 'critical'
                          ? 'border-red-700 text-red-400'
                          : signal.threatLevel === 'high'
                          ? 'border-amber-700 text-amber-400'
                          : 'border-cyan-700 text-cyan-400'
                      }
                    >
                      {signal.threatLevel}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-300 mt-1">{signal.content}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="font-mono">{signal.timestamp}</span>
                      <span className="font-mono">{signal.source}</span>
                    </div>
                    {signal.isSponsored && (
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-black font-mono font-bold text-xs">
                        Learn More
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

// Thought Chain Sidebar
const ThoughtChainSidebar = ({ isOpen }: { isOpen: boolean }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-96 bg-black bg-opacity-60 border-l border-cyan-900 overflow-y-auto"
        >
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-mono font-bold text-cyan-400 text-sm mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" />
                AI ANALYST SUMMARY
              </h3>
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-cyan-900 bg-opacity-10 border-l-2 border-cyan-500 pl-3 py-2"
                >
                  <p className="text-xs text-gray-300 font-mono leading-relaxed">
                    Google's error correction breakthrough represents the most significant hardware advancement in Q1 2025. Logical qubit stability improved 40% YoY.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-amber-900 bg-opacity-10 border-l-2 border-amber-500 pl-3 py-2"
                >
                  <p className="text-xs text-gray-300 font-mono leading-relaxed">
                    Threat timeline: At current acceleration rate, quantum computers capable of breaking RSA-2048 in &lt;1 day within 4-7 years.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="bg-green-900 bg-opacity-10 border-l-2 border-emerald-500 pl-3 py-2"
                >
                  <p className="text-xs text-gray-300 font-mono leading-relaxed">
                    RECOMMENDATION: Accelerate PQC migration to critical systems. NSA mandate compliance requires 18-month implementation runway.
                  </p>
                </motion.div>
              </div>
            </div>

            <div>
              <h4 className="font-mono font-bold text-cyan-400 text-xs mb-3">CONFIDENCE METRICS</h4>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400 font-mono">Data Integrity</span>
                    <span className="text-xs text-cyan-400 font-mono">94%</span>
                  </div>
                  <div className="w-full h-1 bg-cyan-950 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 w-[94%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400 font-mono">Trend Confidence</span>
                    <span className="text-xs text-cyan-400 font-mono">87%</span>
                  </div>
                  <div className="w-full h-1 bg-cyan-950 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 w-[87%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============= MAIN PAGE =============
export default function QuantumThreatTerminal() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [timeRemaining] = useState('4y 287d');

  const handleNewsletterSignup = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`[v0] Newsletter signup: ${emailInput}`);
    setEmailInput('');
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden" style={{ color: '#ffffff' }}>
      {/* Sticky Header */}
      <motion.header
        className="sticky top-0 z-50 border-b border-cyan-900 bg-black bg-opacity-95 backdrop-blur-sm"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
      >
        <div className="max-w-full px-6 py-4">
          {/* Logo and Ticker Section */}
          <div className="flex items-center justify-between gap-8 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-cyan-400" />
                <h1 className="font-mono font-bold text-xl text-cyan-400">XQBTS.COM</h1>
              </div>
              <span className="text-xs text-gray-500 font-mono">[QUANTUM THREAT TERMINAL v0.2]</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>

          {/* Market Ticker */}
          <div className="border-t border-b border-cyan-900 py-3">
            <div className="text-xs text-gray-500 font-mono mb-2">QUANTUM STOCK TICKER</div>
            <MarketTicker />
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <ThoughtChainSidebar isOpen={sidebarOpen} />

        {/* Main Grid */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-full px-6 py-8 space-y-8">
            {/* Hero: Q-Day Countdown & RSA-2048 Delta */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8">
                  <Card className="border-cyan-800 bg-gradient-to-br from-black to-cyan-950 bg-opacity-40 h-full">
                    <CardContent className="p-8">
                      <p className="font-mono text-xs text-gray-400 mb-2 tracking-widest">
                        ESTIMATED Q-DAY COUNTDOWN
                      </p>
                      <GlitchClock timeRemaining={timeRemaining} />
                      <p className="font-mono text-xs text-gray-500 mt-3">
                        ↓ Hardware acceleration = ↓ Time to RSA-2048 breach
                      </p>
                      <div className="mt-6 pt-6 border-t border-cyan-900">
                        <Badge className="bg-red-900 text-red-300 border-red-700 mb-3 inline-block">CRITICAL</Badge>
                        <p className="text-xs text-gray-400 font-mono">Last recalculated: 2026-03-04</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="col-span-4">
                  <RSA2048Delta />
                </div>
              </div>
            </motion.section>

            {/* Data Download Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Button className="w-full bg-amber-700 hover:bg-amber-600 text-white font-mono font-bold h-12 flex items-center justify-center gap-2">
                <FileDown className="w-5 h-5" />
                <DollarSign className="w-4 h-4" />
                Download Full 2026 Industry Report (CSV/PDF)
              </Button>
            </motion.div>

            {/* Grid Layout (12 columns) */}
            <div className="grid grid-cols-12 gap-6">
              {/* Threat Matrix (6 cols) */}
              <motion.div
                className="col-span-12 lg:col-span-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-cyan-900 bg-black bg-opacity-40 h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-cyan-400 text-base">
                      <Gauge className="w-5 h-5" />
                      THREAT MATRIX RADAR
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                      Global quantum capabilities assessment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={threatMatrixData}>
                        <PolarGrid stroke="#164e63" />
                        <PolarAngleAxis dataKey="category" stroke="#888888" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis stroke="#888888" />
                        <Radar name="Threat Level" dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.3} />
                        <Tooltip contentStyle={{ backgroundColor: '#000000', border: '1px solid #22d3ee' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              {/* HNDL Tracker (6 cols) */}
              <motion.div
                className="col-span-12 lg:col-span-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="h-full">
                  <HNDLTracker />
                </div>
              </motion.div>

              {/* Hardware Leaderboard (12 cols, full width) */}
              <motion.div
                className="col-span-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-cyan-900 bg-black bg-opacity-40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-cyan-400 text-base">
                      <TrendingUp className="w-5 h-5" />
                      HARDWARE RACE LEADERBOARD
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                      Click company rows to request a PQC migration audit
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HardwareLeaderboard data={hardwareLeaderboard} />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Signal Feed (12 cols, full width) */}
              <motion.div
                className="col-span-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-cyan-900 bg-black bg-opacity-40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-cyan-400 text-base">
                      <Activity className="w-5 h-5" />
                      LIVE SIGNAL FEED
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                      Real-time quantum threat intelligence and industry breakthroughs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SignalFeed signals={signalFeed} />
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Email Capture Footer */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-cyan-700 bg-gradient-to-r from-cyan-950 to-black">
                <CardContent className="p-8">
                  <div className="max-w-2xl">
                    <h3 className="font-mono font-bold text-cyan-400 mb-2 text-lg">Join the Resistance</h3>
                    <p className="text-sm text-gray-300 mb-4">
                      Stay ahead of the quantum threat. Receive weekly deep-dives on PQC migration strategies, hardware breakthroughs, and Q-Day timeline updates.
                    </p>
                    <form onSubmit={handleNewsletterSignup} className="flex gap-3">
                      <Input
                        type="email"
                        placeholder="your-email@company.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        required
                        className="bg-black border-cyan-700 text-white font-mono placeholder:text-gray-600"
                      />
                      <Button className="bg-cyan-600 hover:bg-cyan-700 text-black font-mono font-bold px-6 whitespace-nowrap">
                        Subscribe
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}
