import { GoogleGenAI } from '@google/genai';
import { BusinessAiProfile, BusinessRecord } from './jsonDb';

// Reusable Gemini client helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// ─────────────────────────────────────────────
// Normalized Category System (14 verticals + Custom)
// ─────────────────────────────────────────────
export type NormalizedCategory =
  | 'PET_SHOP'
  | 'RESTAURANT'
  | 'CAFE'
  | 'SALON'
  | 'CLINIC'
  | 'GYM'
  | 'BAKERY'
  | 'CLOTHING_STORE'
  | 'RETAIL'
  | 'ELECTRONICS_STORE'
  | 'GROCERY_STORE'
  | 'PHARMACY'
  | 'HOTEL'
  | 'SPA'
  | 'AUTOMOBILE_SERVICE'
  | 'AUTOMOBILE'
  | 'OTHER'
  | 'CUSTOM';

export function normalizeCategory(rawCategory: string = ''): NormalizedCategory {
  const clean = (rawCategory || '').trim().toLowerCase();
  if (/\b(automobile|garage|mechanic|car\s*service|bike\s*service|auto\s*repair|tyre|wheel|workshop|motor)\b|car\s*workshop/i.test(clean)) return 'AUTOMOBILE';
  if (/\b(pet|pets|veterinary|dog|cat)\b|pet\s*shop|pet\s*store|pet\s*supplies/i.test(clean)) return 'PET_SHOP';
  if (/\b(rest|restaurant|dining|dosa|thali|dhaba|bistro|eatery|biryani|burger|pizza)\b|food\s*joint|food\s*restaurant/i.test(clean)) return 'RESTAURANT';
  if (/\b(cafe|coffee|tea|brew|espresso|boba|beverage)\b|cafe\s*and\s*lounge/i.test(clean)) return 'CAFE';
  if (/\b(salon|parlour|parlor|haircut|barber|grooming)\b|hair\s*styl|beauty\s*salon|unisex\s*salon/i.test(clean)) return 'SALON';
  if (/\b(clinic|doctor|dental|dentist|hospital|physiotherapy|pathology)\b|medical\s*clinic|healthcare|eye\s*care/i.test(clean)) return 'CLINIC';
  if (/\b(gym|fitness|crossfit|workout|yoga|pilates|bodybuilding)\b|training\s*center/i.test(clean)) return 'GYM';
  if (/\b(bakery|cake|cakes|pastry|pastries|bake|bread|confectionery|patisserie)\b/i.test(clean)) return 'BAKERY';
  if (/\b(clothing|cloth|apparel|garment|fashion|boutique|textile|tailor|wear|dress|menswear|womenswear|retail)\b/i.test(clean)) return 'RETAIL';
  if (/\b(electronic|electronics|mobile|mobiles|gadget|gadgets|computer|laptop|appliance|appliances|phone|smart\s*watch)\b/i.test(clean)) return 'ELECTRONICS_STORE';
  if (/\b(grocery|supermarket|mart|kirana|provision|vegetable|fruit)\b|daily\s*needs/i.test(clean)) return 'GROCERY_STORE';
  if (/\b(pharmacy|chemist|druggist|medicine|medicines|medico)\b|medical\s*store/i.test(clean)) return 'PHARMACY';
  if (/\b(hotel|resort|lodge|stay|homestay|inn)\b|guest\s*house/i.test(clean)) return 'HOTEL';
  if (/\b(spa|massage|wellness|ayurveda)\b|body\s*spa/i.test(clean)) return 'SPA';
  return 'CUSTOM';
}

export interface CategoryMetadata {
  displayName: string;
  preferredEntityTerms: string[];
  coreVocab: string[];
  prohibitedCrossTerms: RegExp[];
  tags: string[];
}

