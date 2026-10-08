import * as THREE from 'three';

/**
 * DragonEffects: Manages special visual effects for Dragon Bridge (Cau Rong):
 * 1. Fire Breathing Show (Volumetric fire particle column with dynamic warm point light)
 * 2. Water Spraying Show (Pressurized mist particle system cascading into the Han River)
 * 3. Night LED Lighting (Smooth color-shifting RGB LED animations along the dragon steel arches)
 */
export class DragonEffects {
  /**
   * @param {THREE.Scene} scene - The main Three.js scene instance
   */
  constructor(scene) {
    this.scene = scene;
    this.fireActive = false;
    this.waterActive = false;
    this.isNightMode = false;
    this._modelOptimized = false;

    // Mouth / nozzle coordinates in Three.js space (1:100 scale):
    // Dragon head faces East (+X), mouth opening sits at X ≈ 2.65, Y ≈ 0.285, Z = 0.0
    this.nozzlePosition = new THREE.Vector3(2.65, 0.285, 0.0);

    // Warm fire illumination point light
    this.fireLight = new THREE.PointLight(0xff6a00, 0, 3.8);
    this.fireLight.position.set(2.78, 0.36, 0.0);
    this.scene.add(this.fireLight);

    // Cool mist illumination point light
    this.waterLight = new THREE.PointLight(0xa0d0ff, 0, 3.2);
    this.waterLight.position.set(2.76, 0.33, 0.0);
    this.scene.add(this.waterLight);

    this._createParticleTextures();
    this._initFireJet();
    this._initWaterJet();
  }

  /**
   * Generates procedural radial gradient particle textures via HTML5 Canvas.
   * @private
   */
  _createParticleTextures() {
    // 1. Soft fire ember particle texture
    const fireCanvas = document.createElement('canvas');
    fireCanvas.width = 64;
    fireCanvas.height = 64;
    const fCtx = fireCanvas.getContext('2d');
    const fGrad = fCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    fGrad.addColorStop(0.0, 'rgba(255, 235, 170, 0.85)');
    fGrad.addColorStop(0.22, 'rgba(255, 160, 30, 0.65)');
    fGrad.addColorStop(0.55, 'rgba(230, 70, 10, 0.30)');
    fGrad.addColorStop(0.85, 'rgba(160, 20, 0, 0.10)');
    fGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    fCtx.fillStyle = fGrad;
    fCtx.fillRect(0, 0, 64, 64);
    this.fireTexture = new THREE.CanvasTexture(fireCanvas);

    // 2. Translucent water mist droplet particle texture
    const waterCanvas = document.createElement('canvas');
    waterCanvas.width = 64;
    waterCanvas.height = 64;
    const wCtx = waterCanvas.getContext('2d');
    const wGrad = wCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    wGrad.addColorStop(0.0, 'rgba(240, 248, 255, 0.60)');
    wGrad.addColorStop(0.35, 'rgba(215, 235, 255, 0.32)');
    wGrad.addColorStop(0.70, 'rgba(185, 215, 245, 0.12)');
    wGrad.addColorStop(1.0, 'rgba(160, 200, 240, 0)');
    wCtx.fillStyle = wGrad;
    wCtx.fillRect(0, 0, 64, 64);
    this.waterTexture = new THREE.CanvasTexture(waterCanvas);
  }

  /**
   * Initializes fire particle system buffer and materials.
   * @private
   */
  _initFireJet() {
    this.fireCount = 420;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.fireCount * 3);
    const colors = new Float32Array(this.fireCount * 3);

    this.fireVelocities = [];
    this.fireLifetimes = [];
    this.fireMaxLifetimes = [];

