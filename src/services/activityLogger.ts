import { supabase } from './supabase';

export interface ActivityLogItem {
  id: string;
  advocateName: string;
  advocateRole?: string;
  action: string;
  actionDescription?: string;
  actionType?: ActivityLogItem['type'];
  timeAgo: string;
  timestamp: number;
  type: 'feenote' | 'approval' | 'return' | 'permission' | 'login' | 'letter' | 'vault' | 'profile' | 'settings';
  badgeColor: string;
}

export function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

const INITIAL_LOGS: ActivityLogItem[] = [
  {
    id: 'log-1',
    advocateName: 'Guyo Halake',
    advocateRole: 'Managing Partner',
    action: 'authenticated & accessed Executive Oversight Docket',
    timeAgo: 'Just now',
    timestamp: Date.now() - 2 * 60 * 1000,
    type: 'login',
    badgeColor: 'bg-blue-500'
  },
  {
    id: 'log-2',
    advocateName: 'Karani Victor',
    advocateRole: 'Senior Partner',
    action: 'calculated & approved BOC-2026-SEYANI-001 (KES 30,820,193.28)',
    timeAgo: '15 mins ago',
    timestamp: Date.now() - 15 * 60 * 1000,
    type: 'feenote',
    badgeColor: 'bg-emerald-500'
  },
  {
    id: 'log-3',
    advocateName: 'Nyagah Kithinji',
    advocateRole: 'Senior Counsel',
    action: 'filed Party & Party Bill of Costs for HCCOMM E547/2024 (KES 405,594.00)',
    timeAgo: '45 mins ago',
    timestamp: Date.now() - 45 * 60 * 1000,
    type: 'approval',
    badgeColor: 'bg-amber-500'
  },
  {
    id: 'log-4',
    advocateName: 'Razak Wako',
    advocateRole: 'Lead Developer',
    action: 'synchronized legal vault spreadsheet: 14.01.2026 - Bill of Costs - Dhanya v Sunil.xlsx',
    timeAgo: '2 hours ago',
    timestamp: Date.now() - 2 * 3600 * 1000,
    type: 'vault',
    badgeColor: 'bg-purple-500'
  },
  {
    id: 'log-5',
    advocateName: 'Karani Victor',
    advocateRole: 'Senior Partner',
    action: 'verified Schedule 6 ad valorem instruction fee calculation for Seyani v Greenhills',
    timeAgo: '3 hours ago',
    timestamp: Date.now() - 3 * 3600 * 1000,
    type: 'approval',
    badgeColor: 'bg-emerald-500'
  }
];

export const getActivityLogs = (): ActivityLogItem[] => {
  try {
    const saved = localStorage.getItem('SYSTEM_ACTIVITY_LOGS');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0 && !parsed.some(p => p.advocateName === 'Adv. Wanjiku')) {
        // Refresh timeAgo dynamically
        return parsed.map((item: ActivityLogItem) => ({
          ...item,
          timeAgo: formatTimeAgo(item.timestamp)
        }));
      }
    }
  } catch (e) { }
  localStorage.setItem('SYSTEM_ACTIVITY_LOGS', JSON.stringify(INITIAL_LOGS));
  return INITIAL_LOGS;
};

/**
 * Fetches recent audit logs from Supabase PostgreSQL public.admin_audit_logs.
 * Merges with local items to give complete cross-machine executive visibility.
 */
export const fetchRemoteActivityLogs = async (): Promise<ActivityLogItem[]> => {
  try {
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) {
      return getActivityLogs();
    }

    const remoteItems: ActivityLogItem[] = data
      .filter((row: any) => {
        const act = (row.action || row.details?.action || '').toLowerCase();
        // Filter out noisy repeated profile coordinate updates
        return !act.includes('coordinates and preferences');
      })
      .map((row: any) => {
        const details = row.details || {};
        const ts = details.timestamp || (row.created_at ? new Date(row.created_at).getTime() : Date.now());
        return {
          id: row.id || `remote-${ts}`,
          advocateName: (details.advocateName || 'Firm Member').replace(/^Adv\.?\s*/i, ''),
          advocateRole: details.advocateRole,
          action: row.action || details.action || 'filed billing ledger entry',
          actionDescription: details.actionDescription,
          actionType: details.type || 'feenote',
          timeAgo: formatTimeAgo(ts),
          timestamp: ts,
          type: details.type || 'feenote',
          badgeColor: details.badgeColor || 'bg-emerald-500'
        };
      });

    // Merge and deduplicate by action + advocateName (keep only the newest entry per distinct action)
    const local = getActivityLogs().filter(l => !l.action.includes('coordinates and preferences'));
    const combined = [...remoteItems];
    for (const l of local) {
      if (!combined.some(c => c.action === l.action && c.advocateName === l.advocateName)) {
        combined.push(l);
      }
    }
    // Deduplicate consecutive identical actions
    const deduplicated: ActivityLogItem[] = [];
    for (const item of combined) {
      const isDuplicate = deduplicated.some(d => d.action === item.action && d.advocateName === item.advocateName);
      if (!isDuplicate) {
        deduplicated.push(item);
      }
    }
    deduplicated.sort((a, b) => b.timestamp - a.timestamp);
    const trimmed = deduplicated.slice(0, 30);

    try {
      localStorage.setItem('SYSTEM_ACTIVITY_LOGS', JSON.stringify(trimmed));
    } catch (e) {}

    return trimmed;
  } catch (e) {
    console.warn('[ActivityLogger] Error fetching remote logs:', e);
    return getActivityLogs();
  }
};

