import * as THREE from 'three';

/**
 * OceanWaves: Dynamic oceanic simulation for My Khe Beach:
 * 1. Multi-frequency Gerstner wave displacement grid with depth attenuation.
 * 2. Cascading breaking wave foam crests sweeping onto the sand shoreline.
 * 3. Tidal shoreline wash pulsation.
 * 4. Animated flock of coastal seagulls soaring over the surf.
 */
export class OceanWaves {
  /**
   * @param {{x: number, y: number, z: number}} [origin] - World coordinates of beach center
   */
  constructor(origin = { x: 20.65, y: 0.0, z: 0.0 }) {
    this.group = new THREE.Group();
    this.origin = origin;
    this.seagulls = [];
    this.waveIntensity = 1.0;

    this._createDynamicOceanSurface();
    this._createShorelineFoamLayers();
    this._createSeagulls();
  }

  /**
   * Sets the intensity multiplier for wave displacement and surge.
   * @param {number} [val]
   */
  setWaveIntensity(val = 1.0) {
    this.waveIntensity = val;
  }

  /**
   * Generates the multi-segment ocean water mesh with PBR physical properties.
   * @private
   */
  _createDynamicOceanSurface() {
    this.oceanWidth = 4.8;
    this.oceanLength = 24.0;
    this.oceanSegmentsX = 48;
    this.oceanSegmentsZ = 120;

    const geo = new THREE.PlaneGeometry(
      this.oceanWidth,
      this.oceanLength,
      this.oceanSegmentsX,
      this.oceanSegmentsZ
    );
    geo.rotateX(-Math.PI / 2);

    this.basePositions = geo.attributes.position.array.slice();

    this.oceanMat = new THREE.MeshPhysicalMaterial({
      color: 0x0fa8b8,          // Radiant turquoise
      emissive: new THREE.Color(0x022535),
      emissiveIntensity: 0.15,
      roughness: 0.12,
      metalness: 0.15,
      transmission: 0.55,       // Water transparency
      ior: 1.333,               // Water index of refraction
      transparent: true,
      opacity: 0.92,
      depthWrite: true
    });

    this.oceanMesh = new THREE.Mesh(geo, this.oceanMat);
    this.oceanMesh.position.set(
      this.origin.x + 3.10,
      this.origin.y + 0.008,
      this.origin.z
    );
    this.oceanMesh.receiveShadow = true;
    this.group.add(this.oceanMesh);
  }

