import { db } from './firebase';
import {
  collection, getDocs, doc, setDoc, query, where, getDoc
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// NEW: Get a single business by its loginId
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getBusinessByLoginId(loginId: string): Promise<BusinessRecord | null> {
  const clean = loginId.trim().toLowerCase();
  try {
    const colRef = collection(db, 'businesses');
    const q = query(colRef, where('loginId', '==', clean));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      const data = d.data();
      return {
        id: data.id || d.id,
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
        createdAt: data.createdAt || new Date().toISOString(),
        ownerEmail: data.ownerEmail || null,
      } as BusinessRecord;
    }
  } catch (err) {
    console.warn('getBusinessByLoginId warning:', err);
  }
  // Fallback: check local JSON cache
  const jsonBusinesses = getJsonBusinesses();
  return (jsonBusinesses.find((b) => (b as any).loginId === clean) as BusinessRecord) || null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// NEW: Check whether a loginId is already taken
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  // Fallback: check local cache
  const jsonBusinesses = getJsonBusinesses();
  return jsonBusinesses.some((b) => (b as any).loginId === clean);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Get a single business document by its Firestore doc ID
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getBusinessById(id: string): Promise<BusinessRecord | null> {
  const cleanId = String(id).trim();
  try {
    // 1. Direct doc ID lookup
    const docRef = doc(db, 'businesses', cleanId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        id: data.id || snapshot.id,
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
        createdAt: data.createdAt || new Date().toISOString(),
        ownerEmail: data.ownerEmail || null,
      } as BusinessRecord;
    }
  } catch (err) {
    console.warn('getBusinessById warning:', err);
  }
  // Fallback JSON cache
  const jsonBusinesses = getJsonBusinesses();
  return (jsonBusinesses.find((b) => b.id === id) as BusinessRecord) || null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Get a single business by slug
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getBusinessBySlug(slug: string): Promise<BusinessRecord | null> {
  try {
    const colRef = collection(db, 'businesses');
    const q = query(colRef, where('slug', '==', slug));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      const data = d.data();
      return {
        id: data.id || d.id,
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
        createdAt: data.createdAt || new Date().toISOString(),
        ownerEmail: data.ownerEmail || null,
      } as BusinessRecord;
    }
  } catch (err) {
    console.warn('getBusinessBySlug warning:', err);
  }
  const jsonBusinesses = getJsonBusinesses();
  return (jsonBusinesses.find((b) => b.slug === slug) as BusinessRecord) || null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Get ALL businesses
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getBusinessesFromFirebase(): Promise<BusinessRecord[]> {
  try {
    const colRef = collection(db, 'businesses');
    const snapshot = await getDocs(colRef);
    const fbList: BusinessRecord[] = [];

    snapshot.forEach((d) => {
      const data = d.data();
      fbList.push({
        id: data.id || d.id,
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
        createdAt: data.createdAt || new Date().toISOString(),
        ownerEmail: data.ownerEmail || null,
      } as BusinessRecord);
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Save / update a business document
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function saveBusinessToFirebase(record: BusinessRecord): Promise<void> {
  saveJsonBusiness(record);

  try {
    const docRef = doc(db, 'businesses', record.id || record.slug);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 4000));
    await Promise.race([setDoc(docRef, record, { merge: true }), timeoutPromise]);
  } catch (err) {
    console.warn('Firebase saveBusiness warning:', err);
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// QR Stands helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getStandsFromFirebase(): Promise<QrStandRecord[]> {
  const baseStands = getJsonStands();
  try {
    const colRef = collection(db, 'qr_stands');
    const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000));
    const snapshot: any = await Promise.race([getDocs(colRef), timeoutPromise]);
    const fbStands: QrStandRecord[] = [];

    snapshot.forEach((d: any) => {
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

    // Merge Firestore stands into the complete base inventory
    const maxStand = Math.max(100, ...baseStands.map((s) => s.standNumber), ...fbStands.map((s) => s.standNumber));
    const standMap = new Map<number, QrStandRecord>();

    for (let i = 1; i <= maxStand; i++) {
      standMap.set(i, {
        standNumber: i,
        status: 'UNASSIGNED',
        businessId: null,
        businessName: null,
        businessSlug: null,
        updatedAt: new Date().toISOString(),
      });
    }

    baseStands.forEach((s) => standMap.set(s.standNumber, s));
    fbStands.forEach((s) => standMap.set(s.standNumber, s));

    const merged = Array.from(standMap.values()).sort((a, b) => a.standNumber - b.standNumber);
    saveJsonStands(merged);
    return merged;
  } catch (err) {
    console.warn('Firebase getStands warning:', err);
  }
  return baseStands;
}

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
    const docRef = doc(db, 'qr_stands', `stand-${standNumber}`);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000));
    await Promise.race([setDoc(docRef, updateData, { merge: true }), timeoutPromise]);
  } catch (err) {
    console.warn('Firebase updateStand warning:', err);
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Feedback helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function saveFeedbackToFirebase(feedback: FeedbackRecord): Promise<void> {
  try {
    const docRef = doc(db, 'feedbacks', feedback.id);
    await setDoc(docRef, feedback, { merge: true });
  } catch (err) {
    console.warn('Firebase saveFeedback warning:', err);
  }
}

export async function getFeedbacksFromFirebase(businessId?: string, status?: string): Promise<FeedbackRecord[]> {
  try {
    const colRef = collection(db, 'feedbacks');
    const snapshot = await getDocs(colRef);
    let list: FeedbackRecord[] = [];

    snapshot.forEach((d) => {
      const data = d.data();
      list.push({
        id: data.id || d.id,
        businessId: data.businessId,
        businessSlug: data.businessSlug || '',
        rating: Number(data.rating),
        customerName: data.customerName || null,
        customerContact: data.customerContact || null,
        message: data.message,
        status: data.status || 'UNRESOLVED',
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });

    if (businessId && businessId !== 'ALL') {
      list = list.filter((f) => f.businessId === businessId);
    }

    if (status && status !== 'ALL') {
      list = list.filter((f) => f.status === status);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.warn('Firebase getFeedbacks warning:', err);
    return [];
  }
}