/**
 * Subscribes to realtime insertions on admin_audit_logs table.
 * Returns unsubscribe function.
 */
export const subscribeToActivityLogs = (onUpdate: (logs: ActivityLogItem[]) => void) => {
  const channel = supabase
    .channel('admin_audit_logs_realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'admin_audit_logs' },
      (payload) => {
        try {
          const newRow = payload.new as any;
          if (!newRow) return;
          const details = newRow.details || {};
          const ts = details.timestamp || (newRow.created_at ? new Date(newRow.created_at).getTime() : Date.now());
          const newItem: ActivityLogItem = {
            id: newRow.id || `live-${Date.now()}`,
            advocateName: details.advocateName || 'Firm Member',
            advocateRole: details.advocateRole,
            action: newRow.action || details.action || 'System action logged',
            actionDescription: details.actionDescription,
            actionType: details.type || 'feenote',
            timeAgo: 'Just now',
            timestamp: ts,
            type: details.type || 'feenote',
            badgeColor: details.badgeColor || 'bg-emerald-500'
          };

          const current = getActivityLogs();
          const updated = [newItem, ...current.filter(c => c.id !== newItem.id)].slice(0, 50);
          try {
            localStorage.setItem('SYSTEM_ACTIVITY_LOGS', JSON.stringify(updated));
          } catch (e) {}
          window.dispatchEvent(new CustomEvent('activityLogsUpdated', { detail: updated }));
          onUpdate(updated);
        } catch (err) {
          console.error('[ActivityLogger Realtime]', err);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const logSystemActivity = (
  advocateName: string,
  arg2: string,
  arg3?: ActivityLogItem['type'] | string,
  arg4?: ActivityLogItem['type'] | string,
  arg5?: string
) => {
  let role: string | undefined = undefined;
  let action: string = arg2;
  let type: ActivityLogItem['type'] = 'feenote';
  let badgeColor = 'bg-emerald-500';

  if (typeof arg3 === 'string' && (arg4 !== undefined || arg5 !== undefined) && !arg3.startsWith('bg-')) {
    // Called with (advocateName, advocateRole, action, type, badgeColor)
    role = arg2;
    action = arg3;
    if (arg4 && ['feenote', 'approval', 'return', 'permission', 'login', 'letter', 'vault', 'profile', 'settings'].includes(arg4)) {
      type = arg4 as ActivityLogItem['type'];
    }
    if (arg5) badgeColor = arg5;
  } else {
    // Called with (advocateName, action, type/badgeColor, badgeColor)
    action = arg2;
    if (arg3) {
      if (arg3.startsWith('bg-')) {
        badgeColor = arg3;
      } else if (['feenote', 'approval', 'return', 'permission', 'login', 'letter', 'vault', 'profile', 'settings'].includes(arg3)) {
        type = arg3 as ActivityLogItem['type'];
      }
    }
    if (arg4 && typeof arg4 === 'string') {
      badgeColor = arg4;
    }
  }

  const currentLogs = getActivityLogs();
  const cleanName = (advocateName || 'User').replace(/^Adv\.?\s*/i, '');
  const nowTs = Date.now();
  const newItem: ActivityLogItem = {
    id: 'log-' + nowTs + '-' + Math.floor(Math.random() * 1000),
    advocateName: cleanName,
    advocateRole: role,
    action,
    timeAgo: 'Just now',
    timestamp: nowTs,
    type,
    badgeColor
  };
  const updated = [newItem, ...currentLogs].slice(0, 50); // Keep last 50 events
  try {
    localStorage.setItem('SYSTEM_ACTIVITY_LOGS', JSON.stringify(updated));
  } catch (e) { }
  window.dispatchEvent(new CustomEvent('activityLogsUpdated', { detail: updated }));

  // Asynchronously broadcast to Supabase PostgreSQL table public.admin_audit_logs
  // for multi-user audit trail visibility across Guyo, Karani, Nyagah, and Razak
  (async () => {
    try {
      await supabase.from('admin_audit_logs').insert([
        {
          action: action,
          details: {
            advocateName: cleanName,
            advocateRole: role,
            type: type,
            badgeColor: badgeColor,
            timestamp: nowTs
          }
        }
      ]);
    } catch (err) {
      // Non-fatal, local log is preserved
      console.warn('[ActivityLogger] Cloud audit push skipped or failed:', err);
    }
  })();

  return newItem;
};
