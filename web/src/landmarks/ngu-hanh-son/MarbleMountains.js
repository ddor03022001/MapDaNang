import * as THREE from 'three';

/**
 * MarbleMountains (Ngũ Hành Sơn) Dynamic Effects & Lighting Controller:
 * Complements the Blender 4.2 LTS 3D model (nguhanh-son.glb) with interactive runtime effects:
 * 1. Động Huyền Không: Volumetric celestial sunbeam (God Ray) descending onto the white marble Buddha.
 * 2. Tháp Xá Lợi: Warm point light and tiered lantern illumination for Night Mode.
 * 3. Cavern & Temple Sanctuary atmospheric lighting.
 */
export class MarbleMountains {
  /**
   * @param {{x: number, y: number, z: number}} [origin] - Georeferenced coordinate center
   */
  constructor(origin = { x: 37.76, y: 0.0, z: 65.01 }) {
    this.group = new THREE.Group();
    this.origin = origin;
    this.group.position.set(origin.x, origin.y, origin.z);

    this.isNightMode = false;
    this.divineLightActive = true;

    this._initEffects();
  }

  /**
   * Initializes volumetric light beam and atmospheric point lights.
   * @private
   */
  _initEffects() {
    // 1. Động Huyền Không: Volumetric God Ray Cone
    // Positioned above the seated Buddha in the cavern (X: -0.12, Y: 0.16, Z: 0.32)
    const beamHeight = 0.55;
    const beamGeo = new THREE.ConeGeometry(0.18, beamHeight, 24, 1, true);
    beamGeo.rotateX(Math.PI);
    beamGeo.translate(0, beamHeight * 0.5, 0);

    this.godRayMat = new THREE.MeshBasicMaterial({
      color: 0xfff6cf,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.godRayMesh = new THREE.Mesh(beamGeo, this.godRayMat);
    this.godRayMesh.position.set(-0.12, 0.22, 0.32);
    this.group.add(this.godRayMesh);

    // Ethereal pool of light on the Buddha shrine
    const poolGeo = new THREE.CircleGeometry(0.18, 16);
    poolGeo.rotateX(-Math.PI / 2);
    this.poolMat = new THREE.MeshBasicMaterial({
      color: 0xfff2b0,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    this.poolMesh = new THREE.Mesh(poolGeo, this.poolMat);
    this.poolMesh.position.set(-0.12, 0.16, 0.32);
    this.group.add(this.poolMesh);

    // Soft warm cavern point light
    this.caveLight = new THREE.PointLight(0xfff1b8, 1.2, 2.5);
    this.caveLight.position.set(-0.12, 0.24, 0.32);
    this.group.add(this.caveLight);

    // 2. Tháp Xá Lợi: Stupa tiered illumination light
    // Positioned on the eastern terrace (X: 0.86, Y: 0.30, Z: -0.08)
    this.stupaLight = new THREE.PointLight(0xffa834, 0.0, 3.8);
    this.stupaLight.position.set(0.86, 0.30, -0.08);
    this.group.add(this.stupaLight);

    // 3. Chùa Linh Ứng sanctuary courtyard lantern light
    // Positioned at X: 0.68, Y: 0.20, Z: 0.28
    this.templeLight = new THREE.PointLight(0xff8833, 0.0, 2.8);
    this.templeLight.position.set(0.68, 0.20, 0.28);
    this.group.add(this.templeLight);
  }

  /**
   * Toggles daytime vs nighttime mode:
   * Adjusts stupa illumination, temple lanterns, and model emissive shaders.
   * @param {boolean} isNight 
   * @param {THREE.Object3D} [model] - Optional loaded nguhanh-son.glb root object
   */
  setNightMode(isNight, model = null) {
    this.isNightMode = isNight;

    if (this.stupaLight) {
      this.stupaLight.intensity = isNight ? 2.0 : 0.0;
    }

    if (this.templeLight) {
      this.templeLight.intensity = isNight ? 1.4 : 0.0;
    }

    if (this.caveLight) {
      this.caveLight.intensity = isNight ? 0.6 : 1.4;
    }

    // Traverse loaded Blender model to illuminate lantern materials
    if (model) {
      model.traverse((child) => {
        if (child.isMesh && child.material) {
          const mat = child.material;
          if (mat.name && mat.name.includes('lantern')) {
            mat.emissive = new THREE.Color(isNight ? 0xffaa33 : 0x000000);
            mat.emissiveIntensity = isNight ? 2.0 : 0.0;
          }
        }
      });
    }
  }

  /**
   * Toggles the mystical volumetric sunbeam in Huyên Không Cave.
   * @param {boolean} active 
   */
  toggleDivineLight(active) {
    this.divineLightActive = active;
    if (this.godRayMesh) {
      this.godRayMesh.visible = active;
    }
    if (this.poolMesh) {
      this.poolMesh.visible = active;
    }
  }

  /**
   * Per-frame animation cycle: subtle celestial god ray breathing.
   * @param {number} time 
   * @param {number} delta 
   */
  update(time, delta = 0.016) {
    if (this.godRayMat && this.divineLightActive) {
      const pulse = 0.38 + Math.sin(time * 1.8) * 0.08 + Math.cos(time * 3.1) * 0.04;
      this.godRayMat.opacity = pulse;
      if (this.poolMat) {
        this.poolMat.opacity = pulse * 0.8;
      }
    }
  }
}