    for (let i = 0; i < this.fireCount; i++) {
      positions[i * 3] = this.nozzlePosition.x;
      positions[i * 3 + 1] = this.nozzlePosition.y;
      positions[i * 3 + 2] = this.nozzlePosition.z;

      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.6;
      colors[i * 3 + 2] = 0.1;

      this.fireVelocities.push(new THREE.Vector3());
      this.fireLifetimes.push(Math.random() * 0.9);
      this.fireMaxLifetimes.push(0.75 + Math.random() * 0.45);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.11,
      map: this.fireTexture,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });

    this.firePoints = new THREE.Points(geometry, material);
    this.firePoints.visible = false;
    this.scene.add(this.firePoints);
  }

  /**
   * Initializes water spray mist particle system buffer and materials.
   * @private
   */
  _initWaterJet() {
    this.waterCount = 650;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.waterCount * 3);
    const colors = new Float32Array(this.waterCount * 3);

    this.waterVelocities = [];
    this.waterLifetimes = [];
    this.waterMaxLifetimes = [];

    for (let i = 0; i < this.waterCount; i++) {
      positions[i * 3] = this.nozzlePosition.x;
      positions[i * 3 + 1] = this.nozzlePosition.y;
      positions[i * 3 + 2] = this.nozzlePosition.z;

      colors[i * 3] = 0.90;
      colors[i * 3 + 1] = 0.96;
      colors[i * 3 + 2] = 1.0;

      this.waterVelocities.push(new THREE.Vector3());
      this.waterLifetimes.push(Math.random() * 1.3);
      this.waterMaxLifetimes.push(1.2 + Math.random() * 0.6);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.13,
      map: this.waterTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    this.waterPoints = new THREE.Points(geometry, material);
    this.waterPoints.visible = false;
    this.scene.add(this.waterPoints);
  }

  /**
   * Toggles fire-breathing particle emission on/off.
   * @param {boolean} [active]
   */
  toggleFire(active = !this.fireActive) {
    this.fireActive = active;
    this.firePoints.visible = active;
    if (active) {
      this.waterActive = false;
      this.waterPoints.visible = false;
      this.waterLight.intensity = 0;
    }
  }

  /**
   * Toggles water-spraying particle emission on/off.
   * @param {boolean} [active]
   */
  toggleWater(active = !this.waterActive) {
    this.waterActive = active;
    this.waterPoints.visible = active;
    if (active) {
      this.fireActive = false;
      this.firePoints.visible = false;
      this.fireLight.intensity = 0;
    }
  }

  /**
   * Per-frame animation and simulation update.
   * @param {number} delta - Frame delta time in seconds
   * @param {number} time - Global elapsed time in seconds
   * @param {THREE.Object3D|null} bridgeModel - Loaded Dragon Bridge 3D root object
   */
  update(delta, time, bridgeModel) {
    if (bridgeModel && !this._modelOptimized) {
      this._optimizeModelMaterials(bridgeModel);
      this._modelOptimized = true;
    }

    // 1. Update Fire Emission Simulation
    if (this.fireActive) {
      this.fireLight.intensity = 1.25 + Math.sin(time * 28.0) * 0.25 + Math.cos(time * 46.0) * 0.15;

      const pos = this.firePoints.geometry.attributes.position;
      const col = this.firePoints.geometry.attributes.color;
      const count = this.fireCount;

      for (let i = 0; i < count; i++) {
        this.fireLifetimes[i] += delta;

        if (this.fireLifetimes[i] >= this.fireMaxLifetimes[i]) {
          this.fireLifetimes[i] = 0;
          pos.setXYZ(
            i,
            this.nozzlePosition.x + (Math.random() - 0.5) * 0.02,
            this.nozzlePosition.y + (Math.random() - 0.5) * 0.015,
            this.nozzlePosition.z + (Math.random() - 0.5) * 0.02
          );

          // Eject eastwards (+X) at an elevated angle (+26 to +34 degrees)
          const speed = 2.6 + Math.random() * 2.2;
          const pitch = (26 + Math.random() * 8) * (Math.PI / 180);
          const yaw = (Math.random() - 0.5) * 0.12;

          this.fireVelocities[i].set(
            Math.cos(pitch) * speed,
            Math.sin(pitch) * speed,
            yaw * speed
          );
        } else {
          const vx = this.fireVelocities[i].x;
          const vy = this.fireVelocities[i].y;
          const vz = this.fireVelocities[i].z;
          const lifeProgress = this.fireLifetimes[i] / this.fireMaxLifetimes[i];

          pos.setXYZ(
            i,
            pos.getX(i) + vx * delta,
            pos.getY(i) + (vy + lifeProgress * 0.35) * delta,
            pos.getZ(i) + vz * delta
          );

          // Color transition: Bright yellow -> Warm orange -> Fading smoke red
          if (lifeProgress < 0.20) {
            col.setXYZ(i, 1.0, 0.85, 0.40);
          } else if (lifeProgress < 0.60) {
            col.setXYZ(i, 1.0, 0.48, 0.06);
          } else {
            const fade = Math.max(0.0, 1.0 - (lifeProgress - 0.60) / 0.40);
            col.setXYZ(i, 0.70 * fade, 0.16 * fade, 0.02 * fade);
          }
        }
      }
      pos.needsUpdate = true;
      col.needsUpdate = true;
    } else {
      this.fireLight.intensity = 0;
    }

    // 2. Update Water Mist Simulation
    if (this.waterActive) {
      this.waterLight.intensity = 0.45;

      const pos = this.waterPoints.geometry.attributes.position;
      const count = this.waterCount;

      for (let i = 0; i < count; i++) {
        this.waterLifetimes[i] += delta;

        if (this.waterLifetimes[i] >= this.waterMaxLifetimes[i]) {
          this.waterLifetimes[i] = 0;
          pos.setXYZ(
            i,
            this.nozzlePosition.x + (Math.random() - 0.5) * 0.02,
            this.nozzlePosition.y + (Math.random() - 0.5) * 0.015,
            this.nozzlePosition.z + (Math.random() - 0.5) * 0.02
          );

          const speed = 2.5 + Math.random() * 2.1;
          const pitch = (32 + Math.random() * 8) * (Math.PI / 180);
          const yaw = (Math.random() - 0.5) * 0.30;

          this.waterVelocities[i].set(
            Math.cos(pitch) * speed,
            Math.sin(pitch) * speed,
            yaw * speed
          );
        } else {
          // Gravity pull curving spray downwards toward river surface
          this.waterVelocities[i].y -= 2.8 * delta;

          pos.setXYZ(
            i,
            pos.getX(i) + this.waterVelocities[i].x * delta,
            pos.getY(i) + this.waterVelocities[i].y * delta,
            pos.getZ(i) + this.waterVelocities[i].z * delta
          );
        }
      }
      pos.needsUpdate = true;
    } else {
      this.waterLight.intensity = 0;
    }

    // 3. Dynamic Night LED Lighting
    if (bridgeModel && this.isNightMode) {
      this._updateNightLedColors(time, bridgeModel);
    }
  }

  /**
   * Optimizes emissive materials on the loaded model.
   * @private
   */
  _optimizeModelMaterials(bridgeModel) {
    bridgeModel.traverse((child) => {
      if (child.isMesh && child.material) {
        if (child.material.name.includes('dragon-eye')) {
          if (child.material.emissiveIntensity !== undefined) {
            child.material.emissiveIntensity = 1.6;
          }
        }
        if (child.material.name.includes('fire-core')) {
          if (child.material.emissiveIntensity !== undefined) {
            child.material.emissiveIntensity = 1.8;
          }
        }
      }
    });
  }

  /**
   * Sets nighttime lighting mode for the bridge.
   * @param {boolean} isNight
   * @param {THREE.Object3D|null} bridgeModel
   */
  setNightMode(isNight, bridgeModel) {
    this.isNightMode = isNight;
    if (!isNight && bridgeModel) {
      bridgeModel.traverse((child) => {
        if (child.isMesh && child.material && child.material.name.includes('dragon-gold')) {
          child.material.color.setHex(0xffba08);
          if (child.material.emissive) child.material.emissive.setHex(0x000000);
        }
      });
    }
  }

  /**
   * Cycles smooth RGB gradient colors across the dragon's body at night.
   * @private
   */
  _updateNightLedColors(time, bridgeModel) {
    const colors = [
      new THREE.Color(0xffaa00), // Golden Amber
      new THREE.Color(0x0088ff), // Sapphire Blue
      new THREE.Color(0x00e599), // Emerald Jade
      new THREE.Color(0xff2222), // Crimson Red
      new THREE.Color(0xdd00bb), // Lotus Magenta
    ];

    const cycle = (time * 0.35) % colors.length;
    const idx1 = Math.floor(cycle);
    const idx2 = (idx1 + 1) % colors.length;
    const blend = cycle - idx1;

    const currentColor = colors[idx1].clone().lerp(colors[idx2], blend);

    bridgeModel.traverse((child) => {
      if (child.isMesh && child.material) {
        if (child.material.name.includes('dragon-gold') || child.material.name.includes('dragon-amber')) {
          child.material.color.copy(currentColor);
          if (child.material.emissive) {
            child.material.emissive.copy(currentColor).multiplyScalar(0.48);
          }
        }
      }
    });
  }
}
