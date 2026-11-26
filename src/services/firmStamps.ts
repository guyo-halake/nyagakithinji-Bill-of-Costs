import { supabase } from './supabase';
import {
  getFirmStampsCatalog as getLocalFirmStampsCatalog,
  LawFirmStamp,
  deleteFirmStampFromCatalog,
  saveFirmStampToCatalog as saveLocalFirmStampToCatalog,
} from './documentSecurity';

const STAMPS_BUCKET = 'firm-stamps';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface FirmStampRow {
  id: string;
  firm_id: string;
  name: string;
  code: string;
  category: LawFirmStamp['category'];
  matter_types: string[];
  description: string;
  signatory: string;
  lsk_number: string;
  target_domain: string;
  image_path: string;
  qr_code_path: string;
  merged_stamp_path: string;
  short_token: string;
  sha256_fingerprint: string;
  verification_url: string;
  status: LawFirmStamp['status'];
  is_default: boolean;
  updated_at: string;
}

const publicUrl = (path: string): string => {
  const { data } = supabase.storage.from(STAMPS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

const mapStamp = (row: FirmStampRow): LawFirmStamp => ({
  id: row.id,
  name: row.name,
  code: row.code,
  category: row.category,
  matterTypes: Array.isArray(row.matter_types) ? row.matter_types : [],
  description: row.description,
  signatory: row.signatory,
  lskNumber: row.lsk_number,
  targetDomain: row.target_domain,
  imageUrl: publicUrl(row.image_path),
  shortToken: row.short_token,
  sha256Fingerprint: row.sha256_fingerprint,
  verificationUrl: row.verification_url,
  qrCodeDataUrl: publicUrl(row.qr_code_path),
  mergedStampPng: publicUrl(row.merged_stamp_path),
  status: row.status,
  updatedAt: row.updated_at,
  isDefault: row.is_default,
  securityFeatures: {
    antiTamperSha256: true,
    embeddedMicroQr: true,
    highErrorCorrection: true,
    firmRootSecretBound: true,
    lskPracticingRollVerified: false,
  },
});

const requireFirmId = (firmId: string): void => {
  if (!UUID_PATTERN.test(firmId)) {
    throw new Error('Your firm account could not be verified. Sign out and sign in again.');
  }
};

const uploadImage = async (path: string, source: string): Promise<void> => {
  const response = await fetch(source);
  if (!response.ok) throw new Error('Could not read the selected stamp image.');
  const blob = await response.blob();
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) {
    throw new Error('Choose a PNG, JPG, or WebP image.');
  }
  if (blob.size > 5 * 1024 * 1024) {
    throw new Error('Each stamp image must be 5 MB or smaller.');
  }
  const { error } = await supabase.storage.from(STAMPS_BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: true,
  });
  if (error) throw error;
};

export async function fetchFirmStamps(firmId: string, importSavedStamps = false): Promise<LawFirmStamp[]> {
  requireFirmId(firmId);
  const { data, error } = await supabase
    .from('firm_stamps')
    .select('*')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  if (!data?.length) {
    if (!importSavedStamps) return [];
    const savedLocalCatalog = localStorage.getItem('KARANI_LAW_FIRM_STAMPS_V2');
    if (!savedLocalCatalog) return [];

    let existingStamps: unknown;
    try {
      existingStamps = JSON.parse(savedLocalCatalog);
    } catch {
      throw new Error('The saved stamps on this device could not be read.');
    }
    if (!Array.isArray(existingStamps) || existingStamps.length === 0) return [];

    const localStamps = await getLocalFirmStampsCatalog();
    const existingFirmStamp = localStorage.getItem('karani_firm_stamp_url');
    localStorage.removeItem('KARANI_LAW_FIRM_STAMPS_V2');
    for (const [index, stamp] of localStamps.entries()) {
      await saveFirmStamp(firmId, {
        ...stamp,
        imageUrl: index === 0 && existingFirmStamp ? existingFirmStamp : stamp.imageUrl,
        isDefault: index === 0,
      });
    }
    return fetchFirmStamps(firmId);
  }

  const stamps = (data as FirmStampRow[]).map(mapStamp);
  const defaultStamp = stamps.find(stamp => stamp.isDefault);
  if (defaultStamp) {
    try {
      localStorage.setItem('karani_firm_stamp_url', defaultStamp.imageUrl);
    } catch (error) {
      console.warn('Could not cache the firm stamp for document creation.', error);
    }
  }
  return stamps;
}

export async function saveFirmStamp(firmId: string, stamp: LawFirmStamp): Promise<LawFirmStamp> {
  requireFirmId(firmId);
  const id = UUID_PATTERN.test(stamp.id) ? stamp.id : crypto.randomUUID();
  const basePath = `${firmId}/${id}`;
  const imagePath = `${basePath}/stamp`;
  const qrCodePath = `${basePath}/qr`;
  const mergedStampPath = `${basePath}/merged`;

  await Promise.all([
    uploadImage(imagePath, stamp.imageUrl),
    uploadImage(qrCodePath, stamp.qrCodeDataUrl),
    uploadImage(mergedStampPath, stamp.mergedStampPng || stamp.imageUrl),
  ]);

  const record = {
    id,
    firm_id: firmId,
    name: stamp.name,
    code: stamp.code,
    category: stamp.category,
    matter_types: stamp.matterTypes,
    description: stamp.description,
    signatory: stamp.signatory,
    lsk_number: stamp.lskNumber,
    target_domain: stamp.targetDomain,
    image_path: imagePath,
    qr_code_path: qrCodePath,
    merged_stamp_path: mergedStampPath,
    short_token: stamp.shortToken,
    sha256_fingerprint: stamp.sha256Fingerprint,
    verification_url: stamp.verificationUrl,
    status: stamp.status,
    is_default: Boolean(stamp.isDefault),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('firm_stamps')
    .upsert(record, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;

  const saved = mapStamp(data as FirmStampRow);
  saveLocalFirmStampToCatalog(saved);
  if (saved.isDefault) {
    localStorage.setItem('karani_firm_stamp_url', saved.imageUrl);
    window.dispatchEvent(new CustomEvent('firmStampUpdated', { detail: saved.imageUrl }));
  }
  return saved;
}

export async function deleteFirmStamp(firmId: string, stamp: LawFirmStamp): Promise<void> {
  requireFirmId(firmId);
  const { error } = await supabase
    .from('firm_stamps')
    .delete()
    .eq('firm_id', firmId)
    .eq('id', stamp.id);
  if (error) throw error;
  deleteFirmStampFromCatalog(stamp.id);

  const paths = [stamp.imageUrl, stamp.qrCodeDataUrl, stamp.mergedStampPng]
    .map(value => value || '')
    .map(value => {
      const marker = `/storage/v1/object/public/${STAMPS_BUCKET}/`;
      const position = value.indexOf(marker);
      return position >= 0 ? decodeURIComponent(value.slice(position + marker.length)) : '';
    })
    .filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(STAMPS_BUCKET).remove(paths);
    if (storageError) throw new Error(`Stamp removed, but its image files could not be cleared: ${storageError.message}`);
  }
}

export async function setDefaultFirmStamp(firmId: string, stampId: string): Promise<void> {
  requireFirmId(firmId);
  const { error } = await supabase.rpc('set_firm_default_stamp', { target_stamp_id: stampId });
  if (error) throw error;
}
