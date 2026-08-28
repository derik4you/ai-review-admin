/**
 * lib/adminDb.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Firestore helpers for admin-specific collections:
 *   - adminUsers
 *   - auditLogs
 *
 * Collections added in later phases:
 *   - adminSettings / aiPromptVersions (Phase 6)
 *   - featureFlags (Phase 7)
 *   - adminCategories (Phase 4)
 */

import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import type { AdminUserRecord } from './adminAuth';

// ─────────────────────────────────────────────
// Admin Users
// ─────────────────────────────────────────────

export async function getAdminUserByEmail(email: string): Promise<AdminUserRecord | null> {
  try {
    const colRef = collection(db, 'adminUsers');
    const q = query(colRef, where('email', '==', email.toLowerCase().trim()));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as AdminUserRecord;
    }
  } catch (err) {
    console.warn('getAdminUserByEmail error:', err);
  }
  return null;
}

export async function getAdminUserById(adminId: string): Promise<AdminUserRecord | null> {
  try {
    const docRef = doc(db, 'adminUsers', adminId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) return snapshot.data() as AdminUserRecord;
  } catch {
    // ignore — return null
  }
  return null;
}

export async function saveAdminUser(record: AdminUserRecord): Promise<void> {
  const docRef = doc(db, 'adminUsers', record.adminId);
  await setDoc(docRef, record, { merge: true });
}

export async function updateAdminLastLogin(adminId: string): Promise<void> {
  try {
    const docRef = doc(db, 'adminUsers', adminId);
    await setDoc(docRef, { lastLoginAt: new Date().toISOString() }, { merge: true });
  } catch {
    // non-blocking
  }
}

export async function getAdminUsersCount(): Promise<number> {
  try {
    const colRef = collection(db, 'adminUsers');
    const snapshot = await getDocs(colRef);
    return snapshot.size;
  } catch {
    return 0;
  }
}

