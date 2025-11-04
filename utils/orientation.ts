const RAD_TO_DEGREES = 180 / Math.PI;

export type TiltReading = {
  roll: number;
  pitch: number;
};

const clamp = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, min), max);
};

const normalizeOrientationAngle = (angle: number) => {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

export const getScreenOrientationAngle = () => {
  if (typeof window === 'undefined') {
    return 0;
  }

  const orientation = window.screen?.orientation;
  if (orientation && typeof orientation.angle === 'number') {
    return normalizeOrientationAngle(orientation.angle);
  }

  const legacyOrientation = (window as unknown as { orientation?: number }).orientation;
  if (typeof legacyOrientation === 'number') {
    return normalizeOrientationAngle(legacyOrientation);
  }

  return 0;
};

const toTiltReading = (roll: number, pitch: number): TiltReading => ({
  roll,
  pitch,
});

export const computeTiltFromMotion = (
  accelerationIncludingGravity?: DeviceMotionEventAcceleration | null,
): TiltReading => {
  if (!accelerationIncludingGravity) {
    return toTiltReading(0, 0);
  }

  const x = clamp(accelerationIncludingGravity.x ?? 0, -10, 10);
  const y = clamp(accelerationIncludingGravity.y ?? 0, -10, 10);
  const z = clamp(accelerationIncludingGravity.z ?? 0, -10, 10);

  const rollRadians = Math.atan2(y, z);
  const pitchRadians = Math.atan2(-x, Math.sqrt(y * y + z * z));

  return toTiltReading(rollRadians * RAD_TO_DEGREES, pitchRadians * RAD_TO_DEGREES);
};

export const computeTiltFromOrientation = (
  beta: number | null | undefined,
  gamma: number | null | undefined,
): TiltReading => {
  const safeBeta = Number.isFinite(beta) ? (beta as number) : 0;
  const safeGamma = Number.isFinite(gamma) ? (gamma as number) : 0;
  const orientation = getScreenOrientationAngle();

  switch (orientation) {
    case 90:
      return toTiltReading(safeBeta, -safeGamma);
    case 180:
      return toTiltReading(-safeGamma, -(safeBeta + 90));
    case 270:
      return toTiltReading(-safeBeta, safeGamma);
    default:
      return toTiltReading(safeGamma, safeBeta - 90);
  }
};

export const smoothTilt = (current: TiltReading, next: TiltReading, alpha = 0.2): TiltReading => {
  const weight = clamp(alpha, 0, 1);
  return {
    roll: current.roll + (next.roll - current.roll) * weight,
    pitch: current.pitch + (next.pitch - current.pitch) * weight,
  };
};

export const isDeviceLevel = (
  tilt: TiltReading,
  options?: {
    rollThreshold?: number;
    pitchThreshold?: number;
  },
) => {
  const rollThreshold = options?.rollThreshold ?? 2.5;
  const pitchThreshold = options?.pitchThreshold ?? 3.5;

  return Math.abs(tilt.roll) <= rollThreshold && Math.abs(tilt.pitch) <= pitchThreshold;
};
