import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type RealtimeTable =
  | 'clients'
  | 'matters'
  | 'fee_notes'
  | 'documents'
  | 'messages'
  | 'notifications'
  | 'activity_logs';

export interface RealtimeChange {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

export type RealtimeChangeHandler = (change: RealtimeChange) => void;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const subscribe = (
  channelName: string,
  table: RealtimeTable,
  filter: string | undefined,
  onChange: RealtimeChangeHandler
): (() => void) => {
  const channelOpts: { event: string; schema: string; table: string; filter?: string } = {
    event: '*',
    schema: 'public',
    table
  };
  if (filter) {
    channelOpts.filter = filter;
  }

  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      channelOpts as any,
      payload => onChange(payload as unknown as RealtimeChange)
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
};

export const subscribeToFirmTable = (
  firmId: string,
  table: RealtimeTable,
  onChange: RealtimeChangeHandler
): (() => void) => {
  const filter = UUID_REGEX.test(firmId) ? `firm_id=eq.${firmId}` : undefined;
  return subscribe(`firm:${firmId}:${table}`, table, filter, onChange);
};

export const subscribeToUserNotifications = (
  userId: string,
  onChange: RealtimeChangeHandler
): (() => void) => subscribe(`user:${userId}:notifications`, 'notifications', `user_id=eq.${userId}`, onChange);