export const CATEGORY_REGISTRY: Record<NormalizedCategory, CategoryMetadata> = {
  PET_SHOP: {
    displayName: 'Pet Shop',
    preferredEntityTerms: ['pet shop', 'pet supply store'],
    coreVocab: ['pet food', 'pet supplies', 'accessories', 'toys', 'dog food', 'cat food', 'pet care products', 'treats', 'leash', 'shampoo'],
    prohibitedCrossTerms: [/\b(haircut|hairstyling|stylist|facial)\b/i, /\b(doctor consultation|prescribed|diagnosis|medical treatment|dental cleaning)\b/i, /\b(delicious food|tasty dishes|dinner|lunch|cappuccino|croissant|pasta)\b/i, /\b(workout equipment|gym trainers|dumbbells|bench press)\b/i],
    tags: ['Pet Food Selection', 'Product Variety', 'Helpful Staff', 'Fair Pricing', 'Clean Facility', 'Quick Checkout'],
  },
  RESTAURANT: {
    displayName: 'Restaurant',
    preferredEntityTerms: ['restaurant', 'dining place'],
    coreVocab: ['food taste', 'freshness', 'flavors', 'portions', 'menu', 'dishes', 'dining', 'table service', 'ambiance', 'seating'],
    prohibitedCrossTerms: [/\b(pet food|dog food|cat litter|pet accessories|puppy food)\b/i, /\b(haircut|hair styling|stylist|hair salon)\b/i, /\b(doctor consultation|medical diagnosis|treatment|prescriptions)\b/i, /\b(workout equipment|gym membership|treadmill)\b/i],
    tags: ['Food Taste', 'Food Quality', 'Fast Service', 'Pleasant Ambience', 'Generous Portions', 'Friendly Staff'],
  },
  CAFE: {
    displayName: 'Cafe',
    preferredEntityTerms: ['cafe', 'coffee shop'],
    coreVocab: ['coffee', 'cappuccino', 'latte', 'beverages', 'pastries', 'snacks', 'cozy vibe', 'barista', 'seating', 'brew'],
    prohibitedCrossTerms: [/\b(pet food|dog food|cat supplies|pet shop)\b/i, /\b(haircut|hair styling|facial|pedicure)\b/i, /\b(doctor consultation|medical treatment|clinic)\b/i, /\b(workout equipment|gym trainers)\b/i],
    tags: ['Great Coffee', 'Cozy Ambiance', 'Fresh Bakery', 'Quick Service', 'Friendly Barista', 'Comfortable Seating'],
  },
  SALON: {
    displayName: 'Salon',
    preferredEntityTerms: ['salon', 'hair salon', 'grooming lounge'],
    coreVocab: ['haircut', 'styling', 'stylist', 'grooming', 'hair care', 'cleanliness', 'appointment', 'consultation', 'hygiene'],
    prohibitedCrossTerms: [/\b(delicious food|tasty dish|fresh meal|cappuccino|dinner)\b/i, /\b(pet food|pet accessories|dog shampoo|puppy food)\b/i, /\b(doctor consultation|medical prescription|diagnosis|clinic)\b/i, /\b(workout machines|gym membership|dumbbells)\b/i],
    tags: ['Quality Haircut', 'Skilled Stylist', 'Hygienic Setup', 'Prompt Appointment', 'Polite Staff', 'Value for Money'],
  },
  CLINIC: {
    displayName: 'Clinic',
    preferredEntityTerms: ['clinic', 'healthcare center'],
    coreVocab: ['doctor', 'consultation', 'diagnosis', 'treatment', 'patient care', 'explanation', 'waiting time', 'hygiene', 'appointment'],
    prohibitedCrossTerms: [/\b(delicious food|tasty dish|fresh meal|cappuccino|restaurant)\b/i, /\b(haircut|hair styling|stylist|salon)\b/i, /\b(pet food|dog leash|pet supplies)\b/i, /\b(workout machines|gym training|crossfit)\b/i],
    tags: ['Doctor Consultation', 'Clear Explanation', 'Polite Staff', 'Clean Clinic', 'Minimal Wait Time', 'Reassuring Care'],
  },
  GYM: {
    displayName: 'Gym & Fitness',
    preferredEntityTerms: ['gym', 'fitness center'],
    coreVocab: ['workout', 'equipment', 'trainers', 'weights', 'cleanliness', 'atmosphere', 'training guidance', 'facilities'],
    prohibitedCrossTerms: [/\b(delicious food|dinner|cocktails|restaurant|pastry)\b/i, /\b(haircut|hair coloring|stylist|salon)\b/i, /\b(pet food|cat food|dog accessories)\b/i, /\b(doctor consultation|medical surgery|clinic)\b/i],
    tags: ['Modern Equipment', 'Helpful Trainers', 'Clean Environment', 'Great Workout Vibe', 'Spacious Floor', 'Supportive Staff'],
  },
  BAKERY: {
    displayName: 'Bakery',
    preferredEntityTerms: ['bakery', 'cake shop'],
    coreVocab: ['fresh cakes', 'pastries', 'bread', 'baked goods', 'custom cakes', 'packaging', 'sweet treats', 'freshness'],
    prohibitedCrossTerms: [/\b(haircut|stylist|salon)\b/i, /\b(doctor consultation|clinic|prescriptions)\b/i, /\b(pet food|pet accessories)\b/i, /\b(gym workout|trainers|dumbbells)\b/i],
    tags: ['Fresh Cakes', 'Delicious Pastries', 'Custom Designs', 'Quick Service', 'Polite Staff', 'Neat Packaging'],
  },
  CLOTHING_STORE: {
    displayName: 'Clothing Store',
    preferredEntityTerms: ['clothing store', 'boutique', 'fashion outlet'],
    coreVocab: ['collection', 'fabric quality', 'fitting', 'outfits', 'variety', 'designs', 'trial rooms', 'pricing'],
    prohibitedCrossTerms: [/\b(delicious food|tasty dishes|dinner|coffee)\b/i, /\b(haircut|facial|hair salon)\b/i, /\b(doctor consultation|clinic)\b/i, /\b(pet food|dog accessories)\b/i],
    tags: ['Latest Collection', 'Fabric Quality', 'Perfect Fitting', 'Helpful Staff', 'Fair Pricing', 'Wide Variety'],
  },
  ELECTRONICS_STORE: {
    displayName: 'Electronics Store',
    preferredEntityTerms: ['electronics shop', 'gadget store'],
    coreVocab: ['gadgets', 'appliances', 'mobiles', 'specifications', 'demo', 'warranty guidance', 'billing', 'accessories'],
    prohibitedCrossTerms: [/\b(delicious food|coffee|restaurant)\b/i, /\b(haircut|stylist|salon)\b/i, /\b(doctor consultation|clinic)\b/i, /\b(pet food|dog food)\b/i],
    tags: ['Product Knowledge', 'Genuine Gadgets', 'Helpful Demo', 'Quick Billing', 'Fair Pricing', 'Warranty Guidance'],
  },
  GROCERY_STORE: {
    displayName: 'Grocery Store',
    preferredEntityTerms: ['grocery mart', 'provision store'],
    coreVocab: ['fresh groceries', 'provisions', 'daily essentials', 'packaged items', 'stock availability', 'billing speed'],
    prohibitedCrossTerms: [/\b(haircut|stylist|salon)\b/i, /\b(doctor consultation|medical treatment)\b/i, /\b(gym workout|dumbbells)\b/i],
    tags: ['Fresh Stock', 'All Essentials Available', 'Quick Billing', 'Organized Aisles', 'Helpful Staff', 'Fair Pricing'],
  },
  PHARMACY: {
    displayName: 'Pharmacy',
    preferredEntityTerms: ['pharmacy', 'chemist store'],
    coreVocab: ['medicines', 'prescriptions', 'health products', 'dosage guidance', 'availability', 'quick dispensing'],
    prohibitedCrossTerms: [/\b(delicious food|dinner|cocktails|restaurant)\b/i, /\b(haircut|hairstyling|salon)\b/i, /\b(pet food|dog accessories)\b/i, /\b(gym equipment)\b/i],
    tags: ['Medicine Availability', 'Accurate Dispensing', 'Helpful Pharmacist', 'Quick Billing', 'Genuine Medicines', 'Clear Guidance'],
  },
  HOTEL: {
    displayName: 'Hotel',
    preferredEntityTerms: ['hotel', 'guest stay'],
    coreVocab: ['room cleanliness', 'hospitality', 'amenities', 'check-in', 'bed comfort', 'room service', 'location'],
    prohibitedCrossTerms: [/\b(haircut|stylist|salon)\b/i, /\b(pet food|dog leash)\b/i, /\b(doctor consultation|medical clinic)\b/i],
    tags: ['Spotless Rooms', 'Warm Hospitality', 'Smooth Check-in', 'Comfortable Stay', 'Helpful Staff', 'Great Location'],
  },
  SPA: {
    displayName: 'Spa & Wellness',
    preferredEntityTerms: ['spa & wellness center', 'therapy lounge'],
    coreVocab: ['massage', 'therapy', 'relaxation', 'calm ambiance', 'hygiene', 'therapist', 'wellness'],
    prohibitedCrossTerms: [/\b(delicious food|dining|restaurant)\b/i, /\b(pet food|dog food)\b/i, /\b(workout weights|gym equipment)\b/i],
    tags: ['Relaxing Therapy', 'Skilled Therapist', 'Peaceful Ambiance', 'Clean & Hygienic', 'Courteous Staff', 'Rejuvenating Experience'],
  },
  AUTOMOBILE_SERVICE: {
    displayName: 'Automobile Service',
    preferredEntityTerms: ['automobile workshop', 'service center'],
    coreVocab: ['vehicle servicing', 'repairs', 'mechanic', 'spare parts', 'timely delivery', 'transparent billing', 'maintenance'],
    prohibitedCrossTerms: [/\b(delicious food|coffee|restaurant)\b/i, /\b(haircut|stylist|salon)\b/i, /\b(doctor consultation|clinic)\b/i, /\b(pet food|dog food)\b/i],
    tags: ['Timely Servicing', 'Skilled Mechanics', 'Transparent Estimate', 'Genuine Parts', 'Smooth Handover', 'Helpful Staff'],
  },
  AUTOMOBILE: {
    displayName: 'Automobile Service',
    preferredEntityTerms: ['automobile workshop', 'service center'],
    coreVocab: ['vehicle servicing', 'repairs', 'mechanic', 'spare parts', 'timely delivery', 'transparent billing', 'maintenance'],
    prohibitedCrossTerms: [/\b(delicious food|coffee|restaurant)\b/i, /\b(haircut|stylist|salon)\b/i, /\b(doctor consultation|clinic)\b/i, /\b(pet food|dog food)\b/i],
    tags: ['Timely Servicing', 'Skilled Mechanics', 'Transparent Estimate', 'Genuine Parts', 'Smooth Handover', 'Helpful Staff'],
  },
  RETAIL: {
    displayName: 'Retail & Clothing',
    preferredEntityTerms: ['retail store', 'clothing boutique', 'fashion outlet'],
    coreVocab: ['collection', 'fabric quality', 'fitting', 'variety', 'trends', 'staff guidance', 'pricing', 'discounts'],
    prohibitedCrossTerms: [/\b(delicious food|fresh food|restaurant)\b/i, /\b(haircut|stylist|salon)\b/i, /\b(doctor consultation|clinic)\b/i, /\b(pet food|dog food)\b/i],
    tags: ['Latest Collection', 'Product Variety', 'Helpful Staff', 'Fair Pricing', 'Fitting Comfort', 'Easy Billing'],
  },
  OTHER: {
    displayName: 'General Business',
    preferredEntityTerms: ['shop', 'business'],
    coreVocab: ['service', 'quality', 'products', 'assistance', 'staff', 'pricing'],
    prohibitedCrossTerms: [],
    tags: ['Great Service', 'Friendly Staff', 'High Quality', 'Prompt Assistance', 'Fair Pricing', 'Clean Environment'],
  },
  CUSTOM: {
    displayName: 'Store',
    preferredEntityTerms: ['shop', 'business'],
    coreVocab: ['service', 'quality', 'products', 'assistance', 'staff', 'pricing'],
    prohibitedCrossTerms: [],
    tags: ['Great Service', 'Friendly Staff', 'High Quality', 'Prompt Assistance', 'Fair Pricing', 'Clean Environment'],
  },
};

