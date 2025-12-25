
export enum ShapeType {
  HEART = 'Heart',
  FLOWER = 'Flower',
  STAR = 'Star',
  TREE = 'Christmas Tree',
  BUDDHA = 'Sphere (Zen)',
  FIREWORKS = 'Fireworks'
}

export interface GestureState {
  openness: number; // 0 (fist) to 1 (fully open)
  rotation: { x: number; y: number; z: number };
  isPinching: boolean;
  pinchStrength: number;
  center: { x: number; y: number };
}

export interface ParticleConfig {
  count: number;
  color: string;
  size: number;
  glowStrength: number;
  shape: ShapeType;
}
