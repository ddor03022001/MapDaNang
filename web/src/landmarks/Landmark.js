/**
 * Landmark: đại diện cho 1 địa danh đã được load vào scene.
 * Bọc lại metadata (từ landmarks.json) cùng với Object3D thực tế trong scene,
 * để dễ tra cứu, tương tác (click, hover, label) sau này.
 */
export class Landmark {
  /**
   * @param {object} data - metadata từ landmarks.json (id, name, gps, description...)
   * @param {import('three').Object3D} object3D - root object đã load từ .glb
   * @param {object} mapConfig - nội dung data/map-config.json (dùng để lấy scale.metersPerUnit)
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

    // Model được dựng trong Blender theo đúng mét thật (1:1). Khi đặt vào scene
    // tổng, phải thu nhỏ theo cùng tỉ lệ với scenePosition (map-config.json >
    // scale.metersPerUnit), nếu không model sẽ đúng vị trí nhưng sai kích thước
    // tương đối so với khoảng cách giữa các địa danh.
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

  addTo(scene) {
    scene.add(this.object3D);
  }
}
