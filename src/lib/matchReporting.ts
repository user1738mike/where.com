import { supabase } from '@/integrations/supabase/client';

export interface ReportPayload {
  reporterId: string;
  reportedUserId: string;
  matchId?: string | null;
  reason: string;
  details?: Record<string, any> | string;
}

export async function submitReport(payload: ReportPayload) {
  const { reporterId, reportedUserId, matchId, reason, details } = payload;
  return supabase.from('reports').insert([
    {
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      match_id: matchId ?? null,
      reason,
      details: typeof details === 'string' ? { text: details } : details ?? {},
    },
  ]);
}

export default submitReport;