export function getCategoryContext(category: string = ''): CategoryMetadata {
  const normalized = normalizeCategory(category);
  return CATEGORY_REGISTRY[normalized] || CATEGORY_REGISTRY.CUSTOM;
}

// ─────────────────────────────────────────────
// Cross-Category Vocabulary Contamination Validator
// ─────────────────────────────────────────────
export function validateCategoryIntegrity(
  reviewText: string,
  normalizedCategory: NormalizedCategory
): { isValid: boolean; contaminatedWord?: string } {
  if (!reviewText) return { isValid: true };
  const meta = CATEGORY_REGISTRY[normalizedCategory];
  if (!meta || !meta.prohibitedCrossTerms.length) return { isValid: true };

  for (const regex of meta.prohibitedCrossTerms) {
    const match = reviewText.match(regex);
    if (match) {
      return { isValid: false, contaminatedWord: match[0] };
    }
  }
  return { isValid: true };
}

// ─────────────────────────────────────────────
// Fallback AI Profile Generator (deterministic)
// ─────────────────────────────────────────────
export function generateFallbackProfile(business: {
  name: string;
  category?: string;
  city?: string | null;
  location?: string | null;
  description?: string | null;
  keywords?: string;
  services?: string | string[] | null;
}): { aiProfile: BusinessAiProfile; reviewTags: string[] } {
  const name = business.name || 'Our Business';
  const cat = business.category || 'General Business';
  const normalized = normalizeCategory(cat);
  const meta = CATEGORY_REGISTRY[normalized] || CATEGORY_REGISTRY.CUSTOM;
  const entityTerm = meta.preferredEntityTerms[0] || cat;
  const loc = business.city || business.location ? ` in ${business.city || business.location}` : '';
  const desc = business.description || `Quality ${entityTerm}${loc} serving local customers with care and professionalism.`;
  const parsedServices = Array.isArray(business.services)
    ? business.services
    : typeof business.services === 'string' && business.services
    ? business.services.split(',').map((s) => s.trim()).filter(Boolean)
    : meta.coreVocab.slice(0, 3);

  const aiProfile: BusinessAiProfile = {
    businessPersonality: `Welcoming, dependable, customer-focused ${entityTerm}${loc}`,
    customerType: ['Local residents', 'First-time visitors', 'Regular customers', 'Value-conscious customers'],
    uniqueSellingPoints: [
      `Attentive and friendly customer service`,
      `Consistently high quality across all ${entityTerm} offerings`,
      `Welcoming atmosphere and fair transparent pricing`,
    ],
    importantFeatures: parsedServices.slice(0, 4),
    commonCustomerExperiences: [
      `Quick and hassle-free assistance upon arrival`,
      `Warm interactions with knowledgeable team members`,
      `Leaving satisfied and returning regularly`,
    ],
    preferredReviewStyle: 'Authentic, friendly conversational tone sharing real personal highlights',
    wordsToUse: ['friendly', 'welcoming', 'recommended', 'smooth experience', 'worth visiting', 'great quality'],
    wordsToAvoid: ['exceptional establishment', 'synergistic organization', 'top-notch establishment', 'world-class conglomerate'],
    reviewExamples: [
      `Great experience at ${name}! The team was helpful and everything went smoothly.`,
      `Loved the service and friendly atmosphere at ${name}. 5 stars!`,
    ],
    suggestedKeywords: [name, cat, ...(business.city ? [business.city] : []), ...parsedServices.slice(0, 3)],
    lastGeneratedAt: new Date().toISOString(),
  };

  return {
    aiProfile,
    reviewTags: meta.tags,
  };
}

