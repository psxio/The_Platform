// Bulk PFP Collection Generator for scatter.art NFT Collections
// Generates 4444 unique PFPs with metadata following ERC-721 standard

import { TRAIT_OPTIONS, TRAIT_LAYER_ORDER, TraitCategory, TraitOption } from './pfp-traits';

export interface GeneratedPFP {
  id: number; // 1-indexed for scatter.art
  traits: Record<string, string>;
  metadata: NFTMetadata;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

export interface ShadowCollectionMetadata {
  id: number;
  traits: Record<string, string>;
  metadata: NFTMetadata;
  shadowImage: string; // Shadow silhouette shown to public
  revealImage: string; // Full PFP for future reveal
}

export interface GenerationProgress {
  current: number;
  total: number;
  status: 'generating' | 'rendering' | 'packaging' | 'complete' | 'error';
  message: string;
}

// Rarity weights for traits (lower = rarer)
const RARITY_WEIGHTS: Record<string, Record<string, number>> = {
  background: {
    'None': 0, // Never use None
    'Create': 50, // Rarer (PSX branding)
    'Hot Pocket': 50,
    'Tonchu': 50,
  },
  overlay: {
    'None': 800, // Most common
    'Burger': 100,
    'Ear Power': 100,
    'Tonchu Overlay': 100,
  },
  hat: {
    'None': 400,
    'Arab Headgear': 100,
    'THE VOID Cap': 100,
    'FOXY DEGEN Cap': 100,
    'Mossad Purple Cap': 100,
    'French Hat': 100,
    'Wu Hat': 100,
  },
  glasses: {
    'None': 300,
    'PSX Pit Vipers Red': 100,
    'PSX Pit Vipers Purple': 100,
    'Coolguy Cat Eye': 100,
    'Coolguy Sport Red': 100,
    'Clear Frames': 100,
    'Create Glasses': 50, // Rarer
    'Fear N Loadthing': 50, // Rarer
  },
};

/**
 * Generate a random trait based on rarity weights
 */
function selectWeightedTrait(category: TraitCategory, traits: TraitOption[]): string {
  const weights = RARITY_WEIGHTS[category] || {};
  
  // Build weighted array
  const weightedTraits: string[] = [];
  traits.forEach(trait => {
    const weight = weights[trait.name] !== undefined ? weights[trait.name] : 100;
    for (let i = 0; i < weight; i++) {
      weightedTraits.push(trait.name);
    }
  });
  
  // Random selection
  const selected = weightedTraits[Math.floor(Math.random() * weightedTraits.length)];
  return selected;
}

/**
 * Generate a random unique PFP trait combination
 */
export function generateRandomTraits(): Record<string, string> {
  const traits: Record<string, string> = {};
  
  TRAIT_LAYER_ORDER.forEach(category => {
    const categoryTraits = TRAIT_OPTIONS[category];
    if (categoryTraits && categoryTraits.length > 0) {
      traits[category] = selectWeightedTrait(category, categoryTraits);
    }
  });
  
  // Ensure required traits are never "None"
  const requiredCategories: TraitCategory[] = ['background', 'skin', 'eyes', 'mouth'];
  requiredCategories.forEach(cat => {
    if (traits[cat] === 'None') {
      const categoryTraits = TRAIT_OPTIONS[cat];
      const nonNoneTraits = categoryTraits.filter((t: TraitOption) => t.name !== 'None');
      if (nonNoneTraits.length > 0) {
        traits[cat] = selectWeightedTrait(cat, nonNoneTraits);
      }
    }
  });
  
  // Apply mutual exclusion rules (only ONE torso item)
  const torsoCategories = ['shirt', 'tops', 'jacket', 'armor'];
  const activeTorso = torsoCategories.filter(cat => traits[cat] && traits[cat] !== 'None');
  
  if (activeTorso.length > 1) {
    // Keep only one random torso item
    const keepCategory = activeTorso[Math.floor(Math.random() * activeTorso.length)];
    torsoCategories.forEach(cat => {
      if (cat !== keepCategory) {
        traits[cat] = 'None';
      }
    });
  }
  
  return traits;
}

/**
 * Create a unique hash for a trait combination
 */
function hashTraits(traits: Record<string, string>): string {
  return Object.entries(traits)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
}

/**
 * Generate N unique PFP combinations with guaranteed uniqueness
 */
export function generateUniqueCollections(count: number): GeneratedPFP[] {
  const collection: GeneratedPFP[] = [];
  const seenHashes = new Set<string>();
  
  let attempts = 0;
  const maxAttempts = count * 10; // Safety limit
  
  while (collection.length < count && attempts < maxAttempts) {
    attempts++;
    const traits = generateRandomTraits();
    const hash = hashTraits(traits);
    
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      
      // Create metadata following ERC-721 standard
      const metadata: NFTMetadata = {
        name: `PSX #${collection.length + 1}`,
        description: "PSX - Please Stop Xisting. A precision-driven meme token on Base Network.",
        image: `ipfs://REPLACEME/${collection.length + 1}.png`,
        external_url: "https://psxonbase.com",
        attributes: Object.entries(traits)
          .filter(([_, value]) => value !== 'None') // Exclude "None" traits
          .map(([trait_type, value]) => ({
            trait_type: trait_type.charAt(0).toUpperCase() + trait_type.slice(1),
            value,
          })),
      };
      
      collection.push({
        id: collection.length + 1, // 1-indexed for scatter.art
        traits,
        metadata,
      });
    }
  }
  
  if (collection.length < count) {
    console.warn(`Only generated ${collection.length}/${count} unique combinations after ${attempts} attempts`);
  }
  
  return collection;
}

/**
 * Export collection as scatter.art compatible format
 */
export interface ScatterArtPackage {
  images: Array<{ id: number; blob: Blob }>;
  metadata: Array<{ id: number; json: string }>;
}

/**
 * Create metadata JSON string for a PFP (no .json extension)
 */
export function createMetadataJSON(pfp: GeneratedPFP): string {
  return JSON.stringify(pfp.metadata, null, 2);
}

/**
 * Validate collection meets scatter.art requirements
 */
export function validateScatterArtCollection(collection: GeneratedPFP[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check count
  if (collection.length === 0) {
    errors.push('Collection is empty');
  }
  
  // Check IDs are 1-indexed and sequential
  collection.forEach((pfp, index) => {
    if (pfp.id !== index + 1) {
      errors.push(`PFP at index ${index} has incorrect ID ${pfp.id}, expected ${index + 1}`);
    }
  });
  
  // Check metadata format
  collection.forEach(pfp => {
    if (!pfp.metadata.name || !pfp.metadata.description || !pfp.metadata.image) {
      errors.push(`PFP #${pfp.id} missing required metadata fields`);
    }
    
    if (!pfp.metadata.image.includes('ipfs://')) {
      errors.push(`PFP #${pfp.id} image URL must use ipfs:// protocol`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
