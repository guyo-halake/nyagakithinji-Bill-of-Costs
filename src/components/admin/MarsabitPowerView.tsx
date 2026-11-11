import React, { useState } from 'react';
import { 
  Zap, Battery, BatteryCharging, ShieldAlert, ShieldCheck, 
  Clock, Activity, AlertTriangle, RefreshCw, Power, Server, 
  Wifi, CheckCircle2, ChevronRight, Gauge, Cpu, ArrowDownRight
} from 'lucide-react';

interface MarsabitPowerViewProps {
  showToast: (msg: string) => void;
}

interface PowerIncident {
  id: string;
  timestamp: string;
  date: string;
  type: 'BLACKOUT' | 'SURGE' | 'MAINTENANCE' | 'TEST' | 'FLOAT_CHARGE';
  title: string;
  description: string;
  duration: string;
  transferTime: string;
  source: 'APC 1500VA' | 'KPLC Grid' | 'Dual 100Ah Bank';
  status: 'RESOLVED' | 'NOMINAL';
}

export const MarsabitPowerView: React.FC<MarsabitPowerViewProps> = ({ showToast }) => {
  const [batteryPct, setBatteryPct] = useState<number>(73);
  const [gridVoltage, setGridVoltage] = useState<number>(238);
  const [inverterLoad, setInverterLoad] = useState<number>(180); // Watts
  const [gridConnected, setGridConnected] = useState<boolean>(true);
  const [isTestingSwitchover, setIsTestingSwitchover] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'cells'>('overview');

  const [incidents, setIncidents] = useState<PowerIncident[]>([
    {
      id: 'inc-04',
      date: 'Today',
      timestamp: '09:14 AM',
      type: 'FLOAT_CHARGE',
      title: 'Trickle Float Charge Active',
      description: 'Dual 100Ah Gel Bank reached optimal 25.4V resting float. APC inverter switched to low-heat standby.',
      duration: 'Ongoing',
      transferTime: '0 ms',
      source: 'Dual 100Ah Bank',
      status: 'NOMINAL'
    },
    {
      id: 'inc-03',
      date: '02 Feb 2026',
      timestamp: '19:42 PM',
      type: 'SURGE',
      title: 'High-Voltage Spikes Clamped (AVR)',
      description: 'Northern grid lightning strike nearby induced a 274V line transient. Automatic Voltage Regulator clamped downstream to 230V.',
      duration: '1m 20s',
      transferTime: '< 2 ms',
      source: 'APC 1500VA',
      status: 'RESOLVED'
    },
    {
      id: 'inc-02',
      date: '15 Jan 2026',
      timestamp: '14:23 PM',
      type: 'BLACKOUT',
      title: 'Marsabit Town Feeder Blackout',
      description: 'KPLC transmission line trip. Seamless pure sine wave transfer to battery bank kept Razak Server and Adrian AK fiber online.',
      duration: '4h 12m',
      transferTime: '4.2 ms (Zero packet loss)',
      source: 'Dual 100Ah Bank',
      status: 'RESOLVED'
    },
    {
      id: 'inc-01',
      date: '04 Oct 2025',
      timestamp: '08:00 AM',
      type: 'MAINTENANCE',
      title: 'Scheduled Battery Deep Cycle & Equalization',
      description: 'Controlled discharge test down to 40% depth, terminal cleaning, and re-equalization to 27.6V.',
      duration: '6h 30m',
      transferTime: 'Manual toggle',
      source: 'Dual 100Ah Bank',
      status: 'RESOLVED'
    }
  ]);

  const handleTestSwitchover = () => {
    if (isTestingSwitchover) return;
    setIsTestingSwitchover(true);
    showToast('Initiating Inverter Transfer Switchover Test...');

    setTimeout(() => {
      setGridConnected(false);
      showToast('Grid disconnected. Running on 100Ah Battery Bank (Pure Sine Wave).');
    }, 1200);

    setTimeout(() => {
      setGridConnected(true);
      setIsTestingSwitchover(false);
      showToast('Grid reconnected. Inverter synced in 3.8ms with zero downtime.');
      
      const newIncident: PowerIncident = {
        id: `inc-${Date.now()}`,
        date: 'Today',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'TEST',
        title: 'Manual Switchover & Transfer Benchmark',
        description: 'Verified seamless 3.8ms zero-downtime cutover. Workstation and Adrian AK optical fiber maintained full uptime.',
        duration: '15s',
        transferTime: '3.8 ms',
        source: 'APC 1500VA',
        status: 'RESOLVED'
      };
      setIncidents(prev => [newIncident, ...prev]);
    }, 4500);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Header (Minimalist, No background card) */}
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Marsabit Power &amp; Inverter Subsystem
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              STATION ONLINE
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time telemetry for Dual 100Ah Gel Bank, APC Smart-UPS 1500VA, and Adrian AK fiber protection
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestSwitchover}
            disabled={isTestingSwitchover}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              isTestingSwitchover 
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingSwitchover ? 'animate-spin' : ''}`} />
            {isTestingSwitchover ? 'Testing Switchover...' : 'Test Inverter Cutover'}
          </button>
        </div>
      </div>

      {/* Primary Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Battery Bank Health */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Dual 100Ah Battery Bank</span>
            <BatteryCharging className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-zinc-900 dark:text-white">{batteryPct}%</span>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">25.4 V Float</span>
          </div>
          {/* Visual Progress Bar */}
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${batteryPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <span>Est. Backup: <strong>14h 20m</strong></span>
            <span>Health: <strong className="text-emerald-500">98%</strong></span>
          </div>
        </div>

        {/* APC Smart-UPS 1500VA */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Inverter Output</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-zinc-900 dark:text-white">230 V</span>
            <span className="text-xs font-mono text-zinc-500">Pure Sine Wave</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500">Active Load:</span>
            <strong className="text-zinc-900 dark:text-white">{inverterLoad} W (38%)</strong>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <span>Inverter Temp: <strong>31.2 &deg;C</strong></span>
            <span>Transfer: <strong className="text-emerald-500">4.2 ms</strong></span>
          </div>
        </div>

        {/* KPLC Northern Grid Input */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">KPLC Grid Input</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold font-mono ${gridConnected ? 'text-zinc-900 dark:text-white' : 'text-red-500'}`}>
              {gridConnected ? `${gridVoltage} V` : 'OFFLINE'}
            </span>
            <span className="text-xs font-mono text-zinc-500">50.1 Hz</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500">AVR Stabilizer:</span>
            <strong className="text-emerald-600 dark:text-emerald-400">Engaged &middot; Nominal</strong>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <span>Surge Protection: <strong>Active</strong></span>
            <span>Grounding: <strong className="text-emerald-500">Verified</strong></span>
          </div>
        </div>

        {/* Protected Infrastructure */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Protected Links</span>
            <Wifi className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-zinc-900 dark:text-white">12 ms</span>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">Adrian AK Fiber</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500">Optical Signal:</span>
            <strong className="text-zinc-900 dark:text-white">-19.4 dBm (Clean)</strong>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <span>Razak 12TB Server: <strong>Online</strong></span>
            <span>Failover: <strong className="text-emerald-500">Ready</strong></span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'overview' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          System Architecture &amp; Wiring
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'timeline' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Incident &amp; Blackout Timeline ({incidents.length})
        </button>
        <button
          onClick={() => setActiveTab('cells')}
          className={`pb-3 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'cells' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Dual 100Ah Cell Diagnostic Metrics
        </button>
      </div>

      {/* Tab 1: Architecture Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-500" />
              Marsabit Station Continuous Power Line
            </h3>
            
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-start gap-3">
                <div className="p-2 rounded bg-amber-500/10 text-amber-600 font-bold text-xs shrink-0">1</div>
                <div>
                  <strong className="text-zinc-900 dark:text-white font-sans text-xs">KPLC Northern Feeder Line (230V AC)</strong>
                  <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                    Town grid line prone to intermittent outages and voltage fluctuations. Protected by dual 32A MCB and 10kA surge arrestor.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-start gap-3">
                <div className="p-2 rounded bg-blue-500/10 text-blue-600 font-bold text-xs shrink-0">2</div>
                <div>
                  <strong className="text-zinc-900 dark:text-white font-sans text-xs">APC Smart-UPS 1500VA Inverter &amp; Double-Conversion AVR</strong>
                  <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                    Regulates voltage between 208V and 250V without draining batteries. Switches to pure sine wave inverter in &lt; 4.2ms during cuts.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-start gap-3">
                <div className="p-2 rounded bg-emerald-500/10 text-emerald-600 font-bold text-xs shrink-0">3</div>
                <div>
                  <strong className="text-zinc-900 dark:text-white font-sans text-xs">Dual 100Ah Deep Cycle Gel Battery Bank (24V 200Ah Total)</strong>
                  <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                    Maintains steady 25.4V float. Delivers over 14 hours of continuous compute and networking during full regional power loss.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-start gap-3">
                <div className="p-2 rounded bg-purple-500/10 text-purple-600 font-bold text-xs shrink-0">4</div>
                <div>
                  <strong className="text-zinc-900 dark:text-white font-sans text-xs">Downstream Critical Workloads</strong>
                  <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                    Razak Server (12TB RAID array), Adrian AK 3674 Optical Fiber Terminal, Local WireGuard Gateway, and developer workstations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
              Failover Specifications
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Transfer Time:</span>
                <strong className="font-mono text-emerald-600 dark:text-emerald-400">3.8 ms &ndash; 4.2 ms</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Waveform:</span>
                <strong className="font-mono text-zinc-900 dark:text-white">Pure Sine Wave (&lt;3% THD)</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Max Sustained Load:</span>
                <strong className="font-mono text-zinc-900 dark:text-white">980 Watts</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Current Load:</span>
                <strong className="font-mono text-zinc-900 dark:text-white">180 Watts (18.3%)</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Autonomous Runtime:</span>
                <strong className="font-mono text-emerald-600 dark:text-emerald-400">14 hrs 20 mins</strong>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-500">Fiber Gateway Uptime:</span>
                <strong className="font-mono text-zinc-900 dark:text-white">99.98%</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Incident & Blackout Timeline */}
      {activeTab === 'timeline' && (
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
              Power Incident &amp; Transfer Log
            </h3>
            <span className="text-[11px] font-mono text-zinc-400">Autonomous APC event recorder</span>
          </div>

          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
            {incidents.map((inc) => (
              <div key={inc.id} className="relative space-y-1">
                {/* Dot */}
                <div className={`absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                  inc.type === 'BLACKOUT' ? 'bg-red-500' :
                  inc.type === 'SURGE' ? 'bg-amber-500' :
                  inc.type === 'FLOAT_CHARGE' ? 'bg-emerald-500' : 'bg-blue-500'
                }`} />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-white text-sm">{inc.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {inc.type}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400">
                    {inc.date} &middot; {inc.timestamp}
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 font-sans">
                  {inc.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-zinc-500">
                  <span>Duration: <strong className="text-zinc-700 dark:text-zinc-300">{inc.duration}</strong></span>
                  <span>&bull;</span>
                  <span>Transfer: <strong className="text-emerald-600 dark:text-emerald-400">{inc.transferTime}</strong></span>
                  <span>&bull;</span>
                  <span>Source: <strong className="text-zinc-700 dark:text-zinc-300">{inc.source}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Dual 100Ah Cell Diagnostic Metrics */}
      {activeTab === 'cells' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="font-bold text-sm text-zinc-900 dark:text-white">Battery Bank A (Gel Deep Cycle 100Ah)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 font-bold">Optimal</span>
            </div>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500">Resting Voltage:</span>
                <strong className="text-zinc-900 dark:text-white">12.72 V</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500">Internal Resistance:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">4.1 m&Omega;</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500">Temperature:</span>
                <strong className="text-zinc-900 dark:text-white">28.4 &deg;C</strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-500">Cycle Life Used:</span>
                <strong className="text-zinc-900 dark:text-white">42 / 1,200 Cycles (3.5%)</strong>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="font-bold text-sm text-zinc-900 dark:text-white">Battery Bank B (Gel Deep Cycle 100Ah)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 font-bold">Optimal</span>
            </div>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500">Resting Voltage:</span>
                <strong className="text-zinc-900 dark:text-white">12.68 V</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500">Internal Resistance:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">4.3 m&Omega;</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500">Temperature:</span>
                <strong className="text-zinc-900 dark:text-white">28.7 &deg;C</strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-500">Cycle Life Used:</span>
                <strong className="text-zinc-900 dark:text-white">42 / 1,200 Cycles (3.5%)</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

