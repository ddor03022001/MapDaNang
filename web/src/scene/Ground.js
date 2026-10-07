import * as THREE from 'three';
import { CityEnvironment } from './CityEnvironment.js';
import { OceanWaves } from './OceanWaves.js';

/**
 * Ground: Quản lý cảnh quan tổng thể Đà Nẵng:
 * - Dòng Sông Hàn thơ mộng chảy qua trung tâm từ Cầu Trần Thị Lý, Cầu Rồng đến Cầu Sông Hàn ra vịnh.
 * - Môi trường đô thị CityEnvironment: đường xá, bờ kè, nhà cửa, các tòa cao ốc biểu tượng (Tòa nhà Trái Bắp, Novotel, Hilton, APEC...).
 * - Bãi biển Mỹ Khê & Hệ thống sóng biển dạt dào OceanWaves.
 * - Nền địa hình mở rộng cho toàn thành phố.
 */
export class Ground {
  constructor() {
    this.group = new THREE.Group();

    this._createHanRiver();
    this._createOuterTerrain();

    // Môi trường đô thị, mạng lưới đường xá và các khối cao ốc hai bên sông Hàn
    this.cityEnvironment = new CityEnvironment();
    this.group.add(this.cityEnvironment.group);

    // Hệ thống sóng biển động Biển Mỹ Khê
    this.oceanWaves = new OceanWaves({ x: 20.65, y: 0.0, z: 0.0 });
    this.group.add(this.oceanWaves.group);
  }

  _createHanRiver() {
    // Sông Hàn chảy dọc trục Z (Bắc - Nam), rộng ~558m (5.58 units trong scene từ X=-2.79 đến +2.79)
    // Chiều dài 50 units (5km) bao trọn toàn bộ đoạn sông từ phía Nam Cầu Rồng đến phía Bắc Cầu Sông Hàn
    const riverWidth = 5.58;
    const riverLength = 52.0;
    const geometry = new THREE.PlaneGeometry(riverWidth, riverLength, 64, 160);

    // Lưu các vị trí ban đầu để tạo sóng lăn tăn
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
    this.waterMesh.position.set(0, 0.005, -7.0); // Tâm sông dịch về Z=-7.0 để cân đối Cầu Rồng (Z=0) và Cầu Sông Hàn (Z=-12.25)
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);
  }

  _createOuterTerrain() {
    // Mặt nền đô thị rộng lớn bao quát toàn thành phố
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

  setNightMode(isNight) {
    if (this.cityEnvironment) {
      this.cityEnvironment.setNightMode(isNight);
    }
    if (this.oceanWaves) {
      this.oceanWaves.setNightMode(isNight);
    }
  }

  update(time, delta = 0.016) {
    // Cập nhật hệ thống xe cộ lưu thông trên cầu và các đại lộ
    if (this.cityEnvironment) {
      this.cityEnvironment.update(time, delta);
    }

    // Cập nhật hệ thống sóng biển động Biển Mỹ Khê
    if (this.oceanWaves) {
      this.oceanWaves.update(time, delta);
    }

    // Sóng nước lăn tăn trên sông Hàn
    if (this.waterMesh) {
      const pos = this.waterMesh.geometry.attributes.position;
      const count = pos.count;
      for (let i = 0; i < count; i++) {
        const u = this.waterBasePositions[i * 3];
        const v = this.waterBasePositions[i * 3 + 1];
        // Sóng lăn tăn nhẹ nhàng
        const wave = Math.sin(u * 5.0 + time * 1.8) * 0.007 +
                     Math.cos(v * 4.0 + time * 1.4) * 0.005;
        pos.setZ(i, wave);
      }
      pos.needsUpdate = true;
    }
  }

  addTo(scene) {
    scene.add(this.group);
  }
}
