// Helper functions for 360 spin angle calculations

export const TOTAL_ANGLES = 24; // 360° / 15° = 24 photos
export const ANGLE_INCREMENT = 360 / TOTAL_ANGLES; // 15°
export const ANGLE_TOLERANCE = 7.5; // ±7.5° tolerance for capture

/**
 * Normalizes an angle to 0-360 range
 */
export const normalizeAngle = (angle: number): number => {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
};

/**
 * Calculates the target angle for a given index (0-23)
 */
export const getTargetAngle = (index: number): number => {
  return normalizeAngle(index * ANGLE_INCREMENT);
};

/**
 * Finds the nearest target angle index for a current compass heading
 */
export const getNearestTargetIndex = (currentAngle: number): number => {
  const normalized = normalizeAngle(currentAngle);
  const index = Math.round(normalized / ANGLE_INCREMENT) % TOTAL_ANGLES;
  return index;
};

/**
 * Calculates angular distance between two angles (shortest path)
 */
export const getAngularDistance = (angle1: number, angle2: number): number => {
  const a1 = normalizeAngle(angle1);
  const a2 = normalizeAngle(angle2);
  const diff = Math.abs(a1 - a2);
  return Math.min(diff, 360 - diff);
};

/**
 * Checks if current angle is within tolerance of target angle
 */
export const isWithinTolerance = (currentAngle: number, targetAngle: number): boolean => {
  return getAngularDistance(currentAngle, targetAngle) <= ANGLE_TOLERANCE;
};

/**
 * Gets directional guidance text
 */
export const getDirectionGuidance = (currentAngle: number, targetAngle: number): string => {
  const distance = getAngularDistance(currentAngle, targetAngle);
  
  if (distance <= ANGLE_TOLERANCE) {
    return 'Perfect! Hold steady...';
  }
  
  const current = normalizeAngle(currentAngle);
  const target = normalizeAngle(targetAngle);
  
  // Determine shortest rotation direction
  let diff = target - current;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  
  const direction = diff > 0 ? 'clockwise' : 'counter-clockwise';
  const degrees = Math.round(Math.abs(diff));
  
  return `Rotate ${degrees}° ${direction}`;
};

/**
 * Calculates progress percentage
 */
export const getProgressPercentage = (capturedCount: number): number => {
  return Math.round((capturedCount / TOTAL_ANGLES) * 100);
};

/**
 * Gets next uncaptured angle index
 */
export const getNextUncapturedIndex = (capturedIndices: Set<number>): number | null => {
  for (let i = 0; i < TOTAL_ANGLES; i++) {
    if (!capturedIndices.has(i)) {
      return i;
    }
  }
  return null; // All captured
};
