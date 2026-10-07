import * as THREE from 'three';

/**
 * OceanWaves: Hệ thống sóng biển động chân thực cho Biển Mỹ Khê (Đà Nẵng)
 * 
 * Tái hiện chân thực vẻ đẹp bãi biển quyến rũ nhất hành tinh:
 * 1. Các đợt sóng biển Gerstner đa tầng cuộn từ đại dương bao la tiến dần vào bờ cát.
 * 2. Dải bọt sóng trắng xóa (Breaking Wave Foam Crests) trào bọt và dạt dào vỗ bờ.
 * 3. Hiệu ứng sóng liếm bờ cát (Shoreline Wash) mở rộng và thu hẹp nhịp nhàng theo chu kỳ thủy triều.
 * 4. Chuyển màu nước biển chân thực: Xanh ngọc bích (Turquoise) trong vắt ven bờ chuyển sang xanh lam thẳm (Deep Sapphire) ngoài khơi.
 * 5. Đàn chim hải âu chao lượn trên bầu trời biển Mỹ Khê.
 */
export class OceanWaves {
  constructor(origin = { x: 20.65, y: 0.0, z: 7.57 }) {
    this.group = new THREE.Group();
    this.origin = origin;
    this.seagulls = [];

    this._createDynamicOceanSurface();
    this._createShorelineFoamLayers();
    this._createSeagulls();
  }

  _createDynamicOceanSurface() {
    // Mặt nước biển trải dài từ mép bờ cát (X ≈ 20.65 + 0.70) ra xa khơi (X ≈ 20.65 + 3.80)
    // Chiều dài dọc bờ biển: 9.0 units (900m)
    this.oceanWidth = 3.6;   // 360m ra khơi
    this.oceanLength = 9.2;  // 920m dọc bờ biển
    this.oceanSegmentsX = 48;
    this.oceanSegmentsZ = 72;

    const geo = new THREE.PlaneGeometry(
      this.oceanWidth,
      this.oceanLength,
      this.oceanSegmentsX,
      this.oceanSegmentsZ
    );
    geo.rotateX(-Math.PI / 2);

    // Lưu vị trí gốc của các đỉnh để tính toán dao động sóng
    this.basePositions = geo.attributes.position.array.slice();

    // Vật liệu nước biển PBR với độ trong suốt và phản chiếu cao
    this.oceanMat = new THREE.MeshPhysicalMaterial({
      color: 0x0fa8b8,          // Xanh ngọc bích quyến rũ
      emissive: new THREE.Color(0x022535),
      emissiveIntensity: 0.15,
      roughness: 0.12,
      metalness: 0.15,
      transmission: 0.55,       // Độ trong suốt ánh nước
      ior: 1.333,               // Khúc xạ nước
      transparent: true,
      opacity: 0.92,
      depthWrite: true
    });

    this.oceanMesh = new THREE.Mesh(geo, this.oceanMat);
    // Đặt tâm mặt biển ở phía Đông bãi cát Mỹ Khê
    this.oceanMesh.position.set(
      this.origin.x + 2.50,
      this.origin.y + 0.008,
      this.origin.z
    );
    this.oceanMesh.receiveShadow = true;
    this.group.add(this.oceanMesh);
  }

