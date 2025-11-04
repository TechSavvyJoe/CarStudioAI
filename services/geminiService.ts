
import { GoogleGenAI, Modality } from '@google/genai';
import type { ImageFile, DealershipBackground } from '../types';
import { logger } from '../utils/logger';

// Use import.meta.env for Vite projects (not process.env)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Debug logging
const keyLength = apiKey?.length || 0;
const keyPreview = apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}` : 'MISSING';

if (!apiKey || apiKey.trim() === '') {
  logger.error('❌ CRITICAL: VITE_GEMINI_API_KEY is not set! This will fail.');
  logger.error('   Expected: import.meta.env.VITE_GEMINI_API_KEY to contain a valid Gemini API key');
  logger.error('   Please check your .env.local file has: VITE_GEMINI_API_KEY=AIza...');
} else {
  logger.log(`✓ API Key loaded (${keyLength} chars): ${keyPreview}`);
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const validateFile = (file: File): void => {
  if (!file) {
    throw new Error('File is required');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(MAX_FILE_SIZE / 1024 / 1024);
    throw new Error(`File too large: ${Math.round(file.size / 1024 / 1024)}MB. Maximum: ${sizeMB}MB`);
  }

  if (file.size === 0) {
    throw new Error('File is empty');
  }
};

const fileToGenerativePart = async (file: File) => {
  // Validate file before processing
  validateFile(file);

  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        if (!base64) {
          reject(new Error('Failed to encode file as base64'));
        } else {
          resolve(base64);
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

type GenerativeContentPart = Awaited<ReturnType<typeof fileToGenerativePart>> | { text: string };

const base64ToBlobUrl = (base64: string, mimeType: string): string => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
};

/**
 * Analyzes an image to generate a descriptive filename based on the vehicle part/angle shown
 * @param file - The image file to analyze
 * @returns A descriptive name (e.g., "Front-Quarter-Passenger-Side", "Dashboard-Center-Console", etc.)
 */
export const analyzeImageContent = async (file: File, retryCount = 0): Promise<string> => {
  const startTime = Date.now();
  const maxRetries = 3;

  try {
    console.log(`🔍 [${file.name}] Starting analysis... (attempt ${retryCount + 1}/${maxRetries + 1})`);
    validateFile(file);

    const imagePart = await fileToGenerativePart(file);
    console.log(`📦 [${file.name}] Image encoded (${Math.round(file.size / 1024)}KB)`);

    const prompt = `Analyze this automotive photo and generate a concise, descriptive filename.

INSTRUCTIONS:
1. Identify the main vehicle part, angle, or feature shown
2. Use professional automotive photography terminology
3. Format: Use hyphens between words, capitalize each word
4. Keep it SHORT (2-4 words maximum)
5. Be SPECIFIC about the exact part/angle

EXAMPLES:
- "Front-Quarter-Right"
- "Dashboard-Center"
- "Rear-Taillight-Left"
- "Wheel-Closeup"
- "Interior-Seats"
- "Engine-Bay"
- "Side-Profile-Left"
- "Grille-Detail"
- "Door-Handle"
- "Trunk-Open"

RESPOND WITH ONLY THE FILENAME (no explanation, no file extension, just the descriptive name).`;

    console.log(`📤 [${file.name}] Sending to Gemini API...`);

    // Add timeout wrapper
    const timeoutMs = 30000; // 30 second timeout per image
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Analysis timeout (30s)')), timeoutMs)
    );

    const apiPromise = ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: [imagePart, { text: prompt }],
      },
    });

    const result = await Promise.race([apiPromise, timeoutPromise]);
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

    const response = result.candidates?.[0]?.content?.parts?.[0];
    const text = response && 'text' in response && typeof response.text === 'string'
      ? response.text.trim()
      : '';

    console.log(`📥 [${file.name}] Response received (${elapsedTime}s): "${text}"`);

    // Clean up the response - remove any quotes, file extensions, or extra characters
    const cleanName = text
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/\.(jpg|jpeg|png|gif|webp)$/i, '') // Remove file extensions
      .replace(/[^a-zA-Z0-9-]/g, '-') // Replace invalid chars with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    console.log(`✅ [${file.name}] AI label: "${cleanName || 'Vehicle-Photo'}" (${elapsedTime}s total)`);
    return cleanName || 'Vehicle-Photo';
  } catch (error: unknown) {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

    const message = error instanceof Error ? error.message : String(error);

    // Check if it's a rate limit error (429)
    const isRateLimit = /429|quota/i.test(message);

    if (isRateLimit && retryCount < maxRetries) {
      // Extract retry delay from error (API tells us how long to wait)
      const retryMatch = message.match(/"retryDelay":"(\d+)s"/);
      const suggestedDelay = retryMatch ? parseInt(retryMatch[1]) : 0;

      // Use suggested delay or exponential backoff (10s, 20s, 40s)
      const delaySeconds = suggestedDelay || Math.pow(2, retryCount) * 10;

      console.warn(`⏳ [${file.name}] Rate limit hit. Retrying in ${delaySeconds}s... (${retryCount + 1}/${maxRetries})`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));

      // Retry recursively
      return analyzeImageContent(file, retryCount + 1);
    }

  console.error(`❌ [${file.name}] Analysis failed after ${elapsedTime}s:`, error);
    return 'Vehicle-Photo'; // Fallback name
  }
};

// --- START: New consistent prompt generation logic ---

const generateConsistentPrompt = (dealershipBackground?: DealershipBackground): string => {
  if (dealershipBackground) {
    // When dealership background is provided, use it ONLY for exterior shots
    const prompt = `You are a professional automotive photo compositor specialized in seamless background replacement.

