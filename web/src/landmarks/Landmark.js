/**
 * Landmark represents a distinct geospatial entity loaded into the 3D scene.
 * Encapsulates metadata (from landmarks.json) and the underlying Three.js Object3D,
 * enabling query capabilities, interactions (click, hover, focus), and lifecycle management.
 */
export class Landmark {
  /**
   * @param {object} data - Landmark metadata (id, name, gps, description, etc.)
   * @param {import('three').Object3D} object3D - Root 3D object loaded from GLTF
   * @param {object} mapConfig - Global scene configuration (scale, metersPerUnit)
   */
  constructor(data, object3D, mapConfig) {
    this.id = data.id;
    this.name = data.name;
    this.nameEn = data.nameEn;
    this.category = data.category;
    this.description = data.description;
    this.gps = data.gps;
    this.object3D = object3D;

    const { x, y, z } = data.scenePosition ?? { x: 0, y: 0, z: 0 };
    this.object3D.position.set(x, y, z);
    this.object3D.name = data.id;

    // Models are authored in real-world metric scale (1:1).
    // Normalize to scene coordinates via mapConfig.scale.metersPerUnit.
    const metersPerUnit = mapConfig?.scale?.metersPerUnit ?? 1;
    const modelScale = 1 / metersPerUnit;
    this.object3D.scale.setScalar(modelScale);

    this.object3D.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  /**
   * Mounts the landmark 3D object to the target scene.
   * @param {import('three').Scene} scene
   */
  addTo(scene) {
    scene.add(this.object3D);
  }
}
