import React from 'react';
import { Battery, BatteryCharging, Zap } from 'lucide-react';

export const MarsabitPowerView: React.FC = () => (
  <div className="space-y-6 font-sans">
    <header className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Power status</h2>
          <p className="mt-1 text-sm text-zinc-500">Battery backup and KPLC supply</p>
        </div>
        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
          Example readings
        </span>
      </div>
    </header>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
            <Battery className="h-4 w-4 text-emerald-600" />
            Battery backup
          </div>
          <BatteryCharging className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-zinc-900 dark:text-white">78%</span>
          <span className="text-sm text-zinc-500">charge estimate</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: '78%' }} />
        </div>
        <div className="flex justify-between border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
          <span className="text-zinc-500">Battery voltage</span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">25.1 V</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Status</span>
          <span className="font-medium text-emerald-700 dark:text-emerald-400">Charging</span>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
            <Zap className="h-4 w-4 text-blue-600" />
            KPLC supply
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            On
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-zinc-900 dark:text-white">229 V</span>
          <span className="text-sm text-zinc-500">voltage estimate</span>
        </div>
        <div className="flex justify-between border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
          <span className="text-zinc-500">Frequency</span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">50 Hz</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Supply status</span>
          <span className="font-medium text-emerald-700 dark:text-emerald-400">Within range</span>
        </div>
      </section>
    </div>

    <p className="text-xs text-zinc-400">
      Example values only; this page is not connected to a battery monitor or KPLC meter.
    </p>
  </div>
);