**CRITICAL IMAGE QUALITY REQUIREMENTS:**
- Output MUST maintain or EXCEED input image sharpness and quality
- Do NOT blur, soften, or degrade image quality in any way
- Preserve fine details: paint texture, reflections, edges, text
- If upscaling is needed, use high-quality interpolation

**ABSOLUTE FRAMING LOCK - NON-NEGOTIABLE:**
1. Vehicle size in output = Vehicle size in input (EXACT 1:1 scale)
2. Vehicle position in frame = Original position (pixel-perfect)
3. Output dimensions = Input dimensions (no resize)
4. Space around vehicle = Original space (identical margins)
5. Camera perspective = Original perspective (no angle change)
6. Visible vehicle parts = Original visible parts (no more, no less)

**SEAMLESS COMPOSITING TECHNIQUE:**
1. Extract vehicle with precision edge detection - include ALL reflections and shadows
2. Match perspective grid between vehicle and dealership background
3. Analyze dealership background lighting (sun position, intensity, color temperature)
4. Place vehicle on background with perfect ground plane alignment
5. Generate matching shadows (direction, length, softness, opacity based on background lighting)
6. Color grade vehicle to match background lighting conditions
7. Blend edges with micro-feathering for imperceptible seams
8. Add environmental reflections on vehicle from dealership (windows, sky, building)
9. RESULT: Photo-realistic composite that looks natively photographed at location

**REFLECTION REMOVAL - ABSOLUTELY MANDATORY:**
- SCAN EVERY reflective surface on vehicle for photographer/person reflections
- Remove ALL visible reflections of photographer/person/equipment from:
  * Vehicle paint - ALL body panels (hood, doors, fenders, bumpers, trunk, roof)
  * Chrome trim, badges, emblems, door handles, mirror housings
  * Glass surfaces (windows, windshield, headlights, taillights, side mirrors)
  * Wheels, hubcaps, and any reflective wheel surfaces
  * ANY shiny or reflective surface on the vehicle
- Common reflection locations to CHECK:
  * Door panels (especially passenger doors - most common)
  * Curved surfaces near photographer
  * Chrome bumpers and trim pieces
  * Side mirrors (exterior) - high reflection probability
  * Dark paint colors show reflections more clearly
- Replace photographer reflections with appropriate environmental reflections:
  * Sky gradients (blue/white for outdoors, neutral for studio)
  * Soft light gradients matching the scene
  * Generic environmental reflections (trees, clouds, buildings - NOT people)
- CRITICAL: Absolutely ZERO human figures, cameras, phones, or photographer visible anywhere
- VERIFY before output: Check EVERY reflective surface for human presence

**FOR EXTERIOR VEHICLE SHOTS (front, side, rear, 3/4 angles):**
1. Classify as exterior shot - use dealership background
2. Extract vehicle cleanly (include vehicle shadow from original)
3. CRITICAL GROUND PLANE REPLACEMENT:
   - Remove ALL original ground surface (pavement, concrete, asphalt, dirt)
   - Replace COMPLETELY with dealership surface - no original floor should remain visible
   - Ensure seamless transition between dealership surface and vehicle tires/bottom
   - Ground surface must be 100% dealership background, 0% original floor
4. Place vehicle on dealership surface at EXACT original size and position
5. Generate new shadow matching dealership sun angle and ambient occlusion
6. Match vehicle lighting to dealership: adjust highlights, shadows, color cast
7. Add subtle environmental reflections from dealership (building, sky) on vehicle paint
8. Seamlessly blend - NO visible edges, halos, or color mismatches
9. VERIFY: Vehicle looks like it was originally photographed at this dealership
10. VERIFY: NO original pavement/floor visible - 100% dealership ground surface
11. MAINTAIN: Exact framing - same vehicle size, position, and composition