export async function getAllAdminUsers(): Promise<AdminUserRecord[]> {
  try {
    const colRef = collection(db, 'adminUsers');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => d.data() as AdminUserRecord);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// Audit Logs (read access for audit viewer)
// ─────────────────────────────────────────────

export interface AuditLogRecord {
  adminId: string;
  action: string;
  targetId?: string;
  targetType?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export async function getAuditLogs(limitCount: number = 100): Promise<AuditLogRecord[]> {
  try {
    const colRef = collection(db, 'auditLogs');
    const snapshot = await getDocs(colRef);
    const logs = snapshot.docs.map((d) => d.data() as AuditLogRecord);
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs.slice(0, limitCount);
  } catch {
    return [];
  }
}

export async function getAuditLogsForBusiness(businessId: string, limitCount: number = 50): Promise<AuditLogRecord[]> {
  try {
    const colRef = collection(db, 'auditLogs');
    const snapshot = await getDocs(colRef);
    const logs = snapshot.docs
      .map((d) => d.data() as AuditLogRecord)
      .filter((l) => l.targetId === businessId || (l.metadata && (l.metadata as any).businessId === businessId));
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs.slice(0, limitCount);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// Business Analytics Aggregator
// ─────────────────────────────────────────────

export interface BusinessAnalyticsSummary {
  totalScans: number;
  reviewStarts: number;
  reviewsGenerated: number;
  reviewsCopied: number;
  googleRedirects: number;
  lastActivity: string | null;
}

export async function getBusinessAnalyticsSummary(businessId: string, slug?: string): Promise<BusinessAnalyticsSummary> {
  const summary: BusinessAnalyticsSummary = {
    totalScans: 0,
    reviewStarts: 0,
    reviewsGenerated: 0,
    reviewsCopied: 0,
    googleRedirects: 0,
    lastActivity: null,
  };

  try {
    const colRef = collection(db, 'analyticsEvents');
    const snapshot = await getDocs(colRef);
    let latestTime: number = 0;

    snapshot.forEach((d) => {
      const data = d.data();
      const match = data.businessId === businessId || (slug && data.businessSlug === slug);
      if (match) {
        const evt = data.event;
        if (evt === 'customer_scan' || evt === 'scan') summary.totalScans++;
        else if (evt === 'review_started') summary.reviewStarts++;
        else if (evt === 'review_generated') summary.reviewsGenerated++;
        else if (evt === 'review_copied') summary.reviewsCopied++;
        else if (evt === 'google_redirect_clicked' || evt === 'GOOGLE_REDIRECT') summary.googleRedirects++;

        if (data.timestamp) {
          const t = new Date(data.timestamp).getTime();
          if (t > latestTime) {
            latestTime = t;
            summary.lastActivity = data.timestamp;
          }
        }
      }
    });
  } catch (err) {
    console.warn('getBusinessAnalyticsSummary warning:', err);
  }

  return summary;
}

// ─────────────────────────────────────────────
// Category Management (Phase 4)
// ─────────────────────────────────────────────

export interface AdminCategoryRecord {
  id: string;
  name: string;
  normalizedName: string;
  description?: string;
  aiContext?: string;
  experienceTags?: string[];
  vocabulary?: string[];
  wordsToAvoid?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const INITIAL_SEED_CATEGORIES: AdminCategoryRecord[] = [
  {
    id: 'cat-pet-shop',
    name: 'Pet Shop',
    normalizedName: 'PET_SHOP',
    description: 'Pet food, pet supply stores, veterinary clinics and grooming.',
    aiContext: 'Pet food, pet supplies, accessories, staff guidance, product availability, pet care shopping.',
    experienceTags: ['Pet Food', 'Product Variety', 'Staff Guidance', 'Pet Supplies', 'Product Quality', 'Pricing'],
    vocabulary: ['pet food', 'pet supplies', 'accessories', 'toys', 'dog food', 'cat food', 'pet care products', 'treats', 'leash', 'shampoo'],
    wordsToAvoid: ['delicious food', 'tasty dish', 'haircut', 'doctor consultation', 'workout equipment'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-restaurant',
    name: 'Restaurant',
    normalizedName: 'RESTAURANT',
    description: 'Dining places, fine dining, bistros, eateries, family restaurants.',
    aiContext: 'Food taste, freshness, portions, menu, service, ambience, waiting time and staff.',
    experienceTags: ['Food Taste', 'Food Quality', 'Service', 'Ambience', 'Portion Size', 'Waiting Time'],
    vocabulary: ['food taste', 'freshness', 'flavors', 'portions', 'menu', 'dishes', 'dining', 'table service', 'ambiance', 'seating'],
    wordsToAvoid: ['pet food', 'dog food', 'haircut', 'doctor consultation', 'workout equipment'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-cafe',
    name: 'Cafe & Coffee Shop',
    normalizedName: 'CAFE',
    description: 'Coffee shops, tea houses, cafes, bakeries with seating, beverage spots.',
    aiContext: 'Coffee quality, beverages, cozy vibe, seating comfort, snacks and friendly barista.',
    experienceTags: ['Great Coffee', 'Cozy Ambiance', 'Fresh Bakery', 'Quick Service', 'Friendly Barista', 'Comfortable Seating'],
    vocabulary: ['coffee', 'cappuccino', 'latte', 'beverages', 'pastries', 'snacks', 'cozy vibe', 'barista', 'seating', 'brew'],
    wordsToAvoid: ['pet food', 'doctor consultation', 'haircut', 'workout equipment'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-salon',
    name: 'Salon & Beauty Parlour',
    normalizedName: 'SALON',
    description: 'Hair salons, unisex salons, barbershops, beauty parlours, grooming lounges.',
    aiContext: 'Haircut, styling, consultation, stylist behaviour, cleanliness, grooming and results.',
    experienceTags: ['Haircut', 'Styling', 'Consultation', 'Staff', 'Cleanliness', 'Result'],
    vocabulary: ['haircut', 'styling', 'stylist', 'grooming', 'hair care', 'cleanliness', 'appointment', 'consultation', 'hygiene'],
    wordsToAvoid: ['delicious food', 'pet food', 'doctor diagnosis', 'workout machines'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-clinic',
    name: 'Medical & Dental Clinic',
    normalizedName: 'CLINIC',
    description: 'Doctor clinics, dental clinics, healthcare centers, diagnostics, hospitals.',
    aiContext: 'Doctor consultation, explanation, appointment, waiting time, staff behaviour and cleanliness.',
    experienceTags: ['Doctor Consultation', 'Explanation', 'Staff Behaviour', 'Waiting Time', 'Cleanliness', 'Appointment'],
    vocabulary: ['doctor', 'consultation', 'diagnosis', 'treatment', 'patient care', 'explanation', 'waiting time', 'hygiene', 'appointment'],
    wordsToAvoid: ['delicious food', 'tasty dish', 'haircut', 'pet supplies', 'workout machines'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-gym',
    name: 'Gym & Fitness Center',
    normalizedName: 'GYM',
    description: 'Fitness centers, gyms, crossfit boxes, yoga studios, bodybuilding gyms.',
    aiContext: 'Workout equipment, trainer guidance, gym atmosphere, hygiene, locker rooms and fitness vibe.',
    experienceTags: ['Quality Equipment', 'Helpful Trainers', 'Clean Gym', 'Great Atmosphere', 'Spacious Floor', 'Motivating Vibe'],
    vocabulary: ['workout', 'equipment', 'trainers', 'weights', 'cleanliness', 'atmosphere', 'training guidance', 'facilities', 'treadmill'],
    wordsToAvoid: ['delicious food', 'haircut', 'doctor consultation', 'pet food'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-bakery',
    name: 'Bakery & Cake Shop',
    normalizedName: 'BAKERY',
    description: 'Bakeries, cake shops, pastry shops, confectionery, dessert parlours.',
    aiContext: 'Freshness of baked goods, custom cake designs, pastry taste, packaging and quick delivery.',
    experienceTags: ['Fresh Cakes', 'Pastry Taste', 'Custom Designs', 'Hygiene', 'Affordable Prices', 'Prompt Delivery'],
    vocabulary: ['cakes', 'pastries', 'freshly baked', 'croissants', 'bread', 'desserts', 'cupcakes', 'custom cakes', 'packaging'],
    wordsToAvoid: ['pet supplies', 'haircut', 'medical prescription', 'workout equipment'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-retail',
    name: 'Retail & Clothing Store',
    normalizedName: 'RETAIL',
    description: 'Clothing stores, fashion boutiques, shoe stores, electronic stores, general retail.',
    aiContext: 'Product variety, collection freshness, fitting room experience, pricing transparency and staff assistance.',
    experienceTags: ['Latest Collection', 'Product Variety', 'Helpful Staff', 'Fair Pricing', 'Fitting Comfort', 'Easy Billing'],
    vocabulary: ['collection', 'variety', 'quality fabric', 'fitting', 'discounts', 'staff help', 'clothing', 'apparel', 'accessories'],
    wordsToAvoid: ['delicious food', 'haircut', 'doctor consultation'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-hotel',
    name: 'Hotel & Hospitality',
    normalizedName: 'HOTEL',
    description: 'Hotels, resorts, lodges, guest houses, homestays, boutique stays.',
    aiContext: 'Room cleanliness, check-in speed, hospitality, amenities, location convenience and breakfast.',
    experienceTags: ['Clean Rooms', 'Friendly Staff', 'Smooth Check-in', 'Great Amenities', 'Convenient Location', 'Comfortable Bed'],
    vocabulary: ['rooms', 'cleanliness', 'hospitality', 'check-in', 'housekeeping', 'amenities', 'comfort', 'stay', 'view'],
    wordsToAvoid: ['haircut', 'pet supplies', 'medical surgery'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-spa',
    name: 'Spa & Wellness',
    normalizedName: 'SPA',
    description: 'Body spas, massage centers, Ayurvedic wellness centers, relaxation lounges.',
    aiContext: 'Relaxing ambiance, skilled therapist, hygienic setup, massage quality and soothing experience.',
    experienceTags: ['Relaxing Massage', 'Skilled Therapist', 'Soothing Ambiance', 'Clean & Hygienic', 'Polite Staff', 'Value for Money'],
    vocabulary: ['massage', 'therapist', 'relaxation', 'aromatherapy', 'wellness', 'hygiene', 'soothing music', 'rejuvenating'],
    wordsToAvoid: ['fast food', 'workout equipment', 'pet supplies'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-automobile',
    name: 'Automobile & Garage Service',
    normalizedName: 'AUTOMOBILE',
    description: 'Car service centers, bike mechanics, auto repair garages, tyre and wheel care.',
    aiContext: 'Accurate diagnosis, timely delivery, genuine spare parts, transparent billing and professional mechanics.',
    experienceTags: ['Quick Service', 'Experienced Mechanics', 'Transparent Pricing', 'Genuine Parts', 'Timely Delivery', 'Smooth Ride'],
    vocabulary: ['car service', 'bike repair', 'mechanic', 'engine oil', 'wheel alignment', 'spare parts', 'diagnosis', 'washing'],
    wordsToAvoid: ['haircut', 'delicious food', 'doctor consultation', 'pet food'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-other',
    name: 'Other / Custom Business',
    normalizedName: 'OTHER',
    description: 'Custom business categories not covered by standard verticals.',
    aiContext: 'General customer satisfaction, professional staff, prompt assistance, quality offerings and fair pricing.',
    experienceTags: ['Quality Service', 'Helpful Staff', 'Prompt Support', 'Fair Pricing', 'Clean Setup', 'Highly Recommended'],
    vocabulary: ['service', 'quality', 'staff', 'experience', 'pricing', 'support', 'professionalism'],
    wordsToAvoid: [],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let categoriesSeeded = false;

export async function seedDefaultCategoriesIfEmpty(): Promise<void> {
  if (categoriesSeeded) return;
  try {
    const colRef = collection(db, 'categories');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      for (const cat of INITIAL_SEED_CATEGORIES) {
        const docRef = doc(db, 'categories', cat.id);
        await setDoc(docRef, cat, { merge: true });
      }
      console.log('[Categories] Seeded initial categories into Firestore.');
    }
    categoriesSeeded = true;
  } catch (err) {
    console.warn('[Categories] Seeding warning:', err);
  }
}

export async function getAllCategories(includeDisabled = true): Promise<AdminCategoryRecord[]> {
  try {
    await seedDefaultCategoriesIfEmpty();
    const colRef = collection(db, 'categories');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      let list = snapshot.docs.map((d) => d.data() as AdminCategoryRecord);
      if (!includeDisabled) {
        list = list.filter((c) => c.active !== false);
      }
      list.sort((a, b) => a.name.localeCompare(b.name));
      return list;
    }
  } catch (err) {
    console.warn('getAllCategories error:', err);
  }
  return includeDisabled ? INITIAL_SEED_CATEGORIES : INITIAL_SEED_CATEGORIES.filter((c) => c.active);
}

export async function getCategoryById(id: string): Promise<AdminCategoryRecord | null> {
  try {
    await seedDefaultCategoriesIfEmpty();
    const docRef = doc(db, 'categories', id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as AdminCategoryRecord;
    }
  } catch (err) {
    console.warn('getCategoryById error:', err);
  }
  return INITIAL_SEED_CATEGORIES.find((c) => c.id === id) || null;
}

export async function getCategoryByNormalizedName(normName: string): Promise<AdminCategoryRecord | null> {
  try {
    await seedDefaultCategoriesIfEmpty();
    const colRef = collection(db, 'categories');
    const q = query(colRef, where('normalizedName', '==', normName.toUpperCase().trim()));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as AdminCategoryRecord;
    }
  } catch (err) {
    console.warn('getCategoryByNormalizedName error:', err);
  }
  return INITIAL_SEED_CATEGORIES.find((c) => c.normalizedName === normName.toUpperCase().trim()) || null;
}

export async function saveCategoryToDb(category: AdminCategoryRecord): Promise<void> {
  const docRef = doc(db, 'categories', category.id);
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(category)) {
    if (v !== undefined) clean[k] = v;
  }
  clean.updatedAt = new Date().toISOString();
  await setDoc(docRef, clean, { merge: true });
}

// ─────────────────────────────────────────────
// Phase 6: AI Control Center & Prompt Versioning
// ─────────────────────────────────────────────

export interface ClicheItem {
  id: string;
  phrase: string;
  active: boolean;
}

export interface AiSettingsRecord {
  id: string; // 'global'
  aiEnabled: boolean;
  reviewGenerationEnabled: boolean;
  dynamicTagsEnabled: boolean;
  aiInsightsEnabled: boolean;
  ownerReplyAssistantEnabled: boolean;
  englishEnabled: boolean;
  hindiEnabled: boolean;
  marathiEnabled: boolean;
  defaultReviewLength: 'short' | 'medium' | 'detailed';
  defaultTone: 'casual' | 'warm' | 'professional';
  locationMentionPercentage: number;
  minWords: number;
  maxWords: number;
  maxEmojis: number;
  maxExclamations: number;
  globalRules: string[];
  clicheBlacklist: ClicheItem[];
  modelName: string;
  temperature: number;
  maxOutputTokens: number;
  updatedAt: string;
  updatedBy: string;
}

export interface AiPromptVersionRecord {
  id: string;
  version: string;
  name: string;
  description: string;
  globalRules: string[];
  systemInstructionTemplate?: string;
  createdBy: string;
  createdAt: string;
  active: boolean;
}

export const DEFAULT_CLICHE_BLACKLIST: ClicheItem[] = [
  { id: 'cliche-1', phrase: 'Honestly, one of the best...', active: true },
  { id: 'cliche-2', phrase: 'Had an amazing experience...', active: true },
  { id: 'cliche-3', phrase: 'Highly recommend...', active: true },
  { id: 'cliche-4', phrase: 'This place is genuinely...', active: true },
  { id: 'cliche-5', phrase: 'Really impressed...', active: true },
  { id: 'cliche-6', phrase: 'Look no further...', active: true },
  { id: 'cliche-7', phrase: '5 stars!', active: true },
  { id: 'cliche-8', phrase: 'Exceptional establishment', active: true },
  { id: 'cliche-9', phrase: 'Great experience overall', active: true },
];

export const DEFAULT_GLOBAL_RULES: string[] = [
  'Sound like a real, authentic customer sharing a genuine first-hand visit',
  'Mention direct experiences, specific items or staff interactions rather than vague praise',
  'Avoid marketing adjectives, buzzwords, and promotional hype',
  'Match rating sentiment strictly (positive for 5-star, balanced/fair for lower ratings)',
  'Do not invent nonexistent products, services or doctor names',
  'Strictly adhere to the specific business category vertical vocabulary',
  'Use the business AI intelligence profile and customer-selected tags naturally',
  'Integrate customer-provided custom notes with highest priority',
];

export const DEFAULT_AI_SETTINGS: AiSettingsRecord = {
  id: 'global',
  aiEnabled: true,
  reviewGenerationEnabled: true,
  dynamicTagsEnabled: true,
  aiInsightsEnabled: true,
  ownerReplyAssistantEnabled: true,
  englishEnabled: true,
  hindiEnabled: true,
  marathiEnabled: true,
  defaultReviewLength: 'medium',
  defaultTone: 'casual',
  locationMentionPercentage: 40,
  minWords: 15,
  maxWords: 40,
  maxEmojis: 1,
  maxExclamations: 1,
  globalRules: DEFAULT_GLOBAL_RULES,
  clicheBlacklist: DEFAULT_CLICHE_BLACKLIST,
  modelName: 'gemini-2.5-flash',
  temperature: 0.7,
  maxOutputTokens: 800,
  updatedAt: new Date().toISOString(),
  updatedBy: 'SYSTEM',
};

export const INITIAL_PROMPT_VERSION: AiPromptVersionRecord = {
  id: 'prompt-v1-production',
  version: 'v1.0.0',
  name: 'Production Natural Review Engine',
  description: 'Baseline production prompt version with dynamic sentence variation, location intelligence, customer personas, and anti-cliché filters.',
  globalRules: DEFAULT_GLOBAL_RULES,
  systemInstructionTemplate: 'You are an authentic local customer leaving a short, natural Google review.',
  createdBy: 'SYSTEM',
  createdAt: new Date().toISOString(),
  active: true,
};

// ── In-Memory Configuration Cache with 60s TTL ──────────────────────────────
let aiConfigCache: {
  settings: AiSettingsRecord | null;
  activePrompt: AiPromptVersionRecord | null;
  cachedAt: number;
} = {
  settings: null,
  activePrompt: null,
  cachedAt: 0,
};

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function invalidateAiConfigCache(): void {
  aiConfigCache = { settings: null, activePrompt: null, cachedAt: 0 };
}

let aiSeedPromise: Promise<void> | null = null;

export async function seedDefaultAiConfigIfEmpty(): Promise<void> {
  if (aiSeedPromise) return aiSeedPromise;
  aiSeedPromise = (async () => {
    try {
      // 1. Check & seed AI Settings
      const settingsDocRef = doc(db, 'aiSettings', 'global');
      const settingsSnap = await getDoc(settingsDocRef);
      if (!settingsSnap.exists()) {
        await setDoc(settingsDocRef, DEFAULT_AI_SETTINGS);
        console.log('[AI Control] Seeded default global AI settings into Firestore.');
      }

      // 2. Check & seed Active Prompt Version
      const promptColRef = collection(db, 'aiPromptVersions');
      const promptSnap = await getDocs(promptColRef);
      if (promptSnap.empty) {
        const promptDocRef = doc(db, 'aiPromptVersions', INITIAL_PROMPT_VERSION.id);
        await setDoc(promptDocRef, INITIAL_PROMPT_VERSION);
        console.log('[AI Control] Seeded baseline active prompt version into Firestore.');
      }
    } catch (err) {
      console.warn('[AI Control] Seeding check error:', err);
    }
  })();
  return aiSeedPromise;
}

export async function getAiSettings(): Promise<AiSettingsRecord> {
  const now = Date.now();
  if (aiConfigCache.settings && now - aiConfigCache.cachedAt < CACHE_TTL_MS) {
    return aiConfigCache.settings;
  }

  try {
    await seedDefaultAiConfigIfEmpty();
    const docRef = doc(db, 'aiSettings', 'global');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as AiSettingsRecord;
      aiConfigCache.settings = { ...DEFAULT_AI_SETTINGS, ...data };
      aiConfigCache.cachedAt = now;
      return aiConfigCache.settings;
    }
  } catch (err) {
    console.warn('getAiSettings error:', err);
  }

  return DEFAULT_AI_SETTINGS;
}

export async function saveAiSettings(
  updates: Partial<AiSettingsRecord>,
  adminId: string
): Promise<AiSettingsRecord> {
  await seedDefaultAiConfigIfEmpty();
  const current = await getAiSettings();

  const updated: AiSettingsRecord = {
    ...current,
    ...updates,
    id: 'global',
    updatedAt: new Date().toISOString(),
    updatedBy: adminId,
  };

  const docRef = doc(db, 'aiSettings', 'global');
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(updated)) {
    if (v !== undefined) clean[k] = v;
  }

  await setDoc(docRef, clean, { merge: true });
  invalidateAiConfigCache();
  return updated;
}

export async function getAllPromptVersions(): Promise<AiPromptVersionRecord[]> {
  try {
    await seedDefaultAiConfigIfEmpty();
    const colRef = collection(db, 'aiPromptVersions');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const versions: AiPromptVersionRecord[] = [];
      snapshot.forEach((d) => {
        versions.push(d.data() as AiPromptVersionRecord);
      });
      return versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (err) {
    console.warn('getAllPromptVersions error:', err);
  }
  return [INITIAL_PROMPT_VERSION];
}

export async function getPromptVersionById(id: string): Promise<AiPromptVersionRecord | null> {
  try {
    await seedDefaultAiConfigIfEmpty();
    const docRef = doc(db, 'aiPromptVersions', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) return snap.data() as AiPromptVersionRecord;
  } catch (err) {
    console.warn('getPromptVersionById error:', err);
  }
  return id === INITIAL_PROMPT_VERSION.id ? INITIAL_PROMPT_VERSION : null;
}

export async function getActivePromptVersion(): Promise<AiPromptVersionRecord> {
  const now = Date.now();
  if (aiConfigCache.activePrompt && now - aiConfigCache.cachedAt < CACHE_TTL_MS) {
    return aiConfigCache.activePrompt;
  }

  try {
    await seedDefaultAiConfigIfEmpty();
    const colRef = collection(db, 'aiPromptVersions');
    const q = query(colRef, where('active', '==', true));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const active = snap.docs[0].data() as AiPromptVersionRecord;
      aiConfigCache.activePrompt = active;
      aiConfigCache.cachedAt = now;
      return active;
    }
  } catch (err) {
    console.warn('getActivePromptVersion error:', err);
  }

  return INITIAL_PROMPT_VERSION;
}

export async function savePromptVersion(version: AiPromptVersionRecord): Promise<void> {
  const docRef = doc(db, 'aiPromptVersions', version.id);
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(version)) {
    if (v !== undefined) clean[k] = v;
  }
  await setDoc(docRef, clean, { merge: true });
  invalidateAiConfigCache();
}

export async function activatePromptVersion(versionId: string, _adminId: string): Promise<AiPromptVersionRecord | null> {
  const versions = await getAllPromptVersions();
  const target = versions.find((v) => v.id === versionId);
  if (!target) return null;

  // Deactivate all others, activate target
  for (const v of versions) {
    const shouldBeActive = v.id === versionId;
    if (v.active !== shouldBeActive) {
      await savePromptVersion({ ...v, active: shouldBeActive });
    }
  }

  invalidateAiConfigCache();
  return { ...target, active: true };
}



