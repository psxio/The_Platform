export const TRAIT_LAYER_ORDER = [
  "background",
  "backgroundAccessory", // Background accessories render BEHIND character (DuhCat, etc.)
  "skin",
  "eyes",
  "mouth",
  "shirt", // Base layer shirts (worn directly on skin)
  "tops", // Tops category - additional clothing layer
  "jacket", // ALL outer layers: jackets, windbreakers, sweatshirts, suit jacket (only ONE can be worn)
  "armor", // Armor renders OVER all clothing (chest piece on top)
  "faceAccessory", // Cigarette, devil horns - render BEHIND glasses/hats/masks
  "glasses", // Glasses sit on the face (render before hats)
  "hat", // Hats render OVER glasses (on top of head)
  "mask", // Masks render OVER hats (ski masks, gas masks cover the entire head)
  "overlay", // Overlays render on top of everything
] as const

export type TraitCategory = typeof TRAIT_LAYER_ORDER[number]

// Category grouping for better UI organization
export const TRAIT_GROUPS = {
  "Character Base": ["background", "backgroundAccessory", "skin", "eyes", "mouth"],
  "Clothing": ["shirt", "tops", "armor", "jacket"],
  "Accessories": ["glasses", "mask", "faceAccessory", "hat"],
  "Effects": ["overlay"],
} as const

// Required categories that must have a value (no "None" option)
export const REQUIRED_CATEGORIES: TraitCategory[] = ["skin", "eyes", "mouth"]

export interface TraitOption {
  name: string
  fileName?: string
}

export const TRAIT_OPTIONS: Record<TraitCategory, TraitOption[]> = {
  background: [
    { name: "None" },
    { name: "4eleven", fileName: "4eleven.png" },
    { name: "9111", fileName: "9111.png" },
    { name: "Backrooms", fileName: "backrooms.png" },
    { name: "Blood Red", fileName: "bloodred.png" },
    { name: "Circus Circus", fileName: "circuscircus.png" },
    { name: "Clouds", fileName: "clouds.png" },
    { name: "Create", fileName: "create.png" },
    { name: "CSGO", fileName: "csgo.png" },
    { name: "Cyber City", fileName: "cybercity.png" },
    { name: "Desert", fileName: "desert.png" },
    { name: "Epstine", fileName: "epstine.png" },
    { name: "GameStop", fileName: "gamestop.png" },
    { name: "Hot Pocket", fileName: "hotpocket.png" },
    { name: "Infra", fileName: "infra.png" },
    { name: "Laundry", fileName: "laundry.png" },
    { name: "Macintosh", fileName: "macantosh.png" },
    { name: "Minimart", fileName: "minimart.png" },
    { name: "Pods", fileName: "pods.png" },
    { name: "Sky", fileName: "sky.png" },
    { name: "Spiritual", fileName: "spiritaul.png" },
    { name: "Subway", fileName: "subway.png" },
    { name: "Tabs", fileName: "tabs.png" },
    { name: "Tonchu", fileName: "tonchu.png" },
    { name: "Waffle House", fileName: "wafflehouse.png" },
    { name: "Zombie", fileName: "zombie.png" },
  ],
  backgroundAccessory: [
    { name: "None" },
    { name: "007", fileName: "007_background_accessory.png" },
    { name: "DuhCat", fileName: "duhcat_background_accessory.png" },
    { name: "DuhCat Tamagotchi", fileName: "duhcat_tamagatchi_background_accessory.png" },
    { name: "Schizo Text", fileName: "schizo_text_1.png" },
    { name: "Text Overlay", fileName: "text_overlay_1.png" },
    { name: "Windows Message", fileName: "windows_message_background_accessory.png" },
  ],
  skin: [
    { name: "Black", fileName: "black.png" },
    { name: "Blue", fileName: "blue.png" },
    { name: "Brown", fileName: "brown.png" },
    { name: "Green", fileName: "green.png" },
    { name: "Orange", fileName: "orange.png" },
    { name: "Purple", fileName: "purple.png" },
    { name: "Radiant", fileName: "radiant.png" },
    { name: "Red", fileName: "red.png" },
    { name: "Toxic", fileName: "toxic.png" },
    { name: "Yellow", fileName: "yellow.png" },
  ],
  eyes: [
    { name: "Orange Normal", fileName: "eye_orange_normal.png" },
    { name: "Orange Angry", fileName: "eye_orange_angry.png" },
    { name: "Brown Eyes", fileName: "eye_2.png" },
    { name: "Green Spiral Eyes", fileName: "eye_3.png" },
    { name: "Blue Glowing Eyes", fileName: "eye_4.png" },
    { name: "Lazery Eyes", fileName: "lazery eye.png" },
  ],
  mouth: [
    { name: "Yellow Smile", fileName: "mouth_1.png" },
    { name: "Closed Smile", fileName: "mouth_2.png" },
    { name: "Pink Open Mouth", fileName: "mouth_4.png" },
    { name: "O Mouth", fileName: "O-mouth.png" },
    { name: "Tongue Out", fileName: "tongue-out.png" },
    { name: "Troll Mouth", fileName: "troll-mouth.png" },
    { name: "Weed Mouth", fileName: "weed-mouth.png" },
  ],
  faceAccessory: [
    { name: "None" },
    { name: "Cigarette", fileName: "cigarette.png" },
    { name: "Devil Horns", fileName: "devil_horns.png" },
  ],
  shirt: [
    { name: "None" },
    { name: "Black Shirt", fileName: "Black_shirt.png" },
    { name: "Black Base Shirt", fileName: "Black_base_shirt.png" },
    { name: "Black I Heart China", fileName: "Black_i_heart_china_shirt.png" },
    { name: "Black PSX Shirt", fileName: "Black_psx_shirt.png" },
    { name: "Black White PSX", fileName: "Black_white_psx_shirt.png" },
  ],
  armor: [
    { name: "None" },
    { name: "Red Evil Armor", fileName: "red_evil_armor.png" },
  ],
  jacket: [
    { name: "None" },
    { name: "Arab Jacket", fileName: "arab_jacket.png" },
    { name: "Red Jacket", fileName: "red_jacket.png" },
    { name: "PSX Green Sweatshirt", fileName: "sweatshirt_1.png" },
    { name: "Red Sweatshirt", fileName: "sweatshirt_2.png" },
    { name: "Yellow Hazard Windbreaker", fileName: "yellow_hazard_windbreaker.png" },
    { name: "Black Windbreaker", fileName: "black_windbreaker_jacket.png" },
    { name: "Blue Suit Jacket", fileName: "suit_1.png" },
  ],
  glasses: [
    { name: "None" },
    { name: "PSX Pit Vipers Red", fileName: "psx-pit-vipers-red.png" },
    { name: "PSX Pit Vipers Purple", fileName: "psx-pit-vipers-purple.png" },
    { name: "Coolguy Cat Eye", fileName: "coolguy-cat-eye.png" },
    { name: "Coolguy Sport Red", fileName: "coolguy-sport-red.png" },
    { name: "Clear Frames", fileName: "clear-frames.png" },
    { name: "Create Glasses", fileName: "create-glasses.png" },
    { name: "Fear N Loadthing", fileName: "fear-n-loadthing.png" },
  ],
  mask: [
    { name: "None" },
    { name: "Tonchu Mask", fileName: "tonchu-mask.png" },
  ],
  hat: [
    { name: "None" },
    { name: "Arab Headgear", fileName: "arab_mask_headgear.png" },
    { name: "THE VOID Cap", fileName: "thevoid-cap.png" },
    { name: "FOXY DEGEN Cap", fileName: "foxydegen-cap.png" },
    { name: "Mossad Purple Cap", fileName: "mossad-purple-cap.png" },
    { name: "French Hat", fileName: "french-hat.png" },
    { name: "Wu Hat", fileName: "wu-hat.png" },
  ],
  tops: [
    { name: "None" },
    { name: "Hot Pocket Top", fileName: "hotpocket-top.png" },
    { name: "Ryan Top", fileName: "ryan-top.png" },
    { name: "Tonchu Top", fileName: "tonchu-top.png" },
    { name: "White Tee", fileName: "white-tee.png" },
  ],
  overlay: [
    { name: "None" },
    { name: "Burger", fileName: "burger.png" },
    { name: "Ear Power", fileName: "ear-power.png" },
    { name: "Tonchu Overlay", fileName: "tonchu-overlay.png" },
  ],
}