**FOR INTERIOR/CABIN SHOTS (dashboard, seats, steering wheel, controls, screens, door panels):**
1. IGNORE dealership background completely - NOT applicable
2. Keep EVERY interior element at EXACT same size, angle, position, and detail level
3. CRITICAL - PRESERVE ALL INTERIOR DETAILS:
   - Door panels: Keep ALL textures, stitching, wood/metal trim, speaker grilles
   - Window controls: Preserve ALL buttons, switches, and control panels on doors
   - Armrests, cup holders, storage compartments: Keep intact with all details
   - Seat materials: Maintain fabric/leather texture, stitching patterns, piping
   - Dashboard trim: Preserve wood grain, carbon fiber, metal accents exactly
   - Air vents, door handles, lock buttons: Keep ALL small details visible
   - Floor mats, pedals, and any visible floor elements: Preserve completely
   - DO NOT simplify, blur, or remove ANY interior components or details
4. Windows and Windshield Treatment - NATURAL STUDIO LIGHTING:
   - Replace exterior view through windows with SOFT DIFFUSED WHITE LIGHT
   - Create the effect of bright studio softbox lighting coming through windows
   - Windows should show gentle gradient: brighter at center, slightly darker at edges
   - Maintain window frame, rubber seals, and all window details
   - Effect should look like natural daylight through frosted studio windows
   - DO NOT create solid flat white blocks - use subtle gradients for realism
5. SCREENS/DISPLAYS - ABSOLUTE PRESERVATION:
   - Keep digital screens EXACTLY as photographed - zero modifications
   - Backup camera screens: preserve entire display intact
   - Navigation displays: maintain as-is with all graphics/maps
   - Instrument cluster (speedometer/tachometer): preserve ALL gauges, numbers, text, warning lights
   - Infotainment screens: keep intact, do NOT split, blur, or alter
   - Climate control displays: keep all numbers and symbols
   - DO NOT add, remove, or modify any text, numbers, symbols, or graphics on ANY screens
   - DO NOT hallucinate or generate new screen content
   - If screen shows text/symbols in original, keep them EXACTLY as they appear
6. Lighting Enhancement - MAINTAIN DEPTH AND DETAIL:
   - Brighten cabin with soft, even, professional showroom lighting
   - Preserve all shadows that define shapes and depth (seat contours, dashboard depth)
   - Remove only harsh, unflattering shadows (like dark spots from overhead lighting)
   - Ensure lighting reveals texture and detail rather than washing it out
   - Maintain natural contrast between different materials (leather vs plastic vs metal)
7. Material Authenticity:
   - Leather should show natural grain and subtle creasing
   - Plastic should maintain its sheen and molded details
   - Metal/chrome should keep reflective properties
   - Fabric should show weave texture
8. VERIFY BEFORE OUTPUT:
   - ALL original interior components are present and detailed
   - No elements have been simplified, removed, or blurred
   - Window treatment looks natural, not artificial flat white
   - All screens and displays are perfectly preserved
   - Material textures are maintained or enhanced, never degraded

**FOR DETAIL/CLOSE-UP SHOTS (wheel, headlight, taillight, grille, badge, engine bay, door handle):**
1. NOT an exterior vehicle shot - DO NOT use dealership background
2. This is product photography - use professional studio backdrop
3. CRITICAL - ENGINE BAY SHOTS MUST PRESERVE ACTUAL ENGINE:
   - If input shows ENGINE BAY (open hood with engine visible), you MUST keep the ACTUAL photographed engine
   - DO NOT replace the real engine with a 3D rendered/generated engine image
   - DO NOT create a floating standalone engine render
   - DO NOT hallucinate or generate engine components not in the original photo
   - Keep EVERY component visible in the original engine bay photo (belts, hoses, covers, fluids, etc.)
   - The engine must remain under the hood as photographed, not extracted or replaced
   - Only change the BACKGROUND behind/around the engine bay, never the engine itself
   - Think: "I'm only improving the background, the engine stays exactly as photographed"
