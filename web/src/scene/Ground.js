import * as THREE from 'three';
import { CityEnvironment } from './CityEnvironment.js';
import { OceanWaves } from '../landmarks/my-khe/OceanWaves.js';
import { MarbleMountains } from '../landmarks/ngu-hanh-son/MarbleMountains.js';

/**
 * Ground: Coordinates Da Nang's overarching geographical landscape:
 * - Han River water plane flowing North-South through the city center.
 * - Urban city environment: road networks, embankments, residential blocks, iconic skyscrapers.
 * - My Khe Beach dynamic ocean surf system.
 * - Marble Mountains (Ngũ Hành Sơn) five elemental karst peaks.
 * - Base regional terrain plane.
 */
export class Ground {
  constructor() {
    this.group = new THREE.Group();

    this._createHanRiver();
    this._createOuterTerrain();

    // Urban environment: streets, traffic networks, and high-rise structures on both banks
    this.cityEnvironment = new CityEnvironment();
    this.group.add(this.cityEnvironment.group);

    // Dynamic surf and shoreline simulation for My Khe Beach
    this.oceanWaves = new OceanWaves({ x: 20.65, y: 0.0, z: 0.0 });
    this.group.add(this.oceanWaves.group);

    // Marble Mountains (Ngũ Hành Sơn) karst landscape
    this.marbleMountains = new MarbleMountains({ x: 37.76, y: 0.0, z: 65.01 });
    this.group.add(this.marbleMountains.group);
  }

  /**
   * Initializes Han River water geometry and animated standard material.
   * River flows along Z axis (North - South), ~558m wide (5.58 scene units).
   * @private
   */
  _createHanRiver() {
    const riverWidth = 5.58;
    const riverLength = 52.0;
    const geometry = new THREE.PlaneGeometry(riverWidth, riverLength, 64, 160);

    // Cache initial vertex positions for procedural wave displacement
    this.waterBasePositions = geometry.attributes.position.array.slice();

    this.waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c3345,
      roughness: 0.42,
      metalness: 0.08,
      transparent: true,
      opacity: 0.95,
      depthWrite: true
    });

    this.waterMesh = new THREE.Mesh(geometry, this.waterMaterial);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(0, 0.005, -7.0); // Offset to balance Dragon Bridge (Z=0) and Han River Bridge (Z=-12.25)
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);
  }

  /**
   * Generates the regional terrain plane covering the metropolitan perimeter.
   * @private
   */
  _createOuterTerrain() {
    const cityGeo = new THREE.PlaneGeometry(1200, 1200);
    const cityMat = new THREE.MeshStandardMaterial({
      color: 0x2d3732,
      roughness: 0.95,
      metalness: 0.0
    });

    const cityMesh = new THREE.Mesh(cityGeo, cityMat);
    cityMesh.rotation.x = -Math.PI / 2;
    cityMesh.position.set(0, -0.015, 0);
    cityMesh.receiveShadow = true;
    this.group.add(cityMesh);
  }

  /**
   * Updates lighting and shaders across child environments for night mode.
   * @param {boolean} isNight 
   */
  setNightMode(isNight, nhsModel = null) {
    if (this.cityEnvironment) {
      this.cityEnvironment.setNightMode(isNight);
    }
    if (this.oceanWaves) {
      this.oceanWaves.setNightMode(isNight);
    }
    if (this.marbleMountains) {
      this.marbleMountains.setNightMode(isNight, nhsModel);
    }
  }

  /**
   * Toggles city traffic simulation on/off.
   * @param {boolean} enabled 
   */
  setTrafficEnabled(enabled) {
    if (this.cityEnvironment) {
      this.cityEnvironment.setTrafficEnabled(enabled);
    }
  }

  /**
   * Adjusts coastal wave amplitude and intensity.
   * @param {number} val 
   */
  setWaveIntensity(val) {
    if (this.oceanWaves) {
      this.oceanWaves.setWaveIntensity(val);
    }
  }

  /**
   * Toggles Huyen Khong Cave divine volumetric sunbeam.
   * @param {boolean} active 
   */
  toggleDivineLight(active) {
    if (this.marbleMountains) {
      this.marbleMountains.toggleDivineLight(active);
    }
  }

  /**
   * Per-frame animation cycle for river surface waves, traffic, and ocean surf.
   * @param {number} time 
   * @param {number} delta 
   */
  update(time, delta = 0.016) {
    // Update road traffic flow
    if (this.cityEnvironment) {
      this.cityEnvironment.update(time, delta);
    }

    // Update My Khe ocean surf
    if (this.oceanWaves) {
      this.oceanWaves.update(time, delta);
    }

    // Update Marble Mountains effects
    if (this.marbleMountains) {
      this.marbleMountains.update(time, delta);
    }

    // Han River undulating ripple displacement
    if (this.waterMesh) {
      const pos = this.waterMesh.geometry.attributes.position;
      const count = pos.count;
      for (let i = 0; i < count; i++) {
        const u = this.waterBasePositions[i * 3];
        const v = this.waterBasePositions[i * 3 + 1];
        const wave = Math.sin(u * 5.0 + time * 1.8) * 0.007 +
                     Math.cos(v * 4.0 + time * 1.4) * 0.005;
        pos.setZ(i, wave);
      }
      pos.needsUpdate = true;
    }
  }

  /**
   * Adds all ground environment objects to the given Three.js scene.
   * @param {THREE.Scene} scene 
   */
  addTo(scene) {
    scene.add(this.group);
  }
}
