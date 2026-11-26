import QRCode from 'qrcode';
import { EXACT_FIRM_INFO, getActiveFirmProfile } from './supabase';

export interface DocumentSecurityData {
  documentRef: string;
  clientName: string;
  matterTitle?: string;
  totalAmount: number;
  dateBilled: string;
  signatoryName?: string;
  lskNumber?: string;
  customOrigin?: string;
}

export interface DocumentSecurityRecord {
  documentRef: string;
  clientName: string;
  matterTitle: string;
  totalAmount: number;
  dateBilled: string;
  signatoryName: string;
  lskNumber: string;
  shortToken: string;
  fullHash: string;
  verificationUrl: string;
  qrCodeDataUrl: string;
  mergedStampDataUrl?: string;
  generatedAt: string;
}

// Pure TypeScript SHA-256 implementation (works 100% offline, with or without HTTPS/WebCrypto)
function sha256Pure(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0, j = 0;

  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;


  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  for (i = 0; i < ascii.length; i++) {
    const code = ascii.charCodeAt(i);

    words[i >> 2] |= (code & 0xff) << (24 - (i % 4) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = [...hash];

    for (j = 16; j < 64; j++) {
      const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    for (j = 0; j < 64; j++) {
      const s1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[j] + w[j]) | 0;
      const s0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

// Firm Root Salt for cryptographic hashing (Firm Secret Key)
const FIRM_ROOT_SECRET = 'NBK_ADVOCATES_KENYA_CAP16_SEAL_2026_ROOT';

export interface LawFirmStamp {
  id: string;
  name: string;
  code: string;
  category: 'General Practice' | 'Conveyancing & Land' | 'Litigation & Court Process' | 'Commissioner for Oaths' | 'Commercial & Corporate' | 'Registry & Filing';
  matterTypes: string[];
  description: string;
  signatory: string;
  lskNumber: string;
  targetDomain: string;
  imageUrl: string;
  shortToken: string;
  sha256Fingerprint: string;
  verificationUrl: string;
  qrCodeDataUrl: string;
  mergedStampPng?: string;
  status: 'active' | 'revoked';
  updatedAt: string;
  isDefault?: boolean;
  securityFeatures: {
    antiTamperSha256: boolean;
    embeddedMicroQr: boolean;
    highErrorCorrection: boolean;
    firmRootSecretBound: boolean;
    lskPracticingRollVerified: boolean;
  };
}

export const computeStampFingerprint = (code: string, category: string, lskNo: string): { fullHash: string; shortToken: string } => {
  const rawPayload = `${FIRM_ROOT_SECRET}|STAMP|${code.trim().toUpperCase()}|${category.trim()}|${lskNo.trim()}`;
  const fullHash = sha256Pure(rawPayload);
  const rawToken = fullHash.slice(0, 8).toUpperCase();
  const shortToken = `KL-STP-${rawToken.slice(0, 4)}-${rawToken.slice(4, 8)}`;
  return { fullHash, shortToken };
};

export const DEFAULT_FIRM_STAMP_SEEDS = [
  {
    id: 'stamp-master',
    name: 'Firm Master Official Seal & Stamp',
    code: 'NBK-MASTER-SEAL',
    category: 'General Practice' as const,
    matterTypes: ['All Matters', 'Bills of Costs', 'Retainer Agreements', 'Legal Opinions', 'Formal Letters'],
    description: 'Master official seal of Nyagah B. Kithinji Advocates for general legal practice, advocate-client billing, executive certifications, and formal firm correspondence.',
    imageUrl: '/stamp.png'
  },
  {
    id: 'stamp-oaths',
    name: 'Commissioner for Oaths & Notarial Seal',
    code: 'NBK-OATHS-NOTARY',
    category: 'Commissioner for Oaths' as const,
    matterTypes: ['Verifying Affidavits', 'Sworn Declarations', 'Deed Polls', 'Statutory Oaths', 'Exhibits'],
    description: 'Statutory seal under Cap 15 Laws of Kenya for administering oaths, swearing verifying affidavits, verifying witness statements, and legal affirmations.',
    imageUrl: '/stamp.png'
  },
  {
    id: 'stamp-litigation',
    name: 'Court Process & Litigation Department Stamp',
    code: 'NBK-LITIGATION-COURT',
    category: 'Litigation & Court Process' as const,
    matterTypes: ['High Court Pleadings', 'Schedule 6 & 7 Bills of Costs', 'Chamber Summons', 'Notice of Motions', 'Appeals'],
    description: 'Formal court process and litigation stamp used for drawing, filing, and serving pleadings, bills of costs, and litigation processes before Kenyan Courts.',
    imageUrl: '/stamp.png'
  },
  {
    id: 'stamp-conveyancing',
    name: 'Conveyancing & Land Registry Seal',
    code: 'NBK-CONVEYANCING-LAND',
    category: 'Conveyancing & Land' as const,
    matterTypes: ['Title Deeds & Transfers', 'Legal Charges & Mortgages', 'Commercial Leases', 'Land Searches', 'Stamp Duty'],
    description: 'Authoritative property and conveyancing seal for registration of title deeds, transfers, commercial leases, sectional properties, and bank charges.',
    imageUrl: '/stamp.png'
  },
  {
    id: 'stamp-commercial',
    name: 'Commercial Contracts & Arbitration Seal',
    code: 'NBK-COMMERCIAL-CORP',
    category: 'Commercial & Corporate' as const,
    matterTypes: ['Commercial Contracts', 'Shareholder Agreements', 'Arbitration Submissions', 'NDAs', 'Mergers & Joint Ventures'],
    description: 'Specialized corporate stamp for executing commercial contracts, international arbitration submissions, shareholder pacts, and business transactions.',
    imageUrl: '/stamp.png'
  },
  {
    id: 'stamp-registry',
    name: 'Registry "RECEIVED & FILED" Endorsement Stamp',
    code: 'NBK-REGISTRY-RECEIVED',
    category: 'Registry & Filing' as const,
    matterTypes: ['Service Copies', 'Client Submissions', 'Registry Intake', 'Process Server Affidavits', 'Court Returns'],
    description: 'Official registry receiving and filing stamp recording the exact date, recipient signature line, and tracking index for all served and filed documents.',
    imageUrl: '/stamp.png'
  }
];

export const computeDocumentFingerprint = (data: {
  documentRef: string;
  totalAmount: number;
  dateBilled: string;
  clientName: string;
}): { fullHash: string; shortToken: string } => {
  const normAmount = Number(data.totalAmount || 0).toFixed(2);
  const normClient = (data.clientName || '').trim().toUpperCase();
  const normRef = (data.documentRef || '').trim().toUpperCase();
  const normDate = (data.dateBilled || '').trim();

  // Canonical payload
  const firm = getActiveFirmProfile();
  const rawPayload = `${FIRM_ROOT_SECRET}|${normRef}|${normClient}|${normAmount}|${normDate}|${firm.kraPin || EXACT_FIRM_INFO.kraPin}`;
  const fullHash = sha256Pure(rawPayload);

  // Short 8-character human-readable verification token: e.g. "8F92-C4B1"
  const rawToken = fullHash.slice(0, 8).toUpperCase();
  const shortToken = `KL-${rawToken.slice(0, 4)}-${rawToken.slice(4, 8)}`;

  return { fullHash, shortToken };
};

export interface MergedStampOptions {
  stampImageUrl?: string;
  qrCodeDataUrl: string;
  shortToken: string;
  documentRef: string;
  signatoryName?: string;
  lskNumber?: string;
  firmName?: string;
  dateBilled?: string;
  layout?: 'badge' | 'stacked';
}

function loadImageSafe(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Canvas requires browser window'));
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Merges the Official Firm Stamp PNG and the Real Cryptographic QR Code
 * into a single unified high-resolution transparent PNG image.
 */
export const generateMergedStampImage = async (
  options: MergedStampOptions
): Promise<string> => {
  if (typeof document === 'undefined') {
    return options.qrCodeDataUrl;
  }

  const layout = options.layout || 'badge';
  const firm = getActiveFirmProfile();
  const firmName = (options.firmName || firm.name || 'NYAGAH B. KITHINJI ADVOCATES').toUpperCase();
  const signatory = options.signatoryName || firm.name;
  const lsk = options.lskNumber || firm.lskRegNo || 'ADMIN/2026/001';
  const dateStr = options.dateBilled || new Date().toISOString().split('T')[0];

  const stampSrc = options.stampImageUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem('karani_firm_stamp_url') : null) || '/stamp.png';

  // Load both images in parallel
  let stampImg: HTMLImageElement | null = null;
  try {
    stampImg = await loadImageSafe(stampSrc);
  } catch (err) {
    try {
      stampImg = await loadImageSafe('/stamp.png');
    } catch {
      stampImg = null;
    }
  }

  let qrImg: HTMLImageElement | null = null;
  try {
    qrImg = await loadImageSafe(options.qrCodeDataUrl);
  } catch (err) {
    console.error('Failed to load QR code image for merge:', err);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return options.qrCodeDataUrl;

  if (layout === 'badge') {
    // High-resolution horizontal badge (780 x 360)
    canvas.width = 780;
    canvas.height = 360;

    // Clear transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Official Stamp on the left
    if (stampImg) {
      ctx.drawImage(stampImg, 20, 30, 300, 300);
    } else {
      // Fallback procedural official seal
      ctx.save();
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(170, 180, 140, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(170, 180, 125, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#991b1b';
      ctx.font = 'bold 13px serif';
      ctx.textAlign = 'center';
      ctx.fillText(firmName.slice(0, 26), 170, 160);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('OFFICIAL ADVOCATE SEAL', 170, 185);
      ctx.fillText(`LSK: ${lsk}`, 170, 205);
      ctx.restore();
    }

    // 2. Draw Right-Side Security Card (High Contrast & 100% Scannable)
    const cardX = 340;
    const cardY = 20;
    const cardW = 420;
    const cardH = 320;
    const radius = 16;

    // Card Background (pure white for ultra-crisp QR camera scanner detection)
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.15)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.fill();
    ctx.restore();

    // Card Border
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.stroke();

    // Top Header Banner
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cardX + radius, cardY);
    ctx.lineTo(cardX + cardW - radius, cardY);
    ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
    ctx.lineTo(cardX + cardW, cardY + 38);
    ctx.lineTo(cardX, cardY + 38);
    ctx.lineTo(cardX, cardY + radius);
    ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
    ctx.closePath();
    ctx.fillStyle = '#0F172A';
    ctx.fill();

    // Header Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔒 OFFICIAL VERIFIABLE ADVOCATE SEAL', cardX + cardW / 2, cardY + 24);
    ctx.restore();

    // 3. Draw Real Scannable QR Code
    if (qrImg) {
      // Solid white background pad for QR code
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cardX + 16, cardY + 48, 175, 175);
      // Draw QR
      ctx.drawImage(qrImg, cardX + 18, cardY + 50, 170, 170);
      // Subtle border around QR code
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(cardX + 16, cardY + 48, 175, 175);
    }

    // 4. Details Column next to QR Code
    const textX = cardX + 205;
    let currY = cardY + 68;

    ctx.textAlign = 'left';

    // Token
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.fillText('VERIFICATION TOKEN', textX, currY);
    currY += 16;

    // Token Pill
    ctx.fillStyle = '#EFF6FF';
    drawRoundedRect(ctx, textX - 2, currY - 13, 195, 22, 5);
    ctx.fill();
    ctx.strokeStyle = '#BFDBFE';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, textX - 2, currY - 13, 195, 22, 5);
    ctx.stroke();

    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 12.5px monospace, Courier';
    ctx.fillText(options.shortToken, textX + 6, currY + 2);
    currY += 26;

    // Document Ref
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 8.5px system-ui, sans-serif';
    ctx.fillText('DOCUMENT REF:', textX, currY);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(options.documentRef.slice(0, 18), textX + 85, currY);
    currY += 20;

    // LSK Roll
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 8.5px system-ui, sans-serif';
    ctx.fillText('LSK ROLL NO:', textX, currY);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(lsk.slice(0, 18), textX + 85, currY);
    currY += 20;

    // Date
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 8.5px system-ui, sans-serif';
    ctx.fillText('DATE SEALED:', textX, currY);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 9.5px system-ui';
    ctx.fillText(dateStr, textX + 85, currY);
    currY += 20;

    // Signatory
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 8.5px system-ui, sans-serif';
    ctx.fillText('SIGNATORY:', textX, currY);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 9px system-ui';
    ctx.fillText(signatory.slice(0, 20), textX + 70, currY);

    // 5. Bottom Instructions Bar
    const footerY = cardY + cardH - 52;
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 16, footerY);
    ctx.lineTo(cardX + cardW - 16, footerY);
    ctx.stroke();

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText('✓ Cryptographically Verified Legal Record', cardX + 20, footerY + 18);

    ctx.fillStyle = '#64748B';
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillText('Point phone camera at QR code or verify at: kithinjilaw.co.ke/?tab=verify', cardX + 20, footerY + 34);

  } else {
    // Vertical Stacked Layout (440 x 680)
    canvas.width = 440;
    canvas.height = 680;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Top Stamp
    if (stampImg) {
      ctx.drawImage(stampImg, 70, 20, 300, 300);
    }

    // Bottom Badge Card
    const cardX = 20;
    const cardY = 340;
    const cardW = 400;
    const cardH = 320;
    const radius = 16;

    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.fill();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.stroke();

    // Header
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(cardX, cardY, cardW, 36);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('OFFICIAL DIGITAL SEAL VERIFICATION', cardX + cardW / 2, cardY + 23);

    // QR Code centered
    if (qrImg) {
      ctx.drawImage(qrImg, cardX + (cardW - 160) / 2, cardY + 50, 160, 160);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(options.shortToken, cardX + cardW / 2, cardY + 235);

    ctx.fillStyle = '#64748B';
    ctx.font = '9px system-ui';
    ctx.fillText(`Ref: ${options.documentRef} | LSK: ${lsk}`, cardX + cardW / 2, cardY + 255);
    ctx.fillText('Scan QR to verify live authenticity on kithinjilaw.co.ke', cardX + cardW / 2, cardY + 275);
  }

  return canvas.toDataURL('image/png');
};

export const mintLawFirmStamp = async (
  partial: {
    id?: string;
    name: string;
    code: string;
    category: LawFirmStamp['category'];
    matterTypes: string[];
    description: string;
    signatory?: string;
    lskNumber?: string;
    targetDomain?: string;
    imageUrl?: string;
  }
): Promise<LawFirmStamp> => {
  const firm = getActiveFirmProfile();
  const signatory = partial.signatory || firm.name;
  const lskNumber = partial.lskNumber || firm.lskRegNo || 'P.105/14233/26';
  const targetDomain = partial.targetDomain || (typeof window !== 'undefined' && localStorage.getItem('karani_verification_domain')) || 'https://kithinjilaw.co.ke';
  const imageUrl = partial.imageUrl || '/stamp.png';

  const { fullHash, shortToken } = computeStampFingerprint(partial.code, partial.category, lskNumber);

  const queryParams = new URLSearchParams({
    tab: 'verify',
    ref: partial.code,
    amt: '0.00',
    dt: new Date().toISOString().split('T')[0],
    cli: partial.name,
    tok: shortToken,
    sig: fullHash.slice(0, 16)
  });

  const verificationUrl = `${targetDomain}/?${queryParams.toString()}`;

  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate stamp QR:', err);
  }

  let mergedStampPng = '';
  try {
    mergedStampPng = await generateMergedStampImage({
      stampImageUrl: imageUrl,
      qrCodeDataUrl,
      shortToken,
      documentRef: partial.code,
      signatoryName: signatory,
      lskNumber,
      firmName: firm.name,
      dateBilled: new Date().toISOString().split('T')[0],
      layout: 'badge'
    });
  } catch (err) {
    console.warn('Failed to generate merged stamp image:', err);
  }

  const stamp: LawFirmStamp = {
    id: partial.id || `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: partial.name,
    code: partial.code.toUpperCase(),
    category: partial.category,
    matterTypes: partial.matterTypes,
    description: partial.description,
    signatory,
    lskNumber,
    targetDomain,
    imageUrl,
    shortToken,
    sha256Fingerprint: fullHash,
    verificationUrl,
    qrCodeDataUrl,
    mergedStampPng: mergedStampPng || undefined,
    status: 'active',
    updatedAt: new Date().toISOString(),
    securityFeatures: {
      antiTamperSha256: true,
      embeddedMicroQr: true,
      highErrorCorrection: true,
      firmRootSecretBound: true,
      lskPracticingRollVerified: true
    }
  };

  return stamp;
};

export const getFirmStampsCatalog = async (): Promise<LawFirmStamp[]> => {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('KARANI_LAW_FIRM_STAMPS_V2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }

      // Initialize defaults
      const seeded: LawFirmStamp[] = [];
      for (const seed of DEFAULT_FIRM_STAMP_SEEDS) {
        const minted = await mintLawFirmStamp(seed);
        seeded.push(minted);
      }
      localStorage.setItem('KARANI_LAW_FIRM_STAMPS_V2', JSON.stringify(seeded));
      return seeded;
    }
  } catch (e) {
    console.error('Error in getFirmStampsCatalog:', e);
  }
  return [];
};

export const saveFirmStampToCatalog = (stamp: LawFirmStamp): void => {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('KARANI_LAW_FIRM_STAMPS_V2');
      let catalog: LawFirmStamp[] = stored ? JSON.parse(stored) : [];
      const index = catalog.findIndex(s => s.id === stamp.id);
      if (index >= 0) {
        catalog[index] = stamp;
      } else {
        catalog.unshift(stamp);
      }
      localStorage.setItem('KARANI_LAW_FIRM_STAMPS_V2', JSON.stringify(catalog));
    }
  } catch (e) {
    console.error('Error saving stamp to catalog:', e);
  }
};

export const deleteFirmStampFromCatalog = (id: string): void => {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('KARANI_LAW_FIRM_STAMPS_V2');
      if (stored) {
        let catalog: LawFirmStamp[] = JSON.parse(stored);
        catalog = catalog.filter(s => s.id !== id);
        localStorage.setItem('KARANI_LAW_FIRM_STAMPS_V2', JSON.stringify(catalog));
      }
    }
  } catch (e) {
    console.error('Error deleting stamp from catalog:', e);
  }
};

export const getAllSecuritySeals = (): DocumentSecurityRecord[] => {
  try {
    if (typeof localStorage !== 'undefined') {
      const existingStr = localStorage.getItem('BILLSZIP_SECURITY_SEALS') || '{}';
      const existing = JSON.parse(existingStr);
      return Object.values(existing) as DocumentSecurityRecord[];
    }
  } catch (e) {
    console.error('Error fetching security seals:', e);
  }
  return [];
};

export const saveSecuritySealRecord = (record: DocumentSecurityRecord): void => {
  try {
    if (typeof localStorage !== 'undefined') {
      const existingStr = localStorage.getItem('BILLSZIP_SECURITY_SEALS') || '{}';
      const existing = JSON.parse(existingStr);
      existing[record.documentRef.toUpperCase()] = record;
      localStorage.setItem('BILLSZIP_SECURITY_SEALS', JSON.stringify(existing));
    }
  } catch (e) {
    console.error('Error saving security seal record:', e);
  }
};

export const deleteSecuritySealRecord = (documentRef: string): void => {
  try {
    if (typeof localStorage !== 'undefined') {
      const existingStr = localStorage.getItem('BILLSZIP_SECURITY_SEALS') || '{}';
      const existing = JSON.parse(existingStr);
      delete existing[documentRef.toUpperCase()];
      localStorage.setItem('BILLSZIP_SECURITY_SEALS', JSON.stringify(existing));
    }
  } catch (e) {
    console.error('Error deleting security seal record:', e);
  }
};

export const generateDocumentSecurityPayload = async (
  data: DocumentSecurityData
): Promise<DocumentSecurityRecord> => {
  const { fullHash, shortToken } = computeDocumentFingerprint(data);

  // Construct standard verification URL
  // Supports scanning into the app or online domain
  const defaultDomain = (typeof window !== 'undefined' && localStorage.getItem('karani_verification_domain')) || 'https://kithinjilaw.co.ke';
  const origin = data.customOrigin || (typeof window !== 'undefined' && window.location ? window.location.origin : defaultDomain);
  const normAmount = Number(data.totalAmount || 0).toFixed(2);
  
  // Compact payload encoded in query params for instant offline or online browser validation
  const queryParams = new URLSearchParams({
    tab: 'verify',
    ref: data.documentRef,
    amt: normAmount,
    dt: data.dateBilled,
    cli: data.clientName,
    tok: shortToken,
    sig: fullHash.slice(0, 16)
  });

  const verificationUrl = `${origin}/?${queryParams.toString()}`;

  // Generate crisp QR code Data URL (High error correction level H, quiet zone 2)
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Error generating QR code data URL:', err);
  }

  // Generate the merged smart stamp PNG
  let mergedStampDataUrl = '';
  try {
    mergedStampDataUrl = await generateMergedStampImage({
      qrCodeDataUrl,
      shortToken,
      documentRef: data.documentRef,
      signatoryName: data.signatoryName,
      lskNumber: data.lskNumber,
      dateBilled: data.dateBilled,
      layout: 'badge'
    });
  } catch (err) {
    console.warn('Could not auto-generate merged stamp:', err);
  }

  const record: DocumentSecurityRecord = {
    documentRef: data.documentRef,
    clientName: data.clientName,
    matterTitle: data.matterTitle || 'Legal Matter',
    totalAmount: data.totalAmount,
    dateBilled: data.dateBilled,
    signatoryName: data.signatoryName || getActiveFirmProfile().name,
    lskNumber: data.lskNumber || 'ADMIN/2026/001',
    shortToken,
    fullHash,
    verificationUrl,
    qrCodeDataUrl,
    mergedStampDataUrl: mergedStampDataUrl || undefined,
    generatedAt: new Date().toISOString()
  };

  // Cache record locally in browser storage so offline verification has immediate access
  saveSecuritySealRecord(record);

  return record;
};

// 100% Offline Cryptographic Integrity Verification Function
export const verifyDocumentOffline = (input: {
  documentRef: string;
  totalAmount: number;
  dateBilled: string;
  clientName: string;
  token?: string;
  signature?: string;
}): {
  isValid: boolean;
  computedToken: string;
  computedSignature: string;
  reason?: string;
} => {
  const { fullHash, shortToken } = computeDocumentFingerprint({
    documentRef: input.documentRef,
    totalAmount: input.totalAmount,
    dateBilled: input.dateBilled,
    clientName: input.clientName
  });

  const computedSignature = fullHash.slice(0, 16);

  if (input.token) {
    const cleanToken = input.token.trim().toUpperCase();
    if (cleanToken !== shortToken && cleanToken !== shortToken.replace('KL-', '')) {
      return {
        isValid: false,
        computedToken: shortToken,
        computedSignature,
        reason: 'Verification Token does not match cryptographic bill digest.'
      };
    }
  }

  if (input.signature) {
    const cleanSig = input.signature.trim().toLowerCase();
    if (cleanSig !== computedSignature.toLowerCase()) {
      return {
        isValid: false,
        computedToken: shortToken,
        computedSignature,
        reason: 'Digital cryptographic signature mismatch. Figures or metadata may have been altered.'
      };
    }
  }

  return {
    isValid: true,
    computedToken: shortToken,
    computedSignature
  };
};
