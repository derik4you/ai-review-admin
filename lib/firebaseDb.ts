import { db } from './firebase';
import {
  collection, getDocs, doc, setDoc, query, where, getDoc, updateDoc
} from 'firebase/firestore';
import { getJsonBusinesses, saveJsonBusiness, getJsonStands, saveJsonStands, BusinessRecord, QrStandRecord } from './jsonDb';

export type { BusinessRecord, QrStandRecord };

export interface FeedbackRecord {
  id: string;
  businessId: string;
  businessSlug?: string;
  rating: number;
  customerName?: string | null;
  customerContact?: string | null;
  message: string;
  status: 'UNRESOLVED' | 'RESOLVED' | string;
  createdAt: string;
}

// ─────────────────────────────────────────────
// Get a single business by its loginId (with flexible match)
// ─────────────────────────────────────────────
export async function getBusinessByLoginId(loginId: string): Promise<BusinessRecord | null> {
  const clean = loginId.trim().toLowerCase();
  const normalized = clean.replace(/[^a-z0-9]/g, '');

  try {
    const colRef = collection(db, 'businesses');
    const q = query(colRef, where('loginId', '==', clean));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      const data = d.data();
      return formatBusinessDoc(d.id, data);
    }

    // Secondary scan across businesses to match normalized loginId or slug
    const allDocs = await getDocs(colRef);
    for (const d of allDocs.docs) {
      const data = d.data();
      const docLogin = (data.loginId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const docSlug = (data.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (docLogin === normalized || docSlug === normalized) {
        return formatBusinessDoc(d.id, data);
      }
    }
  } catch (err) {
    console.warn('getBusinessByLoginId warning:', err);
  }

  // Fallback: check local JSON cache
  const jsonBusinesses = getJsonBusinesses();
  return (
    jsonBusinesses.find(
      (b) =>
        (b as any).loginId === clean ||
        ((b as any).loginId || '').replace(/[^a-z0-9]/g, '') === normalized
    ) || null
  );
}

// ─────────────────────────────────────────────
// Check whether a loginId is already taken
// ─────────────────────────────────────────────
export async function checkLoginIdExists(loginId: string): Promise<boolean> {
  const clean = loginId.trim().toLowerCase();
  try {
    const colRef = collection(db, 'businesses');
    const q = query(colRef, where('loginId', '==', clean));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return true;
  } catch (err) {
    console.warn('checkLoginIdExists warning:', err);
  }
  const jsonBusinesses = getJsonBusinesses();
  return jsonBusinesses.some((b) => (b as any).loginId === clean);
}

// ─────────────────────────────────────────────
// Get a single business document by its Firestore doc ID
// ─────────────────────────────────────────────
export async function getBusinessById(id: string): Promise<BusinessRecord | null> {
  const cleanId = String(id).trim();
  try {
    const docRef = doc(db, 'businesses', cleanId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return formatBusinessDoc(snapshot.id, snapshot.data());
    }

    // Look by field id or slug
    const colRef = collection(db, 'businesses');
    const q = query(colRef, where('id', '==', cleanId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return formatBusinessDoc(snap.docs[0].id, snap.docs[0].data());
    }
  } catch (err) {
    console.warn('getBusinessById warning:', err);
  }

  const jsonBusinesses = getJsonBusinesses();
  return jsonBusinesses.find((b) => b.id === cleanId) || null;
}

// ─────────────────────────────────────────────
// Get a single business by slug
// ─────────────────────────────────────────────
export async function getBusinessBySlug(slug: string): Promise<BusinessRecord | null> {
  try {
    const colRef = collection(db, 'businesses');
    const q = query(colRef, where('slug', '==', slug));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      return formatBusinessDoc(d.id, d.data());
    }
  } catch (err) {
    console.warn('getBusinessBySlug warning:', err);
  }
  const jsonBusinesses = getJsonBusinesses();
  return jsonBusinesses.find((b) => b.slug === slug) || null;
}

// ─────────────────────────────────────────────
// Get ALL businesses
// ─────────────────────────────────────────────
export async function getBusinessesFromFirebase(): Promise<BusinessRecord[]> {
  try {
    const colRef = collection(db, 'businesses');
    const snapshot = await getDocs(colRef);
    const fbList: BusinessRecord[] = [];

    snapshot.forEach((d) => {
      fbList.push(formatBusinessDoc(d.id, d.data()));
    });

    if (fbList.length > 0) {
      fbList.forEach((b) => saveJsonBusiness(b));
      return fbList;
    }
  } catch (err) {
    console.warn('Firebase getBusinesses warning:', err);
  }
  return getJsonBusinesses();
}

// ─────────────────────────────────────────────
// Save / update a business document (stores assigned stands inside doc)
// ─────────────────────────────────────────────
export async function saveBusinessToFirebase(record: BusinessRecord): Promise<void> {
  saveJsonBusiness(record);

  try {
    const docId = record.id || record.slug;
    const docRef = doc(db, 'businesses', docId);
    await setDoc(docRef, record, { merge: true });
  } catch (err) {
    console.warn('Firebase saveBusiness warning:', err);
  }
}

// ─────────────────────────────────────────────
// QR Stands helpers: Read from Firestore qr_stands collection
// ─────────────────────────────────────────────
export async function getStandsFromFirebase(): Promise<QrStandRecord[]> {
  const baseStands = getJsonStands();
  try {
    const colRef = collection(db, 'qr_stands');
    const snapshot = await getDocs(colRef);
    const fbStands: QrStandRecord[] = [];

    snapshot.forEach((d) => {
      const data = d.data();
      fbStands.push({
        standNumber: Number(data.standNumber),
        status: (data.status === 'ASSIGNED' ? 'ASSIGNED' : 'UNASSIGNED') as 'ASSIGNED' | 'UNASSIGNED',
        businessId: data.businessId || null,
        businessName: data.businessName || null,
        businessSlug: data.businessSlug || null,
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });

    const maxStand = Math.max(100, ...baseStands.map((s) => s.standNumber), ...fbStands.map((s) => s.standNumber));
    const standMap = new Map<number, QrStandRecord>();

    for (let i = 1; i <= maxStand; i++) {
      const existing = baseStands.find((s) => s.standNumber === i);
      standMap.set(i, existing || {
        standNumber: i,
        status: 'UNASSIGNED',
        businessId: null,
        businessName: null,
        businessSlug: null,
        updatedAt: new Date().toISOString(),
      });
    }

    fbStands.forEach((fbStand) => {
      standMap.set(fbStand.standNumber, fbStand);
    });

    const merged = Array.from(standMap.values()).sort((a, b) => a.standNumber - b.standNumber);
    saveJsonStands(merged);
    return merged;
  } catch (err) {
    console.warn('Firebase getStands warning:', err);
  }
  return baseStands;
}

// ─────────────────────────────────────────────
// Update Stand in Firestore (stores QR stand in qr_stands AND in business doc)
// ─────────────────────────────────────────────
export async function updateStandInFirebase(
  standNumber: number,
  businessId: string | null,
  businessName?: string | null,
  businessSlug?: string | null
): Promise<void> {
  const isUnbind = !businessId || businessId === 'UNBIND' || businessId === 'null';

  const updateData: QrStandRecord = {
    standNumber,
    status: isUnbind ? 'UNASSIGNED' : 'ASSIGNED',
    businessId: isUnbind ? null : businessId,
    businessName: isUnbind ? null : businessName || null,
    businessSlug: isUnbind ? null : businessSlug || null,
    updatedAt: new Date().toISOString(),
  };

  const currentStands = getJsonStands();
  const updatedList: QrStandRecord[] = currentStands.map((s) => {
    if (s.standNumber === standNumber) {
      return { ...s, ...updateData };
    }
    return s;
  });
  saveJsonStands(updatedList);

  try {
    // 1. Save to Firestore qr_stands collection
    const standDocRef = doc(db, 'qr_stands', `stand-${standNumber}`);
    await setDoc(standDocRef, updateData, { merge: true });

    // 2. Also update the business document with its assigned stand
    if (!isUnbind && businessId) {
      const bizDocRef = doc(db, 'businesses', businessId);
      await setDoc(
        bizDocRef,
        {
          assignedStandNumber: standNumber,
          assignedStandUrl: `/q/${standNumber}`,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('Firebase updateStand warning:', err);
  }
}

// Helper to format Firestore Business document
function formatBusinessDoc(docId: string, data: any): BusinessRecord {
  return {
    id: data.id || docId,
    loginId: data.loginId || '',
    passwordHash: data.passwordHash || '',
    name: data.name,
    slug: data.slug,
    category: data.category || 'General Store',
    description: data.description || null,
    googleReviewUrl: data.googleReviewUrl || null,
    googlePlaceId: data.googlePlaceId || null,
    positiveTags: data.positiveTags || JSON.stringify(['Great Service', 'Friendly Staff']),
    keywords: data.keywords || '',
    assignedStandNumber: data.assignedStandNumber || null,
    assignedStandUrl: data.assignedStandUrl || null,
    createdAt: data.createdAt || new Date().toISOString(),
    ownerEmail: data.ownerEmail || null,
  } as any;
}

// ─────────────────────────────────────────────
// Feedbacks helpers
// ─────────────────────────────────────────────
export async function getFeedbacksFromFirebase(businessId?: string, status?: string): Promise<FeedbackRecord[]> {
  try {
    const colRef = collection(db, 'feedbacks');
    let q = query(colRef);
    if (businessId && businessId !== 'ALL') {
      q = query(colRef, where('businessId', '==', businessId));
    }
    if (status && status !== 'ALL') {
      q = query(colRef, where('status', '==', status));
    }
    const snapshot = await getDocs(q);
    const list: FeedbackRecord[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      list.push({
        id: data.id || d.id,
        businessId: data.businessId,
        businessSlug: data.businessSlug,
        rating: Number(data.rating),
        customerName: data.customerName || null,
        customerContact: data.customerContact || null,
        message: data.message || '',
        status: data.status || 'UNRESOLVED',
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });
    return list;
  } catch (err) {
    console.warn('getFeedbacksFromFirebase warning:', err);
    return [];
  }
}

export async function saveFeedbackToFirebase(feedback: FeedbackRecord): Promise<void> {
  try {
    const docRef = doc(db, 'feedbacks', feedback.id);
    await setDoc(docRef, feedback, { merge: true });
  } catch (err) {
    console.warn('saveFeedbackToFirebase warning:', err);
  }
}

