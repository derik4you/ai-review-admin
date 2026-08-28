import fs from 'fs';
import path from 'path';

export interface LocationContext {
  city?: string;
  area?: string;
  landmark?: string;
  formattedAddress?: string;
}

export interface BusinessAiProfile {
  businessPersonality: string;
  customerType: string[];
  uniqueSellingPoints: string[];
  importantFeatures: string[];
  commonCustomerExperiences: string[];
  preferredReviewStyle: string;
  wordsToUse: string[];
  wordsToAvoid: string[];
  reviewExamples?: string[];
  suggestedKeywords?: string[];
  locationContext?: LocationContext | null;
  lastGeneratedAt?: string;
}

export interface ReviewHistoryRecord {
  id: string;
  businessId: string;
  businessSlug?: string;
  businessName?: string;
  generatedReview: string;
  selectedTags: string[];
  rating: number;
  language?: string;
  customNotes?: string;
  timestamp: string;
  status: 'generated' | 'copied' | 'redirected';
  durationMs?: number;
  fallbackUsed?: boolean;
  success?: boolean;
}

export interface CompetitorInsightRecord {
  id: string;
  businessId: string;
  competitorName: string;
  strengths: string[];
  weaknesses: string[];
  opportunityKeywords: string[];
  recommendedActions: string[];
  lastAnalyzedAt: string;
}

export type BusinessStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' | 'ARCHIVED';

export interface BusinessRecord {
  id: string;
  loginId?: string;        // unique store login username (e.g. "bella_pizza")
  passwordHash?: string;   // bcrypt-hashed password stored server-side
  name: string;
  slug: string;
  category: string;
  city?: string | null;
  area?: string | null;
  landmark?: string | null;
  location?: string | null;
  locationContext?: LocationContext | null;
  description?: string | null;
  services?: string | string[] | null;
  website?: string | null;
  instagram?: string | null;
  googleReviewUrl?: string | null;
  googlePlaceId?: string | null;
  positiveTags: string;
  reviewTags?: string[];
  keywords?: string;       // highlight keywords for AI
  aiProfile?: BusinessAiProfile | null;
  aiLength?: string;
  aiLanguage?: string;
  aiTone?: string;
  aiHumanize?: boolean;
  aiCustomPrompt?: string | null;
  createdAt: string;
  ownerEmail?: string | null;
  assignedStandNumber?: number | null;
  assignedStandUrl?: string | null;
  // ── Admin lifecycle fields (safe defaults: ACTIVE for existing data) ──
  status?: BusinessStatus;
  customerFlowEnabled?: boolean;  // disable NFC/QR flow for this business
  adminNotes?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectedAt?: string | null;
  rejectedReason?: string | null;
  suspendedAt?: string | null;
  suspendedBy?: string | null;
  suspendedReason?: string | null;
  archivedAt?: string | null;
  archivedBy?: string | null;
  normalizedCategory?: string | null;
  needsAiRegeneration?: boolean;
  needsTagRegeneration?: boolean;
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
