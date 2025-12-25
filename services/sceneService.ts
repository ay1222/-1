
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { PARTICLE_COUNT, ORNAMENT_COUNT, generateShapePositions, THEME } from '../constants';
import { ShapeType, GestureState, ParticleConfig } from '../types';

export class SceneService {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  
  private ornaments: THREE.Group;
  private ornamentObjects: THREE.Object3D[] = [];
  private ornamentTargets: THREE.Vector3[] = [];
  private zenOrnamentTargets: THREE.Vector3[] = [];
  
  private targetPositions: Float32Array;
  private zenParticlePositions: Float32Array;
  private currentShape: ShapeType = ShapeType.TREE;
  private lerpFactor: number = 0.05;
  private expansionFactor: number = 1.0;
  
  private isZenMode: boolean = false;
  private targetRotation: THREE.Euler = new THREE.Euler();
  private clock: THREE.Clock;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(THEME.BLACK);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 40;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6, 0.4, 0.85
    );
    bloomPass.threshold = 0.45;
    bloomPass.strength = 1.1;
    bloomPass.radius = 0.6;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    // Particles Setup
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for(let i=0; i<PARTICLE_COUNT*3; i++) positions[i] = (Math.random() - 0.5) * 100;
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.targetPositions = generateShapePositions(this.currentShape, PARTICLE_COUNT);
    this.zenParticlePositions = generateShapePositions(ShapeType.BUDDHA, PARTICLE_COUNT);

    this.material = new THREE.PointsMaterial({
      color: new THREE.Color(THEME.METALLIC_GOLD),
      size: 0.1,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.5
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);

    // Ornaments Setup
    this.ornaments = new THREE.Group();
    this.scene.add(this.ornaments);
    this.initOrnaments();

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onResize.bind(this));
    this.animate();
  }

  public toggleZenMode() {
    this.isZenMode = !this.isZenMode;
  }

  private initOrnaments() {
    this.ornamentTargets = [];
    this.zenOrnamentTargets = [];
    const minDistance = 2.2;

    for (let i = 0; i < ORNAMENT_COUNT; i++) {
      let ornament: THREE.Object3D;
      const randType = Math.random();
      let pos = new THREE.Vector3();
      let attempts = 0;
      let valid = false;

      // Tree positions
      while (!valid && attempts < 1000) {
        let h = 20 * (1 - Math.sqrt(Math.random())); 
        if (h < 1.2) h = 0;
        const angle = Math.random() * Math.PI * 2; 
        const maxR = (20 - h) * 0.38; 
        const r = Math.sqrt(Math.random()) * maxR;
        pos.set(Math.cos(angle) * r, h - 10, Math.sin(angle) * r);
        valid = true;
        for (const existingTarget of this.ornamentTargets) {
          if (pos.distanceTo(existingTarget) < minDistance) {
            valid = false;
            break;
          }
        }
        attempts++;
      }

      if (!valid) continue;

      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const noise = Math.sin(phi * 4) * Math.cos(theta * 3) * 0.4 + 
                    Math.sin(phi * 2.5) * Math.sin(theta * 5) * 0.3;
      const r_base = 10 * (1 + noise);
      const r_vol = r_base * Math.pow(Math.random(), 1/3);
      
      this.zenOrnamentTargets.push(new THREE.Vector3(
        r_vol * Math.sin(phi) * Math.cos(theta),
        r_vol * Math.sin(phi) * Math.sin(theta),
        r_vol * Math.cos(phi)
      ));

      if (randType < 0.25) {
        ornament = this.createDetailedGingerbread();
        ornament.rotation.y = Math.atan2(pos.x, pos.z);
      } else if (randType < 0.5) {
        ornament = this.createStocking();
        ornament.rotation.y = Math.random() * Math.PI * 2;
      } else if (randType < 0.75) {
        ornament = this.createGiftBox();
        ornament.rotation.y = Math.random() * Math.PI * 2;
      } else {
        ornament = this.createBow();
        ornament.rotation.y = Math.atan2(pos.x, pos.z);
      }

      this.ornamentTargets.push(pos);
      ornament.position.copy(pos);
      ornament.scale.set(0, 0, 0);
      const baseScale = (1.0 + Math.random() * 0.4) * 1.5;
      
      ornament.userData = {
        baseScale: baseScale,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.2 + Math.random() * 0.5,
        floatRadius: 2.5 + Math.random() * 4.0,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        randomVector: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize()
      };
      
      this.ornamentObjects.push(ornament);
      this.ornaments.add(ornament);
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(50, 50, 50);
    this.scene.add(keyLight);
  }

  private createStocking(): THREE.Group {
    const group = new THREE.Group();
    const redMat = new THREE.MeshStandardMaterial({ color: THEME.XMAS_RED, roughness: 1.0, metalness: 0.1 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0 });
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 16), redMat);
    leg.position.y = 0.3; group.add(leg);
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.3, 8, 16), redMat);
    foot.rotation.z = Math.PI / 2.5; foot.position.set(0.15, 0, 0); group.add(foot);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.08, 12, 24), whiteMat);
    cuff.rotation.x = Math.PI / 2; cuff.position.y = 0.6; group.add(cuff);
    return group;
  }

  private createBow(): THREE.Group {
    const group = new THREE.Group();
    const color = Math.random() > 0.3 ? THEME.XMAS_RED : THEME.METALLIC_GOLD;
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    const loopGeo = new THREE.TorusGeometry(0.18, 0.06, 8, 16);
    const l = new THREE.Mesh(loopGeo, material); l.scale.set(1.4, 0.8, 1); l.position.set(-0.2, 0.1, 0); l.rotation.z = Math.PI / 6; group.add(l);
    const r = new THREE.Mesh(loopGeo, material); r.scale.set(1.4, 0.8, 1); r.position.set(0.2, 0.1, 0); r.rotation.z = -Math.PI / 6; group.add(r);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), material); knot.position.set(0, 0.1, 0.05); group.add(knot);
    return group;
  }

  private createDetailedGingerbread(): THREE.Group {
    const group = new THREE.Group();
    const brownMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, metalness: 0.05, roughness: 0.9 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0 });
    const candyMat = new THREE.MeshStandardMaterial({ color: THEME.XMAS_RED, emissive: THEME.XMAS_RED, emissiveIntensity: 0.5 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 1.0 });
    
    const shape = new THREE.Shape();
    shape.absarc(0, 0.9, 0.25, 0, Math.PI * 2, false); 
    shape.moveTo(-0.1, 0.7); shape.lineTo(-0.45, 0.6); shape.lineTo(-0.45, 0.4); shape.lineTo(-0.15, 0.5); shape.lineTo(-0.35, 0.0);
    shape.lineTo(-0.1, 0.0); shape.lineTo(0, 0.3); shape.lineTo(0.1, 0.0); shape.lineTo(0.35, 0.0); shape.lineTo(0.15, 0.5);
    shape.lineTo(0.45, 0.4); shape.lineTo(0.45, 0.6); shape.lineTo(0.1, 0.7);
    
    const man = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 }), brownMat);
    man.rotation.x = Math.PI; man.rotation.z = Math.PI; man.position.z = 0.09; 
    group.add(man);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, whiteMat); eyeL.position.set(-0.08, 0.9, 0.18); group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, whiteMat); eyeR.position.set(0.08, 0.9, 0.18); group.add(eyeR);

    // Smile
    const smileGeo = new THREE.TorusGeometry(0.08, 0.015, 8, 12, Math.PI);
    const smile = new THREE.Mesh(smileGeo, whiteMat);
    smile.rotation.x = -Math.PI / 1.1;
    smile.position.set(0, 0.85, 0.18);
    group.add(smile);

    // Cheeks
    const cheekGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const cheekL = new THREE.Mesh(cheekGeo, pinkMat); cheekL.position.set(-0.16, 0.85, 0.17); group.add(cheekL);
    const cheekR = new THREE.Mesh(cheekGeo, pinkMat); cheekR.position.set(0.16, 0.85, 0.17); group.add(cheekR);

    // Head Icing
    const icingGeo = new THREE.TorusGeometry(0.12, 0.02, 8, 16, Math.PI);
    const icingTop = new THREE.Mesh(icingGeo, whiteMat);
    icingTop.position.set(0, 1.05, 0.15);
    icingTop.rotation.x = Math.PI / 2;
    group.add(icingTop);

    // Buttons
    const buttonGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const b1 = new THREE.Mesh(buttonGeo, candyMat); b1.position.set(0, 0.6, 0.18); group.add(b1);
    const b2 = new THREE.Mesh(buttonGeo, candyMat); b2.position.set(0, 0.45, 0.18); group.add(b2);
    const b3 = new THREE.Mesh(buttonGeo, new THREE.MeshStandardMaterial({color: 0x44ff44})); b3.position.set(0, 0.3, 0.18); group.add(b3);

    // Icing on limbs (zig-zag pattern)
    const lineGeo = new THREE.CapsuleGeometry(0.015, 0.12, 4, 8);
    const icingArmL = new THREE.Mesh(lineGeo, whiteMat); icingArmL.position.set(-0.32, 0.5, 0.18); icingArmL.rotation.z = 0.6; group.add(icingArmL);
    const icingArmR = new THREE.Mesh(lineGeo, whiteMat); icingArmR.position.set(0.32, 0.5, 0.18); icingArmR.rotation.z = -0.6; group.add(icingArmR);
    const icingLegL = new THREE.Mesh(lineGeo, whiteMat); icingLegL.position.set(-0.25, 0.1, 0.18); icingLegL.rotation.z = 0.9; group.add(icingLegL);
    const icingLegR = new THREE.Mesh(lineGeo, whiteMat); icingLegR.position.set(0.25, 0.1, 0.18); icingLegR.rotation.z = -0.9; group.add(icingLegR);

    return group;
  }

  private createGiftBox(): THREE.Group {
    const group = new THREE.Group();
    const boxColor = Math.random() > 0.5 ? THEME.XMAS_RED : THEME.METALLIC_GOLD;
    const ribbonColor = boxColor === THEME.XMAS_RED ? THEME.METALLIC_GOLD : THEME.XMAS_RED;
    
    const boxMat = new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.4, metalness: 0.15 });
    const lidMat = new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.3, metalness: 0.2 });
    const ribbonMat = new THREE.MeshStandardMaterial({ color: ribbonColor, roughness: 0.2, metalness: 0.8, emissive: ribbonColor, emissiveIntensity: 0.1 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });

    // Base Box
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.42), boxMat);
    base.position.y = 0.175; group.add(base);

    // Polka dots on the box
    const dotGeo = new THREE.SphereGeometry(0.03, 8, 8);
    for(let i=0; i<8; i++) {
        const dot = new THREE.Mesh(dotGeo, whiteMat);
        const side = i % 4;
        const offsetH = (Math.random() - 0.5) * 0.3;
        const offsetV = Math.random() * 0.3;
        if(side === 0) dot.position.set(0.22, offsetV, offsetH);
        if(side === 1) dot.position.set(-0.22, offsetV, offsetH);
        if(side === 2) dot.position.set(offsetH, offsetV, 0.22);
        if(side === 3) dot.position.set(offsetH, offsetV, -0.22);
        group.add(dot);
    }

    // Lid (slightly larger)
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.46), lidMat);
    lid.position.y = 0.4; group.add(lid);

    // Vertical Ribbon Cross
    const ribSize = 0.07;
    const ribV1 = new THREE.Mesh(new THREE.BoxGeometry(ribSize, 0.48, 0.43), ribbonMat);
    ribV1.position.y = 0.24; group.add(ribV1);
    const ribV2 = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.48, ribSize), ribbonMat);
    ribV2.position.y = 0.24; group.add(ribV2);

    // Multi-loop Bow on Top
    const bowCenter = new THREE.Group();
    bowCenter.position.y = 0.46;
    
    const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), ribbonMat);
    bowCenter.add(bowKnot);

    const loopCount = 8;
    const loopGeo = new THREE.TorusGeometry(0.12, 0.02, 12, 24);
    for (let i = 0; i < loopCount; i++) {
        const loop = new THREE.Mesh(loopGeo, ribbonMat);
        const angle = (i / loopCount) * Math.PI * 2;
        loop.rotation.y = angle;
        loop.rotation.x = Math.PI / 4 + (Math.random() * 0.2);
        loop.position.y = 0.04;
        bowCenter.add(loop);
    }

    // Small Gift Tag
    const tagGroup = new THREE.Group();
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.01), whiteMat);
    tag.rotation.z = 0.5;
    tagGroup.add(tag);
    tagGroup.position.set(0.15, 0.42, 0.15);
    group.add(tagGroup);

    group.add(bowCenter);
    return group;
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  public updateConfig(config: Partial<ParticleConfig>) {
    if (config.color) this.material.color.set(config.color);
    if (config.size !== undefined) this.material.size = config.size;
    if (config.shape) {
      this.currentShape = config.shape;
      this.targetPositions = generateShapePositions(this.currentShape, PARTICLE_COUNT);
      this.material.color.set(this.currentShape === ShapeType.TREE ? THEME.MATTE_GREEN : (config.color || THEME.METALLIC_GOLD));
    }
  }

  public updateGestures(gesture: GestureState | null) {
    if (!gesture) {
      this.expansionFactor = THREE.MathUtils.lerp(this.expansionFactor, 1.0, 0.05);
      return;
    }
    const targetScale = 0.2 + (gesture.openness * 1.5);
    this.expansionFactor = THREE.MathUtils.lerp(this.expansionFactor, targetScale, 0.1);
    this.targetRotation.y = gesture.rotation.y * 2.0;
    this.targetRotation.x = gesture.rotation.x * 2.0;
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, gesture.isPinching ? 15 : 40, 0.05);
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this));
    const time = this.clock.getElapsedTime();
    
    this.particles.rotation.y = THREE.MathUtils.lerp(this.particles.rotation.y, this.targetRotation.y, 0.05);
    this.particles.rotation.x = THREE.MathUtils.lerp(this.particles.rotation.x, this.targetRotation.x, 0.05);
    this.ornaments.rotation.copy(this.particles.rotation);
    
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const currentTargetPositions = this.isZenMode ? this.zenParticlePositions : this.targetPositions;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      let tx = currentTargetPositions[i3] * this.expansionFactor;
      let ty = currentTargetPositions[i3 + 1] * this.expansionFactor;
      let tz = currentTargetPositions[i3 + 2] * this.expansionFactor;

      if (this.isZenMode) {
        const pulse = 1.0 + Math.sin(time * 0.4 + i * 0.005) * 0.05;
        tx *= pulse; ty *= pulse; tz *= pulse;
      }

      posAttr.array[i3] = THREE.MathUtils.lerp(posAttr.array[i3], tx, this.lerpFactor);
      posAttr.array[i3 + 1] = THREE.MathUtils.lerp(posAttr.array[i3 + 1], ty, this.lerpFactor);
      posAttr.array[i3 + 2] = THREE.MathUtils.lerp(posAttr.array[i3 + 2], tz, this.lerpFactor);
    }
    posAttr.needsUpdate = true;

    const isTreeActive = this.currentShape === ShapeType.TREE;
    this.ornamentObjects.forEach((obj, i) => {
      const isVisible = (isTreeActive || this.isZenMode);
      const s = isVisible ? (obj.userData.baseScale * this.expansionFactor) : 0.0;
      obj.scale.lerp(new THREE.Vector3(s, s, s), 0.05);
      
      if (isVisible) {
        let targetPos: THREE.Vector3;
        if (this.isZenMode) {
          const baseTarget = this.zenOrnamentTargets[i].clone().multiplyScalar(this.expansionFactor);
          const floatSpeed = obj.userData.floatSpeed;
          const floatOffset = obj.userData.floatOffset;
          const floatRadius = obj.userData.floatRadius * this.expansionFactor;
          
          const oscX = Math.sin(time * floatSpeed + floatOffset) * floatRadius;
          const oscY = Math.cos(time * floatSpeed * 1.1 + floatOffset * 0.5) * floatRadius;
          const oscZ = Math.sin(time * floatSpeed * 0.9 - floatOffset * 0.8) * floatRadius;
          
          targetPos = baseTarget.add(new THREE.Vector3(oscX, oscY, oscZ));
          obj.rotation.x += obj.userData.rotationSpeed;
          obj.rotation.z += obj.userData.rotationSpeed * 0.5;
        } else {
          targetPos = this.ornamentTargets[i].clone().multiplyScalar(this.expansionFactor);
          obj.rotation.set(0, obj.rotation.y, 0); 
        }
        obj.position.lerp(targetPos, 0.05);
      }
    });

    this.composer.render();
  }
}
