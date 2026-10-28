export interface EmailTemplate {
  id: string;
  name: string;
  category: 'onboarding' | 'client_dispatch' | 'authentication' | 'system';
  subject: string;
  description: string;
  variables: string[];
  sampleData: Record<string, string>;
  plainText: string;
  htmlContent: string;
  updatedAt?: string;
  isCustom?: boolean;
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome_user',
    name: 'New Staff Onboarding Welcome',
    category: 'onboarding',
    subject: 'Welcome to Nyagah B. Kithinji & Co. Advocates — Account Provisioning',
    description: 'Onboarding dispatch sent to newly registered advocates and staff with portal login credentials.',
    variables: ['fullName', 'username', 'portalUrl', 'toEmail', 'temporaryPassword', 'roleTitle'],
    sampleData: {
      fullName: 'Victor Karani',
      username: 'vickarani',
      portalUrl: 'http://localhost:3000',
      toEmail: 'alexkaranivic@gmail.com',
      temporaryPassword: 'Nyagah@2026',
      roleTitle: 'Senior Advocate & Practice Lead'
    },
    plainText: `Dear {{fullName}},

Welcome to Nyagah B. Kithinji & Co. Advocates Fee Notes Builder. An Account has been created for you. Use the details below to login:

Portal Link: {{portalUrl}}
System Username: @{{username}}
Email: {{toEmail}}
Temporary Password: {{temporaryPassword}}

Sign in: {{portalUrl}}

Yours faithfully,
Nyagah B. Kithinji & Co. Advocates
Advocates of the High Court of Kenya • Practice & Remuneration Portal
Suite 4B, Mbaruk Road, Nairobi, Kenya`,
    htmlContent: `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b; margin: 0;">
  <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
    
    <!-- Firm Header with Logo -->
    <div style="display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 24px;">
      <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(30, 58, 138, 0.25);">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
          <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
          <path d="M7 21h10"/>
          <path d="M12 3v18"/>
          <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
        </svg>
      </div>
      <div>
        <h2 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">
          Nyagah B. Kithinji &amp; Co. Advocates
        </h2>
        <p style="margin: 3px 0 0 0; color: #64748b; font-size: 12px; font-weight: 500;">
          Advocates of the High Court of Kenya &bull; Practice &amp; Remuneration Portal
        </p>
      </div>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 14px;">
      Dear <strong>{{fullName}}</strong>,
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
      Welcome to <strong>Nyagah B. Kithinji &amp; Co. Advocates Fee Notes Builder</strong>. An Account has been created for you. Use the details below to login:
    </p>

    <!-- Credentials Card -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 16px; font-weight: 600; color: #64748b; width: 38%;">Portal Link</td>
          <td style="padding: 12px 16px; color: #0f172a;"><a href="{{portalUrl}}" style="color: #2563eb; text-decoration: none; font-weight: 600;">{{portalUrl}}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 16px; font-weight: 600; color: #64748b;">System Username</td>
          <td style="padding: 12px 16px; font-family: monospace; font-weight: 600; color: #0f172a;">@{{username}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 16px; font-weight: 600; color: #64748b;">Email</td>
          <td style="padding: 12px 16px; font-family: monospace; color: #0f172a;">{{toEmail}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; color: #64748b;">Temporary Password</td>
          <td style="padding: 12px 16px; font-family: monospace; font-weight: 700; color: #0f172a; background-color: #f1f5f9;">{{temporaryPassword}}</td>
        </tr>
      </table>
    </div>

    <!-- Sign In Button -->
    <div style="text-align: center; margin: 28px 0;">
      <a href="{{portalUrl}}" style="display: inline-block; background-color: #1e3a8a; color: #ffffff; padding: 13px 36px; border-radius: 10px; font-weight: 700; font-size: 13px; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 2px 6px rgba(30, 58, 138, 0.3);">
        Sign in
      </a>
    </div>

    <!-- Simple Footer -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center;">
      Nyagah B. Kithinji &amp; Co. Advocates &bull; Suite 4B, Mbaruk Road, Nairobi, Kenya
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'fee_note_dispatch',
    name: 'Formal Bill of Costs & Fee Note Dispatch',
    category: 'client_dispatch',
    subject: 'Bill of Costs Ref: {{billNumber}} — {{matterTitle}}',
    description: 'Statutory fee note statement dispatched to clients with itemized bill details, attached PDF, and bank / M-Pesa remittance options.',
    variables: ['clientName', 'billNumber', 'matterTitle', 'courtCaseNumber', 'grandTotal', 'firmName'],
    sampleData: {
      clientName: 'Seyani Brothers & Co. (K) Limited',
      billNumber: 'BOC-2026-SEYANI-001',
      matterTitle: 'Seyani Brothers & Co. (K) Ltd v Greenhills Investment Ltd',
      courtCaseNumber: 'HCCC E104/2025',
      grandTotal: 'KES 31,072,493.28',
      firmName: 'Nyagah B. Kithinji & Co. Advocates'
    },
    plainText: `Dear {{clientName}},

Please find attached the formal Bill of Costs (Ref: {{billNumber}}) in respect of {{matterTitle}} (Cause No: {{courtCaseNumber}}).

The itemized Fee Note is attached as a PDF to this email.

Summary of Charges:
• Bill Reference: {{billNumber}}
• Matter / Cause: {{matterTitle}}
• Court Cause No: {{courtCaseNumber}}
• Total Amount Due: {{grandTotal}}

Payment & Remittance Options:

1. Bank Transfer (EFT / RTGS)
• Bank: Stanbic Bank Kenya
• Account Name: Nyagah B. Kithinji & Co. Advocates Clients A/C
• Account Number: 0100088992211
• Branch: Upper Hill Nairobi
• Swift Code: SBICKENA

2. M-Pesa Express / Paybill
• Business / Paybill No: 522522
• Account Number: {{billNumber}}

Please review the attached statement and feel free to reach out if you have any questions.

Yours faithfully,
Nyagah B. Kithinji & Co. Advocates
Advocates of the High Court of Kenya
Suite 4B, Mbaruk Road, Nairobi, Kenya`,
    htmlContent: `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b; margin: 0;">
  <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
    
    <!-- Header with Logo -->
    <div style="display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px;">
      <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
          <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
          <path d="M7 21h10"/>
          <path d="M12 3v18"/>
          <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
        </svg>
      </div>
      <div>
        <h2 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 800;">
          Nyagah B. Kithinji &amp; Co. Advocates
        </h2>
        <p style="margin: 3px 0 0 0; color: #64748b; font-size: 12px; font-weight: 600;">
          Advocates of the High Court of Kenya &bull; Practice &amp; Fee Notes
        </p>
      </div>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 14px;">
      Dear <strong>{{clientName}}</strong>,
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 18px;">
      Please find attached the formal Bill of Costs (Ref: <strong>{{billNumber}}</strong>) in respect of <strong>{{matterTitle}}</strong> (Cause No: <strong>{{courtCaseNumber}}</strong>).
    </p>

    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; font-size: 12.5px; color: #1e40af; font-weight: 600;">
      &#128206; The itemized Fee Note is attached as a PDF to this email.
    </div>

    <!-- Summary Box -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 22px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Bill Reference:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a;">{{billNumber}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Matter / Cause:</td>
          <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600;">{{matterTitle}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Court Cause No:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #2563eb; font-weight: 700;">{{courtCaseNumber}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0 4px 0; font-size: 14px; font-weight: 800; color: #0f172a;">Total Amount Due:</td>
          <td style="padding: 12px 0 4px 0; text-align: right; font-family: monospace; font-size: 18px; font-weight: 800; color: #059669;">{{grandTotal}}</td>
        </tr>
      </table>
    </div>

    <!-- Payment & Remittance Options (Bank & M-Pesa) -->
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 10px 16px; font-size: 12px; font-weight: 700; letter-spacing: 0.3px;">
        Payment &amp; Remittance Options
      </div>
      
      <div style="padding: 16px; background-color: #ffffff;">
        <!-- Option 1: Bank Transfer -->
        <div style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px dashed #e2e8f0;">
          <div style="font-weight: 700; color: #1e3a8a; font-size: 12.5px; margin-bottom: 6px;">
            Option 1: Bank Transfer (EFT / RTGS)
          </div>
          <table style="width: 100%; font-size: 12px; color: #334155; line-height: 1.6;">
            <tr><td style="width: 32%; color: #64748b;">Bank:</td><td style="font-weight: 600;">Stanbic Bank Kenya</td></tr>
            <tr><td style="color: #64748b;">Account Name:</td><td style="font-weight: 600;">Nyagah B. Kithinji &amp; Co. Advocates Clients A/C</td></tr>
            <tr><td style="color: #64748b;">Account No:</td><td style="font-family: monospace; font-weight: 700; color: #0f172a;">0100088992211</td></tr>
            <tr><td style="color: #64748b;">Branch / Swift:</td><td>Upper Hill Nairobi &bull; Swift: SBICKENA</td></tr>
          </table>
        </div>

        <!-- Option 2: M-Pesa Express / Paybill -->
        <div>
          <div style="font-weight: 700; color: #059669; font-size: 12.5px; margin-bottom: 6px;">
            Option 2: M-Pesa Express / Paybill
          </div>
          <table style="width: 100%; font-size: 12px; color: #334155; line-height: 1.6;">
            <tr><td style="width: 32%; color: #64748b;">Paybill Business No:</td><td style="font-family: monospace; font-weight: 800; color: #059669; font-size: 13px;">522522</td></tr>
            <tr><td style="color: #64748b;">Account Number:</td><td style="font-family: monospace; font-weight: 700; color: #0f172a;">{{billNumber}}</td></tr>
          </table>
        </div>
      </div>
    </div>

    <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 20px;">
      Please review the attached statement and feel free to reach out if you have any questions.
    </p>

    <!-- Footer -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
      Nyagah B. Kithinji &amp; Co. Advocates &bull; Suite 4B, Mbaruk Road, Nairobi, Kenya
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'advocate_reset',
    name: 'Password Reset Link Request',
    category: 'authentication',
    subject: 'Password Reset — P3L Developers Help Desk',
    description: 'Actual transactional email dispatched by P3L Helpdesk when an advocate requests credentials recovery.',
    variables: ['greeting', 'username', 'resetUrl'],
    sampleData: {
      greeting: 'Good afternoon Victor Karani',
      username: 'vickarani',
      resetUrl: 'https://nyagahkithinji-advocates.azurewebsites.net/reset-password?token=a8f9c0e2b1'
    },
    plainText: `P3L Developers
Email Support Helpdesk

Password Reset

{{greeting}},

Your password reset request was received. Please click the button below to reset your password.

Reset Link: {{resetUrl}}

P3L Developers, Nairobi
This email was automated by P3L Helpdesk Delivery System. Please do not reply.`,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
    <div style="padding: 24px 28px 16px 28px; border-bottom: 1px solid #f1f5f9;">
      <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px;">P3L Developers</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Email Support Helpdesk</div>
      <div style="font-size: 14px; font-weight: 700; color: #0284c7; margin-top: 14px;">Password Reset</div>
    </div>
    <div style="padding: 24px 28px; font-size: 13px; line-height: 1.6; color: #334155;">
      <p style="margin: 0 0 12px 0; font-weight: 600; color: #0f172a; font-size: 14px;">{{greeting}},</p>
      <p style="margin: 0 0 20px 0; color: #475569;">
        Your password reset request was received. Please click the button below to reset your password.
      </p>

      <div style="text-align: center; margin: 26px 0 16px 0;">
        <a href="{{resetUrl}}" target="_blank" style="display: inline-block; background: #0f172a; color: #ffffff !important; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 30px; border-radius: 6px; letter-spacing: 0.3px;">Reset Password</a>
      </div>

      <p style="margin: 18px 0 0 0; font-size: 11px; color: #94a3b8;">
        If you did not request this change, you can safely ignore this email.
      </p>
    </div>
    <div style="padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
      <div style="font-weight: 600; color: #475569;">P3L Developers, Nairobi</div>
      <div style="margin-top: 3px; font-size: 10px; color: #94a3b8;">This email was automated by P3L Helpdesk Delivery System. Please do not reply.</div>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'reset_confirmation',
    name: 'Password Reset Confirmation',
    category: 'authentication',
    subject: 'Your Password Has Been Reset — P3L Help Desk',
    description: 'Actual security notice dispatched back to advocate once their password is reset successfully in Supabase.',
    variables: ['greeting', 'username', 'loginUrl'],
    sampleData: {
      greeting: 'Good afternoon Victor Karani',
      username: 'vickarani',
      loginUrl: 'https://nyagahkithinji-advocates.azurewebsites.net'
    },
    plainText: `P3L Developers
Email Support Helpdesk

Password Updated Successfully

{{greeting}},

Your password has been reset successfully. Please log in to your account with your new credentials.

Login Link: {{loginUrl}}

P3L Developers, Nairobi
This email was automated by P3L Helpdesk Delivery System. Please do not reply.`,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Password Reset Successful</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">\n    <div style="padding: 24px 28px 16px 28px; border-bottom: 1px solid #f1f5f9;">
      <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px;">P3L Developers</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Email Support Helpdesk</div>
      <div style="font-size: 14px; font-weight: 700; color: #059669; margin-top: 14px;">Password Reset Successful</div>
    </div>
    <div style="padding: 24px 28px; font-size: 13px; line-height: 1.6; color: #334155;">
      <p style="margin: 0 0 12px 0; font-weight: 600; color: #0f172a; font-size: 14px;">{{greeting}},</p>
      <p style="margin: 0 0 20px 0; color: #475569;">
        Your password has been reset successfully. Please log in to your account with your new credentials.
      </p>

      <div style="text-align: center; margin: 26px 0 16px 0;">
        <a href="{{loginUrl}}" target="_blank" style="display: inline-block; background: #059669; color: #ffffff !important; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 30px; border-radius: 6px; letter-spacing: 0.3px;">Log In to Portal</a>
      </div>
    </div>
    <div style="padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
      <div style="font-weight: 600; color: #475569;">P3L Developers, Nairobi</div>
      <div style="margin-top: 3px; font-size: 10px; color: #94a3b8;">This email was automated by P3L Helpdesk Delivery System. Please do not reply.</div>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'developer_alert',
    name: 'Developer Escalation & Security Helpdesk',
    category: 'system',
    subject: 'Password Reset Request — Nyagah & Co Adv.',
    description: 'Actual security escalation dispatched to p3lcodes@gmail.com and root admin Guyo Alake on credential reset requests.',
    variables: ['greeting', 'userId', 'username', 'emailAddress', 'role', 'timestamp', 'resetActionUrl'],
    sampleData: {
      greeting: 'Good afternoon Guyo',
      userId: 'usr_vickarani_002',
      username: 'vickarani',
      emailAddress: 'alexkaranivic@gmail.com',
      role: 'Senior Partner & Remuneration Lead',
      timestamp: '16 Oct 2026, 12:40 PM',
      resetActionUrl: 'https://nyagahkithinji-advocates.azurewebsites.net'
    },
    plainText: `P3L Developers
Email Support Helpdesk

Password Reset Request — Nyagah & Co Adv.

{{greeting}},

{{username}} ({{emailAddress}}) from Nyagah B. Kithinji & Co. Advocates has requested a password reset. Please review the details below:

--------------------------------------------------
User ID:        {{userId}}
Username:       {{username}}
Email:          {{emailAddress}}
Role:           {{role}}
Requested Time: {{timestamp}}
--------------------------------------------------

Reset Password Link: {{resetActionUrl}}

P3L Developers, Nairobi
This email was automated by P3L Helpdesk Delivery System. Please do not reply.`,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Password Reset Request</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
    <div style="padding: 24px 28px 16px 28px; border-bottom: 1px solid #f1f5f9;">
      <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px;">P3L Developers</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Email Support Helpdesk</div>
      <div style="font-size: 14px; font-weight: 700; color: #d97706; margin-top: 14px;">Password Reset Request — Nyagah &amp; Co Adv.</div>
    </div>
    <div style="padding: 24px 28px; font-size: 13px; line-height: 1.6; color: #334155;">
      <p style="margin: 0 0 12px 0; font-weight: 600; color: #0f172a; font-size: 14px;">{{greeting}},</p>
      <p style="margin: 0 0 18px 0; color: #475569;">
        <strong>{{username}}</strong> ({{emailAddress}}) has requested a password reset. Please review the details below:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
        <tbody>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 14px; font-weight: 600; color: #64748b; width: 35%;">User ID</td>
            <td style="padding: 8px 14px; color: #0f172a; font-family: monospace;">{{userId}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 14px; font-weight: 600; color: #64748b;">Username</td>
            <td style="padding: 8px 14px; color: #0f172a; font-weight: 600;">{{username}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 14px; font-weight: 600; color: #64748b;">Email</td>
            <td style="padding: 8px 14px; color: #0f172a;">{{emailAddress}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 14px; font-weight: 600; color: #64748b;">Role</td>
            <td style="padding: 8px 14px; color: #0f172a;">{{role}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 14px; font-weight: 600; color: #64748b;">Requested Time</td>
            <td style="padding: 8px 14px; color: #0f172a;">{{timestamp}}</td>
          </tr>
        </tbody>
      </table>

      <div style="text-align: center; margin: 24px 0 10px 0;">
        <a href="{{resetActionUrl}}" target="_blank" style="display: inline-block; background: #0f172a; color: #ffffff !important; font-size: 12px; font-weight: 700; text-decoration: none; padding: 11px 26px; border-radius: 6px; letter-spacing: 0.3px;">Reset Password in Admin Portal</a>
      </div>
    </div>
    <div style="padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
      <div style="font-weight: 600; color: #475569;">P3L Developers, Nairobi</div>
      <div style="margin-top: 3px; font-size: 10px; color: #94a3b8;">This email was automated by P3L Helpdesk Delivery System. Please do not reply.</div>
    </div>
  </div>
</body>
</html>`
  }
];

export const getSavedEmailTemplates = (): EmailTemplate[] => {
  try {
    const saved = localStorage.getItem('BILLSZIP_EMAIL_TEMPLATES');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Exclude removed templates like matter_share
        const validIds = new Set(DEFAULT_EMAIL_TEMPLATES.map(dt => dt.id));
        const filtered = parsed.filter((t: any) => validIds.has(t.id));
        const existingIds = new Set(filtered.map((t: any) => t.id));
        const merged = [...filtered];
        DEFAULT_EMAIL_TEMPLATES.forEach(dt => {
          if (!existingIds.has(dt.id)) merged.push(dt);
        });
        return merged;
      }
    }
  } catch (e) {}
  return DEFAULT_EMAIL_TEMPLATES;
};

export const fetchEmailTemplatesFromBackend = async (): Promise<EmailTemplate[]> => {
  try {
    const res = await fetch('/api/v1/email/templates');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.templates) && data.templates.length > 0) {
        localStorage.setItem('BILLSZIP_EMAIL_TEMPLATES', JSON.stringify(data.templates));
        window.dispatchEvent(new CustomEvent('emailTemplatesUpdated', { detail: data.templates }));
        return data.templates;
      }
    }
  } catch (err) {
    console.warn('Backend templates fetch warning, using local cache:', err);
  }
  return getSavedEmailTemplates();
};

export const saveEmailTemplate = async (template: EmailTemplate): Promise<EmailTemplate[]> => {
  const current = getSavedEmailTemplates();
  const index = current.findIndex(t => t.id === template.id);
  const updated = [...current];
  const templateToSave = {
    ...template,
    updatedAt: new Date().toISOString(),
    isCustom: true
  };
  if (index >= 0) {
    updated[index] = templateToSave;
  } else {
    updated.push(templateToSave);
  }
  localStorage.setItem('BILLSZIP_EMAIL_TEMPLATES', JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('emailTemplatesUpdated', { detail: updated }));

  // Synchronize to backend database
  try {
    await fetch(`/api/v1/email/templates/${template.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: template.subject,
        plainText: template.plainText,
        htmlContent: template.htmlContent
      })
    });
  } catch (err) {
    console.warn('Backend template save warning:', err);
  }

  return updated;
};

export const resetEmailTemplate = async (templateId: string): Promise<EmailTemplate[]> => {
  const defaultTpl = DEFAULT_EMAIL_TEMPLATES.find(t => t.id === templateId);
  if (!defaultTpl) return getSavedEmailTemplates();

  try {
    await fetch(`/api/v1/email/templates/${templateId}/reset`, { method: 'POST' });
  } catch (e) {}

  return await saveEmailTemplate({
    ...defaultTpl,
    isCustom: false
  });
};

export const renderTemplateText = (templateText: string, data: Record<string, string>): string => {
  let result = templateText;
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value);
  });
  return result;
};