// ─────────────────────────────────────────────
// FEATURE 2: generateBusinessAIProfile (Gemini powered)
// ─────────────────────────────────────────────
export async function generateBusinessAIProfile(business: {
  id?: string;
  name: string;
  category: string;
  city?: string | null;
  location?: string | null;
  description?: string | null;
  services?: string | string[] | null;
  keywords?: string;
  website?: string | null;
  instagram?: string | null;
}): Promise<{ aiProfile: BusinessAiProfile; reviewTags: string[] }> {
  const ai = getGeminiClient();
  if (!ai) {
    return generateFallbackProfile(business);
  }

  const normalized = normalizeCategory(business.category);
  const meta = CATEGORY_REGISTRY[normalized] || CATEGORY_REGISTRY.CUSTOM;

  const prompt = `You are an expert AI business analyst for a Google Business Growth & Reputation system.
Analyze the following business and generate a rich Customer Review Intelligence Profile (JSON).

Business Details:
- Name: "${business.name}"
- Category: "${business.category}" (Normalized Vertical: ${normalized})
- City / Area Location: "${business.city || business.location || 'Local'}"
- Description: "${business.description || 'Not provided'}"
- Services/Specialties: "${Array.isArray(business.services) ? business.services.join(', ') : business.services || 'Not provided'}"
- Keywords: "${business.keywords || 'None'}"
- Website: "${business.website || 'None'}"
- Instagram: "${business.instagram || 'None'}"

CRITICAL CATEGORY INTELLIGENCE & INSTRUCTIONS:
1. This business belongs strictly to the "${meta.displayName}" vertical (Key: ${normalized}).
2. Focus customer experiences around: ${meta.coreVocab.join(', ')}.
3. Explicitly avoid cross-category terms such as haircuts/salons for food/medical, or doctor terms for restaurants/salons.
4. Generate 6 business-specific customer experience tags appropriate for ${meta.displayName}.

Return ONLY a valid, parseable JSON object matching this exact TypeScript structure:
{
  "businessPersonality": "string describing personality",
  "customerType": ["string", "string", "string"],
  "uniqueSellingPoints": ["string", "string", "string"],
  "importantFeatures": ["string", "string", "string"],
  "commonCustomerExperiences": ["string", "string", "string"],
  "preferredReviewStyle": "string describing natural review style",
  "wordsToUse": ["string", "string", "string", "string"],
  "wordsToAvoid": ["string", "string", "string", "string"],
  "reviewExamples": ["string", "string"],
  "suggestedKeywords": ["string", "string", "string"],
  "reviewTags": ["Tag 1", "Tag 2", "Tag 3", "Tag 4", "Tag 5", "Tag 6"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        topP: 0.9,
      },
    });

    const rawText = response.text || '';
    const cleanJson = rawText.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    const tags: string[] = Array.isArray(parsed.reviewTags) && parsed.reviewTags.length >= 4
      ? parsed.reviewTags.slice(0, 8)
      : meta.tags;

    const aiProfile: BusinessAiProfile = {
      businessPersonality: parsed.businessPersonality || `${business.category} offering friendly service`,
      customerType: Array.isArray(parsed.customerType) ? parsed.customerType : ['Local customers', 'Visitors'],
      uniqueSellingPoints: Array.isArray(parsed.uniqueSellingPoints) ? parsed.uniqueSellingPoints : ['Great service', 'Quality offerings'],
      importantFeatures: Array.isArray(parsed.importantFeatures) ? parsed.importantFeatures : [business.category],
      commonCustomerExperiences: Array.isArray(parsed.commonCustomerExperiences) ? parsed.commonCustomerExperiences : ['Friendly staff', 'Quick service'],
      preferredReviewStyle: parsed.preferredReviewStyle || 'Casual, authentic and friendly review style',
      wordsToUse: Array.isArray(parsed.wordsToUse) ? parsed.wordsToUse : ['friendly', 'recommended', 'great experience'],
      wordsToAvoid: Array.isArray(parsed.wordsToAvoid) ? parsed.wordsToAvoid : ['exceptional establishment', 'synergistic'],
      reviewExamples: Array.isArray(parsed.reviewExamples) ? parsed.reviewExamples : [],
      suggestedKeywords: Array.isArray(parsed.suggestedKeywords) ? parsed.suggestedKeywords : [business.name, business.category],
      lastGeneratedAt: new Date().toISOString(),
    };

    return { aiProfile, reviewTags: tags };
  } catch (err) {
    console.warn('generateBusinessAIProfile error, using deterministic fallback:', err);
    return generateFallbackProfile(business);
  }
}

// ─────────────────────────────────────────────
// FEATURE 3: generateDynamicReviewTags (Gemini powered)
// ─────────────────────────────────────────────
export async function generateDynamicReviewTags(params: {
  name?: string;
  category: string;
  description?: string | null;
  services?: string | string[] | null;
  aiProfile?: BusinessAiProfile | null;
}): Promise<string[]> {
  const { category, description, services, aiProfile } = params;
  const normalized = normalizeCategory(category);
  const meta = CATEGORY_REGISTRY[normalized] || CATEGORY_REGISTRY.CUSTOM;

  const ai = getGeminiClient();
  if (!ai) {
    return meta.tags;
  }

  const prompt = `Generate 6 to 8 short, positive customer experience tags for a "${category}" business (${meta.displayName} vertical).
Examples for ${meta.displayName}: ${meta.tags.join(', ')}.

Context:
- Services: ${Array.isArray(services) ? services.join(', ') : services || 'Standard'}
- Description: ${description || 'Not provided'}
- AI Personality: ${aiProfile?.businessPersonality || 'Not provided'}

Return ONLY a valid JSON array of 6-8 strings. Example: ["${meta.tags[0]}", "${meta.tags[1]}", "${meta.tags[2]}"]`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        topP: 0.9,
      },
    });

    const rawText = response.text || '';
    const cleanJson = rawText.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed) && parsed.length >= 4) {
      return parsed.slice(0, 8).map((t) => String(t).trim()).filter(Boolean);
    }
    return meta.tags;
  } catch (err) {
    console.warn('generateDynamicReviewTags error, using fallback:', err);
    return meta.tags;
  }
}

// ─────────────────────────────────────────────
// FEATURE 4: generateOwnerReply (Gemini powered)
// ─────────────────────────────────────────────
export async function generateOwnerReply(params: {
  businessName: string;
  businessCategory?: string;
  category?: string;
  reviewText: string;
  rating: number;
  reviewerName?: string;
  tone?: 'Professional' | 'Warm & Friendly' | 'Apologetic & Solution-Focused' | 'Short & Casual' | string;
  aiProfile?: BusinessAiProfile | null;
}): Promise<string> {
  const { businessName, reviewText, rating, tone = 'Warm & Friendly', aiProfile } = params;
  const isPositive = rating >= 4;

  const fallbackPositive = `Thank you for taking the time to share your feedback! We are glad you had a positive experience with us and look forward to serving you again.`;
  const fallbackNegative = `Thank you for sharing your experience. We sincerely apologize that your visit did not meet expectations. Please reach out to us directly so we can make this right.`;

  const ai = getGeminiClient();
  if (!ai) {
    return isPositive ? fallbackPositive : fallbackNegative;
  }

  const prompt = `You are the business owner/manager of "${businessName}". Write a short response to this customer review:
- Rating: ${rating} Stars
- Review Content: "${reviewText}"
- Tone: ${tone}
${aiProfile?.businessPersonality ? `- Business Personality: ${aiProfile.businessPersonality}` : ''}

Rules:
1. Speak as the actual business owner/team.
2. If positive (4-5 stars): Thank them warmly and invite them back.
3. If negative (1-3 stars): Acknowledge their concern sincerely without being defensive and invite a resolution.
4. Keep it concise: 2 to 3 natural sentences (max 60 words).
5. Never use corporate buzzwords like "valued patron".
6. Return ONLY the reply message text.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        temperature: 0.8,
        maxOutputTokens: 150,
      },
    });
    return response.text?.trim() || (isPositive ? fallbackPositive : fallbackNegative);
  } catch (err) {
    console.warn('generateOwnerReply error, using fallback:', err);
    return isPositive ? fallbackPositive : fallbackNegative;
  }
}

