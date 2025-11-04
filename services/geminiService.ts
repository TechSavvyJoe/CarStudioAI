
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

const sanitizeHeroDescriptor = (descriptor: string): string =>
  descriptor
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildHeroFilename = (descriptor: string): string => {
  const cleaned = sanitizeHeroDescriptor(descriptor)
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-')
    .substring(0, 50);

  return cleaned.length > 0 ? cleaned : 'Hero-Render';
};

const createDefaultHeroPrompt = (descriptor: string): string => {
  const refinedDescriptor = sanitizeHeroDescriptor(descriptor);
  return `Create a photorealistic automotive hero render of ${refinedDescriptor} in a premium studio environment.

REQUIREMENTS:
- Maintain exact manufacturer design language, trim cues, wheel design, and proportions described.
- Lighting: high-key automotive studio, soft diffused key light with controlled specular highlights.
- Background: seamless neutral gradient cyclorama, no props, no text, no additional vehicles.
- Surface treatment: crisp reflections, accurate paint color, visible material textures.
- Output resolution equivalent to ≥4K, sharp focus edge to edge.
- Camera angle and composition must respect the described perspective.
- Do not invent aftermarket modifications, decals, or wheel designs.`;
};

const describeVehicleForHero = async (
  carImagePart: GenerativeContentPart,
  fallback?: string
): Promise<string> => {
  const descriptorPrompt = `You are an automotive catalog specialist. Describe the exact vehicle in this photo in one clause (max 25 words).
- Include paint color, body style, trim or standout details, wheel finish, and camera perspective.
- Do NOT mention the background, lighting equipment, people, or photography instructions.
- Respond with a single sentence fragment only.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [carImagePart, { text: descriptorPrompt }] },
      config: {
        responseModalities: [Modality.TEXT],
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 128,
      },
    });

    const textPart = response.candidates?.[0]?.content?.parts?.find(
      part => 'text' in part
    ) as { text?: string } | undefined;

    const descriptor = textPart?.text?.trim();
    if (descriptor) {
      return sanitizeHeroDescriptor(descriptor);
    }
  } catch (error) {
    console.warn('Hero descriptor generation failed, falling back to default.', error);
  }

  return fallback ? sanitizeHeroDescriptor(fallback) : 'the vehicle';
};

const renderHeroImageWithImagen = async (
  imageFile: ImageFile,
  onUpdate: (updatedImage: ImageFile) => void,
  config: HeroRenderConfig
): Promise<void> => {
  const modelsWithImagen = ai.models as unknown as {
    generateImages?: (params: {
      model: string;
      prompt: string;
      config?: {
        numberOfImages?: number;
        aspectRatio?: string;
        imageSize?: string;
        personGeneration?: PersonGenerationPolicy;
      };
    }) => Promise<
      | {
          generatedImages?: Array<{
            image?: { imageBytes?: string; mimeType?: string };
            mimeType?: string;
          }>;
        }
      | undefined
    >;
  };

  if (typeof modelsWithImagen.generateImages !== 'function') {
    throw new Error('Imagen 4 generation is not available in the current SDK build. Update @google/genai to a version that exposes models.generateImages.');
  }

  onUpdate({ ...imageFile, status: 'processing', error: 'Generating hero render via Imagen 4…' });

  const carPart = await fileToGenerativePart(imageFile.originalFile);
  const descriptor = await describeVehicleForHero(carPart, imageFile.aiGeneratedName);
  const defaultPrompt = createDefaultHeroPrompt(descriptor);

  const finalPrompt = imageFile.heroPrompt?.trim().length
    ? `${imageFile.heroPrompt.trim()}

HERO RENDER CONSTRAINTS:
- Preserve the factory design and proportions of ${descriptor}.
- Produce a photorealistic high-end studio environment.`
    : config.promptOverride
        ? config.promptOverride({
            descriptor,
            aiGeneratedName: imageFile.aiGeneratedName,
            defaultPrompt,
            imageFile,
          })
        : defaultPrompt;

  const modelVariant: HeroModelVariant = config.modelVariant ?? 'ultra';
  const modelId = HERO_MODEL_MAP[modelVariant];

  const response = await modelsWithImagen.generateImages({
    model: modelId,
    prompt: finalPrompt,
    config: {
      numberOfImages: config.numberOfImages ?? 1,
      aspectRatio: config.aspectRatio ?? '4:3',
      imageSize: config.imageSize ?? '1K',
      personGeneration: config.personGeneration ?? 'dont_allow',
    },
  });

  const generatedImage = response?.generatedImages?.[0];
  const imageBytes = generatedImage?.image?.imageBytes;
  if (!imageBytes) {
    throw new Error('Imagen 4 returned no image data.');
  }

  const mimeType = generatedImage?.image?.mimeType || generatedImage?.mimeType || 'image/png';
  const newProcessedUrl = base64ToBlobUrl(imageBytes, mimeType);

  if (imageFile.processedUrl && imageFile.processedUrl.startsWith('blob:')) {
    URL.revokeObjectURL(imageFile.processedUrl);
  }

  const updatedName = imageFile.aiGeneratedName ?? buildHeroFilename(descriptor);

  onUpdate({
    ...imageFile,
    status: 'completed',
    processedUrl: newProcessedUrl,
    aiGeneratedName: updatedName,
    heroModel: modelId,
    error: null,
  });
};

type HeroModelVariant = 'standard' | 'ultra' | 'fast';

const HERO_MODEL_MAP: Record<HeroModelVariant, string> = {
  standard: 'imagen-4.0-generate-001',
  ultra: 'imagen-4.0-ultra-generate-001',
  fast: 'imagen-4.0-fast-generate-001',
};

type ImagenAspectRatio =
  | '1:1'
  | '3:4'
  | '4:3'
  | '9:16'
  | '16:9'
  | '2:3'
  | '3:2'
  | '4:5'
  | '5:4'
  | '21:9';

type ImagenSize = '1K' | '2K';

type PersonGenerationPolicy = 'dont_allow' | 'allow_adult' | 'allow_all';

interface HeroPromptContext {
  descriptor: string;
  aiGeneratedName?: string;
  defaultPrompt: string;
  imageFile: ImageFile;
}

export interface HeroRenderConfig {
  modelVariant?: HeroModelVariant;
  aspectRatio?: ImagenAspectRatio;
  imageSize?: ImagenSize;
  numberOfImages?: 1 | 2 | 3 | 4;
  personGeneration?: PersonGenerationPolicy;
  promptOverride?: (context: HeroPromptContext) => string;
}

interface BatchProcessingOptions {
  heroConfig?: HeroRenderConfig;
}

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
      model: 'gemini-2.5-flash',
      contents: {
        parts: [imagePart, { text: prompt }],
      },
      config: {
        responseModalities: [Modality.TEXT],
        temperature: 0.15,
        topP: 0.8,
        maxOutputTokens: 64,
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

const GLOBAL_INTENT = `You are a senior automotive imaging specialist. Your role is to transform supplied vehicle photos into polished, photorealistic deliverables ready for OEM and dealership merchandising. Treat every decision like a high-end commercial retouch: no stylistic inventions, no AI hallucinations, just faithful improvements.`;

const SHOT_CLASSIFICATION = `INTERNAL CLASSIFICATION (do not mention in output): Determine \`shot_type\` strictly from the source photo.
- EXTERIOR — the full vehicle or large exterior portion is visible.
- INTERIOR — cabin, dashboard, seating, instrumentation, or door panels dominate.
- DETAIL — close-up of a specific component (wheel, light, badge, engine bay, shifter, etc.).
Follow the workflow that matches the determined \`shot_type\` and ignore instructions for the others.`;

const COMPOSITION_FIDELITY = `COMPOSITION FIDELITY (applies to every shot):
1. Output width, height, crop, and aspect ratio must match the original pixels exactly.
2. Subject scale and placement must remain 1:1 with the source frame—no zooming, stretching, or reframing.
3. Camera perspective, lens feel, and focal characteristics stay untouched.
4. Preserve every visible edge of the subject exactly where it occurs in the frame.
5. Maintain color accuracy to the real paint, materials, upholstery, and displays.`;

const IMAGE_QUALITY = `IMAGE QUALITY & LIGHTING:
- Maintain or exceed native sharpness. Never blur, denoise aggressively, or introduce plastic smoothing.
- Enhance clarity with subtle micro-contrast where it helps reveal real texture (paint flake, leather grain, machined metal, stitching).
- Keep lighting believable: respect the incoming light direction, temperature, and contrast. When brightening, use soft studio-style diffusion near 5200–5600K unless the source indicates otherwise.
- Never introduce dramatic effects, flares, colored gels, or stylized grading.`;

const REFLECTION_POLICY = `REFLECTION & ARTIFACT CLEANUP:
- Inspect every reflective surface (paint, chrome, glass, screens, wheel faces) for the photographer, rigging, or stray human silhouettes.
- Remove those reflections and replace them with clean environmental cues (sky gradients, dealership architecture, soft studio cards) that match the scene.
- Never invent people, props, or new objects. Leave OEM badges, decals, VIN stickers, and legally required markings untouched.`;

const DEALERSHIP_EXTERIOR = `DEALERSHIP BACKGROUND WORKFLOW (only when \`shot_type = EXTERIOR\` and a dealership background image is provided as the second input):
1. Use the supplied dealership background exclusively—do not fabricate new scenery.
2. Analyze the background for sun position, color temperature, horizon height, and surface texture before compositing.
3. Remove the original ground plane completely. Replace it with the dealership surface so there is zero trace of the prior pavement or floor.
4. Align the vehicle on the new surface with perfect perspective matching and tire contact. Inject realistic soft shadows matching the dealership light direction and intensity.
5. Harmonize reflections and color so the car feels naturally photographed on-location.
6. Ensure compositing seams are invisible—no halos, cut lines, or mismatched exposure.
7. Confirm the vehicle remains the same size and crop as the source frame.`;

const STUDIO_EXTERIOR = `PURE WHITE STUDIO WORKFLOW (only when \`shot_type = EXTERIOR\` and no dealership background is supplied):
1. Extract the vehicle cleanly and place it on a seamless white cyclorama (#FFFFFF) with a gentle studio roll.
2. Remove every trace of the original ground. Produce a realistic soft contact shadow (20–30% opacity) directly beneath the tires aligned with the existing light direction.
3. Maintain paint color accuracy and keep specular highlights crisp and showroom-ready.
4. Ensure the white background stays neutral—no gradients unless the source implies them.
5. Vehicle scale, framing, and perspective stay identical to the input capture.`;

const INTERIOR_GUIDE = `INTERIOR / CABIN WORKFLOW (only when \`shot_type = INTERIOR\`):
- Ignore any supplied dealership background asset; use the original cabin as-is.
- Preserve every component exactly as captured: seat bolsters, stitching, perforations, door cards, speaker grilles, HVAC controls, ambient lighting strips, and seams.
- Windows should glow with soft diffused studio light—not flat white slabs. Use gentle gradients that feel like 8–12 foot softboxes outside the vehicle.
- Screens, gauge clusters, HUD projections, and infotainment displays must remain pixel-perfect. Do not replace UI, remove warning lights, or invent graphics.
- Brighten the cabin evenly while retaining the shadows that define depth (seat bolsters, console recesses, steering wheel contours). Avoid flattening the scene.
- Remove harsh spot reflections on glossy trim only if they distract; never strip true material character.`;

const DETAIL_GUIDE = `DETAIL / COMPONENT WORKFLOW (only when \`shot_type = DETAIL\`):
- Ignore any supplied dealership background asset; detail shots always use a studio rendering.
- Treat it like product photography. Keep the component size and placement identical to the source frame.
- Background should become a premium studio gradient: light-to-medium gray for mechanical subjects (#D8D8D8 to #8A8A8A) or a soft gray bokeh for design accents.
- ENGINE BAY RULE: Never replace the real engine. Keep every hose, cover, bracket, and fluid reservoir exactly as photographed. Only improve the surrounding environment.
- Accentuate real textures—machined metal, knurled knobs, tire tread, lens optics—without inventing new geometry.
- Remove distracting reflections but retain realistic metallic sheen and specular cues.`;

const QA_CHECKLIST = `FINAL QA BEFORE DELIVERY:
- Sharpness is equal to or better than the source with no AI softness.
- Output dimensions, crop, and subject scale are identical to the input file.
- Background choice matches the classified shot type (dealership, pure white, or gray gradient).
- No unwanted artifacts, halos, or mismatched color grading.
- All legal/safety information, VIN stickers, and OEM badges remain untouched.
- ZERO traces of photographer, crew, or equipment reflections.`;

const OUTPUT_SUMMARY = `OUTPUT TARGET: Deliver a photorealistic, production-ready automotive image that feels genuinely photographed under the specified conditions.`;

const generateConsistentPrompt = (dealershipBackground?: DealershipBackground): string => {
  const sections = [
   GLOBAL_INTENT,
   SHOT_CLASSIFICATION,
   COMPOSITION_FIDELITY,
   IMAGE_QUALITY,
   REFLECTION_POLICY,
   dealershipBackground ? DEALERSHIP_EXTERIOR : STUDIO_EXTERIOR,
   INTERIOR_GUIDE,
   DETAIL_GUIDE,
   QA_CHECKLIST,
   OUTPUT_SUMMARY,
  ];

  return sections.join('\n\n');
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
  const retouchPrompt = `SYSTEM ROLE: Senior automotive retouch artist delivering OEM-ready imagery.

TASK: Apply the user's adjustment verbatim to the vehicle while keeping every other aspect of the supplied studio photograph identical.

NON-NEGOTIABLES:
- White infinity background (#FFFFFF) stays untouched—no gradients, patterns, or shadows added or removed beyond what already exists.
- Maintain original framing, crop, perspective, and subject scale pixel-for-pixel.
- Preserve material fidelity: paint, glass, chrome, wheels, lighting elements, and any branding or legal markings must remain authentic.
- Keep native sharpness; no blur, watercolor smoothing, or loss of micro-detail.
- Screens, badges, VIN stickers, and safety labels must stay exactly as captured.

ADJECTIVE GUIDE: Subtle, photoreal, premium showroom finish.

USER INSTRUCTION: "${prompt}"

OUTPUT STYLE: Updated image only; do not append text or overlays.`;
    const promptPart = { text: retouchPrompt };

    const apiResponse = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, promptPart] },
      config: { responseModalities: [Modality.IMAGE], temperature: 0.2, topP: 0.8 },
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
  dealershipBackground?: DealershipBackground,
  options?: BatchProcessingOptions
) => {
  const model = 'gemini-2.5-flash-image';
  const basePrompt = generateConsistentPrompt(dealershipBackground);
  const heroConfig = options?.heroConfig;

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

    const wantsHero = Boolean(heroConfig && imageFile.qualityMode === 'hero');
    if (wantsHero) {
      try {
        await waitForRateLimit();
        await renderHeroImageWithImagen(imageFile, onUpdate, heroConfig!);
        return;
      } catch (heroError) {
        console.error(`Hero render failed for ${imageFile.originalFile.name}, retrying with standard Gemini pipeline.`, heroError);
        onUpdate({
          ...imageFile,
          status: 'processing',
          error: 'Hero render failed, retrying with standard pipeline...'
        });
      }
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
          config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            temperature: 0.25,
            topP: 0.85,
          }, // Request BOTH image and text
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
