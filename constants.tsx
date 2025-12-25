
import * as THREE from 'three';
import { ShapeType } from './types';

// Fix broken import and remove redundant type definitions
export const PARTICLE_COUNT = 8000;
export const ORNAMENT_COUNT = 1280; 

export const THEME = {
  MATTE_GREEN: '#2F5233',
  METALLIC_GOLD: '#D4AF37',
  XMAS_RED: '#C41E3A',
  BLACK: '#050505',
  EMERALD: '#50C878'
};

export const generateShapePositions = (type: ShapeType, count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    let x = 0, y = 0, z = 0;

    switch (type) {
      case ShapeType.HEART: {
        const t = Math.random() * Math.PI * 2;
        x = 16 * Math.pow(Math.sin(t), 3);
        y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        z = (Math.random() - 0.5) * 5;
        const scale = 0.5;
        x *= scale; y *= scale; z *= scale;
        break;
      }
      case ShapeType.STAR: {
        const t = Math.random() * Math.PI * 2;
        const r = (i % 2 === 0 ? 10 : 4) + (Math.random() - 0.5) * 2;
        x = Math.cos(t) * r;
        y = Math.sin(t) * r;
        z = (Math.random() - 0.5) * 4;
        break;
      }
      case ShapeType.TREE: {
        let h = Math.random() * 20;
        if (h < 0.6) h = 0;
        const angle = Math.random() * Math.PI * 2;
        const r = (20 - h) * 0.4;
        x = Math.cos(angle) * r;
        y = h - 10;
        z = Math.sin(angle) * r;
        const jitterScale = Math.min(1.0, h / 2.0);
        x += (Math.random() - 0.5) * 1.5 * jitterScale;
        z += (Math.random() - 0.5) * 1.5 * jitterScale;
        break;
      }
      case ShapeType.BUDDHA: {
        // Create an irregular organic cloud using sum of sines for noise-like deformation
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        
        // Displacement based on angular coordinates
        const noise = Math.sin(phi * 4) * Math.cos(theta * 3) * 0.4 + 
                      Math.sin(phi * 2.5) * Math.sin(theta * 5) * 0.3 + 
                      Math.cos(phi * 6) * 0.2;
                      
        const radius = 10 * (1 + noise) * (0.8 + Math.random() * 0.4);
        
        x = radius * Math.cos(theta) * Math.sin(phi);
        y = radius * Math.sin(theta) * Math.sin(phi);
        z = radius * Math.cos(phi);
        break;
      }
      case ShapeType.FLOWER: {
        const t = Math.random() * Math.PI * 2;
        const petals = 5;
        const r = 8 * Math.cos(petals * t);
        x = r * Math.cos(t);
        y = r * Math.sin(t);
        z = (Math.random() - 0.5) * 3;
        break;
      }
      case ShapeType.FIREWORKS: {
        const radius = Math.random() * 15;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        x = radius * Math.sin(phi) * Math.cos(theta);
        y = radius * Math.sin(phi) * Math.sin(theta);
        z = radius * Math.cos(phi);
        break;
      }
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
  }
  
  return positions;
};