4. Replace background ONLY (behind the component) with soft neutral gradient:
   - For mechanical details (engine bay): Light gray (#D5D5D5) to medium gray (#888888)
   - For design details (wheels, lights, badges, grilles): Soft bokeh effect with gray tones
5. Keep detail at EXACT original size and framing - no zoom, no recomposition
6. Professional studio lighting: clean, shadowless, brings out texture
7. Remove any photographer reflections from chrome, glass, painted surfaces
8. Enhance sharpness and clarity of the ACTUAL component in the photo
9. VERIFY: Output shows the SAME component from input, just with better background
10. VERIFY ENGINE BAY: If input had engine bay, output must show same engine bay with only background improved
11. CRITICAL: Detail shots get gray studio background, NOT dealership background

**QUALITY ASSURANCE CHECKLIST - VERIFY BEFORE OUTPUT:**
☐ Image sharpness equal to or better than input (NO blur or quality loss)
☐ Output dimensions match input dimensions exactly (width × height)
☐ Vehicle/subject size in frame identical to original
☐ Same margins and space around subject as original
☐ No unwanted cropping or expansion of frame boundaries
☐ Camera angle and perspective unchanged from original
☐ Background appropriate: dealership for exteriors, white for interiors, gray for details
☐ Zero visible human/photographer reflections in vehicle surfaces
☐ Compositing seamless with no visible edges, halos, or mismatched lighting
☐ All digital screens and displays preserved intact (no splitting or artifacts)

Output: Photo-realistic automotive image that looks professionally shot at the dealership with perfect composition fidelity.`;
    return prompt.trim();
  }

  const prompt = `You are a professional automotive studio photographer. Transform car photos into flawless studio-quality images.

**CRITICAL IMAGE QUALITY REQUIREMENTS:**
- Output MUST maintain or EXCEED input image sharpness and quality
- Do NOT blur, soften, or degrade image quality in any way
- Preserve fine details: paint texture, reflections, edges, badges, text
- If processing requires upscaling, use high-quality interpolation
- Final image should be crisp, sharp, and professional

**ABSOLUTE FRAMING LOCK - NON-NEGOTIABLE:**
1. Subject size in output = Subject size in input (EXACT 1:1 scale)
2. Subject position in frame = Original position (pixel-perfect placement)
3. Output dimensions = Input dimensions (no dimension changes)
4. Space around subject = Original space (identical on all sides)
5. Camera perspective = Original perspective (no angle/height changes)
6. Visible subject parts = Original visible parts (preserve any edge cut-offs)

**STUDIO BACKGROUND TECHNIQUE:**
1. Identify subject and extract with precision edge detection
2. Separate subject from original background cleanly
3. Place subject on pure white studio background (#FFFFFF)
4. Generate soft, realistic drop shadow under vehicle (subtle contact shadow)
5. Apply professional studio lighting: bright, even, shadowless illumination
6. Ensure subject appears naturally lit as if in white infinity cove studio
7. Seamlessly blend with micro-feathering - no visible edges or halos

**REFLECTION REMOVAL - ABSOLUTELY MANDATORY:**
- SCAN EVERY reflective surface on vehicle for photographer/person reflections
- Remove ALL visible reflections of photographer/person/equipment from:
  * Vehicle paint - ALL body panels (hood, doors, fenders, bumpers, trunk, roof)
  * Chrome trim, badges, emblems, door handles, mirror housings
  * Glass surfaces (windows, windshield, headlights, taillights, side mirrors)
  * Wheel surfaces, hubcaps, brake rotors - any shiny wheel components
  * ANY reflective or semi-reflective surface on the vehicle
- Common reflection locations to CHECK thoroughly:
  * Door panels (especially passenger doors - MOST COMMON reflection spot)
  * Curved body panels near camera position
  * Chrome bumpers and trim pieces
  * Side mirrors (exterior) - extremely high reflection probability
  * Dark paint colors (black, navy, burgundy) show reflections most clearly
  * Glossy wheel finishes
- Replace photographer reflections with clean environmental reflections:
  * Sky gradients (blue/white for outdoors, neutral gray for studio)
  * Soft light gradients that match the lighting environment
  * Generic environmental reflections (clouds, trees, buildings - NEVER people/equipment)
- CRITICAL: Absolutely ZERO human figures, cameras, phones, hands, or photographer visible
- VERIFY before output: Systematically check EVERY reflective surface for any human presence
- If uncertain, err on side of caution and replace suspicious reflections with clean gradient

**FOR EXTERIOR VEHICLE SHOTS (full vehicle - front, side, rear, 3/4 views):**
1. Extract vehicle cleanly with all details preserved
2. CRITICAL GROUND PLANE REMOVAL:
   - Remove ALL original ground surface (pavement, concrete, asphalt, dirt, grass)
   - Floor beneath and around vehicle must be PURE WHITE (#FFFFFF)
   - No traces of original pavement, parking lot markings, or ground texture
   - Seamless blend between white background and vehicle tires/bottom
3. Place on pure white studio background (#FFFFFF)
4. Vehicle MUST be at EXACT same size relative to frame as original
5. Maintain EXACT same positioning - if centered, stay centered; if off-center, stay off-center
6. Generate subtle, soft drop shadow (contact shadow only, 20-30% opacity, highly blurred)
7. Professional studio lighting: bright, even, brings out vehicle lines and paint
8. Remove all photographer/person reflections from every reflective surface
9. Ensure paint looks clean and showroom-quality
10. VERIFY: NO original ground surface visible - complete white background
11. CRITICAL: Preserve exact framing - same vehicle size, position, composition as input

**FOR INTERIOR/CABIN SHOTS (dashboard, seats, steering wheel, center console, controls, displays, door panels):**
1. Keep EVERY interior element at EXACT same size, angle, position, and detail level
2. CRITICAL - PRESERVE ALL INTERIOR DETAILS:
   - Door panels: Keep ALL textures, stitching, wood/metal trim, speaker grilles
   - Window controls: Preserve ALL buttons, switches, and control panels on doors
   - Armrests, cup holders, storage compartments: Keep intact with all details
   - Seat materials: Maintain fabric/leather texture, stitching patterns, piping
   - Dashboard trim: Preserve wood grain, carbon fiber, metal accents exactly
   - Air vents, door handles, lock buttons: Keep ALL small details visible
   - Floor mats, pedals, and any visible floor elements: Preserve completely
   - DO NOT simplify, blur, or remove ANY interior components or details
3. Windows and Windshield Treatment - NATURAL STUDIO LIGHTING:
   - Replace exterior view through windows with SOFT DIFFUSED WHITE LIGHT
   - Create the effect of bright studio softbox lighting coming through windows
   - Windows should show gentle gradient: brighter at center, slightly darker at edges
   - Maintain window frame, rubber seals, and all window details
   - Effect should look like natural daylight through frosted studio windows
   - DO NOT create solid flat white blocks - use subtle gradients for realism
4. SCREENS/DISPLAYS - ABSOLUTE PRESERVATION:
   - Keep digital screens EXACTLY as photographed - zero modifications
   - Backup camera screens: preserve entire display intact
   - Navigation displays: maintain as-is with all graphics/maps
   - Instrument cluster (speedometer/tachometer): preserve ALL gauges, numbers, text, warning lights
   - Infotainment screens: keep intact, do NOT split, blur, or alter
   - Climate control displays: keep all numbers and symbols
   - DO NOT add, remove, or modify any text, numbers, symbols, or graphics on ANY screens
   - DO NOT hallucinate or generate new screen content
   - If screen shows text/symbols in original, keep them EXACTLY as they appear
5. Lighting Enhancement - MAINTAIN DEPTH AND DETAIL:
   - Brighten cabin with soft, even, professional showroom lighting
   - Preserve all shadows that define shapes and depth (seat contours, dashboard depth)
   - Remove only harsh, unflattering shadows (like dark spots from overhead lighting)
   - Ensure lighting reveals texture and detail rather than washing it out
   - Maintain natural contrast between different materials (leather vs plastic vs metal)
6. Material Authenticity:
   - Leather should show natural grain and subtle creasing
   - Plastic should maintain its sheen and molded details
   - Metal/chrome should keep reflective properties
   - Fabric should show weave texture
7. Remove any photographer reflections from interior chrome/screens/glass
8. VERIFY BEFORE OUTPUT:
   - ALL original interior components are present and detailed
   - No elements have been simplified, removed, or blurred
   - Window treatment looks natural, not artificial flat white
   - All screens and displays are perfectly preserved
   - Material textures are maintained or enhanced, never degraded

**FOR DETAIL/CLOSE-UP SHOTS (wheel, headlight, taillight, grille, badge, engine bay, door handle, controls):**
1. This is product photography - NOT a full vehicle shot
2. Keep detail component at EXACT same size and position in frame - no zoom or reframe
3. CRITICAL - ENGINE BAY SHOTS MUST PRESERVE ACTUAL ENGINE:
   - If input shows ENGINE BAY (open hood with engine visible), you MUST keep the ACTUAL photographed engine
   - DO NOT replace the real engine with a 3D rendered/generated engine image
   - DO NOT create a floating standalone engine render
   - DO NOT hallucinate or generate engine components not in the original photo
   - Keep EVERY component visible in the original engine bay photo
   - The engine must remain under the hood as photographed, not extracted or replaced
   - Only change the BACKGROUND behind/around the engine bay, never the engine itself
   - Think: "I'm only improving the background, the engine stays exactly as photographed"
4. Replace background ONLY (area behind the component) with professional studio backdrop:
   - For mechanical details (engine bay): Soft gradient from light gray (#D8D8D8) to medium gray (#909090)
   - For design details (wheels, lights, badges, grilles): Soft bokeh-style blur with gray tones (#C0C0C0 to #808080)
   - Create depth-of-field effect with Gaussian blur on background
5. Professional product photography lighting: clean, focused, shadowless, brings out texture and detail
6. Remove any photographer/person reflections from chrome, glass, painted surfaces
7. Enhance sharpness and clarity of the detail - make it look premium and high-end
8. Keep the detail centered or positioned exactly as in original photo
9. VERIFY: Output shows ACTUAL component from input, not a generated replacement
10. VERIFY ENGINE BAY: If input had engine bay, output must show same engine bay with only background improved
11. CRITICAL: Detail shots get gray gradient studio backdrop for professional product photo look

**QUALITY ASSURANCE CHECKLIST - VERIFY EACH BEFORE OUTPUT:**
☐ Image sharpness EQUAL TO OR BETTER than input (absolutely no quality loss or blur)
☐ Output dimensions match input dimensions precisely (width × height unchanged)
☐ Subject size relative to frame identical to original (no scaling)
☐ Same amount of empty space around subject on all sides
☐ No unwanted cropping, expansion, or boundary changes
☐ Camera angle and perspective completely unchanged from original
☐ Background is appropriate pure white or gray gradient
☐ ZERO visible human, photographer, or equipment reflections anywhere
☐ All digital screens and displays preserved intact and visible (no splitting/artifacts)
☐ If original had parts cut off at frame edges, those cuts are preserved
☐ Compositing is seamless with no visible edges, halos, or unnatural transitions

Output: Museum-quality studio automotive photography with perfect composition fidelity and zero defects.`;
  return prompt.trim();
};


// --- END: New consistent prompt generation logic ---

export const retouchImage = async (
  imageFile: ImageFile,
  prompt: string,
  onUpdate: (updatedImage: ImageFile) => void
) => {
  const model = 'gemini-2.5-flash-image';

  onUpdate({ ...imageFile, status: 'retouching', error: 'Starting retouch...' });

  try {
    const baseImageUrl = imageFile.processedUrl || imageFile.originalUrl;
    const response = await fetch(baseImageUrl);
    const blob = await response.blob();
    const file = new File([blob], imageFile.originalFile.name, { type: blob.type });

    const imagePart = await fileToGenerativePart(file);
    const retouchPrompt = `You are an expert automotive photo editor. The user has provided a photo of a car, which has already been placed in a professional white studio setting. Your task is to ONLY modify the car based on the user's request. DO NOT change, alter, or remove the existing white studio background. The background must remain a pure, seamless white void. User's request: "${prompt}"`;
    const promptPart = { text: retouchPrompt };

    const apiResponse = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, promptPart] },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const resultPart = apiResponse.candidates?.[0]?.content?.parts?.[0];

    if (resultPart && 'inlineData' in resultPart && resultPart.inlineData) {
      const { data: processedImageData, mimeType } = resultPart.inlineData;

      if (typeof processedImageData !== 'string' || typeof mimeType !== 'string') {
        throw new Error('Retouching failed: Invalid image payload received.');
      }

      const newProcessedUrl = base64ToBlobUrl(processedImageData, mimeType);

      // Clean up old blob URL if it exists
      if (imageFile.processedUrl && imageFile.processedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageFile.processedUrl);
      }

      onUpdate({ ...imageFile, status: 'completed', processedUrl: newProcessedUrl, error: null });
    } else {
       throw new Error(apiResponse.text?.trim() || 'Retouching failed: No image data returned.');
    }

  } catch (error: unknown) {
    console.error(`Failed to retouch image ${imageFile.originalFile.name}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during retouching.';
    onUpdate({ ...imageFile, status: 'failed', error: errorMessage });
  }
};

export const processImageBatch = async (
  imageFiles: ImageFile[],
  onUpdate: (updatedImage: ImageFile) => void,
  pauseRef: { current: boolean },
  dealershipBackground?: DealershipBackground
) => {
  const model = 'gemini-2.5-flash-image';
  const basePrompt = generateConsistentPrompt(dealershipBackground);

  // Set initial status to 'queued' for better UI feedback
  imageFiles.forEach(img => {
    if (img.status === 'pending') {
      onUpdate({ ...img, status: 'queued', error: null });
    }
  });

  // Parallel processing configuration
  const MAX_CONCURRENT = 3; // Process 3 images simultaneously
  const RATE_LIMIT_RPM = 15; // Gemini free tier: 15 requests per minute
  const MIN_DELAY_MS = (60 / RATE_LIMIT_RPM) * 1000; // 4000ms = 4 seconds

  // Track request timing to enforce rate limits
  const requestTimestamps: number[] = [];

  const waitForRateLimit = async () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove timestamps older than 1 minute
    while (requestTimestamps.length > 0 && requestTimestamps[0]! < oneMinuteAgo) {
      requestTimestamps.shift();
    }

    // If we've hit the rate limit, wait until the oldest request expires
    if (requestTimestamps.length >= RATE_LIMIT_RPM) {
      const oldestRequest = requestTimestamps[0]!;
      const waitTime = (oldestRequest + 60000) - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime + 100)); // +100ms buffer
      }
    }

    // Ensure minimum delay between requests
    if (requestTimestamps.length > 0) {
      const lastRequest = requestTimestamps[requestTimestamps.length - 1]!;
      const timeSinceLastRequest = now - lastRequest;
      if (timeSinceLastRequest < MIN_DELAY_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS - timeSinceLastRequest));
      }
    }

    requestTimestamps.push(Date.now());
  };

  const processImage = async (imageFile: ImageFile) => {
    // --- PAUSE GATE ---
    while (pauseRef.current) {
      if(imageFile.status !== 'paused' && imageFile.status !== 'completed' && imageFile.status !== 'failed') {
          onUpdate({ ...imageFile, status: 'paused', error: 'Queue is paused.' });
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (imageFile.status === 'completed' || imageFile.status === 'failed') {
      return;
    }

    let processed = false;
    let attempt = 0;
    const maxAttempts = 10;

    while (!processed && attempt < maxAttempts) {
       // Re-check pause before each attempt
      while (pauseRef.current) {
        if(imageFile.status !== 'paused') {
          onUpdate({ ...imageFile, status: 'paused', error: 'Queue is paused.' });
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      onUpdate({ ...imageFile, status: 'processing', error: attempt > 0 ? `Retrying (attempt ${attempt + 1})...` : null });

      try {
        // Wait for rate limit before making API call
        await waitForRateLimit();

        const promptWithFilenameRequest = `${basePrompt}

**MANDATORY TEXT RESPONSE FORMAT (RETURN ONE LINE ONLY):**
After you finish generating the enhanced image, respond with a separate text modality containing exactly one line in this format:
FILENAME: <Professional-Hyphenated-Name>

Formatting rules:
- Replace spaces with hyphens and capitalize each significant word (e.g., "Front-Quarter-Driver-Side").
- Keep the filename under 50 characters.
- No additional words, sentences, punctuation, JSON, quotes, or explanations.
- The text modality must contain nothing except that single FILENAME: line.`;

        const carImagePart = await fileToGenerativePart(imageFile.originalFile);

        const parts: GenerativeContentPart[] = [
          carImagePart,
          { text: promptWithFilenameRequest },
        ];

        if (dealershipBackground) {
          const backgroundPart = await fileToGenerativePart(dealershipBackground.file);
          parts.splice(1, 0, backgroundPart);
        }

        const response = await ai.models.generateContent({
          model,
          contents: { parts },
          config: { responseModalities: [Modality.IMAGE, Modality.TEXT] }, // Request BOTH image and text
        });

        // Extract both image and AI-generated filename from response
        let processedImageData: string | null = null;
        let mimeType: string | null = null;
        let aiGeneratedName: string | null = null;

        // Parse response parts - can include both image and text
        const responseParts = response.candidates?.[0]?.content?.parts || [];

        for (const part of responseParts) {
          if ('inlineData' in part && part.inlineData) {
            const { data, mimeType: inlineMimeType } = part.inlineData;
            if (typeof data === 'string') {
              processedImageData = data;
            }
            if (typeof inlineMimeType === 'string') {
              mimeType = inlineMimeType;
            }
          }
          if ('text' in part && part.text) {
            // Extract filename from text response
            let text = part.text.trim();
            console.log(`📝 [${imageFile.originalFile.name}] Raw AI text response: "${text}"`);

            const directiveMatch = text.match(/FILENAME\s*:\s*([A-Za-z0-9\-\s]+)/i);
            if (directiveMatch) {
              text = directiveMatch[1].trim();
              console.log(`🎯 [${imageFile.originalFile.name}] Parsed filename directive: "${text}"`);
            }

            if (!directiveMatch) {
              const fallbackMatch = text.match(/([A-Z][a-zA-Z0-9]*(?:-[A-Z][a-zA-Z0-9]*)+)(?:\s*$|"|\))/);
              if (fallbackMatch) {
                text = fallbackMatch[1];
                console.log(`🎯 [${imageFile.originalFile.name}] Fallback filename extraction: "${text}"`);
              }
            }

            aiGeneratedName = text
              .replace(/^['"]|['"]$/g, '')
              .replace(/[^a-zA-Z0-9\s-]/g, '')
              .trim()
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '')
              .substring(0, 50);

            if (aiGeneratedName && aiGeneratedName.length === 0) {
              aiGeneratedName = null;
            }
          }
        }

        if (processedImageData && mimeType) {
          const newProcessedUrl = base64ToBlobUrl(processedImageData, mimeType);

          // Clean up old blob URL if reprocessing
          if (imageFile.processedUrl && imageFile.processedUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imageFile.processedUrl);
          }

          console.log(`✅ [${imageFile.originalFile.name}] Processed + AI label: "${aiGeneratedName || 'none'}"`);

          // Check pause state before marking complete
          if (pauseRef.current) {
            onUpdate({
              ...imageFile,
              status: 'paused',
              processedUrl: newProcessedUrl,
              aiGeneratedName: aiGeneratedName || imageFile.aiGeneratedName,
              error: 'Queue is paused.'
            });
            continue;
          }

          onUpdate({
            ...imageFile,
            status: 'completed',
            processedUrl: newProcessedUrl,
            aiGeneratedName: aiGeneratedName || imageFile.aiGeneratedName,
            error: null
          });
          processed = true;
        } else {
          // No image was returned - this is an actual error
          const finishReason = response.candidates?.[0]?.finishReason;
          let specificError = 'An unknown issue occurred.';
          let shouldRetry = false;

          if (finishReason === 'SAFETY') {
            specificError = 'Image blocked for safety. Try a different photo.';
          } else if (finishReason === 'NO_IMAGE') {
            specificError = 'Could not generate image. Retrying...';
            shouldRetry = true;
          } else if (finishReason && finishReason !== 'STOP') {
            specificError = `Processing stopped: ${finishReason}. Retrying...`;
            shouldRetry = true;
          } else {
            // Don't use response.text as it might contain the filename we extracted
            specificError = 'No image data returned. Retrying...';
            shouldRetry = true;
          }

          if (shouldRetry && attempt < maxAttempts - 1) {
            attempt++;
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }

          throw new Error(specificError);
        }
      } catch (error: unknown) {
        console.error(`Failed to process image ${imageFile.originalFile.name}:`, error);

        let errorMessage = 'An unknown error occurred.';
        let isRateLimit = false;
        let isApiKeyInvalid = false;

        const serialisedError = (() => {
          if (typeof error === 'string') return error;
          if (error instanceof Error) return `${error.name}: ${error.message}`;
          try {
            return JSON.stringify(error);
          } catch {
            return String(error);
          }
        })();

        const lowerError = serialisedError.toLowerCase();
        const structuredError = typeof error === 'object' && error !== null
          ? (error as { error?: { code?: number; status?: string; message?: string } })
          : undefined;

        isApiKeyInvalid =
          (lowerError.includes('api_key_invalid') && lowerError.includes('renew')) ||
          (structuredError?.error?.code === 400 &&
           structuredError.error?.status === 'INVALID_ARGUMENT' &&
           lowerError.includes('api key') && lowerError.includes('renew'));

        if (!isApiKeyInvalid) {
          isRateLimit = lowerError.includes('rate limit') ||
                        lowerError.includes('resource_exhausted') ||
                        lowerError.includes('exceeded your current quota') ||
                        lowerError.includes('429') ||
                        (lowerError.includes('api') && lowerError.includes('expired') && !lowerError.includes('renew')) ||
                        (structuredError?.error?.code === 400 && lowerError.includes('invalid_argument') && !lowerError.includes('api key'));
        }

        const potentialMessage = structuredError?.error?.message || (error instanceof Error ? error.message : undefined);
        if (typeof potentialMessage === 'string' && potentialMessage) {
          errorMessage = potentialMessage;
        } else if (isRateLimit) {
          errorMessage = 'API rate limit reached. The queue will pause and retry.';
        } else if (isApiKeyInvalid) {
          errorMessage = 'API key is invalid or expired. Please check your GEMINI_API_KEY in the .env.local file and regenerate it at https://aistudio.google.com/app/apikey';
        } else {
          errorMessage = 'An API error occurred. See console for details.';
        }

        if (isRateLimit && attempt < maxAttempts - 1) {
          attempt++;
          const baseDelay = 120000; // 2 minutes
          const backoffDelay = baseDelay * Math.pow(1.5, attempt - 1);
          const delayInSeconds = Math.round(backoffDelay / 1000);

          const pauseError = `Rate limit - waiting ${delayInSeconds}s before retry ${attempt}/${maxAttempts}`;

          onUpdate({
            ...imageFile,
            status: 'paused',
            error: pauseError,
          });

          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          let finalErrorMessage = errorMessage;
          if (isRateLimit && attempt >= maxAttempts - 1) {
            finalErrorMessage = 'Rate limit exceeded after multiple retries. Wait 5 minutes, then click "Reprocess".';
          } else if (isApiKeyInvalid) {
            finalErrorMessage = 'API key error - Please renew your API key and refresh the page.';
          }

          onUpdate({
            ...imageFile,
            status: 'failed',
            error: finalErrorMessage,
          });
          processed = true;
        }
      }
    }
  };

  // Process images in parallel batches
  for (let i = 0; i < imageFiles.length; i += MAX_CONCURRENT) {
    const batch = imageFiles.slice(i, i + MAX_CONCURRENT);
    await Promise.all(batch.map(imageFile => processImage(imageFile)));
  }
};
