import * as THREE from 'three';

/**
 * Ground: mặt phẳng nền đại diện mặt đất/mặt nước của khu vực map.
 * Giai đoạn 1 chỉ dùng mặt phẳng đơn giản làm nền để đặt các landmark lên,
 * sau này có thể thay bằng heightmap địa hình thật của Đà Nẵng.
 */
export class Ground {
  constructor(size = 2000, color = 0x3a7d44) {
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 1,
      metalness: 0
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;
  }

  addTo(scene) {
    scene.add(this.mesh);
  }
}