// ─────────────────────────────────────────────
// Category-Aware Authentic Fallback Review Generator
// ─────────────────────────────────────────────
export function generateCategoryFallbackReview(params: {
  storeName: string;
  storeCategory: string;
  tags: string[];
  rating?: number;
  language?: string;
  city?: string | null;
  location?: string | null;
  storeDescription?: string;
  customNotes?: string;
  variationIndex?: number;
}): string {
  const { storeName, storeCategory, tags, rating = 5, language = 'English', city, location, customNotes, variationIndex = 0 } = params;
  const normalized = normalizeCategory(storeCategory);
  const meta = CATEGORY_REGISTRY[normalized] || CATEGORY_REGISTRY.CUSTOM;

  const primaryTag = tags[0] || meta.tags[0] || 'good service';
  const secondaryTag = tags[1] || meta.tags[1] || 'helpful staff';
  const note = customNotes?.trim() ? ` ${customNotes.trim()}` : '';
  const numRating = Number(rating) || 5;
  const lc = language.toLowerCase();
  const vIdx = Math.abs(variationIndex);
  const cityName = city || location || '';

  // Organic location frequency (~20%, e.g. vIdx % 5 === 0)
  const includeLocation = Boolean(cityName && (vIdx % 5 === 0));

  // Dynamic business name mention (~33% of reviews, e.g. vIdx % 3 === 0)
  const includeBusinessName = (vIdx % 3 === 0);
  const nameRef = includeBusinessName ? storeName : meta.preferredEntityTerms[0] || 'place';

  const marathiStoreRef = includeBusinessName ? storeName : (
    normalized === 'PET_SHOP' ? 'पेट शॉपमध्ये' :
    normalized === 'RESTAURANT' ? 'रेस्टॉरंटमध्ये' :
    normalized === 'CAFE' ? 'कॅफेमध्ये' :
    normalized === 'SALON' ? 'सलूनमध्ये' :
    normalized === 'CLINIC' ? 'क्लिनिकमध्ये' :
    normalized === 'GYM' ? 'जिममध्ये' :
    normalized === 'BAKERY' ? 'बेकरीमध्ये' :
    normalized === 'CLOTHING_STORE' ? 'दुकानमध्ये' : 'इथे'
  );

  const hindiStoreRef = includeBusinessName ? `${storeName} पर` : (
    normalized === 'PET_SHOP' ? 'पेट शॉप पर' :
    normalized === 'RESTAURANT' ? 'रेस्टोरेंट में' :
    normalized === 'CAFE' ? 'कैफे में' :
    normalized === 'SALON' ? 'सैलून पर' :
    normalized === 'CLINIC' ? 'क्लिनिक में' :
    normalized === 'GYM' ? 'जिम में' :
    normalized === 'BAKERY' ? 'बेकरी पर' :
    normalized === 'CLOTHING_STORE' ? 'स्टोर पर' : 'यहाँ'
  );

  // ────────────── Multi-language: Marathi ──────────────
  if (lc === 'marathi') {
    if (numRating === 5) {
      let tpl: string[] = [];
      if (normalized === 'PET_SHOP') {
        tpl = [
          includeLocation
            ? `${cityName} मधील ${marathiStoreRef} पाळीव प्राण्यांसाठी उत्तम खाद्य आणि वस्तू मिळाल्या. कर्मचाऱ्यांनी योग्य मार्गदर्शन केले आणि खरेदीचा अनुभव छान राहिला.`
            : `${marathiStoreRef} पाळीव प्राण्यांसाठी लागणाऱ्या वस्तू सहज मिळाल्या. स्टाफने योग्य प्रॉडक्ट निवडायला मदत केली. काम पटकन झाले आणि समाधान वाटले.`,
          `${primaryTag} खूप चांगली मिळाली आणि स्टाफचे बोलणे नम्र होते. हवी ती उत्पादने सहज उपलब्ध झाली. खरेदीचा अनुभव नक्कीच चांगला राहिला.`,
          includeLocation
            ? `${cityName} मध्ये पेट केअरच्या सामानासाठी ${marathiStoreRef} एक सोयीस्कर पर्याय आहे. वाजवी दरात सर्व गोष्टी मिळाल्या आणि सेवा तत्पर होती.`
            : `इथे ${primaryTag} आणि ${secondaryTag} दोन्ही उत्तम होते. दुकान नीटनेटके आहे आणि लागणाऱ्या वस्तू सहज मिळाल्या.`,
        ];
      } else if (normalized === 'RESTAURANT') {
        tpl = [
          includeLocation
            ? `${cityName} मधील ${marathiStoreRef} जेवणाचा अनुभव खूप छान राहिला. जेवण ताजे आणि चविष्ट होते आणि सेवा वेळेवर मिळाली. बसण्याची व्यवस्था उत्तम होती.`
            : `${marathiStoreRef} जेवण आणि नाश्ता खूप आवडला. स्वच्छता चांगली होती आणि कर्मचाऱ्यांनी ऑर्डर पटकन दिली. पुन्हा नक्की भेट देईन.`,
          `${primaryTag} खूप चांगली मिळाली. पदार्थांची चव उत्तम होती, पोर्शन पुरेसा होता आणि दरही योग्य वाटले. अनुभव समाधानकारक होता.`,
          includeLocation
            ? `${cityName} मध्ये चांगल्या जेवणासाठी ${marathiStoreRef} सोयीस्कर पर्याय आहे. वातावरण छान आहे आणि सेवा तत्पर मिळाली.`
            : `इथे ${primaryTag} आणि ${secondaryTag} दोन्ही उत्तम होते. स्वच्छता छान आणि चवही लाजवाब होती.`,
        ];
      } else if (normalized === 'CAFE') {
        tpl = [
          includeLocation
            ? `${cityName} मधील ${marathiStoreRef} कॉफी आणि स्नॅक्स खूप छान मिळाले. बसण्यासाठी शांत आणि आरामदायक जागा आहे. मित्रांसोबत वेळ घालवायला उत्तम ठिकाण.`
            : `${marathiStoreRef} कॉफीची टेस्ट खूप छान होती आणि बेकरीचे पदार्थही ताजे होते. बरिस्ताचे सहकार्य छान मिळाले आणि ऑर्डर वेळेत तयार झाली.`,
          `${primaryTag} उत्तम होती. कॉफीचा सुगंध आणि वातावरण दोन्ही शांत आणि प्रसन्न वाटले. पुन्हा नक्की येईन.`,
        ];
      } else if (normalized === 'SALON') {
        tpl = [
          includeLocation
            ? `${cityName} येथील ${marathiStoreRef} सेवेचा अनुभव चांगला राहिला. स्टायलिस्टने समजावून घेऊन छान काम केले. सेटअप नीटनेटका आणि स्वच्छ होता.`
            : `${marathiStoreRef} केसांचा कट मला हवा तसाच झाला. स्टायलिस्टने आधी व्यवस्थित समजून घेतले आणि काम उत्तम केले. स्वच्छताही खूप चांगली होती.`,
          `${primaryTag} खूप छान मिळाली. कर्मचाऱ्यांचे सहकार्य लाभले आणि काम समाधानकारक झाले. वाजवी दरात दर्जेदार सेवा मिळाली.`,
        ];
      } else if (normalized === 'CLINIC') {
        tpl = [
          includeLocation
            ? `${cityName} येथील ${marathiStoreRef} डॉक्टरांनी खूप चांगले मार्गदर्शन केले. तपासणी व्यवस्थित झाली आणि स्टाफ नम्र होता. जास्त वेळ थांबावे लागले नाही.`
            : `${marathiStoreRef} डॉक्टरांनी तपासणी व्यवस्थित केली आणि सर्व गोष्टी शांतपणे समजावून सांगितल्या. कर्मचाऱ्यांनी उत्तम सहकार्य केले. वातावरण स्वच्छ आणि सुरक्षित होते.`,
          `${primaryTag} वेळेत मिळाली. तपासणीचा अनुभव समाधानकारक होता आणि योग्य सल्ला मिळाला. कर्मचाऱ्यांचे सहकार्य लाभले.`,
        ];
      } else if (normalized === 'GYM') {
        tpl = [
          includeLocation
            ? `${cityName} मधील ${marathiStoreRef} व्यायामाची सर्व उपकरणे सुसज्ज आहेत. ट्रेनर्स योग्य मार्गदर्शन करतात आणि वर्कआउटसाठी वातावरण खूप उत्साही आहे.`
            : `${marathiStoreRef} वर्कआउटसाठी सर्व मशिन्स उत्तम स्थितीत आहेत. ट्रेनर्सचे लक्ष असते आणि जागाही पुरेशी प्रशस्त आहे. व्यायाम करायला छान वाटते.`,
          `${primaryTag} खूप छान आहे. नियमित व्यायामासाठी सर्व आधुनिक सुविधा उपलब्ध आहेत आणि स्वच्छता चांगली ठेवली आहे.`,
        ];
      } else if (normalized === 'BAKERY') {
        tpl = [
          includeLocation
            ? `${cityName} येथील ${marathiStoreRef} मधील केक आणि पेस्ट्रीज एकदम ताज्या होत्या. पॅकिंगही छान होते आणि ऑर्डर वेळेवर मिळाली.`
            : `${marathiStoreRef} केक आणि बेकरी प्रॉडक्ट्स खूप चविष्ट आणि ताजे होते. वेळेत ऑर्डर मिळाली आणि सर्व्हिस छान होती. डिझाईनही खूप आवडले.`,
          `${primaryTag} उत्तम मिळाली. पदार्थांची क्वालिटी आणि ताजेपणा दोन्ही उत्तम होते. पुन्हा नक्की खरेदी करेन.`,
        ];
      } else if (normalized === 'CLOTHING_STORE') {
        tpl = [
          includeLocation
            ? `${cityName} मधील ${marathiStoreRef} कपड्यांचे चांगले कलेक्शन पाहायला मिळाले. व्हरायटी भरपूर आहे आणि कपड्यांची क्वालिटी उत्तम आहे.`
            : `${marathiStoreRef} कपड्यांची क्वालिटी उत्तम आहे आणि नवीन व्हरायटी सहज मिळाली. स्टाफने योग्य फिटिंग निवडायला मदत केली. खरेदी छान झाली.`,
          `${primaryTag} चांगली मिळाली. कपड्यांचे रंग, डिझाईन्स आणि फिटिंग सर्व व्यवस्थित होते. बिलिंगही पटकन झाले.`,
        ];
      } else {
        tpl = [
          includeLocation
            ? `${cityName} येथील ${marathiStoreRef} सेवा खूप चांगली मिळाली. कर्मचाऱ्यांनी खूप चांगले सहकार्य केले आणि हव्या त्या गोष्टी सहज मिळाल्या.`
            : `${marathiStoreRef} ${primaryTag} सहज मिळाली. स्टाफचे सहकार्य छान होते आणि काम पटकन झाले. खरेदीचा अनुभव सोपा राहिला.`,
          `${primaryTag} आणि ${secondaryTag} दोन्ही उत्तम होते. अनुभव चांगला राहिला आणि नक्की पुन्हा भेट देईन.`,
        ];
      }
      return tpl[vIdx % tpl.length] + note;
    } else if (numRating === 4) {
      const tpl = [
        `${primaryTag} चांगली मिळाली आणि स्टाफचे सहकार्य लाभले. थोडा वेळ लागला, पण एकंदरीत अनुभव समाधानकारक होता.`,
        `इथे विविधता छान आहे. कर्मचाऱ्यांनी मदत केली आणि काम व्यवस्थित पूर्ण झाले. खरेदी चांगली झाली.`,
        includeLocation
          ? `${cityName} मधील ${marathiStoreRef} चांगला अनुभव आला. सेवा चांगली होती आणि हव्या त्या गोष्टी सहज मिळाल्या.`
          : `${primaryTag} चांगली होती आणि सेवाही व्यवस्थित मिळाली. पुन्हा नक्की भेट देईन.`,
      ];
      return tpl[vIdx % tpl.length] + note;
    } else if (numRating === 3) {
      return `${primaryTag} ठीक-ठाक मिळाली. स्टाफ मदत करत होता पण काही गोष्टींमध्ये सुधारणेची गरज वाटली.` + note;
    } else {
      return `${primaryTag} अजिबात समाधानकारक नव्हती आणि प्रतिसादही चांगला मिळाला नाही. सुधारणेची गरज आहे.` + note;
    }
  }

  // ────────────── Multi-language: Hindi ──────────────
  if (lc === 'hindi') {
    if (numRating === 5) {
      let tpl: string[] = [];
      if (normalized === 'PET_SHOP') {
        tpl = [
          includeLocation
            ? `${cityName} में ${hindiStoreRef} पेट फूड और सामान की अच्छी वैरायटी मिली। स्टाफ ने सही सामान चुनने में पूरी मदद की। खरीदारी का अनुभव काफी आसान रहा।`
            : `${hindiStoreRef} पेट फूड और जरूरी एक्सेसरीज आसानी से मिल गईं। स्टाफ काफी मददगार था और सामान भी सही दाम पर मिला। दुकान काफी व्यवस्थित है।`,
          `यहाँ ${primaryTag} और ${secondaryTag} दोनों बढ़िया मिले। प्रोडक्ट्स की क्वालिटी अच्छी है और टीम ने पूरा सहयोग दिया। दोबारा ज़रूर आएँगे।`,
        ];
      } else if (normalized === 'RESTAURANT') {
        tpl = [
          includeLocation
            ? `${cityName} में ${hindiStoreRef} खाने का अनुभव बहुत बढ़िया रहा। खाना ताज़ा और स्वादिष्ट था, और सर्विस भी समय पर मिली। बैठने की अच्छी व्यवस्था थी।`
            : `${hindiStoreRef} खाना और नाश्ता बहुत पसंद आया। स्वाद लाजवाब था, पोर्शन पर्याप्त मिला और स्टाफ का व्यवहार काफी विनम्र था।`,
          `यहाँ ${primaryTag} बहुत अच्छी रही। खाने की फ्रेशनेस और सर्विस दोनों बेहतरीन थे। फैमिली के साथ आने के लिए अच्छी जगह।`,
        ];
      } else if (normalized === 'CAFE') {
        tpl = [
          includeLocation
            ? `${cityName} में ${hindiStoreRef} कॉफी और स्नॅक्स बहुत बढ़िया मिले। बैठने के लिए काफी शांत और अच्छी जगह है। दोस्तों के साथ समय बिताने के लिए उत्तम जगह।`
            : `${hindiStoreRef} कॉफी का स्वाद बहुत अच्छा था और बेकरी आइटम्स भी फ्रेश थे। बरिस्ता का व्यवहार काफी फ्रेंडली था और ऑर्डर जल्दी मिल गया।`,
        ];
      } else if (normalized === 'SALON') {
        tpl = [
          includeLocation
            ? `${cityName} में ${hindiStoreRef} हेयरकट और ग्रूमिंग का अनुभव काफी अच्छा रहा। स्टाइलिस्ट ने ध्यान से काम किया और सेटअप भी साफ-सुथरा था।`
            : `${hindiStoreRef} हेयरकट बिल्कुल वैसा ही हुआ जैसा मुझे चाहिए था। स्टाइलिस्ट ने बहुत अच्छे से गाइड किया और जगह भी साफ-सुथरी थी।`,
        ];
      } else if (normalized === 'CLINIC') {
        tpl = [
          includeLocation
            ? `${cityName} में ${hindiStoreRef} डॉक्टर ने बहुत अच्छे से समझाया। चेकअप आराम से हुआ और स्टाफ का व्यवहार काफी सहयोगी था। बिल्कुल इंतज़ार नहीं करना पड़ा।`
            : `${hindiStoreRef} डॉक्टर ने सभी सवालों का तसल्ली से जवाब दिया और इलाज का तरीका बहुत अच्छा रहा। क्लीनिक में काफी सफाई और शांति थी।`,
        ];
      } else if (normalized === 'GYM') {
        tpl = [
          includeLocation
            ? `${cityName} में ${hindiStoreRef} वर्कआउट के लिए सभी मशीनें अच्छी कंडीशन में हैं। ट्रेनर्स सही गाइड करते हैं और माहौल काफी मोटिवेटिंग है।`
            : `${hindiStoreRef} वर्कआउट के लिए आधुनिक उपकरण उपलब्ध हैं। ट्रेनर्स हर एक्सरसाइज में सही तरीके से गाइड करते हैं और फ्लोर काफी साफ रहता है।`,
        ];
      } else {
        tpl = [
          includeLocation
            ? `${cityName} में ${hindiStoreRef} विजिट अच्छी रही। जरूरी सामान और अच्छी सर्विस समय पर मिल गई। स्टाफ काफी मददगार था।`
            : `${hindiStoreRef} ${primaryTag} बहुत अच्छी रही। स्टाफ का व्यवहार काफी मददगार था और काम आसानी से हो गया।`,
          `यहाँ ${primaryTag} और ${secondaryTag} दोनों बढ़िया मिले। कीमतें सही हैं और अनुभव काफी सुखद रहा।`,
        ];
      }
      return tpl[vIdx % tpl.length] + note;
    } else if (numRating === 4) {
      const tpl = [
        `${primaryTag} अच्छी रही और स्टाफ भी सहयोगी था। थोड़ा समय लगा लेकिन पूरा काम अच्छे से हो गया।`,
        `अच्छी वैरायटी है और स्टाफ ने सही गाइड किया। ओवरऑल अनुभव संतोषजनक रहा।`,
      ];
      return tpl[vIdx % tpl.length] + note;
    } else if (numRating === 3) {
      return `${primaryTag} औसत रही। सर्विस ठीक थी लेकिन कुछ चीजों में सुधार की गुंजाइश है।` + note;
    } else {
      return `${primaryTag} उम्मीद के मुताबिक नहीं रही और सर्विस में देरी हुई। सुधार होना चाहिए।` + note;
    }
  }

  // ────────────── Multi-language: English ──────────────
  if (numRating === 5) {
    let tpl: string[] = [];
    if (normalized === 'PET_SHOP') {
      tpl = [
        includeLocation
          ? `Visited ${nameRef} in ${cityName} and found good quality pet supplies. The staff helped me choose the right pet food, and checkout was smooth. Glad to have this pet shop nearby.`
          : `Found the pet supplies I needed quickly at ${nameRef}. The staff was helpful with pet food recommendations, and the shop was clean and well organized.`,
        `Good variety of pet accessories and treats. The team answered my questions patiently and guided me to the right items. Positive experience overall.`,
        includeLocation
          ? `Convenient pet shop around ${cityName} for regular supplies. Fair pricing and the staff is always courteous and attentive.`
          : `Really liked the ${primaryTag.toLowerCase()} at ${nameRef}. They had all the supplies in stock and the whole visit was hassle-free.`,
      ];
    } else if (normalized === 'RESTAURANT') {
      tpl = [
        includeLocation
          ? `Visited ${nameRef} in ${cityName} and really enjoyed the food. Quick service, fresh flavors, and the staff was courteous throughout. Nice spot for a relaxed meal.`
          : `Enjoyed the meal here at ${nameRef}. Everything was freshly prepared, the portions were good, and the team took care of our order promptly.`,
        `Good food and helpful staff. Found the ${primaryTag.toLowerCase()} to be fresh and tasty, and pricing felt reasonable for the quality provided. Will visit again.`,
        includeLocation
          ? `Convenient spot for people around ${cityName} looking for good food. The ${primaryTag.toLowerCase()} was on point and turnaround was fast.`
          : `Nice dining experience at ${nameRef}. The staff was polite, service was quick, and the flavors were consistent. Happy with the visit.`,
      ];
    } else if (normalized === 'CAFE') {
      tpl = [
        includeLocation
          ? `Visited ${nameRef} in ${cityName} for coffee and snacks. Cozy ambiance, quick service, and the brew was fresh. Great place to sit and relax.`
          : `Really liked the coffee and pastry selection at ${nameRef}. Clean seating area, friendly barista, and relaxed atmosphere overall.`,
        `Great coffee and prompt service. The ${primaryTag.toLowerCase()} was delicious and it is a comfortable spot to sit and unwind.`,
      ];
    } else if (normalized === 'SALON') {
      tpl = [
        includeLocation
          ? `Had a good experience at ${nameRef} in ${cityName}. The stylist took time to understand what I needed and the haircut was neat. Setup was clean throughout.`
          : `Clean salon and polite staff at ${nameRef}. Got the appointment on time without waiting long, and the ${primaryTag.toLowerCase()} was done neatly.`,
        `Attentive team and hygienic setup. They explained the styling options clearly and ensured a comfortable visit. Left very satisfied.`,
      ];
    } else if (normalized === 'CLINIC') {
      tpl = [
        includeLocation
          ? `Visited ${nameRef} in ${cityName} and received clear guidance. The doctor explained everything patiently and the staff was polite throughout the visit.`
          : `Clean clinic and reassuring consultation at ${nameRef}. The doctor handled the examination with care and check-in was smooth and organized.`,
        `Prompt appointment and courteous staff. All my questions were answered clearly and the treatment was handled very professionally.`,
      ];
    } else if (normalized === 'GYM') {
      tpl = [
        includeLocation
          ? `Joined ${nameRef} in ${cityName} and found the workout floor well equipped. The trainers guide properly and the atmosphere is motivating.`
          : `Great workout environment with clean machines and weights at ${nameRef}. The trainers are supportive and the space is well maintained.`,
        `Good equipment selection and helpful trainers. The ${primaryTag.toLowerCase()} is on point and the gym vibe keeps you energized.`,
      ];
    } else if (normalized === 'BAKERY') {
      tpl = [
        includeLocation
          ? `Visited ${nameRef} in ${cityName} for cakes and fresh bakery items. Everything was fresh, tasty, and neatly packaged. Order was ready on time.`
          : `Loved the cake quality and pastry selection at ${nameRef}. Freshly baked, good presentation, and the staff was courteous with custom requests.`,
        `Delicious pastries and prompt service. The ${primaryTag.toLowerCase()} was fresh and pricing was very fair for the quality.`,
      ];
    } else if (normalized === 'CLOTHING_STORE') {
      tpl = [
        includeLocation
          ? `Visited ${nameRef} in ${cityName} and found a great clothing collection. The staff helped with sizes and trial rooms were clean.`
          : `Good collection of outfits with nice fabric quality at ${nameRef}. The staff was patient with options and checkout was quick and easy.`,
        `Nice variety of designs and fair pricing. The ${primaryTag.toLowerCase()} was good and found what I needed without any hassle.`,
      ];
    } else if (normalized === 'ELECTRONICS_STORE') {
      tpl = [
        includeLocation
          ? `Visited ${nameRef} in ${cityName} for gadgets. The staff explained the specifications clearly and billing was fast.`
          : `Good range of electronics and helpful guidance from the team at ${nameRef}. They explained the product features and warranty terms well.`,
      ];
    } else if (normalized === 'PHARMACY') {
      tpl = [
        includeLocation
          ? `Visited ${nameRef} in ${cityName} for prescriptions. All required medicines were in stock and the pharmacist was helpful.`
          : `Prompt service and all medicines were available in stock at ${nameRef}. The staff guided on dosages clearly and checkout was fast.`,
      ];
    } else if (normalized === 'AUTOMOBILE_SERVICE') {
      tpl = [
        includeLocation
          ? `Got my vehicle serviced at ${nameRef} in ${cityName}. The mechanic explained the work clearly and handover was on time.`
          : `Good service quality and transparent estimate at ${nameRef}. The vehicle was serviced properly and the team was professional throughout.`,
      ];
    } else {
      tpl = [
        includeLocation
          ? `Visited ${nameRef} in ${cityName} and received helpful assistance. Got what I needed without any hassle and checkout was smooth.`
          : `Good service and helpful staff at ${nameRef}. Found what I was looking for quickly, and the team was courteous throughout.`,
        `Prompt assistance and fair pricing. The ${primaryTag.toLowerCase()} was on point and the whole visit was smooth and hassle-free.`,
      ];
    }
    return tpl[vIdx % tpl.length] + note;
  } else if (numRating === 4) {
    const tpl = [
      includeLocation
        ? `Good experience at ${nameRef} in ${cityName}. Found the ${primaryTag.toLowerCase()} I was looking for, though it took a few minutes during rush hour.`
        : `Good variety of offerings and helpful staff. Took a little time to find what I needed, but the team guided me well once available. Positive visit overall.`,
      `Decent selection and polite staff. The ${primaryTag.toLowerCase()} was good, and checkout was relatively quick. Would visit again.`,
    ];
    return tpl[vIdx % tpl.length] + note;
  } else if (numRating === 3) {
    return `Average experience. The ${primaryTag.toLowerCase()} was okay, but a few items were out of stock. Hope they improve on availability.` + note;
  } else if (numRating === 2) {
    return `Was looking for specific service but had to wait long. Staff seemed occupied and attention was lacking. Needs improvement.` + note;
  } else {
    return `Disappointing visit. The ${primaryTag.toLowerCase()} did not meet expectations and service was unresponsive. Significant improvement needed.` + note;
  }
}