// Smart defaults for a complete starting character
export const DEFAULT_TRAITS: Record<TraitCategory, number> = {
  background: 1, // 4eleven
  backgroundAccessory: 0, // None
  skin: 0, // Black
  eyes: 0, // Orange Normal
  mouth: 0, // Yellow Smile
  shirt: 0, // None
  tops: 0, // None
  jacket: 0, // None
  armor: 0, // None
  glasses: 0, // None
  mask: 0, // None
  faceAccessory: 0, // None
  hat: 0, // None
  overlay: 0, // None
}

export function getTraitPath(category: TraitCategory, fileName: string): string {
  // Map files to their actual folder locations
  const fileToFolderMap: Record<string, string> = {
    // Jackets folder
    'arab_jacket.png': 'jackets',
    'red_jacket.png': 'jackets',
    // Sweatshirts folder
    'sweatshirt_1.png': 'sweatshirts',
    'sweatshirt_2.png': 'sweatshirts',
    // Windbreakers folder
    'yellow_hazard_windbreaker.png': 'windbreakers',
    'black_windbreaker_jacket.png': 'windbreakers',
    // Suits folder
    'suit_1.png': 'suits',
  }
  
  const categoryFolderMap: Record<TraitCategory, string> = {
    background: "backgrounds",
    backgroundAccessory: "background-accessories",
    skin: "skin",
    eyes: "eyes",
    mouth: "mouths",
    shirt: "shirts",
    tops: "tops",
    armor: "armor",
    jacket: "jackets", // Default to jackets folder
    glasses: "glasses",
    mask: "masks",
    faceAccessory: "face-accessories",
    hat: "hats",
    overlay: "overlays",
  }
  
  // Use specific folder mapping for known files, otherwise use category default
  const folder = fileToFolderMap[fileName] || categoryFolderMap[category]
  return `/pfp-traits/${folder}/${fileName}`
}

// Optimized image loader with caching
const imageCache = new Map<string, HTMLImageElement>()

export async function loadTraitImage(category: TraitCategory, fileName: string): Promise<HTMLImageElement | null> {
  const path = getTraitPath(category, fileName)
  
  // Return cached image if available
  if (imageCache.has(path)) {
    return imageCache.get(path)!
  }
  
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      imageCache.set(path, img)
      resolve(img)
    }
    img.onerror = () => resolve(null)
    img.src = path
  })
}

// Clear cache if needed
export function clearImageCache() {
  imageCache.clear()
}

// Helper to get display label for category
export function getCategoryLabel(category: TraitCategory): string {
  const labels: Record<TraitCategory, string> = {
    background: "Background",
    backgroundAccessory: "BG Accessory",
    skin: "Skin Base",
    eyes: "Eyes",
    mouth: "Mouth",
    shirt: "Shirt",
    tops: "Tops",
    armor: "Armor",
    jacket: "Outer Layer",
    glasses: "Glasses",
    mask: "Mask",
    faceAccessory: "Face Item",
    hat: "Hat",
    overlay: "Overlay",
  }
  return labels[category]
}
