import * as THREE from 'three';

/**
 * CityEnvironment: Tái hiện chân thực mạng lưới đường xá và các khối kiến trúc đô thị
 * hai bên bờ sông Hàn (Hải Châu - Bờ Tây & Sơn Trà - Bờ Đông) xung quanh Cầu Rồng
 * và Cầu Sông Hàn theo đúng tọa độ thực tế trên bản đồ Đà Nẵng:
 *
 * 1. Dốc cầu tiếp đất (Approach Ramps) CHUẨN XÁC 100%:
 *    - Cầu Rồng: Mặt dốc 6 làn xe (3 làn mỗi chiều) + dải phân cách giữa có cỏ xanh & đèn đường +
 *      vỉa hè đi bộ có lan can bảo vệ kéo dài liền mạch từ trên cầu xuống mặt đất (X = ±3.33 -> ±4.25).
 *    - Tường cánh mố cầu bê tông phẳng phiu, không có góc nhọn hay khối thừa nào chìa ra ngoài.
 *    - Cầu Sông Hàn: Mặt dốc 2 làn xe + vỉa hè + lan can tiếp đất êm thuận vào đường Lê Duẩn và Phạm Văn Đồng.
 *
 * 2. Mạng lưới đường xá chuẩn thực địa & Hầm chui ven sông (Underpasses):
 *    - Đường Bạch Đằng (bờ Tây) & Trần Hưng Đạo (bờ Đông) chạy thông suốt dưới gầm Cầu Rồng và Cầu Sông Hàn
 *      với tĩnh không thoáng đãng (6m - 8.3m), không bị vỉa hè hay trụ cầu nào chắn ngang đường.
 *    - Đại lộ Nguyễn Văn Linh & Võ Văn Kiệt: 6 làn xe, dải phân cách cây xanh giữa đường và vỉa hè rợp bóng cây.
 *
 * 3. Hệ thống xe cộ lưu thông sống động (Traffic System):
 *    - Ô tô, taxi Mai Linh (xanh lá), taxi Tiên Sa (vàng), xe buýt, xe máy di chuyển liên tục
 *      trên các làn đường của Cầu Rồng, Cầu Sông Hàn và các tuyến phố.
 *
 * 4. Các công trình biểu tượng Đà Nẵng:
 *    - Tháp Trái Bắp (Admin Center 34 tầng), Novotel (37 tầng), Hilton (28 tầng), Công viên APEC,
 *      Bảo tàng Điêu khắc Chăm, Cầu Tình Yêu & Tượng Cá Chép Hóa Rồng.
 */
export class CityEnvironment {
  constructor() {
    this.group = new THREE.Group();
    this.isNightMode = false;
    this.nightMaterials = [];
    this.vehicles = [];

    this._initMaterials();
    this._buildBridgeRamps();
    this._buildRoadNetwork();
    this._buildSidewalksAndQuays();
    this._buildIconicLandmarks();
    this._buildUrbanCityBlocks();
    this._buildTreesAndStreetFurniture();
    this._buildTrafficVehicles();
  }