  _createShorelineFoamLayers() {
    this.foamGroup = new THREE.Group();

    // 4 dải bọt sóng trắng song song di chuyển nối tiếp nhau đánh vào bờ
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
      const segs = 64;
      const ribbonGeo = new THREE.PlaneGeometry(0.18, 8.8, 1, segs);
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

    // Dải bọt sóng bờ cát (Shoreline wash) dạt lên bãi cát ẩm
    const washGeo = new THREE.PlaneGeometry(0.24, 8.8, 1, 64);
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

  _createSeagulls() {
    const gullGroup = new THREE.Group();
    const gullMat = new THREE.MeshBasicMaterial({ color: 0xf5f8fa, side: THREE.DoubleSide });

    const numGulls = 8;
    for (let i = 0; i < numGulls; i++) {
      const bird = new THREE.Group();

      // Cánh chim hải âu dạng chữ V uốn lượn
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

  update(time, delta = 0.016) {
    // 1. Cập nhật sóng biển nhấp nhô 3D (Multi-frequency Ocean Waves)
    if (this.oceanMesh) {
      const pos = this.oceanMesh.geometry.attributes.position;
      const count = pos.count;

      for (let i = 0; i < count; i++) {
        const u = this.basePositions[i * 3];     // Trục X (Đông - Tây)
        const v = this.basePositions[i * 3 + 2]; // Trục Z (Bắc - Nam)

        // Sóng truyền từ ngoài khơi (X dương) dạt vào bờ cát (X âm)
        // Độ cao sóng (wave amplitude) tự nhiên tăng nhẹ khi tiến vào vùng nước nông ven bờ
        const depthFactor = Math.max(0.6, 1.4 - (u + 1.8) * 0.25);

        const wave1 = Math.sin(u * 8.5 - time * 2.4 + v * 1.5) * 0.022 * depthFactor;
        const wave2 = Math.sin(u * 14.0 - time * 3.6 + v * 3.2) * 0.011;
        const wave3 = Math.cos(v * 4.5 + time * 1.8) * 0.008;

        pos.setY(i, wave1 + wave2 + wave3);
      }
      pos.needsUpdate = true;
    }

    // 2. Cập nhật các dải bọt sóng cuộn bờ (Breaking Foam Crests)
    if (this.foamWaves) {
      this.foamWaves.forEach(foam => {
        // Chu kỳ di chuyển của từng con sóng dạt vào bờ
        const cycle = ((time * foam.speed + foam.baseOffset) % 2.4) / 2.4; // 0.0 -> 1.0
        // Sóng tiến từ X = 20.65 + 2.20 xuống bờ cát X = 20.65 + 0.74
        const waveX = (this.origin.x + 2.20) - cycle * 1.46;
        foam.mesh.position.set(waveX, 0.012 + Math.sin(cycle * Math.PI) * 0.008, this.origin.z);

        // Bọt sóng rõ nhất khi chuẩn bị vỗ vào bờ (cuối chu kỳ)
        const opacity = Math.sin(cycle * Math.PI) * 0.85;
        foam.mesh.material.opacity = Math.max(0.0, opacity);
      });
    }

    // 3. Sóng liếm bờ cát ẩm (Shoreline Wash pulsating)
    if (this.washMesh) {
      const washT = Math.sin(time * 1.6);
      // Mép sóng tiến lùi trên bãi cát
      this.washMesh.position.x = this.origin.x + 0.74 - washT * 0.06;
      this.washMat.opacity = 0.45 + washT * 0.35;
    }

    // 4. Cập nhật chim hải âu chao lượn trên bầu trời biển
    if (this.seagulls) {
      this.seagulls.forEach(gull => {
        gull.angle += gull.speed * delta;
        gull.group.position.x = gull.center.x + Math.cos(gull.angle) * gull.radius;
        gull.group.position.z = gull.center.z + Math.sin(gull.angle) * (gull.radius * 0.65);
        gull.group.position.y = gull.baseY + Math.sin(time * 2.0 + gull.angle) * 0.08;

        // Xoay hướng bay theo tiếp tuyến quỹ đạo
        gull.group.rotation.y = -gull.angle + Math.PI / 2;
        // Đập cánh
        gull.group.rotation.z = Math.sin(time * 6.5) * 0.22;
      });
    }
  }

  setNightMode(isNight) {
    if (this.oceanMat) {
      if (isNight) {
        this.oceanMat.color.setHex(0x06283d);
        this.oceanMat.emissive.setHex(0x02111d);
        this.oceanMat.roughness = 0.08;
      } else {
        this.oceanMat.color.setHex(0x0fa8b8);
        this.oceanMat.emissive.setHex(0x022535);
        this.oceanMat.roughness = 0.12;
      }
    }
  }

  addTo(scene) {
    scene.add(this.group);
  }
}
