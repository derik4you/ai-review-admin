import fs from 'fs';
import path from 'path';

export interface BusinessRecord {
  id: string;
  loginId?: string;        // NEW: unique store login username (e.g. "bella_pizza")
  passwordHash?: string;   // NEW: bcrypt-hashed password stored server-side
  name: string;
  slug: string;
  category: string;
  description?: string | null;
  googleReviewUrl?: string | null;
  googlePlaceId?: string | null;
  positiveTags: string;
  keywords?: string;       // NEW: highlight keywords for AI (e.g. "wood-fired pizza")
  createdAt: string;
  ownerEmail?: string | null;
}

export interface QrStandRecord {
  standNumber: number;
  status: 'ASSIGNED' | 'UNASSIGNED';
  businessId?: string | null;
  businessName?: string | null;
  businessSlug?: string | null;
  updatedAt: string;
}

const globalForJsonDb = globalThis as unknown as {
  globalBusinesses?: BusinessRecord[];
  globalStands?: QrStandRecord[];
};

const DEFAULT_STANDS: QrStandRecord[] = Array.from({ length: 100 }, (_, i) => ({
  standNumber: i + 1,
  status: 'UNASSIGNED',
  businessId: null,
  businessName: null,
  businessSlug: null,
  updatedAt: new Date().toISOString(),
}));

if (!globalForJsonDb.globalBusinesses) {
  globalForJsonDb.globalBusinesses = [];
}

if (!globalForJsonDb.globalStands) {
  globalForJsonDb.globalStands = [...DEFAULT_STANDS];
}

function syncWriteFile(fileName: string, content: string) {
  const targetPaths = [
    path.join('d:/Album 1/ai review system/data', fileName),
    path.join('d:/Album 1/ai review admin panel/data', fileName),
  ];
  for (const p of targetPaths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, content, 'utf-8');
    } catch (e) {}
  }
}

function getDataDir(): string {
  const localDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch (e) {}
  }
  return localDir;
}

function getBusinessesFilePath(): string {
  return path.join(getDataDir(), 'businesses.json');
}

function getQrStandsFilePath(): string {
  return path.join(getDataDir(), 'qr_stands.json');
}

function ensureDataFiles() {
  const bizFile = getBusinessesFilePath();
  const standsFile = getQrStandsFilePath();

  if (!fs.existsSync(bizFile)) {
    try {
      syncWriteFile('businesses.json', JSON.stringify(globalForJsonDb.globalBusinesses, null, 2));
    } catch (e) {}
  }

  if (!fs.existsSync(standsFile)) {
    try {
      syncWriteFile('qr_stands.json', JSON.stringify(globalForJsonDb.globalStands, null, 2));
    } catch (e) {}
  }
}

export function getJsonBusinesses(): BusinessRecord[] {
  ensureDataFiles();
  try {
    const content = fs.readFileSync(getBusinessesFilePath(), 'utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      globalForJsonDb.globalBusinesses = parsed;
      return parsed;
    }
  } catch (e) {}
  return globalForJsonDb.globalBusinesses || [];
}

export function saveJsonBusiness(record: BusinessRecord): BusinessRecord[] {
  const list = getJsonBusinesses();
  const index = list.findIndex((b) => b.id === record.id || b.slug === record.slug);
  if (index >= 0) {
    list[index] = { ...list[index], ...record };
  } else {
    list.unshift(record);
  }

  globalForJsonDb.globalBusinesses = list;
  syncWriteFile('businesses.json', JSON.stringify(list, null, 2));
  return list;
}

export function getJsonStands(): QrStandRecord[] {
  ensureDataFiles();
  try {
    const content = fs.readFileSync(getQrStandsFilePath(), 'utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (parsed.length < 100) {
        const existingNumbers = new Set(parsed.map((s: any) => s.standNumber));
        for (let i = 1; i <= 100; i++) {
          if (!existingNumbers.has(i)) {
            parsed.push({
              standNumber: i,
              status: 'UNASSIGNED',
              businessId: null,
              businessName: null,
              businessSlug: null,
              updatedAt: new Date().toISOString(),
            });
          }
        }
        parsed.sort((a: any, b: any) => a.standNumber - b.standNumber);
        saveJsonStands(parsed);
      }
      globalForJsonDb.globalStands = parsed;
      return parsed;
    }
  } catch (e) {}
  return globalForJsonDb.globalStands || DEFAULT_STANDS;
}

export function saveJsonStands(stands: QrStandRecord[]) {
  ensureDataFiles();
  globalForJsonDb.globalStands = stands;
  syncWriteFile('qr_stands.json', JSON.stringify(stands, null, 2));
}

export function generateNewJsonStands(count: number): QrStandRecord[] {
  const currentStands = getJsonStands();
  const maxNum = currentStands.reduce((max, s) => Math.max(max, s.standNumber), 0);
  const qty = Math.min(Math.max(count, 1), 100);

  const newStands: QrStandRecord[] = [];
  for (let i = 1; i <= qty; i++) {
    newStands.push({
      standNumber: maxNum + i,
      status: 'UNASSIGNED',
      businessId: null,
      businessName: null,
      businessSlug: null,
      updatedAt: new Date().toISOString(),
    });
  }

  const updatedList = [...currentStands, ...newStands];
  saveJsonStands(updatedList);
  return updatedList;
}

export function updateJsonStand(standNumber: number, businessId: string | null): QrStandRecord[] {
  const stands = getJsonStands();
  const businesses = getJsonBusinesses();
  const targetBiz = businesses.find((b) => b.id === businessId || b.slug === businessId);

  const isUnbind = !businessId || businessId === 'UNBIND' || businessId === 'null';

  const updatedStands = stands.map((s) => {
    if (s.standNumber === standNumber) {
      return {
        ...s,
        status: (isUnbind ? 'UNASSIGNED' : 'ASSIGNED') as 'ASSIGNED' | 'UNASSIGNED',
        businessId: isUnbind ? null : targetBiz?.id || businessId,
        businessName: isUnbind ? null : targetBiz?.name || null,
        businessSlug: isUnbind ? null : targetBiz?.slug || null,
        updatedAt: new Date().toISOString(),
      };
    }
    return s;
  });

  saveJsonStands(updatedStands);
  return updatedStands;
}

export function resetJsonStands(count: number = 100): QrStandRecord[] {
  ensureDataFiles();
  const newStands: QrStandRecord[] = Array.from({ length: count }, (_, i) => ({
    standNumber: i + 1,
    status: 'UNASSIGNED',
    businessId: null,
    businessName: null,
    businessSlug: null,
    updatedAt: new Date().toISOString(),
  }));

  saveJsonStands(newStands);
  return newStands;
}
