import * as THREE from 'three';

/**
 * Ground: Mô phỏng cảnh quan thực tế Đà Nẵng với Sông Hàn chảy qua trung tâm,
 * hai bên là bờ kè Bạch Đằng (Bờ Tây) và Trần Hưng Đạo (Bờ Đông).
 */
export class Ground {
  constructor() {
    this.group = new THREE.Group();

    this._createHanRiver();
    this._createRiverBanks();
    this._createOuterTerrain();
  }

  _createHanRiver() {
    // Sông Hàn chảy theo trục Z (Bắc - Nam), rộng ~480m (4.8 units trong scene)
    const riverWidth = 4.8;
    const riverLength = 40.0; // 4km chiều dài đoạn sông
    const geometry = new THREE.PlaneGeometry(riverWidth, riverLength, 64, 128);

    // Lưu các vị trí ban đầu để tạo sóng lăn tăn
    this.waterBasePositions = geometry.attributes.position.array.slice();

    this.waterMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0e3a4f,
      roughness: 0.12,
      metalness: 0.25,
      transmission: 0.35,
      ior: 1.333,
      transparent: true,
      opacity: 0.92,
      depthWrite: true
    });

    this.waterMesh = new THREE.Mesh(geometry, this.waterMaterial);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(0, 0.005, 0); // Ngay sát trên mặt nước Z=0
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);
  }

  _createRiverBanks() {
    // Bờ kè bê tông & vỉa hè ven sông Bạch Đằng (Tây) và Trần Hưng Đạo (Đông)
    const bankLength = 40.0;
    const bankWidth = 2.0;
    const quayHeight = 0.07; // Cao 7m so với nước

    // Bờ Tây (Hải Châu - Bạch Đằng)
    const westBankGeo = new THREE.BoxGeometry(bankWidth, quayHeight, bankLength);
    const bankMat = new THREE.MeshStandardMaterial({
      color: 0xd2d7dc,
      roughness: 0.85,
      metalness: 0.05
    });

    const westBank = new THREE.Mesh(westBankGeo, bankMat);
    westBank.position.set(-3.4, quayHeight / 2, 0);
    westBank.receiveShadow = true;
    this.group.add(westBank);

    // Dải công viên cây xanh ven sông bờ Tây
    const parkMat = new THREE.MeshStandardMaterial({
      color: 0x2e663a,
      roughness: 0.9,
      metalness: 0.0
    });
    const westParkGeo = new THREE.BoxGeometry(bankWidth * 1.5, quayHeight + 0.005, bankLength);
    const westPark = new THREE.Mesh(westParkGeo, parkMat);
    westPark.position.set(-5.15, quayHeight / 2, 0);
    westPark.receiveShadow = true;
    this.group.add(westPark);

    // Bờ Đông (Sơn Trà - Trần Hưng Đạo)
    const eastBank = new THREE.Mesh(westBankGeo, bankMat);
    eastBank.position.set(3.4, quayHeight / 2, 0);
    eastBank.receiveShadow = true;
    this.group.add(eastBank);

    // Dải công viên bờ Đông
    const eastPark = new THREE.Mesh(westParkGeo, parkMat);
    eastPark.position.set(5.15, quayHeight / 2, 0);
    eastPark.receiveShadow = true;
    this.group.add(eastPark);
  }

  _createOuterTerrain() {
    // Mặt nền đô thị rộng lớn bao quát toàn thành phố (cho các địa danh xa như Bà Nà, Ngũ Hành Sơn, Mỹ Khê)
    const cityGeo = new THREE.PlaneGeometry(1200, 1200);
    const cityMat = new THREE.MeshStandardMaterial({
      color: 0x3d4b41,
      roughness: 0.95,
      metalness: 0.0
    });

    const cityMesh = new THREE.Mesh(cityGeo, cityMat);
    cityMesh.rotation.x = -Math.PI / 2;
    cityMesh.position.set(0, -0.01, 0);
    cityMesh.receiveShadow = true;
    this.group.add(cityMesh);
  }

  update(time) {
    // Sóng nước lăn tăn trên sông Hàn
    if (this.waterMesh) {
      const pos = this.waterMesh.geometry.attributes.position;
      const count = pos.count;
      for (let i = 0; i < count; i++) {
        const u = this.waterBasePositions[i * 3];
        const v = this.waterBasePositions[i * 3 + 1];
        // Sóng lăn tăn nhẹ nhàng
        const wave = Math.sin(u * 5.0 + time * 1.8) * 0.008 +
                     Math.cos(v * 4.0 + time * 1.4) * 0.006;
        pos.setZ(i, wave);
      }
      pos.needsUpdate = true;
    }
  }

  addTo(scene) {
    scene.add(this.group);
  }
}