// ─────────────────────────────────────────────
// Anti-Cliche & Quality Sanitizer Helper
// ─────────────────────────────────────────────
export function sanitizeReviewText(
  rawText: string,
  rating: number = 5,
  normalizedCategory: NormalizedCategory = 'CUSTOM'
): string {
  if (!rawText) return '';
  let text = rawText.trim();

  // Remove wrapping quotes or backticks if returned by LLM
  text = text.replace(/^["'`“]+|["'`”]+$/g, '').trim();

  // Strip formulaic AI openings
  const clichePatterns = [
    /^(honestly,?\s*(one of the best|such a great|really impressed|amazing|the best)?\s*)/i,
    /^(i recently visited\s+[^,.]+[,.]\s*)/i,
    /^(had an amazing experience (at|with)\s+[^,.]+[,.]\s*)/i,
    /^(i had a (great|wonderful|fantastic|pleasant) experience (at|with)\s+[^,.]+[,.]\s*)/i,
    /^(this (place|shop|store|clinic|cafe|restaurant) is (genuinely|truly|absolutely)\s+(amazing|the best|great)[,.]\s*)/i,
    /^(what an amazing\s+[^,.]+[,.]\s*)/i,
    /^(couldn't be happier with\s+[^,.]+[,.]\s*)/i,
    /^(look no further than\s+[^,.]+[,.]\s*)/i,
    /^(hands down the best\s+[^,.]+[,.]\s*)/i,
  ];

  for (const pattern of clichePatterns) {
    if (pattern.test(text)) {
      text = text.replace(pattern, '').trim();
      if (text.length > 0) {
        text = text.charAt(0).toUpperCase() + text.slice(1);
      }
    }
  }

  // Strip marketing ranking claims like "best pet shop in Kolhapur" or "number one store in X"
  text = text.replace(/\b(number one|#1|the finest|the best pet shop in [^.,]+)\b/gi, '').trim();

  // Remove multiple trailing exclamation marks
  text = text.replace(/!{2,}/g, '!');

  // Remove excessive repetitive emojis (keep max 1 if any)
  const emojiRegex = /[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g;
  const emojis = text.match(emojiRegex);
  if (emojis && emojis.length > 1) {
    let emojiCount = 0;
    text = text.replace(emojiRegex, () => {
      emojiCount++;
      return emojiCount === 1 ? emojis[0] : '';
    });
  }

  // Cross-category contamination check & fallback sanitize
  if (normalizedCategory && normalizedCategory !== 'CUSTOM') {
    const meta = CATEGORY_REGISTRY[normalizedCategory];
    if (meta?.prohibitedCrossTerms) {
      for (const regex of meta.prohibitedCrossTerms) {
        if (regex.test(text)) {
          // If contaminated, clean out contaminated phrase
          text = text.replace(regex, meta.coreVocab[0] || 'service').trim();
        }
      }
    }
  }

  return text.trim();
}
