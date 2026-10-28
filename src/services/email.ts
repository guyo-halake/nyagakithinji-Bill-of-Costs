import { supabase, getActiveFirmProfile } from './supabase';
import { getSavedEmailTemplates, renderTemplateText } from './emailTemplates';

export type EmailCategory = 'firm_to_client' | 'lawyer_to_client' | 'internal' | 'developer_admin';

export interface EmailAttachmentInput {
  filename: string;
  content: string; // Base64 data or raw string
  contentType?: string;
}

export async function sendEmail(input: {
  to: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  category: EmailCategory;
  replyTo?: string;
  senderName?: string;
  attachments?: EmailAttachmentInput[];
}) {
  let accessToken: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    accessToken = data?.session?.access_token || null;
  } catch (e) { }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch('/api/v1/email/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...input,
        html_body: input.htmlBody,
        reply_to: input.replyTo,
        sender_name: input.senderName || getActiveFirmProfile().name,
        attachments: input.attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
          content_type: a.contentType || 'application/pdf'
        }))
      }),
    });


    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const detail = err.detail || err.message || `SMTP Error (${response.status}): Email delivery failed`;
      throw new Error(detail);
    }

    const result = await response.json().catch(() => ({ sent: true }));
    return result;
  } catch (fetchError: any) {
    console.warn('Backend email route error:', fetchError);
    throw fetchError;
  }
}

export async function sendWelcomeUserEmail(payload: {
  email: string;
  personalEmail?: string;
  username: string;
  fullName?: string;
  roleName?: string;
  allowSelfPassword: boolean;
  temporaryPassword?: string;
  portalUrl?: string;
  broadcastDevs?: boolean;
}) {
  let accessToken: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    accessToken = data?.session?.access_token || null;
  } catch (e) { }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Load custom template if user edited it
  const allTemplates = getSavedEmailTemplates();
  const welcomeTpl = allTemplates.find(t => t.id === 'welcome_user');
  let customSubject: string | undefined;
  let customHtml: string | undefined;
  let customText: string | undefined;

  if (welcomeTpl) {
    const vars: Record<string, string> = {
      fullName: payload.fullName || payload.username,
      username: payload.username.replace(/^@/, ''),
      email: payload.email,
      toEmail: payload.email,
      workEmail: payload.email,
      roleName: payload.roleName || 'Advocate',
      roleTitle: payload.roleName || 'Advocate',
      portalUrl: payload.portalUrl || window.location.origin,
      temporaryPassword: payload.temporaryPassword || 'Nyagah@2026',
      password: payload.temporaryPassword || 'Nyagah@2026'
    };
    customSubject = renderTemplateText(welcomeTpl.subject, vars);
    customHtml = renderTemplateText(welcomeTpl.htmlContent, vars);
    customText = renderTemplateText(welcomeTpl.plainText, vars);
  }

  const response = await fetch('/api/v1/email/welcome-user', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: payload.email,
      personal_email: payload.personalEmail,
      username: payload.username,
      full_name: payload.fullName,
      role_name: payload.roleName,
      allow_self_password: payload.allowSelfPassword,
      temporary_password: payload.temporaryPassword,
      portal_url: payload.portalUrl || window.location.origin,
      broadcast_devs: payload.broadcastDevs ?? true,
      custom_subject: customSubject,
      custom_html: customHtml,
      custom_text: customText,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to dispatch welcome email');
  }

  return await response.json();
}


export async function sendHearingReminderEmail(payload: {
  matterId: string;
  matterTitle: string;
  ctsCaseNumber: string;
  courtStation: string;
  hearingDate: string;
  courtActionRequired: string;
  leadAdvocateName: string;
  leadAdvocateEmail: string;
  portalUrl?: string;
}) {
  const response = await fetch('/api/v1/email/hearing-reminder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      matter_id: payload.matterId,
      matter_title: payload.matterTitle,
      cts_case_number: payload.ctsCaseNumber,
      court_station: payload.courtStation,
      hearing_date: payload.hearingDate,
      court_action_required: payload.courtActionRequired,
      lead_advocate_name: payload.leadAdvocateName,
      lead_advocate_email: payload.leadAdvocateEmail,
      portal_url: payload.portalUrl || 'https://nyagahkithinji-advocates.azurewebsites.net',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to dispatch hearing reminder email');
  }

  return await response.json();
}