  _initMaterials() {
    // 1. Nhựa đường Asphalt cao cấp
    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x222428,
      roughness: 0.88,
      metalness: 0.05
    });

    // 2. Vạch sơn kẻ đường trắng & vàng PBR
    this.whiteStripeMat = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });
    this.yellowStripeMat = new THREE.MeshBasicMaterial({ color: 0xf5b700 });

    // 3. Vỉa hè lát đá granite ghi xám
    this.sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0xb4b9be,
      roughness: 0.78,
      metalness: 0.02
    });

    // 4. Bờ kè sông & tường chắn mố cầu bê tông
    this.quayMat = new THREE.MeshStandardMaterial({
      color: 0xbec4c9,
      roughness: 0.82,
      metalness: 0.04
    });

    // 5. Lan can bảo vệ kim loại ghi bạc
    this.railingMat = new THREE.MeshStandardMaterial({
      color: 0x76828d,
      metalness: 0.8,
      roughness: 0.35
    });

    // 6. Thảm cỏ công viên & dải phân cách xanh
    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0x2e6535,
      roughness: 0.9,
      metalness: 0.0
    });

    // 7. Vật liệu tường nhà đô thị phong phú
    this.facadeMats = [
      new THREE.MeshStandardMaterial({ color: 0xeeece6, roughness: 0.65 }), // Trắng kem
      new THREE.MeshStandardMaterial({ color: 0xe5d8be, roughness: 0.7 }),  // Vàng cát pastel
      new THREE.MeshStandardMaterial({ color: 0xd9dfe5, roughness: 0.6 }),  // Xám xanh hiện đại
      new THREE.MeshStandardMaterial({ color: 0xdfd3c3, roughness: 0.72 }), // Be ấm
      new THREE.MeshStandardMaterial({ color: 0xb5c6d3, roughness: 0.55 }), // Lam nhạt
    ];

    // 8. Kính cao ốc phản chiếu
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x245874,
      roughness: 0.1,
      metalness: 0.85,
      transmission: 0.2,
      ior: 1.52,
      reflectivity: 0.9
    });

    // 9. Kính xanh tháp Trái Bắp (Danang Admin Center)
    this.adminGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1b708b,
      roughness: 0.08,
      metalness: 0.9,
      transmission: 0.25,
      ior: 1.55
    });

    // 10. Cửa sổ nhà phát sáng ban đêm
    this.windowGlowMat = new THREE.MeshStandardMaterial({
      color: 0x334455,
      roughness: 0.4,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0
    });
    this.nightMaterials.push(this.windowGlowMat);

    // 11. Đèn xe & đèn đường ban đêm
    this.headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xfff5d0),
      emissiveIntensity: 0.2
    });
    this.taillightMat = new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: new THREE.Color(0xff1111),
      emissiveIntensity: 0.4
    });
    this.nightMaterials.push(this.headlightMat);
    this.nightMaterials.push(this.taillightMat);

    // 12. Màu xe cộ giao thông
    this.carColors = [
      new THREE.MeshStandardMaterial({ color: 0xededed, roughness: 0.35, metalness: 0.6 }), // Trắng ngọc
      new THREE.MeshStandardMaterial({ color: 0x1f2326, roughness: 0.35, metalness: 0.7 }), // Đen sang trọng
      new THREE.MeshStandardMaterial({ color: 0x257038, roughness: 0.4, metalness: 0.4 }),  // Taxi Mai Linh (Xanh lá)
      new THREE.MeshStandardMaterial({ color: 0xe5a312, roughness: 0.35, metalness: 0.5 }), // Taxi Tiên Sa (Vàng)
      new THREE.MeshStandardMaterial({ color: 0xb52222, roughness: 0.35, metalness: 0.6 }), // Đỏ tươi
      new THREE.MeshStandardMaterial({ color: 0x225599, roughness: 0.35, metalness: 0.6 }), // Xanh dương
      new THREE.MeshStandardMaterial({ color: 0x828890, roughness: 0.3, metalness: 0.7 }),  // Bạc ánh kim
    ];

    // 13. Mái ngói Chăm & công trình cổ
    this.tileMat = new THREE.MeshStandardMaterial({
      color: 0xb84a2d,
      roughness: 0.8,
      metalness: 0.05
    });

    // 14. Cây cối
    this.foliageMat = new THREE.MeshStandardMaterial({ color: 0x24622b, roughness: 0.85 });
    this.trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
  }

  // -------------------------------------------------------------------------
  // 1. DỐC CẦU TIẾP ĐẤT 3D CHUẨN XÁC 100% (APPROACH RAMPS)
  // -------------------------------------------------------------------------
  _buildBridgeRamps() {
    const rampsGroup = new THREE.Group();

    // =========================================================================
    // A. DỐC CẦU RỒNG TIẾP ĐẤT (BỜ TÂY & BỜ ĐÔNG)
    // - Cao độ mặt cầu: Y = 0.095 (9.5m) tại X = ±3.33
    // - Cao độ mặt đất đại lộ: Y = 0.012 tại X = ±4.25
    // - Mặt cắt ngang:
    //   + Dải phân cách giữa: Z = -0.018 đến +0.018 (rộng 3.6m), có bồn cỏ xanh & đèn đường
    //   + Làn xe Nam (3 làn): Z = -0.152 đến -0.018 (rộng 13.4m)
    //   + Làn xe Bắc (3 làn): Z = +0.018 đến +0.152 (rộng 13.4m)
    //   + Vỉa hè đi bộ 2 bên: Z = ±0.152 đến ±0.1845 (rộng 3.25m), lát đá + lan can bảo vệ
    //   + Tường cánh mố bê tông đứng: tại Z = ±0.1845 phẳng phiu từ vỉa hè xuống Y = 0.0
    // =========================================================================
    const buildCauRongRamp = (signX) => {
      const xB = signX * 3.33; // Đầu cầu
      const xG = signX * 4.25; // Chân dốc
      const yB = 0.095;
      const yG = 0.012;

      // 1. Hai mặt đường dốc asphalt (Nam & Bắc)
      const carriageways = [
        { z1: -0.152, z2: -0.018 }, // Chiều Nam (3 làn)
        { z1:  0.018, z2:  0.152 }, // Chiều Bắc (3 làn)
      ];

      carriageways.forEach(cw => {
        const roadGeo = new THREE.BufferGeometry();
        const verts = new Float32Array([
          xB, yB, cw.z1,   xB, yB, cw.z2,   xG, yG, cw.z1,
          xB, yB, cw.z2,   xG, yG, cw.z2,   xG, yG, cw.z1
        ]);
        roadGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        roadGeo.computeVertexNormals();
        const roadMesh = new THREE.Mesh(roadGeo, this.asphaltMat);
        roadMesh.receiveShadow = true;
        rampsGroup.add(roadMesh);

        // Vạch sơn kẻ đường đứt đoạn (2 vạch chia 3 làn xe cho mỗi chiều)
        const laneW = (cw.z2 - cw.z1) / 3.0;
        for (let l = 1; l <= 2; l++) {
          const zLine = cw.z1 + l * laneW;
          const numDashes = 7;
          for (let d = 0; d < numDashes; d++) {
            const t1 = (d * 2.0) / (numDashes * 2.0);
            const t2 = (d * 2.0 + 1.1) / (numDashes * 2.0);
            if (t2 > 1.0) break;
            const x1 = xB + t1 * (xG - xB);
            const x2 = xB + t2 * (xG - xB);
            const y1 = yB + t1 * (yG - yB) + 0.001;
            const y2 = yB + t2 * (yG - yB) + 0.001;

            const dashGeo = new THREE.BufferGeometry();
            const dw = 0.0022;
            const dVerts = new Float32Array([
              x1, y1, zLine - dw,  x1, y1, zLine + dw,  x2, y2, zLine - dw,
              x1, y1, zLine + dw,  x2, y2, zLine + dw,  x2, y2, zLine - dw
            ]);
            dashGeo.setAttribute('position', new THREE.BufferAttribute(dVerts, 3));
            dashGeo.computeVertexNormals();
            rampsGroup.add(new THREE.Mesh(dashGeo, this.whiteStripeMat));
          }
        }
      });

      // 2. Dải phân cách cây xanh giữa dốc (Median Strip)
      const medGeo = new THREE.BufferGeometry();
      const medH = 0.0035; // Gờ cao hơn mặt đường 3.5mm (35cm thực tế)
      const medVerts = new Float32Array([
        xB, yB + medH, -0.018,   xB, yB + medH,  0.018,   xG, yG + medH, -0.018,
        xB, yB + medH,  0.018,   xG, yG + medH,  0.018,   xG, yG + medH, -0.018
      ]);
      medGeo.setAttribute('position', new THREE.BufferAttribute(medVerts, 3));
      medGeo.computeVertexNormals();
      const medMesh = new THREE.Mesh(medGeo, this.grassMat);
      rampsGroup.add(medMesh);

      // Gờ bó vỉa bê tông dải phân cách
      for (const zSide of [-0.018, 0.018]) {
        const curbGeo = new THREE.BufferGeometry();
        const cVerts = new Float32Array([
          xB, yB, zSide,   xB, yB + medH, zSide,   xG, yG, zSide,
          xB, yB + medH, zSide,   xG, yG + medH, zSide,   xG, yG, zSide
        ]);
        curbGeo.setAttribute('position', new THREE.BufferAttribute(cVerts, 3));
        curbGeo.computeVertexNormals();
        rampsGroup.add(new THREE.Mesh(curbGeo, this.quayMat));
      }

      // 3. Vỉa hè đi bộ 2 bên dốc cầu (Sidewalks)
      const swH = 0.0035;
      const swSides = [
        { zIn: -0.152, zOut: -0.1845 },
        { zIn:  0.152, zOut:  0.1845 }
      ];

      swSides.forEach(sw => {
        const swGeo = new THREE.BufferGeometry();
        const swVerts = new Float32Array([
          xB, yB + swH, sw.zIn,   xB, yB + swH, sw.zOut,   xG, yG + swH, sw.zIn,
          xB, yB + swH, sw.zOut,   xG, yG + swH, sw.zOut,   xG, yG + swH, sw.zIn
        ]);
        swGeo.setAttribute('position', new THREE.BufferAttribute(swVerts, 3));
        swGeo.computeVertexNormals();
        const swMesh = new THREE.Mesh(swGeo, this.sidewalkMat);
        swMesh.receiveShadow = true;
        rampsGroup.add(swMesh);

        // Gờ bó vỉa phía lòng đường
        const curbGeo = new THREE.BufferGeometry();
        const cVerts = new Float32Array([
          xB, yB, sw.zIn,   xB, yB + swH, sw.zIn,   xG, yG, sw.zIn,
          xB, yB + swH, sw.zIn,   xG, yG + swH, sw.zIn,   xG, yG, sw.zIn
        ]);
        curbGeo.setAttribute('position', new THREE.BufferAttribute(cVerts, 3));
        curbGeo.computeVertexNormals();
        rampsGroup.add(new THREE.Mesh(curbGeo, this.quayMat));

        // Lan can bảo vệ kim loại chạy dọc theo dốc
        const railTopH = 0.0125; // Cao 1.25m từ mặt vỉa hè
        const railGeo = new THREE.BufferGeometry();
        const rVerts = new Float32Array([
          xB, yB + swH + railTopH - 0.001, sw.zOut,   xB, yB + swH + railTopH + 0.001, sw.zOut,   xG, yG + swH + railTopH - 0.001, sw.zOut,
          xB, yB + swH + railTopH + 0.001, sw.zOut,   xG, yG + swH + railTopH + 0.001, sw.zOut,   xG, yG + swH + railTopH - 0.001, sw.zOut
        ]);
        railGeo.setAttribute('position', new THREE.BufferAttribute(rVerts, 3));
        railGeo.computeVertexNormals();
        rampsGroup.add(new THREE.Mesh(railGeo, this.railingMat));

        // Các cột trụ lan can dốc
        const numPosts = 10;
        for (let p = 0; p <= numPosts; p++) {
          const t = p / numPosts;
          const xp = xB + t * (xG - xB);
          const yp = yB + t * (yG - yB) + swH;
          const postGeo = new THREE.CylinderGeometry(0.0008, 0.0008, railTopH, 4);
          const postMesh = new THREE.Mesh(postGeo, this.railingMat);
          postMesh.position.set(xp, yp + railTopH / 2, sw.zOut);
          rampsGroup.add(postMesh);
        }
      });

      // 4. Tường cánh mố cầu bê tông phẳng đứng hai bên sườn dốc (Retaining Walls)
      // Nằm chuẩn chỉ tại z = ±0.1845, phẳng đứng từ vỉa hè xuống Y = 0.0, KHÔNG nhô ra ngoài!
      for (const signZ of [-1.0, 1.0]) {
        const wallZ = signZ * 0.1845;
        const wallGeo = new THREE.BufferGeometry();
        const wVerts = new Float32Array([
          xB, yB + swH, wallZ,   xB, 0.0, wallZ,   xG, yG + swH, wallZ,
          xB, 0.0,      wallZ,   xG, 0.0, wallZ,   xG, yG + swH, wallZ
        ]);
        wallGeo.setAttribute('position', new THREE.BufferAttribute(wVerts, 3));
        wallGeo.computeVertexNormals();
        const wallMesh = new THREE.Mesh(wallGeo, this.quayMat);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        rampsGroup.add(wallMesh);
      }

      // 5. Tường chặn đầu mố cầu (Abutment Portal) tại x = xB bịt kín mặt đứng dưới gầm dốc
      const portalGeo = new THREE.BufferGeometry();
      const pVerts = new Float32Array([
        xB, 0.0, -0.1845,   xB, yB, -0.1845,   xB, 0.0, 0.1845,
        xB, yB,  -0.1845,   xB, yB,  0.1845,   xB, 0.0, 0.1845
      ]);
      portalGeo.setAttribute('position', new THREE.BufferAttribute(pVerts, 3));
      portalGeo.computeVertexNormals();
      const portalMesh = new THREE.Mesh(portalGeo, this.quayMat);
      portalMesh.castShadow = true;
      rampsGroup.add(portalMesh);
    };

    // Dựng 2 dốc cầu Rồng tiếp đất (Bờ Đông Sơn Trà & Bờ Tây Hải Châu)
    buildCauRongRamp(1.0);  // Bờ Đông: X = 3.33 -> 4.25 (Võ Văn Kiệt)
    buildCauRongRamp(-1.0); // Bờ Tây: X = -3.33 -> -4.25 (Nguyễn Văn Linh)

    // =========================================================================
    // B. DỐC CẦU SÔNG HÀN TIẾP ĐẤT (BỜ TÂY & BỜ ĐÔNG)
    // - Cao độ mặt cầu: Y = 0.072 tại X = ±3.15, Z = -12.25
    // - Cao độ tiếp đất: Y = 0.012 tại X = ±3.95
    // - Chiều rộng: 12.9m (lòng đường 8.5m: Z = -12.25 ± 0.0425, vỉa hè 2 bên 2.2m: Z = -12.25 ± 0.0645)
    // =========================================================================
    const buildCauSongHanRamp = (signX) => {
      const xB = signX * 3.15;
      const xG = signX * 3.95;
      const yB = 0.072;
      const yG = 0.012;
      const zCen = -12.25;
      const roadHalfW = 0.0425;
      const totalHalfW = 0.0645;
      const swH = 0.003;

      // 1. Mặt đường dốc asphalt
      const rGeo = new THREE.BufferGeometry();
      const rVerts = new Float32Array([
        xB, yB, zCen - roadHalfW,   xB, yB, zCen + roadHalfW,   xG, yG, zCen - roadHalfW,
        xB, yB, zCen + roadHalfW,   xG, yG, zCen + roadHalfW,   xG, yG, zCen - roadHalfW
      ]);
      rGeo.setAttribute('position', new THREE.BufferAttribute(rVerts, 3));
      rGeo.computeVertexNormals();
      const rMesh = new THREE.Mesh(rGeo, this.asphaltMat);
      rMesh.receiveShadow = true;
      rampsGroup.add(rMesh);

      // Vạch tim đường vàng đôi
      const stGeo = new THREE.BufferGeometry();
      const stW = 0.002;
      const stVerts = new Float32Array([
        xB, yB + 0.001, zCen - stW,   xB, yB + 0.001, zCen + stW,   xG, yG + 0.001, zCen - stW,
        xB, yB + 0.001, zCen + stW,   xG, yG + 0.001, zCen + stW,   xG, yG + 0.001, zCen - stW
      ]);
      stGeo.setAttribute('position', new THREE.BufferAttribute(stVerts, 3));
      stGeo.computeVertexNormals();
      rampsGroup.add(new THREE.Mesh(stGeo, this.yellowStripeMat));

      // 2. Vỉa hè đi bộ 2 bên dốc
      for (const signZ of [-1.0, 1.0]) {
        const z1 = zCen + signZ * roadHalfW;
        const z2 = zCen + signZ * totalHalfW;
        const swGeo = new THREE.BufferGeometry();
        const swVerts = new Float32Array([
          xB, yB + swH, z1,   xB, yB + swH, z2,   xG, yG + swH, z1,
          xB, yB + swH, z2,   xG, yG + swH, z2,   xG, yG + swH, z1
        ]);
        swGeo.setAttribute('position', new THREE.BufferAttribute(swVerts, 3));
        swGeo.computeVertexNormals();
        rampsGroup.add(new THREE.Mesh(swGeo, this.sidewalkMat));

        // Lan can dốc
        const railTopH = 0.011;
        const railGeo = new THREE.BufferGeometry();
        const rVerts = new Float32Array([
          xB, yB + swH + railTopH - 0.001, z2,   xB, yB + swH + railTopH + 0.001, z2,   xG, yG + swH + railTopH - 0.001, z2,
          xB, yB + swH + railTopH + 0.001, z2,   xG, yG + swH + railTopH + 0.001, z2,   xG, yG + swH + railTopH - 0.001, z2
        ]);
        railGeo.setAttribute('position', new THREE.BufferAttribute(rVerts, 3));
        railGeo.computeVertexNormals();
        rampsGroup.add(new THREE.Mesh(railGeo, this.railingMat));

        // Tường cánh bê tông
        const wallGeo = new THREE.BufferGeometry();
        const wVerts = new Float32Array([
          xB, yB + swH, z2,   xB, 0.0, z2,   xG, yG + swH, z2,
          xB, 0.0,      z2,   xG, 0.0, z2,   xG, yG + swH, z2
        ]);
        wallGeo.setAttribute('position', new THREE.BufferAttribute(wVerts, 3));
        wallGeo.computeVertexNormals();
        rampsGroup.add(new THREE.Mesh(wallGeo, this.quayMat));
      }

      // Tường chắn mố cầu
      const portGeo = new THREE.BufferGeometry();
      const pVerts = new Float32Array([
        xB, 0.0, zCen - totalHalfW,   xB, yB, zCen - totalHalfW,   xB, 0.0, zCen + totalHalfW,
        xB, yB,  zCen - totalHalfW,   xB, yB, zCen + totalHalfW,   xB, 0.0, zCen + totalHalfW
      ]);
      portGeo.setAttribute('position', new THREE.BufferAttribute(pVerts, 3));
      portGeo.computeVertexNormals();
      rampsGroup.add(new THREE.Mesh(portGeo, this.quayMat));
    };

    buildCauSongHanRamp(1.0);  // Bờ Đông: X = 3.15 -> 3.95 (Phạm Văn Đồng)
    buildCauSongHanRamp(-1.0); // Bờ Tây: X = -3.15 -> -3.95 (Lê Duẩn)

    this.group.add(rampsGroup);
  }

  // -------------------------------------------------------------------------
  // 2. MẠNG LƯỚI ĐƯỜNG XÁ CHUẨN THỰC ĐỊA & HẦM CHUI VEN SÔNG
  // -------------------------------------------------------------------------
  _buildRoadNetwork() {
    const roadsGroup = new THREE.Group();

    // Helper tạo đoạn đường phẳng
    const addRoad = (x, z, w, len, isH = false) => {
      const geo = new THREE.PlaneGeometry(isH ? len : w, isH ? w : len);
      const mesh = new THREE.Mesh(geo, this.asphaltMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.012, z);
      mesh.receiveShadow = true;
      roadsGroup.add(mesh);
    };

    // Helper tạo vạch kẻ đường
    const addStripe = (x, z, len, isYellow = false, isH = false) => {
      const geo = new THREE.PlaneGeometry(isH ? len : 0.003, isH ? 0.003 : len);
      const mesh = new THREE.Mesh(geo, isYellow ? this.yellowStripeMat : this.whiteStripeMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.013, z);
      roadsGroup.add(mesh);
    };

    // Helper tạo đại lộ 6 làn xe tiếp nối trực tiếp từ dốc Cầu Rồng (Nguyễn Văn Linh / Võ Văn Kiệt)
    const build6LaneAvenue = (xStart, xEnd, isWest = false) => {
      const len = Math.abs(xEnd - xStart);
      const xCen = (xStart + xEnd) / 2.0;

      // 1. Hai làn xe chạy (Nam & Bắc)
      // Nam: Z = -0.152 đến -0.018 (rộng 0.134)
      addRoad(xCen, -0.085, 0.134, len, true);
      // Bắc: Z = +0.018 đến +0.152 (rộng 0.134)
      addRoad(xCen,  0.085, 0.134, len, true);

      // 2. Vạch sơn kẻ đường đứt đoạn chia 3 làn xe mỗi chiều
      for (const zLine of [-0.129, -0.085, -0.041, 0.041, 0.085, 0.129]) {
        addStripe(xCen, zLine, len, false, true);
      }

      // 3. Dải phân cách giữa có cỏ xanh và đèn đường (Z = -0.018 đến +0.018)
      const medGeo = new THREE.BoxGeometry(len, 0.005, 0.036);
      const medMesh = new THREE.Mesh(medGeo, this.grassMat);
      medMesh.position.set(xCen, 0.014, 0.0);
      roadsGroup.add(medMesh);

      // Cây cảnh & cột đèn trên dải phân cách giữa đại lộ
      const numLights = Math.floor(len / 1.5);
      for (let i = 0; i <= numLights; i++) {
        const xl = xStart + (i / Math.max(1, numLights)) * (xEnd - xStart);
        // Cột đèn đôi chiếu sáng
        const poleGeo = new THREE.CylinderGeometry(0.003, 0.004, 0.09, 6);
        const pole = new THREE.Mesh(poleGeo, this.railingMat);
        pole.position.set(xl, 0.055, 0.0);
        roadsGroup.add(pole);

        const armGeo = new THREE.BoxGeometry(0.003, 0.002, 0.032);
        const arm = new THREE.Mesh(armGeo, this.railingMat);
        arm.position.set(xl, 0.098, 0.0);
        roadsGroup.add(arm);
      }

      // 4. Vỉa hè đi bộ 2 bên đại lộ
      for (const signZ of [-1.0, 1.0]) {
        const swZ = signZ * 0.178;
        const swGeo = new THREE.BoxGeometry(len, 0.006, 0.052);
        const swMesh = new THREE.Mesh(swGeo, this.sidewalkMat);
        swMesh.position.set(xCen, 0.015, swZ);
        roadsGroup.add(swMesh);
      }
    };

    // A. ĐẠI LỘ NGUYỄN VĂN LINH (BỜ TÂY): Bắt đầu chuẩn xác từ chân dốc Cầu Rồng (X = -4.25 đến -20.0)
    build6LaneAvenue(-4.25, -20.0, true);

    // B. ĐẠI LỘ VÕ VĂN KIỆT (BỜ ĐÔNG): Bắt đầu chuẩn xác từ chân dốc Cầu Rồng (X = +4.25 đến +20.0)
    build6LaneAvenue(4.25, 20.0, false);

    // C. ĐƯỜNG LÊ DUẨN (BỜ TÂY): Bắt đầu từ chân dốc Cầu Sông Hàn (X = -3.95 đến -20.0, Z = -12.25)
    addRoad(-11.975, -12.25, 0.22, 16.05, true);
    addStripe(-11.975, -12.25, 16.05, true, true);
    addStripe(-11.975, -12.25 - 0.05, 16.05, false, true);
    addStripe(-11.975, -12.25 + 0.05, 16.05, false, true);

    // D. ĐƯỜNG PHẠM VĂN ĐỒNG (BỜ ĐÔNG): Bắt đầu từ chân dốc Cầu Sông Hàn (X = +3.95 đến +20.0, Z = -12.25)
    addRoad(11.975, -12.25, 0.24, 16.05, true);
    addStripe(11.975, -12.25, 16.05, true, true);
    addStripe(11.975, -12.25 - 0.06, 16.05, false, true);
    addStripe(11.975, -12.25 + 0.06, 16.05, false, true);

    // E. ĐƯỜNG BẠCH ĐẰNG (VEN SÔNG BỜ TÂY): Chạy dọc bờ sông tại X = -3.12 (Z = -20.0 đến +14.0)
    // Tuyến đường huyết mạch này CHUI HOÀN TOÀN DƯỚI GẦM Cầu Rồng (clearance 8.3m) và Cầu Sông Hàn (clearance 6.0m)
    addRoad(-3.12, -3.0, 0.22, 34.0);
    addStripe(-3.12, -3.0, 34.0, true);
    addStripe(-3.12 - 0.05, -3.0, 34.0, false);
    addStripe(-3.12 + 0.05, -3.0, 34.0, false);

    // F. ĐƯỜNG TRẦN HƯNG ĐẠO (VEN SÔNG BỜ ĐÔNG): Chạy dọc bờ sông tại X = +3.12 (Z = -20.0 đến +14.0)
    // Tuyến đường này CHUI HOÀN TOÀN DƯỚI GẦM Cầu Rồng và Cầu Sông Hàn
    addRoad(3.12, -3.0, 0.22, 34.0);
    addStripe(3.12, -3.0, 34.0, true);
    addStripe(3.12 - 0.05, -3.0, 34.0, false);
    addStripe(3.12 + 0.05, -3.0, 34.0, false);

    // G. CÁC TRỤC ĐƯỜNG PHỐ NỘI ĐÔ SONG SONG & GIAO CẮT
    // Đường Trần Phú (bờ Tây X = -4.60):
    addRoad(-4.60, -3.0, 0.22, 34.0);
    addStripe(-4.60, -3.0, 34.0, true);

    // Đường 2 Tháng 9 (bờ Tây nối từ nút giao Cầu Rồng về phía Nam Z = 0 đến +14):
    addRoad(-3.12, 7.0, 0.24, 14.0);

    // Đường Ngô Quyền (đại lộ lớn bờ Đông X = +5.80):
    addRoad(5.80, -3.0, 0.30, 34.0);
    addStripe(5.80, -3.0, 34.0, true);

    // Các đường nhánh kết nối (Thái Phiên, Hùng Vương, Quang Trung, Hà Thị Thân):
    addRoad(-3.86, -4.0, 0.16, 1.48, true);  // Thái Phiên
    addRoad(-3.86, -8.0, 0.18, 1.48, true);  // Hùng Vương
    addRoad(-3.86, -15.5, 0.18, 1.48, true); // Quang Trung
    addRoad(4.46, -4.5, 0.16, 2.68, true);   // Hà Thị Thân
    addRoad(4.46, -8.5, 0.16, 2.68, true);   // An Hải Bắc

    this.group.add(roadsGroup);
  }

  // -------------------------------------------------------------------------
  // 3. BỜ KÈ SÔNG HÀN & PHỐ ĐI BỘ VEN SÔNG (RIVERWALK & QUAYS)
  // -------------------------------------------------------------------------
  _buildSidewalksAndQuays() {
    const swGroup = new THREE.Group();
    const quayH = 0.055; // Cao hơn mặt nước 5.5m

    // Tuyến phố đi bộ lát đá và tường kè bờ sông chạy dọc từ Bắc vào Nam (Z = -20 đến +14)
    // Tự nhiên luồn dưới gầm Cầu Rồng và Cầu Sông Hàn mà KHÔNG bao giờ cắt ngang qua lòng đường xe chạy!
    for (const signX of [-1.0, 1.0]) {
      const isWest = signX < 0;
      const wallX = signX * 2.79;       // Tường kè mép nước
      const promX = signX * 2.90;       // Tâm vỉa hè phố đi bộ bờ sông

      // 1. Tường kè đá trắng mép nước
      const wallGeo = new THREE.BoxGeometry(0.04, quayH, 34.0);
      const wallMesh = new THREE.Mesh(wallGeo, this.quayMat);
      wallMesh.position.set(wallX, quayH / 2, -3.0);
      wallMesh.receiveShadow = true;
      swGroup.add(wallMesh);

      // 2. Vỉa hè đi bộ bờ sông Bạch Đằng & Trần Hưng Đạo (rộng 0.18)
      const promGeo = new THREE.BoxGeometry(0.18, 0.02, 34.0);
      const promMesh = new THREE.Mesh(promGeo, this.sidewalkMat);
      promMesh.position.set(promX, quayH, -3.0);
      promMesh.receiveShadow = true;
      swGroup.add(promMesh);

      // 3. Lan can hoa văn bờ sông bảo vệ du khách ngắm cảnh
      const riverRailGeo = new THREE.BoxGeometry(0.008, 0.008, 34.0);
      const riverRail = new THREE.Mesh(riverRailGeo, this.railingMat);
      riverRail.position.set(wallX + (isWest ? -0.015 : 0.015), quayH + 0.012, -3.0);
      swGroup.add(riverRail);
    }

    this.group.add(swGroup);
  }

  // -------------------------------------------------------------------------
  // 4. CÁC CÔNG TRÌNH BIỂU TƯỢNG ĐÀ NẴNG (ICONIC LANDMARKS)
  // -------------------------------------------------------------------------
  _buildIconicLandmarks() {
    const lmGroup = new THREE.Group();

    // A. TRUNG TÂM HÀNH CHÍNH ĐÀ NẴNG (THÁP TRÁI BẮP / BÚP SEN 34 TẦNG CAO 167M)
    const adminTowerGroup = new THREE.Group();
    adminTowerGroup.position.set(-3.85, 0.0, -14.2);

    const adminPodiumGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.16, 24);
    const adminPodium = new THREE.Mesh(adminPodiumGeo, this.facadeMats[0]);
    adminPodium.position.y = 0.08;
    adminTowerGroup.add(adminPodium);

    const towerH = 1.67;
    const towerGeo = new THREE.CylinderGeometry(0.18, 0.25, towerH, 28, 16);
    const pos = towerGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const relY = (y + towerH / 2) / towerH;
      const bulge = 1.0 + Math.sin(relY * Math.PI) * 0.42;
      pos.setX(i, pos.getX(i) * bulge);
      pos.setZ(i, pos.getZ(i) * bulge);
    }
    towerGeo.computeVertexNormals();
    const adminTower = new THREE.Mesh(towerGeo, this.adminGlassMat);
    adminTower.position.y = 0.16 + towerH / 2;
    adminTower.castShadow = true;
    adminTowerGroup.add(adminTower);

    const spireGeo = new THREE.ConeGeometry(0.12, 0.22, 16);
    const spireMat = new THREE.MeshStandardMaterial({ color: 0xddeeff, metalness: 0.9, roughness: 0.2 });
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.y = 0.16 + towerH + 0.11;
    adminTowerGroup.add(spire);

    const adminBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    adminBeacon.position.y = 0.16 + towerH + 0.23;
    adminTowerGroup.add(adminBeacon);
    lmGroup.add(adminTowerGroup);

    // B. NOVOTEL DANANG PREMIER HAN RIVER (THÁP KÍNH 37 TẦNG CAO 150M)
    const novotelGroup = new THREE.Group();
    novotelGroup.position.set(-3.65, 0.0, -12.9);
    const novoH = 1.50;
    const novoGeo = new THREE.BoxGeometry(0.28, novoH, 0.42);
    const novoMesh = new THREE.Mesh(novoGeo, this.glassMat);
    novoMesh.position.y = novoH / 2 + 0.02;
    novoMesh.castShadow = true;
    novotelGroup.add(novoMesh);

    const crownGeo = new THREE.BoxGeometry(0.24, 0.08, 0.36);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x112233, metalness: 0.8 });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = novoH + 0.06;
    novotelGroup.add(crown);
    lmGroup.add(novotelGroup);

    // C. HILTON DANANG & INDOCHINA RIVERSIDE TOWERS (28 TẦNG)
    const hiltonGeo = new THREE.BoxGeometry(0.32, 1.15, 0.48);
    const hiltonMesh = new THREE.Mesh(hiltonGeo, this.glassMat);
    hiltonMesh.position.set(-3.60, 1.15 / 2 + 0.02, -9.8);
    hiltonMesh.castShadow = true;
    lmGroup.add(hiltonMesh);

    // D. CÔNG VIÊN APEC & MÁI VÒM CÁNH DIỀU BAY (APEC PARK)
    const apecGroup = new THREE.Group();
    apecGroup.position.set(-3.40, 0.02, 1.25);
    const parkBaseGeo = new THREE.BoxGeometry(0.65, 0.02, 0.95);
    const parkBase = new THREE.Mesh(parkBaseGeo, this.grassMat);
    apecGroup.add(parkBase);

    const domeW = 0.42;
    const domeL = 0.55;
    const domeGeo = new THREE.PlaneGeometry(domeW, domeL, 24, 24);
    const domePos = domeGeo.attributes.position;
    for (let i = 0; i < domePos.count; i++) {
      const u = domePos.getX(i) / (domeW / 2);
      const v = domePos.getY(i) / (domeL / 2);
      const curve = Math.cos(u * Math.PI * 0.7) * 0.08 + Math.sin(v * Math.PI * 0.9) * 0.05 + 0.12;
      domePos.setZ(i, curve);
    }
    domeGeo.computeVertexNormals();
    const kiteMat = new THREE.MeshStandardMaterial({ color: 0xfafcff, roughness: 0.25, metalness: 0.15, side: THREE.DoubleSide });
    const kiteMesh = new THREE.Mesh(domeGeo, kiteMat);
    kiteMesh.rotation.x = -Math.PI / 2;
    kiteMesh.position.y = 0.06;
    kiteMesh.castShadow = true;
    apecGroup.add(kiteMesh);
    lmGroup.add(apecGroup);

    // E. BẢO TÀNG ĐIÊU KHẮC CHĂM
    const chamGroup = new THREE.Group();
    chamGroup.position.set(-3.75, 0.02, 0.55);
    const chamBase = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 0.45), this.facadeMats[1]);
    chamBase.position.y = 0.05;
    chamGroup.add(chamBase);

    const chamRoof = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.09, 4), this.tileMat);
    chamRoof.rotation.y = Math.PI / 4;
    chamRoof.position.y = 0.145;
    chamGroup.add(chamRoof);
    lmGroup.add(chamGroup);

    // F. CẦU TÌNH YÊU & TƯỢNG CÁ CHÉP HÓA RỒNG (BỜ ĐÔNG SƠN TRÀ)
    const loveBridgeGroup = new THREE.Group();
    loveBridgeGroup.position.set(2.70, 0.035, -1.35);
    const pierGeo = new THREE.BoxGeometry(0.35, 0.025, 0.55);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 });
    const pierMesh = new THREE.Mesh(pierGeo, woodMat);
    pierMesh.position.x = -0.08;
    loveBridgeGroup.add(pierMesh);

    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xdd1122, emissive: new THREE.Color(0xff1122), emissiveIntensity: 0.6 });
    for (let k = 0; k < 5; k++) {
      const poleGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.08, 8);
      const pole = new THREE.Mesh(poleGeo, this.facadeMats[2]);
      pole.position.set(-0.16 + (k % 2) * 0.12, 0.05, -0.20 + k * 0.10);
      loveBridgeGroup.add(pole);

      const heart = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), lanternMat);
      heart.position.set(pole.position.x, 0.095, pole.position.z);
      loveBridgeGroup.add(heart);
    }

    const carpMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.045, 0.075, 12),
      new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.2 })
    );
    carpMesh.position.set(-0.24, 0.07, 0.18);
    loveBridgeGroup.add(carpMesh);
    lmGroup.add(loveBridgeGroup);

    // G. VINPEARL CONDOTEL (BỜ ĐÔNG SƠN TRÀ)
    const vinpearlGeo = new THREE.BoxGeometry(0.35, 1.25, 0.52);
    const vinpearlMesh = new THREE.Mesh(vinpearlGeo, this.glassMat);
    vinpearlMesh.position.set(3.75, 1.25 / 2 + 0.02, -11.5);
    vinpearlMesh.castShadow = true;
    lmGroup.add(vinpearlMesh);

    this.group.add(lmGroup);
  }

  // -------------------------------------------------------------------------
  // 5. CÁC KHỐI NHÀ PHỐ & KHU DÂN CƯ ĐÔ THỊ BÀN CỜ
  // -------------------------------------------------------------------------
  _buildUrbanCityBlocks() {
    const blocksGroup = new THREE.Group();

    const urbanZones = [
      { minX: -4.3, maxX: -3.4, minZ: -11.8, maxZ: -4.8, minH: 0.16, maxH: 0.38, cols: 3, rows: 14 },
      { minX: -6.5, maxX: -4.9, minZ: -11.8, maxZ: -1.0, minH: 0.14, maxH: 0.30, cols: 4, rows: 18 },
      { minX: -6.5, maxX: -3.5, minZ: 0.8, maxZ: 8.5, minH: 0.15, maxH: 0.35, cols: 5, rows: 12 },
      { minX: -15.5, maxX: -6.8, minZ: -1.2, maxZ: -0.3, minH: 0.20, maxH: 0.55, cols: 14, rows: 2 },
      { minX: -15.5, maxX: -6.8, minZ: 0.3, maxZ: 1.2, minH: 0.20, maxH: 0.55, cols: 14, rows: 2 },

      { minX: 3.4, maxX: 5.4, minZ: -11.8, maxZ: -2.0, minH: 0.18, maxH: 0.45, cols: 4, rows: 16 },
      { minX: 3.4, maxX: 5.4, minZ: 0.8, maxZ: 8.5, minH: 0.15, maxH: 0.32, cols: 4, rows: 12 },
      { minX: 6.2, maxX: 15.5, minZ: -1.2, maxZ: -0.3, minH: 0.25, maxH: 0.65, cols: 14, rows: 2 },
      { minX: 6.2, maxX: 15.5, minZ: 0.3, maxZ: 1.2, minH: 0.25, maxH: 0.65, cols: 14, rows: 2 },
      { minX: 4.2, maxX: 15.5, minZ: -13.5, maxZ: -12.6, minH: 0.25, maxH: 0.60, cols: 16, rows: 2 },
      { minX: 4.2, maxX: 15.5, minZ: -11.9, maxZ: -11.0, minH: 0.25, maxH: 0.60, cols: 16, rows: 2 },
    ];

    let seed = 42;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    urbanZones.forEach((zone) => {
      const stepX = (zone.maxX - zone.minX) / zone.cols;
      const stepZ = (zone.maxZ - zone.minZ) / zone.rows;

      for (let c = 0; c < zone.cols; c++) {
        for (let r = 0; r < zone.rows; r++) {
          if (random() < 0.12) continue;

          const cx = zone.minX + c * stepX + stepX * 0.5;
          const cz = zone.minZ + r * stepZ + stepZ * 0.5;

          const w = stepX * (0.65 + random() * 0.25);
          const d = stepZ * (0.65 + random() * 0.25);
          const h = zone.minH + random() * (zone.maxH - zone.minH);

          const geo = new THREE.BoxGeometry(w, h, d);
          const matIdx = Math.floor(random() * this.facadeMats.length);
          const mesh = new THREE.Mesh(geo, this.facadeMats[matIdx]);
          mesh.position.set(cx, h / 2 + 0.02, cz);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          blocksGroup.add(mesh);

          if (random() > 0.45) {
            const roofBox = new THREE.Mesh(
              new THREE.BoxGeometry(w * 0.35, 0.03, d * 0.35),
              this.facadeMats[0]
            );
            roofBox.position.set(cx, h + 0.035, cz);
            blocksGroup.add(roofBox);
          }
        }
      }
    });

    this.group.add(blocksGroup);
  }

  // -------------------------------------------------------------------------
  // 6. CÂY XANH NHIỆT ĐỚI VEN SÔNG & ĐÈN ĐƯỜNG
  // -------------------------------------------------------------------------
  _buildTreesAndStreetFurniture() {
    const vegGroup = new THREE.Group();
    const treeCount = 48;
    const treeGeo = new THREE.ConeGeometry(0.045, 0.10, 6);
    const trunkGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.05, 5);

    for (let i = 0; i < treeCount; i++) {
      const z = -17.0 + (i / treeCount) * 32.0;
      if (Math.abs(z) < 0.35 || Math.abs(z - -12.25) < 0.35) continue;

      // Cây bờ Tây (X ≈ -3.02)
      const tWest = new THREE.Group();
      const trW = new THREE.Mesh(trunkGeo, this.trunkMat);
      trW.position.y = 0.025;
      const crW = new THREE.Mesh(treeGeo, this.foliageMat);
      crW.position.y = 0.075;
      tWest.add(trW);
      tWest.add(crW);
      tWest.position.set(-3.02, 0.035, z);
      vegGroup.add(tWest);

      // Cây bờ Đông (X ≈ +3.02)
      const tEast = new THREE.Group();
      const trE = new THREE.Mesh(trunkGeo, this.trunkMat);
      trE.position.y = 0.025;
      const crE = new THREE.Mesh(treeGeo, this.foliageMat);
      crE.position.y = 0.075;
      tEast.add(trE);
      tEast.add(crE);
      tEast.position.set(3.02, 0.035, z);
      vegGroup.add(tEast);
    }

    this.group.add(vegGroup);
  }

  // -------------------------------------------------------------------------
  // 7. HỆ THỐNG XE CỘ LƯU THÔNG SỐNG ĐỘNG (TRAFFIC VEHICLES)
  // -------------------------------------------------------------------------
  _buildTrafficVehicles() {
    const trafficGroup = new THREE.Group();

    // Hàm tạo 1 xe low-poly: thân xe + cabin kính + 4 bánh + đèn pha & hậu
    const createVehicle = (type = 'car', colorMat = this.carColors[0]) => {
      const veh = new THREE.Group();

      let bodyW = 0.022, bodyH = 0.012, bodyL = 0.046;
      if (type === 'bus') {
        bodyW = 0.028; bodyH = 0.024; bodyL = 0.092;
      } else if (type === 'bike') {
        bodyW = 0.009; bodyH = 0.014; bodyL = 0.024;
      }

      // Thân xe
      const bodyGeo = new THREE.BoxGeometry(bodyL, bodyH, bodyW);
      const body = new THREE.Mesh(bodyGeo, colorMat);
      body.position.y = bodyH / 2 + 0.003;
      body.castShadow = true;
      veh.add(body);

      // Cabin kính
      if (type !== 'bike') {
        const cabH = bodyH * 0.75;
        const cabGeo = new THREE.BoxGeometry(bodyL * 0.55, cabH, bodyW * 0.88);
        const cabin = new THREE.Mesh(cabGeo, this.glassMat);
        cabin.position.set(-bodyL * 0.05, bodyH + cabH / 2 + 0.002, 0);
        veh.add(cabin);
      }

      // Đèn pha trước (vàng trắng) & Đèn hậu sau (đỏ)
      const hlGeo = new THREE.BoxGeometry(0.002, 0.003, bodyW * 0.7);
      const hl = new THREE.Mesh(hlGeo, this.headlightMat);
      hl.position.set(bodyL / 2 + 0.001, bodyH * 0.6, 0);
      veh.add(hl);

      const tl = new THREE.Mesh(hlGeo, this.taillightMat);
      tl.position.set(-bodyL / 2 - 0.001, bodyH * 0.6, 0);
      veh.add(tl);

      // Biển taxi trên nóc nếu là xe taxi Mai Linh / Tiên Sa
      if (colorMat === this.carColors[2] || colorMat === this.carColors[3]) {
        const signMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.012, 0.004, 0.006),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        signMesh.position.set(-bodyL * 0.05, bodyH * 1.8 + 0.002, 0);
        veh.add(signMesh);
      }

      return veh;
    };

    // Định nghĩa các luồng giao thông (Traffic Routes):
    // Luồng 1: Tuyến Cầu Rồng (Đông - Tây qua lại giữa Sơn Trà và Hải Châu)
    // 3 làn hướng Tây (X từ +18 xuống -18): Z = -0.045, -0.085, -0.125
    const westLanes = [-0.045, -0.085, -0.125];
    westLanes.forEach((laneZ, idx) => {
      for (let k = 0; k < 4; k++) {
        const colorMat = this.carColors[(idx * 4 + k) % this.carColors.length];
        const type = (k === 3 && idx === 1) ? 'bus' : 'car';
        const vehObj = createVehicle(type, colorMat);
        trafficGroup.add(vehObj);

        this.vehicles.push({
          mesh: vehObj,
          corridor: 'cau-rong',
          dir: -1, // Hướng Tây
          laneZ: laneZ,
          x: 18.0 - k * 8.5 - (idx * 2.8),
          speed: 1.6 + Math.random() * 0.8,
          xMin: -19.5,
          xMax: 19.5
        });
      }
    });

    // 3 làn hướng Đông (X từ -18 lên +18): Z = +0.045, +0.085, +0.125
    const eastLanes = [0.045, 0.085, 0.125];
    eastLanes.forEach((laneZ, idx) => {
      for (let k = 0; k < 4; k++) {
        const colorMat = this.carColors[(idx * 4 + k + 2) % this.carColors.length];
        const type = (k === 2 && idx === 0) ? 'bus' : 'car';
        const vehObj = createVehicle(type, colorMat);
        trafficGroup.add(vehObj);

        this.vehicles.push({
          mesh: vehObj,
          corridor: 'cau-rong',
          dir: 1, // Hướng Đông
          laneZ: laneZ,
          x: -18.0 + k * 8.5 + (idx * 2.8),
          speed: 1.6 + Math.random() * 0.8,
          xMin: -19.5,
          xMax: 19.5
        });
      }
    });

    // Luồng 2: Tuyến Cầu Sông Hàn (Lê Duẩn <-> Phạm Văn Đồng tại Z = -12.25)
    for (let k = 0; k < 4; k++) {
      // Hướng Tây
      const vW = createVehicle('car', this.carColors[k % this.carColors.length]);
      trafficGroup.add(vW);
      this.vehicles.push({
        mesh: vW,
        corridor: 'cau-song-han',
        dir: -1,
        laneZ: -12.25 - 0.022,
        x: 17.0 - k * 8.5,
        speed: 1.4 + Math.random() * 0.6,
        xMin: -19.0,
        xMax: 19.0
      });

      // Hướng Đông
      const vE = createVehicle('car', this.carColors[(k + 3) % this.carColors.length]);
      trafficGroup.add(vE);
      this.vehicles.push({
        mesh: vE,
        corridor: 'cau-song-han',
        dir: 1,
        laneZ: -12.25 + 0.022,
        x: -17.0 + k * 8.5,
        speed: 1.4 + Math.random() * 0.6,
        xMin: -19.0,
        xMax: 19.0
      });
    }

    // Luồng 3: Tuyến đường ven sông Bạch Đằng (X = -3.12) & Trần Hưng Đạo (X = +3.12)
    // Xe chạy Bắc - Nam chui dưới gầm cầu
    for (let k = 0; k < 6; k++) {
      // Bạch Đằng (hướng Nam & Bắc)
      const vBD = createVehicle('car', this.carColors[k % this.carColors.length]);
      trafficGroup.add(vBD);
      this.vehicles.push({
        mesh: vBD,
        corridor: 'bach-dang',
        dir: k % 2 === 0 ? 1 : -1,
        laneX: -3.12 + (k % 2 === 0 ? 0.05 : -0.05),
        z: -16.0 + k * 5.2,
        speed: 1.3 + Math.random() * 0.5,
        zMin: -19.0,
        zMax: 13.0
      });

      // Trần Hưng Đạo (hướng Nam & Bắc)
      const vTHD = createVehicle('car', this.carColors[(k + 1) % this.carColors.length]);
      trafficGroup.add(vTHD);
      this.vehicles.push({
        mesh: vTHD,
        corridor: 'tran-hung-dao',
        dir: k % 2 === 0 ? -1 : 1,
        laneX: 3.12 + (k % 2 === 0 ? 0.05 : -0.05),
        z: 13.0 - k * 5.2,
        speed: 1.3 + Math.random() * 0.5,
        zMin: -19.0,
        zMax: 13.0
      });
    }

    this.group.add(trafficGroup);
  }

  // -------------------------------------------------------------------------
  // UPDATE HÀNG FRAME: CẬP NHẬT XE CỘ LƯU THÔNG CHUẨN ĐỘ CAO VÀ ĐỘ NGHIÊNG DỐC
  // -------------------------------------------------------------------------
  update(time, delta = 0.016) {
    const dt = Math.min(delta, 0.1);

    this.vehicles.forEach(veh => {
      if (veh.corridor === 'cau-rong') {
        veh.x += veh.dir * veh.speed * dt;

        // Vòng lặp khi chạy hết đại lộ
        if (veh.dir > 0 && veh.x > veh.xMax) veh.x = veh.xMin;
        if (veh.dir < 0 && veh.x < veh.xMin) veh.x = veh.xMax;

        // Tính cao độ Y và góc pitch theo vị trí trên Cầu Rồng:
        // - Trên mặt cầu (|X| <= 3.33): Y = 0.095
        // - Trên dốc cầu (3.33 < |X| <= 4.25): nội suy từ 0.095 xuống 0.012
        // - Trên đại lộ (|X| > 4.25): Y = 0.012
        const absX = Math.abs(veh.x);
        let y = 0.012;
        let pitch = 0.0;

        if (absX <= 3.33) {
          y = 0.095;
          pitch = 0.0;
        } else if (absX <= 4.25) {
          const t = (absX - 3.33) / (4.25 - 3.33); // 0 ở đỉnh dốc, 1 ở chân dốc
          y = 0.095 * (1.0 - t) + 0.012 * t;
          // Độ dốc nghiêng xe
          const slopeAngle = Math.atan2(0.095 - 0.012, 4.25 - 3.33);
          pitch = (veh.x > 0 ? -1 : 1) * veh.dir * slopeAngle;
        } else {
          y = 0.012;
          pitch = 0.0;
        }

        veh.mesh.position.set(veh.x, y, veh.laneZ);
        veh.mesh.rotation.set(0, veh.dir > 0 ? 0 : Math.PI, pitch);

      } else if (veh.corridor === 'cau-song-han') {
        veh.x += veh.dir * veh.speed * dt;

        if (veh.dir > 0 && veh.x > veh.xMax) veh.x = veh.xMin;
        if (veh.dir < 0 && veh.x < veh.xMin) veh.x = veh.xMax;

        const absX = Math.abs(veh.x);
        let y = 0.012;
        let pitch = 0.0;

        if (absX <= 3.15) {
          y = 0.072;
          pitch = 0.0;
        } else if (absX <= 3.95) {
          const t = (absX - 3.15) / (3.95 - 3.15);
          y = 0.072 * (1.0 - t) + 0.012 * t;
          const slopeAngle = Math.atan2(0.072 - 0.012, 3.95 - 3.15);
          pitch = (veh.x > 0 ? -1 : 1) * veh.dir * slopeAngle;
        } else {
          y = 0.012;
          pitch = 0.0;
        }

        veh.mesh.position.set(veh.x, y, veh.laneZ);
        veh.mesh.rotation.set(0, veh.dir > 0 ? 0 : Math.PI, pitch);

      } else if (veh.corridor === 'bach-dang' || veh.corridor === 'tran-hung-dao') {
        veh.z += veh.dir * veh.speed * dt;

        if (veh.dir > 0 && veh.z > veh.zMax) veh.z = veh.zMin;
        if (veh.dir < 0 && veh.z < veh.zMin) veh.z = veh.zMax;

        // Đường ven sông đi dưới gầm cầu ở cao độ mặt đất chuẩn
        veh.mesh.position.set(veh.laneX, 0.012, veh.z);
        veh.mesh.rotation.set(0, veh.dir > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
      }
    });
  }

  setNightMode(isNight) {
    this.isNightMode = isNight;
    if (this.windowGlowMat) {
      if (isNight) {
        this.windowGlowMat.emissive.setHex(0xffbb55);
        this.windowGlowMat.emissiveIntensity = 0.75;
      } else {
        this.windowGlowMat.emissive.setHex(0x000000);
        this.windowGlowMat.emissiveIntensity = 0.0;
      }
    }

    if (this.headlightMat && this.taillightMat) {
      if (isNight) {
        this.headlightMat.emissiveIntensity = 1.6;
        this.taillightMat.emissiveIntensity = 1.2;
      } else {
        this.headlightMat.emissiveIntensity = 0.2;
        this.taillightMat.emissiveIntensity = 0.4;
      }
    }
  }

  addTo(scene) {
    scene.add(this.group);
  }
}
