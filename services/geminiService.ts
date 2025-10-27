
import { GoogleGenAI, Modality } from '@google/genai';
import type { ImageFile, DealershipBackground } from '../types';

// Validate API key exists
const apiKey = process.env.API_KEY;

// Debug logging
const keyLength = apiKey?.length || 0;
const keyPreview = apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}` : 'MISSING';

if (!apiKey || apiKey.trim() === '') {
  console.error('❌ CRITICAL: API_KEY is not set! This will fail.');
  console.error('   Expected: process.env.API_KEY to contain a valid Gemini API key');
  console.error('   Please check your .env.local file has: GEMINI_API_KEY=AIza...');
} else {
  console.log(`✓ API Key loaded (${keyLength} chars): ${keyPreview}`);
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
- Remove ALL visible reflections of photographer/person in:
  * Vehicle paint (body panels, bumpers, fenders)
  * Chrome trim and badges
  * Glass surfaces (windows, headlights, taillights)
  * Wheels and hubcaps
- Replace with appropriate environmental reflections (sky, surroundings)
- CRITICAL: No human figures, camera equipment, or photographer visible anywhere

**FOR EXTERIOR VEHICLE SHOTS (front, side, rear, 3/4 angles):**
1. Classify as exterior shot - use dealership background
2. Extract vehicle cleanly (include vehicle shadow from original)
3. Place vehicle on dealership surface at EXACT original size and position
4. Generate new shadow matching dealership sun angle and ambient occlusion
5. Match vehicle lighting to dealership: adjust highlights, shadows, color cast
6. Add subtle environmental reflections from dealership (building, sky) on vehicle paint
7. Seamlessly blend - NO visible edges, halos, or color mismatches
8. VERIFY: Vehicle looks like it was originally photographed at this dealership
9. MAINTAIN: Exact framing - same vehicle size, position, and composition

**FOR INTERIOR/CABIN SHOTS (dashboard, seats, steering wheel, controls, screens):**
1. IGNORE dealership background completely - NOT applicable
2. Keep interior EXACTLY as photographed - no framing changes
3. Identify windows/windshield showing exterior
4. Replace ONLY exterior view through windows with pure white (#FFFFFF)
5. Keep all interior elements untouched: dashboard, screens, seats, controls
6. SCREENS/DISPLAYS: Keep digital screens intact - backup cameras, navigation, gauges
7. Enhance cabin lighting: bright, even, professional showroom quality
8. Remove harsh shadows while maintaining depth
9. CRITICAL: Interior shots use white window background, NOT dealership

**FOR DETAIL/CLOSE-UP SHOTS (wheel, headlight, taillight, grille, badge, engine, door handle):**
1. NOT an exterior vehicle shot - DO NOT use dealership background
2. This is product photography - use professional studio backdrop
3. Replace background with soft neutral gradient:
   - For mechanical details (engine): Light gray (#D5D5D5) to medium gray (#888888)
   - For design details (wheels, lights, badges): Soft bokeh effect with gray tones
4. Keep detail at EXACT original size and framing - no zoom
5. Professional studio lighting: clean, shadowless, brings out texture
6. Remove any photographer reflections from chrome, glass, painted surfaces
7. Enhance sharpness and clarity of the detail component
8. CRITICAL: Detail shots get gray studio background, NOT dealership background

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
- Remove ALL visible reflections of photographer/person/equipment from:
  * Vehicle paint (body panels, bumpers, doors, fenders, hood, trunk)
  * Chrome trim, badges, emblems, and brightwork
  * Glass surfaces (windows, windshield, headlights, taillights, mirrors)
  * Wheel surfaces and hubcaps
  * Any reflective surface on the vehicle
- Replace with clean environmental reflections (neutral sky, soft gradients)
- CRITICAL: Zero traces of humans, cameras, or photographer anywhere in image

**FOR EXTERIOR VEHICLE SHOTS (full vehicle - front, side, rear, 3/4 views):**
1. Extract vehicle cleanly with all details preserved
2. Place on pure white studio background (#FFFFFF)
3. Vehicle MUST be at EXACT same size relative to frame as original
4. Maintain EXACT same positioning - if centered, stay centered; if off-center, stay off-center
5. Generate subtle, soft drop shadow (contact shadow only, 20-30% opacity, highly blurred)
6. Professional studio lighting: bright, even, brings out vehicle lines and paint
7. Remove all photographer/person reflections from every reflective surface
8. Ensure paint looks clean and showroom-quality
9. CRITICAL: Preserve exact framing - same vehicle size, position, composition as input

**FOR INTERIOR/CABIN SHOTS (dashboard, seats, steering wheel, center console, controls, displays):**
1. Keep ALL interior elements at EXACT same size, angle, and position
2. Identify windows and windshield showing exterior
3. Replace ONLY the exterior view through windows/windshield with pure white (#FFFFFF)
4. Keep interior elements completely untouched and in exact same framing
5. SCREENS/DISPLAYS: Preserve all digital displays intact:
   - Backup camera screens - keep entire screen visible and functional
   - Navigation displays - maintain as-is
   - Instrument cluster - preserve gauges and information
   - Infotainment screens - keep intact, do NOT split or alter
6. Enhance cabin lighting: bright, clean, professional showroom illumination
7. Soften harsh shadows while maintaining depth and dimension
8. Remove any photographer reflections from interior chrome/screens/glass
9. CRITICAL: Interior shots use white through windows, maintaining all screen displays

**FOR DETAIL/CLOSE-UP SHOTS (wheel, headlight, taillight, grille, badge, engine bay, door handle, controls):**
1. This is product photography - NOT a full vehicle shot
2. Keep detail component at EXACT same size and position in frame - no zoom or reframe
3. Replace background with professional studio backdrop:
   - For mechanical details (engine bay): Soft gradient from light gray (#D8D8D8) to medium gray (#909090)
   - For design details (wheels, lights, badges, grilles): Soft bokeh-style blur with gray tones (#C0C0C0 to #808080)
   - Create depth-of-field effect with Gaussian blur on background
4. Professional product photography lighting: clean, focused, shadowless, brings out texture and detail
5. Remove any photographer/person reflections from chrome, glass, painted surfaces
6. Enhance sharpness and clarity of the detail - make it look premium and high-end
7. Keep the detail centered or positioned exactly as in original photo
8. CRITICAL: Detail shots get gray gradient studio backdrop for professional product photo look

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
      const newProcessedUrl = base64ToBlobUrl(processedImageData, mimeType);
      
      // Clean up old blob URL if it exists
      if (imageFile.processedUrl && imageFile.processedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageFile.processedUrl);
      }
      
      onUpdate({ ...imageFile, status: 'completed', processedUrl: newProcessedUrl, error: null });
    } else {
       throw new Error(apiResponse.text?.trim() || 'Retouching failed: No image data returned.');
    }

  } catch (e: any) {
    console.error(`Failed to retouch image ${imageFile.originalFile.name}:`, e);
    const errorMessage = e?.message || 'An unknown error occurred during retouching.';
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

  // Set initial status to 'queued' for better UI feedback
  imageFiles.forEach(img => {
    if (img.status === 'pending') {
      onUpdate({ ...img, status: 'queued', error: null });
    }
  });

  for (let i = 0; i < imageFiles.length; i++) {
    const imageFile = imageFiles[i];

    // --- PAUSE GATE ---
    while (pauseRef.current) {
      if(imageFile.status !== 'paused' && imageFile.status !== 'completed' && imageFile.status !== 'failed') {
          onUpdate({ ...imageFile, status: 'paused', error: 'Queue is paused.' });
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (imageFile.status === 'completed' || imageFile.status === 'failed') {
      continue;
    }

    let processed = false;
    let attempt = 0;
    const maxAttempts = 10; // Increase retry attempts for rate limits

    while (!processed && attempt < maxAttempts) {
       // Re-check pause before each attempt
      while (pauseRef.current) {
        // FIX: The redundant checks for 'completed' and 'failed' are removed.
        // A prior `if` statement narrows the type of `imageFile.status` so it cannot be
        // 'completed' or 'failed' here, which was causing a TypeScript compiler error.
        if(imageFile.status !== 'paused') {
          onUpdate({ ...imageFile, status: 'paused', error: 'Queue is paused.' });
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      onUpdate({ ...imageFile, status: 'processing', error: attempt > 0 ? `Retrying (attempt ${attempt + 1})...` : null });
      
      try {
        const prompt = generateConsistentPrompt(dealershipBackground);
        const carImagePart = await fileToGenerativePart(imageFile.originalFile);
        
        // Build the parts array - include background if provided
        const parts: any[] = [carImagePart, { text: prompt }];
        
        if (dealershipBackground) {
          const backgroundPart = await fileToGenerativePart(dealershipBackground.file);
          parts.splice(1, 0, backgroundPart); // Insert background before the prompt
        }

        const response = await ai.models.generateContent({
          model,
          contents: { parts },
          config: { responseModalities: [Modality.IMAGE] },
        });

        const resultPart = response.candidates?.[0]?.content?.parts?.[0];

        if (resultPart && 'inlineData' in resultPart && resultPart.inlineData) {
          const { data: processedImageData, mimeType } = resultPart.inlineData;
          const newProcessedUrl = base64ToBlobUrl(processedImageData, mimeType);

          // Clean up old blob URL if reprocessing
          if (imageFile.processedUrl && imageFile.processedUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imageFile.processedUrl);
          }

          // Check pause state before marking complete to prevent race condition
          if (pauseRef.current) {
            onUpdate({ ...imageFile, status: 'paused', processedUrl: newProcessedUrl, error: 'Queue is paused.' });
            continue;
          }

          onUpdate({ ...imageFile, status: 'completed', processedUrl: newProcessedUrl, error: null });
          processed = true;
        } else {
          const finishReason = response.candidates?.[0]?.finishReason;
          let specificError = 'An unknown issue occurred.';
          let shouldRetry = false;
          
          if (finishReason === 'SAFETY') {
            specificError = 'Image blocked for safety. Try a different photo.';
          } else if (finishReason === 'NO_IMAGE') {
            // NO_IMAGE can be transient - retry it
            specificError = 'Could not generate image. Retrying...';
            shouldRetry = true;
          } else if (finishReason && finishReason !== 'STOP') {
            specificError = `Processing stopped: ${finishReason}. Retrying...`;
            shouldRetry = true;
          } else if (response.text?.trim()) {
            specificError = response.text.trim();
          } else {
             specificError = 'No image data returned. Retrying...';
             shouldRetry = true;
          }
          
          // If it's a retryable error and we haven't exhausted attempts, retry
          if (shouldRetry && attempt < maxAttempts - 1) {
            attempt++;
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
            continue; // Go to next attempt
          }
          
          throw new Error(specificError);
        }
      } catch (e: any) {
        console.error(`Failed to process image ${imageFile.originalFile.name}:`, e);

        // --- START: Improved Error Detection ---
        let errorMessage = 'An unknown error occurred.';
        let isRateLimit = false;
        let isApiKeyInvalid = false;

        // Step 1: Convert the entire error to a string for reliable keyword searching.
        const errorAsString = JSON.stringify(e);
        const lowerError = errorAsString.toLowerCase();

        // Detect genuine API key issues (these should NOT be retried)
        isApiKeyInvalid =
          (lowerError.includes('api_key_invalid') && lowerError.includes('renew')) ||
          (e?.error?.code === 400 &&
           e?.error?.status === 'INVALID_ARGUMENT' &&
           (lowerError.includes('api key') && lowerError.includes('renew')));

        // Detect rate limit issues (these SHOULD be retried with backoff)
        // Note: "api key expired" without "renew" context might be a rate limit
        if (!isApiKeyInvalid) {
          isRateLimit = lowerError.includes('rate limit') ||
                        lowerError.includes('resource_exhausted') ||
                        lowerError.includes('exceeded your current quota') ||
                        lowerError.includes('429') ||
                        (lowerError.includes('api') && lowerError.includes('expired') && !lowerError.includes('renew')) ||
                        (e?.error?.code === 400 && lowerError.includes('invalid_argument') && !lowerError.includes('api key'));
        }

        // Step 2: Safely extract a user-friendly message directly from the error object.
        const potentialMessage = e?.error?.message || e?.message;
        if (typeof potentialMessage === 'string' && potentialMessage) {
            errorMessage = potentialMessage;
        } else if (isRateLimit) {
            errorMessage = 'API rate limit reached. The queue will pause and retry.';
        } else if (isApiKeyInvalid) {
            errorMessage = 'API key is invalid or expired. Please check your GEMINI_API_KEY in the .env.local file and regenerate it at https://aistudio.google.com/app/apikey';
        } else {
            errorMessage = 'An API error occurred. See console for details.';
        }
        // --- END: Improved Error Detection ---

        // Only retry for rate limits, NOT for API key errors
        if (isRateLimit && attempt < maxAttempts - 1) {
          attempt++;
          const baseDelay = 120000; // 2 minutes base delay for rate limits
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
          // Fail immediately for API key errors, or after exhausting retries for rate limits
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
          processed = true; // Exit loop, this image has permanently failed
        }
      }
    }
    
    // Proactive throttle: Wait AFTER processing one image, before starting the next.
    if (i < imageFiles.length - 1) {
       // Free tier is 15 RPM = 1 request every 4 seconds minimum
       // Use 8 seconds to be extra safe and avoid any rate limit issues
       const INTER_REQUEST_DELAY = 8000;
       await new Promise(resolve => setTimeout(resolve, INTER_REQUEST_DELAY));
    }
  }
};