  /**
   * Creates breaking foam crests and shoreline wash layers.
   * @private
   */
  _createShorelineFoamLayers() {
    this.foamGroup = new THREE.Group();
    this.foamCount = 4;
    this.foamWaves = [];

    const foamMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xf5fbff),
      emissiveIntensity: 0.45,
      roughness: 0.35,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < this.foamCount; i++) {
      const segs = 120;
      const ribbonGeo = new THREE.PlaneGeometry(0.22, 23.6, 1, segs);
      ribbonGeo.rotateX(-Math.PI / 2);

      const ribbonMesh = new THREE.Mesh(ribbonGeo, foamMat.clone());
      this.foamGroup.add(ribbonMesh);

      this.foamWaves.push({
        mesh: ribbonMesh,
        baseOffset: i * 0.55,
        speed: 0.32,
        phase: (i / this.foamCount) * Math.PI * 2
      });
    }

    // Tidal shoreline wash on the wet sand
    const washGeo = new THREE.PlaneGeometry(0.26, 23.6, 1, 120);
    washGeo.rotateX(-Math.PI / 2);
    this.washMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.75,
      roughness: 0.2
    });
    this.washMesh = new THREE.Mesh(washGeo, this.washMat);
    this.washMesh.position.set(this.origin.x + 0.74, 0.009, this.origin.z);
    this.foamGroup.add(this.washMesh);

    this.group.add(this.foamGroup);
  }

  /**
   * Generates low-poly animated seagulls flying above the shoreline.
   * @private
   */
  _createSeagulls() {
    const gullGroup = new THREE.Group();
    const gullMat = new THREE.MeshBasicMaterial({ color: 0xf5f8fa, side: THREE.DoubleSide });
    const numGulls = 8;

    for (let i = 0; i < numGulls; i++) {
      const bird = new THREE.Group();

      const wingGeo = new THREE.BufferGeometry();
      const wSpan = 0.045;
      const verts = new Float32Array([
        -wSpan, 0.008, 0.0,   0, 0, -0.012,   0, 0, 0.012,
         wSpan, 0.008, 0.0,   0, 0, -0.012,   0, 0, 0.012
      ]);
      wingGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      wingGeo.computeVertexNormals();

      const wingMesh = new THREE.Mesh(wingGeo, gullMat);
      bird.add(wingMesh);

      bird.position.set(
        this.origin.x + 1.2 + Math.random() * 2.2,
        0.35 + Math.random() * 0.45,
        this.origin.z - 3.5 + Math.random() * 7.0
      );

      gullGroup.add(bird);
      this.seagulls.push({
        group: bird,
        wingMesh: wingMesh,
        speed: 0.45 + Math.random() * 0.3,
        radius: 0.8 + Math.random() * 1.4,
        angle: Math.random() * Math.PI * 2,
        baseY: bird.position.y,
        center: bird.position.clone()
      });
    }

    this.group.add(gullGroup);
  }

  /**
   * Adjusts materials for nighttime lighting.
   * @param {boolean} isNight
   */
  setNightMode(isNight) {
    if (this.oceanMat) {
      if (isNight) {
        this.oceanMat.color.setHex(0x041824);
        this.oceanMat.emissive.setHex(0x010810);
        this.oceanMat.emissiveIntensity = 0.05;
        this.oceanMat.roughness = 0.22;
      } else {
        this.oceanMat.color.setHex(0x0fa8b8);
        this.oceanMat.emissive.setHex(0x022535);
        this.oceanMat.emissiveIntensity = 0.15;
        this.oceanMat.roughness = 0.12;
      }
    }
  }

  /**
   * Per-frame simulation update.
   * @param {number} time
   * @param {number} [delta]
   */
  update(time, delta = 0.016) {
    // 1. Dynamic Gerstner ocean surface deformation
    if (this.oceanMesh) {
      const pos = this.oceanMesh.geometry.attributes.position;
      const count = pos.count;
      const intens = this.waveIntensity;

      for (let i = 0; i < count; i++) {
        const u = this.basePositions[i * 3];     // X axis (East-West)
        const v = this.basePositions[i * 3 + 2]; // Z axis (North-South)

        // Wave amplitude naturally steepens in shallow waters approaching shore
        const depthFactor = Math.max(0.6, 1.4 - (u + 1.8) * 0.25);

        const wave1 = Math.sin(u * 8.5 - time * 2.4 * intens + v * 1.5) * 0.022 * depthFactor * intens;
        const wave2 = Math.sin(u * 14.0 - time * 3.6 * intens + v * 3.2) * 0.011 * intens;
        const wave3 = Math.cos(v * 4.5 + time * 1.8 * intens) * 0.008 * intens;

        pos.setY(i, wave1 + wave2 + wave3);
      }
      pos.needsUpdate = true;
    }

    // 2. Cascade breaking foam crests rolling ashore
    if (this.foamWaves) {
      this.foamWaves.forEach(foam => {
        const cycle = ((time * foam.speed + foam.baseOffset) % 2.4) / 2.4;
        const waveX = (this.origin.x + 2.20) - cycle * 1.46;
        foam.mesh.position.set(waveX, 0.012 + Math.sin(cycle * Math.PI) * 0.008, this.origin.z);

        const opacity = Math.sin(cycle * Math.PI) * 0.85;
        foam.mesh.material.opacity = Math.max(0.0, opacity);
      });
    }

    // 3. Shoreline wash pulsation
    if (this.washMesh) {
      const washT = Math.sin(time * 1.6);
      this.washMesh.position.x = this.origin.x + 0.74 - washT * 0.06;
      this.washMat.opacity = 0.45 + washT * 0.35;
    }

    // 4. Seagull circular soaring & wing flapping
    if (this.seagulls) {
      this.seagulls.forEach((gull, idx) => {
        gull.angle += delta * gull.speed;
        gull.group.position.x = gull.center.x + Math.cos(gull.angle) * gull.radius;
        gull.group.position.z = gull.center.z + Math.sin(gull.angle) * gull.radius * 0.6;
        gull.group.position.y = gull.baseY + Math.sin(time * 2.0 + idx) * 0.04;
        gull.group.rotation.y = -gull.angle + Math.PI / 2;

        const flap = Math.sin(time * 8.0 + idx * 1.5) * 0.35;
        gull.wingMesh.rotation.z = flap;
      });
    }
  }
}
