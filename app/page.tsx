'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertTriangle, TrendingUp, ChevronDown, Menu, X, Zap, Activity, Database, Gauge, DollarSign, FileDown, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// ============= TYPES =============
interface Hardware {
  id: string;
  company: string;
  qubitsPhysical: number;
  qubitsLogical: number;
  errorRate: number;
  timeToRsaCrack: string;
  lastUpdate: string;
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
    id: '0',
    company: 'PQShield',
    qubitsPhysical: 0,
    qubitsLogical: 0,
    errorRate: 0,
    timeToRsaCrack: 'N/A',
    lastUpdate: '2025-03-04',
    threatLevel: 'medium',
    isFeatured: true,
  },
  {
    id: '1',
    company: 'Google Quantum AI',
    qubitsPhysical: 70,
    qubitsLogical: 12,
    errorRate: 0.002,
    timeToRsaCrack: '4,129 years',
    lastUpdate: '2025-02-28',
    threatLevel: 'high',
  },
  {
    id: '2',
    company: 'Atom Computing',
    qubitsPhysical: 1225,
    qubitsLogical: 15,
    errorRate: 0.0018,
    timeToRsaCrack: '3,456 years',
    lastUpdate: '2025-03-02',
    threatLevel: 'high',
  },
  {
    id: '3',
    company: 'IonQ',
    qubitsPhysical: 35,
    qubitsLogical: 8,
    errorRate: 0.0008,
    timeToRsaCrack: '7,943 years',
    lastUpdate: '2025-03-02',
    threatLevel: 'medium',
  },
  {
    id: '4',
    company: 'IBM',
    qubitsPhysical: 433,
    qubitsLogical: 21,
    errorRate: 0.0015,
    timeToRsaCrack: '2,847 years',
    lastUpdate: '2025-03-04',
    threatLevel: 'high',
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
  const [sortKey, setSortKey] = useState<keyof Hardware>('qubitsPhysical');
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cyan-900 bg-black bg-opacity-50">
            <th
              className="px-4 py-3 text-left font-mono font-bold text-cyan-400 cursor-pointer hover:text-cyan-300"
              onClick={() => handleSort('company')}
            >
              COMPANY {sortKey === 'company' && (sortAsc ? '↑' : '↓')}
            </th>
            <th
              className="px-4 py-3 text-right font-mono font-bold text-cyan-400 cursor-pointer hover:text-cyan-300"
              onClick={() => handleSort('qubitsPhysical')}
            >
              QUBITS {sortKey === 'qubitsPhysical' && (sortAsc ? '↑' : '↓')}
            </th>
            <th
              className="px-4 py-3 text-right font-mono font-bold text-cyan-400 cursor-pointer hover:text-cyan-300"
              onClick={() => handleSort('errorRate')}
            >
              ERROR RATE {sortKey === 'errorRate' && (sortAsc ? '↑' : '↓')}
            </th>
            <th
              className="px-4 py-3 text-right font-mono font-bold text-cyan-400 cursor-pointer hover:text-cyan-300"
              onClick={() => handleSort('timeToRsaCrack')}
            >
              TIME-TO-RSA
            </th>
            <th className="px-4 py-3 text-center font-mono font-bold text-amber-400">THREAT</th>
            <th className="px-4 py-3 text-left font-mono font-bold text-cyan-400">ACTION</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((hw) => (
            <motion.tr
              key={hw.id}
              className={`border-b border-cyan-950 transition-colors ${
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
              <td className="px-4 py-3 font-mono text-cyan-400 text-right">{hw.qubitsPhysical > 0 ? hw.qubitsPhysical : '—'}</td>
              <td className="px-4 py-3 font-mono text-amber-400 text-right">
                {hw.errorRate > 0 ? `${(hw.errorRate * 100).toFixed(3)}%` : '—'}
              </td>
              <td className="px-4 py-3 font-mono text-right text-white">{hw.timeToRsaCrack}</td>
              <td className="px-4 py-3 text-center">
                <Badge className={getThreatColor(hw.threatLevel)}>
                  {hw.threatLevel.toUpperCase()}
                </Badge>
              </td>
              <td className="px-4 py-3">
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
            {/* Hero: Q-Day Countdown */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-cyan-800 bg-gradient-to-br from-black to-cyan-950 bg-opacity-40">
                <CardContent className="p-8">
                  <div className="flex items-end justify-between gap-8">
                    <div className="flex-1">
                      <p className="font-mono text-xs text-gray-400 mb-2 tracking-widest">
                        ESTIMATED Q-DAY COUNTDOWN
                      </p>
                      <GlitchClock timeRemaining={timeRemaining} />
                      <p className="font-mono text-xs text-gray-500 mt-3">
                        ↓ Hardware acceleration = ↓ Time to RSA-2048 breach
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-red-900 text-red-300 border-red-700 mb-3 inline-block">CRITICAL</Badge>
                      <p className="text-xs text-gray-400 font-mono">Last recalculated: 2025-03-04</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
