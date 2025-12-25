
import { GestureState } from '../types';

declare const Hands: any;
declare const Camera: any;

export class GestureService {
  private hands: any;
  private camera: any;
  private onResultsCallback: (state: GestureState | null) => void = () => {};

  constructor() {
    this.hands = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults(this.processResults.bind(this));
  }

  public async start(videoElement: HTMLVideoElement, callback: (state: GestureState | null) => void) {
    this.onResultsCallback = callback;
    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        await this.hands.send({ image: videoElement });
      },
      width: 640,
      height: 480
    });
    return this.camera.start();
  }

  private processResults(results: any) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.onResultsCallback(null);
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    
    // 1. Calculate Openness (Fist vs Open Hand)
    // Distance from wrist (0) to finger tips (4, 8, 12, 16, 20)
    const wrist = landmarks[0];
    const tips = [4, 8, 12, 16, 20].map(idx => landmarks[idx]);
    
    let totalDist = 0;
    tips.forEach(tip => {
      totalDist += Math.sqrt(
        Math.pow(tip.x - wrist.x, 2) + 
        Math.pow(tip.y - wrist.y, 2)
      );
    });
    
    // Normalize openness (crude heuristic)
    const avgDist = totalDist / 5;
    const openness = Math.min(Math.max((avgDist - 0.1) / 0.35, 0), 1);

    // 2. Pinch Strength (Thumb 4 to Index 8)
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const pinchDist = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) + 
      Math.pow(thumbTip.y - indexTip.y, 2)
    );
    const pinchStrength = Math.min(Math.max(1 - (pinchDist / 0.1), 0), 1);
    const isPinching = pinchDist < 0.05;

    // 3. Rotation (Wrist to Middle Base 9)
    const middleBase = landmarks[9];
    const dx = middleBase.x - wrist.x;
    const dy = middleBase.y - wrist.y;
    const angle = Math.atan2(dy, dx);

    const state: GestureState = {
      openness,
      rotation: { x: dy * 2, y: -dx * 2, z: angle },
      isPinching,
      pinchStrength,
      center: { x: middleBase.x, y: middleBase.y }
    };

    this.onResultsCallback(state);
  }
}
