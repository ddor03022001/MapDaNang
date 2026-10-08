import * as THREE from 'three';

/**
 * CityEnvironment: Accurately renders the urban road network and architectural blocks
 * on both banks of the Han River (Hai Chau - West Bank & Son Tra - East Bank)
 * surrounding Dragon Bridge and Han River Bridge according to real Da Nang coordinates:
 *
 * 1. Approach Ramps:
 *    - Dragon Bridge: 6-lane ramps (3 lanes each direction) + center median with green verge & lampposts +
 *      pedestrian sidewalks with guardrails transitioning smoothly to ground level (X = ±3.33 -> ±4.25).
 *    - Planar concrete wing walls flush with embankments.
 *    - Han River Bridge: 2-lane ramps + pedestrian paths connecting into Le Duan and Pham Van Dong avenues.
 *
 * 2. Real-world Road Network & Riverside Underpasses:
 *    - Bach Dang St (West) & Tran Hung Dao St (East) running beneath Dragon & Han River Bridges
 *      with realistic vertical clearance (6.0m - 8.3m).
 *    - Nguyen Van Linh & Vo Van Kiet Avenues: 6 traffic lanes, landscaped medians, and tree-lined sidewalks.
 *
 * 3. Dynamic Traffic System:
 *    - Cars, green Mai Linh taxis, yellow Tien Sa taxis, buses, and motorbikes in continuous transit.
 *
 * 4. Iconic Da Nang City Landmarks:
 *    - Danang Administrative Center ("Corn Tower" 34 floors), Novotel (37 floors), Hilton (28 floors),
 *      APEC Peace Park, Cham Sculpture Museum, Love Lock Bridge, and Carp-Dragon Statue.
 */
export class CityEnvironment {
  constructor() {
    this.group = new THREE.Group();
    this.isNightMode = false;
    this.nightMaterials = [];
    this.signMaterials = [];
    this.vehicles = [];
    this.trafficEnabled = true;

    this._initMaterials();
    this._buildBridgeRamps();
    this._buildRoadNetwork();
    this._buildSidewalksAndQuays();
    this._buildIconicLandmarks();
    this._buildUrbanCityBlocks();
    this._buildTreesAndStreetFurniture();
    this._buildStreetSignageSystem();
    this._buildTrafficVehicles();
  }

  _initMaterials() {
    // 1. Heavy asphalt road surface
    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x222428,
      roughness: 0.88,
      metalness: 0.05
    });

    // 2. Road markings (white dashed / double solid yellow)
    this.whiteStripeMat = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });
    this.yellowStripeMat = new THREE.MeshBasicMaterial({ color: 0xf5b700 });

    // 3. Granite sidewalk pavement
    this.sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0xb4b9be,
      roughness: 0.78,
      metalness: 0.02
    });

    // 4. Concrete riverbanks and retaining wing walls
    this.quayMat = new THREE.MeshStandardMaterial({
      color: 0xbec4c9,
      roughness: 0.82,
      metalness: 0.04
    });

    // 5. Metallic guardrails and protective barriers
    this.railingMat = new THREE.MeshStandardMaterial({
      color: 0x76828d,
      metalness: 0.8,
      roughness: 0.35
    });

    // 6. Grass verges and park landscaping
    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0x2e6535,
      roughness: 0.9,
      metalness: 0.0
    });

    // 7. Urban facade materials
    this.facadeMats = [
      new THREE.MeshStandardMaterial({ color: 0xeeece6, roughness: 0.65 }), // Cream white
      new THREE.MeshStandardMaterial({ color: 0xe5d8be, roughness: 0.7 }),  // Pastel sand
      new THREE.MeshStandardMaterial({ color: 0xd9dfe5, roughness: 0.6 }),  // Modern cool gray
      new THREE.MeshStandardMaterial({ color: 0xdfd3c3, roughness: 0.72 }), // Warm beige
      new THREE.MeshStandardMaterial({ color: 0xb5c6d3, roughness: 0.55 }), // Soft slate blue
    ];

    // 8. Reflective skyscraper architectural glass
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x245874,
      roughness: 0.1,
      metalness: 0.85,
      transmission: 0.2,
      ior: 1.52,
      reflectivity: 0.9
    });

    // 9. Corn Tower blue glass (Danang Administrative Center)
    this.adminGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1b708b,
      roughness: 0.08,
      metalness: 0.9,
      transmission: 0.25,
      ior: 1.55
    });

    // 10. Night illuminated windows
    this.windowGlowMat = new THREE.MeshStandardMaterial({
      color: 0x334455,
      roughness: 0.4,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0
    });
    this.nightMaterials.push(this.windowGlowMat);

    // 11. Night vehicle headlights & streetlights
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

    // 12. Vehicle body paint colors
    this.carColors = [
      new THREE.MeshStandardMaterial({ color: 0xededed, roughness: 0.35, metalness: 0.6 }), // Pearl white
      new THREE.MeshStandardMaterial({ color: 0x1f2326, roughness: 0.35, metalness: 0.7 }), // Luxury obsidian black
      new THREE.MeshStandardMaterial({ color: 0x257038, roughness: 0.4, metalness: 0.4 }),  // Mai Linh Taxi (Green)
      new THREE.MeshStandardMaterial({ color: 0xe5a312, roughness: 0.35, metalness: 0.5 }), // Tien Sa Taxi (Yellow)
      new THREE.MeshStandardMaterial({ color: 0xb52222, roughness: 0.35, metalness: 0.6 }), // Crimson red
      new THREE.MeshStandardMaterial({ color: 0x225599, roughness: 0.35, metalness: 0.6 }), // Cobalt blue
      new THREE.MeshStandardMaterial({ color: 0x828890, roughness: 0.3, metalness: 0.7 }),  // Metallic silver
    ];

    // 13. Cham terracotta roof tile material
    this.tileMat = new THREE.MeshStandardMaterial({
      color: 0xb84a2d,
      roughness: 0.8,
      metalness: 0.05
    });

    // 14. Foliage & vegetation
    this.foliageMat = new THREE.MeshStandardMaterial({ color: 0x24622b, roughness: 0.85 });
    this.trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });

    // 15. Structural steel for overhead gantries & sign posts
    this.gantrySteelMat = new THREE.MeshStandardMaterial({
      color: 0x8a99a8,
      metalness: 0.85,
      roughness: 0.3
    });
  }

  // -------------------------------------------------------------------------
  // 1. ACCURATE 3D APPROACH RAMPS
  // -------------------------------------------------------------------------
  _buildBridgeRamps() {
    const rampsGroup = new THREE.Group();

    // =========================================================================
    // A. DRAGON BRIDGE APPROACH RAMPS (WEST & EAST BANKS)
    // - Bridge deck elevation: Y = 0.095 at X = ±3.33
    // - Ground boulevard elevation: Y = 0.012 at X = ±4.25
    // - Cross-section configuration:
    //   + Center median: Z = -0.018 to +0.018, landscaped with grass & streetlamps
    //   + Southbound roadway (3 lanes): Z = -0.152 to -0.018
    //   + Northbound roadway (3 lanes): Z = +0.018 to +0.152
    //   + Sidewalks (both sides): Z = ±0.152 to ±0.1845, paved stone with guardrails
    //   + Concrete wing walls: vertical at Z = ±0.1845 flush down to Y = 0.0
    // =========================================================================
    const buildCauRongRamp = (signX) => {
      const xB = signX * 3.33; // Bridge threshold
      const xG = signX * 4.25; // Ramp foot at ground level
      const yB = 0.095;
      const yG = 0.012;

      // 1. Dual asphalt ramp decks (Southbound & Northbound)
      const carriageways = [
        { z1: -0.152, z2: -0.018 }, // Southbound carriageway (3 lanes)
        { z1:  0.018, z2:  0.152 }, // Northbound carriageway (3 lanes)
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

        // Dashed lane divider lines (2 markings dividing 3 lanes per direction)
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

      // 2. Green median strip along ramp
      const medGeo = new THREE.BufferGeometry();
      const medH = 0.0035; // Elevated 35cm in real-world scale
      const medVerts = new Float32Array([
        xB, yB + medH, -0.018,   xB, yB + medH,  0.018,   xG, yG + medH, -0.018,
        xB, yB + medH,  0.018,   xG, yG + medH,  0.018,   xG, yG + medH, -0.018
      ]);
      medGeo.setAttribute('position', new THREE.BufferAttribute(medVerts, 3));
      medGeo.computeVertexNormals();
      const medMesh = new THREE.Mesh(medGeo, this.grassMat);
      rampsGroup.add(medMesh);

      // Concrete curb borders for center median
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

      // 3. Pedestrian sidewalks flanking the ramps
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

        // Curbs bordering the roadway
        const curbGeo = new THREE.BufferGeometry();
        const cVerts = new Float32Array([
          xB, yB, sw.zIn,   xB, yB + swH, sw.zIn,   xG, yG, sw.zIn,
          xB, yB + swH, sw.zIn,   xG, yG + swH, sw.zIn,   xG, yG, sw.zIn
        ]);
        curbGeo.setAttribute('position', new THREE.BufferAttribute(cVerts, 3));
        curbGeo.computeVertexNormals();
        rampsGroup.add(new THREE.Mesh(curbGeo, this.quayMat));

        // Metal guardrail running along the approach slope
        const railTopH = 0.0125; // 1.25m height from sidewalk surface
        const railGeo = new THREE.BufferGeometry();
        const rVerts = new Float32Array([
          xB, yB + swH + railTopH - 0.001, sw.zOut,   xB, yB + swH + railTopH + 0.001, sw.zOut,   xG, yG + swH + railTopH - 0.001, sw.zOut,
          xB, yB + swH + railTopH + 0.001, sw.zOut,   xG, yG + swH + railTopH + 0.001, sw.zOut,   xG, yG + swH + railTopH - 0.001, sw.zOut
        ]);
        railGeo.setAttribute('position', new THREE.BufferAttribute(rVerts, 3));
        railGeo.computeVertexNormals();
        rampsGroup.add(new THREE.Mesh(railGeo, this.railingMat));

        // Vertical guardrail stanchions
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

      // 4. Planar vertical concrete retaining wing walls
      // Aligned at z = ±0.1845, flush down to ground level Y = 0.0
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

      // 5. Abutment portal wall closing the under-ramp elevation
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

    // Construct both Dragon Bridge ramps (East Bank Son Tra & West Bank Hai Chau)
    buildCauRongRamp(1.0);  // East Bank: X = 3.33 -> 4.25 (Vo Van Kiet Ave)
    buildCauRongRamp(-1.0); // West Bank: X = -3.33 -> -4.25 (Nguyen Van Linh Ave)

    // =========================================================================
    // B. HAN RIVER BRIDGE APPROACH RAMPS (WEST & EAST BANKS)
    // - Han River Bridge deck elevation: Y = 0.072 at X = ±3.15, Z = -12.25
    // - Ground approach elevation: Y = 0.012 at X = ±3.95
    // - Width: 12.9m total (8.5m carriageway, 2.2m sidewalks each side)
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

      // 1. Asphalt ramp roadway deck
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

      // Double solid yellow centerline
      const stGeo = new THREE.BufferGeometry();
      const stW = 0.002;
      const stVerts = new Float32Array([
        xB, yB + 0.001, zCen - stW,   xB, yB + 0.001, zCen + stW,   xG, yG + 0.001, zCen - stW,
        xB, yB + 0.001, zCen + stW,   xG, yG + 0.001, zCen + stW,   xG, yG + 0.001, zCen - stW
      ]);
      stGeo.setAttribute('position', new THREE.BufferAttribute(stVerts, 3));
      stGeo.computeVertexNormals();
      rampsGroup.add(new THREE.Mesh(stGeo, this.yellowStripeMat));

      // 2. Pedestrian sidewalks flanking ramp
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

        // Ramp guardrails
        const railTopH = 0.011;
        const railGeo = new THREE.BufferGeometry();
        const rVerts = new Float32Array([
          xB, yB + swH + railTopH - 0.001, z2,   xB, yB + swH + railTopH + 0.001, z2,   xG, yG + swH + railTopH - 0.001, z2,
          xB, yB + swH + railTopH + 0.001, z2,   xG, yG + swH + railTopH + 0.001, z2,   xG, yG + swH + railTopH - 0.001, z2
        ]);
        railGeo.setAttribute('position', new THREE.BufferAttribute(rVerts, 3));
        railGeo.computeVertexNormals();
        rampsGroup.add(new THREE.Mesh(railGeo, this.railingMat));

        // Concrete wing walls
        const wallGeo = new THREE.BufferGeometry();
        const wVerts = new Float32Array([
          xB, yB + swH, z2,   xB, 0.0, z2,   xG, yG + swH, z2,
          xB, 0.0,      z2,   xG, 0.0, z2,   xG, yG + swH, z2
        ]);
        wallGeo.setAttribute('position', new THREE.BufferAttribute(wVerts, 3));
        wallGeo.computeVertexNormals();
        rampsGroup.add(new THREE.Mesh(wallGeo, this.quayMat));
      }

      // Abutment retaining wall
      const portGeo = new THREE.BufferGeometry();
      const pVerts = new Float32Array([
        xB, 0.0, zCen - totalHalfW,   xB, yB, zCen - totalHalfW,   xB, 0.0, zCen + totalHalfW,
        xB, yB,  zCen - totalHalfW,   xB, yB, zCen + totalHalfW,   xB, 0.0, zCen + totalHalfW
      ]);
      portGeo.setAttribute('position', new THREE.BufferAttribute(pVerts, 3));
      portGeo.computeVertexNormals();
      rampsGroup.add(new THREE.Mesh(portGeo, this.quayMat));
    };

    buildCauSongHanRamp(1.0);  // East Bank: X = 3.15 -> 3.95 (Pham Van Dong Ave)
    buildCauSongHanRamp(-1.0); // West Bank: X = -3.15 -> -3.95 (Le Duan Ave)

    this.group.add(rampsGroup);
  }

  // -------------------------------------------------------------------------
  // 2. URBAN ROAD NETWORK & RIVERSIDE UNDERPASSES
  // -------------------------------------------------------------------------
  _buildRoadNetwork() {
    const roadsGroup = new THREE.Group();

    // Helper to create planar asphalt road segment
    const addRoad = (x, z, w, len, isH = false) => {
      const geo = new THREE.PlaneGeometry(isH ? len : w, isH ? w : len);
      const mesh = new THREE.Mesh(geo, this.asphaltMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.012, z);
      mesh.receiveShadow = true;
      roadsGroup.add(mesh);
    };

    // Helper to create road surface markings
    const addStripe = (x, z, len, isYellow = false, isH = false) => {
      const geo = new THREE.PlaneGeometry(isH ? len : 0.003, isH ? 0.003 : len);
      const mesh = new THREE.Mesh(geo, isYellow ? this.yellowStripeMat : this.whiteStripeMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.013, z);
      roadsGroup.add(mesh);
    };

    // Helper to create 6-lane boulevard connected to Dragon Bridge ramps (Nguyen Van Linh / Vo Van Kiet)
    const build6LaneAvenue = (xStart, xEnd, isWest = false) => {
      const len = Math.abs(xEnd - xStart);
      const xCen = (xStart + xEnd) / 2.0;

      // 1. Dual carriageways (Southbound & Northbound)
      // Southbound: Z = -0.152 to -0.018 (width 0.134)
      addRoad(xCen, -0.085, 0.134, len, true);
      // Northbound: Z = +0.018 to +0.152 (width 0.134)
      addRoad(xCen,  0.085, 0.134, len, true);

      // 2. Dashed lane divider lines for 3 lanes per direction
      for (const zLine of [-0.129, -0.085, -0.041, 0.041, 0.085, 0.129]) {
        addStripe(xCen, zLine, len, false, true);
      }

      // 3. Center median with landscaped grass & streetlights
      // Median set back 0.35m before intersection for clear turning paths
      const medStart = isWest ? (xEnd + 0.3) : xStart;
      const medEnd = isWest ? xStart : (xEnd - 0.35);
      const medLen = Math.abs(medEnd - medStart);
      const medCen = (medStart + medEnd) / 2.0;

      const medGeo = new THREE.BoxGeometry(medLen, 0.005, 0.036);
      const medMesh = new THREE.Mesh(medGeo, this.grassMat);
      medMesh.position.set(medCen, 0.014, 0.0);
      roadsGroup.add(medMesh);

      // Median street lamp posts (stopped before intersections)
      const numLights = Math.floor(medLen / 1.6);
      for (let i = 0; i <= numLights; i++) {
        const xl = isWest
          ? (medStart - (i / Math.max(1, numLights)) * medLen)
          : (medStart + (i / Math.max(1, numLights)) * medLen);
        const poleGeo = new THREE.CylinderGeometry(0.003, 0.004, 0.09, 6);
        const pole = new THREE.Mesh(poleGeo, this.railingMat);
        pole.position.set(xl, 0.055, 0.0);
        roadsGroup.add(pole);

        const armGeo = new THREE.BoxGeometry(0.003, 0.002, 0.032);
        const arm = new THREE.Mesh(armGeo, this.railingMat);
        arm.position.set(xl, 0.098, 0.0);
        roadsGroup.add(arm);
      }

      // 4. Pedestrian sidewalks flanking the boulevard
      const swLen = isWest ? len : Math.max(0.1, len - 0.12);
      const swCen = isWest ? xCen : (xStart + swLen / 2.0);
      for (const signZ of [-1.0, 1.0]) {
        const swZ = signZ * 0.178;
        const swGeo = new THREE.BoxGeometry(swLen, 0.006, 0.052);
        const swMesh = new THREE.Mesh(swGeo, this.sidewalkMat);
        swMesh.position.set(swCen, 0.015, swZ);
        roadsGroup.add(swMesh);
      }
    };

    // A. NGUYEN VAN LINH BOULEVARD (WEST BANK): Originates from Dragon Bridge ramp foot (X = -4.25 to -20.0)
    build6LaneAvenue(-4.25, -20.0, true);

    // B. VO VAN KIET BOULEVARD (EAST BANK): Connects Dragon Bridge directly to My Khe Beach
    // Seamless junction at West edge of Vo Nguyen Giap St at X = 20.02
    build6LaneAvenue(4.25, 20.02, false);

    // C. LE DUAN AVENUE (WEST BANK): Connects Han River Bridge ramp westward (X = -3.95 to -20.0, Z = -12.25)
    addRoad(-11.975, -12.25, 0.22, 16.05, true);
    addStripe(-11.975, -12.25, 16.05, true, true);
    addStripe(-11.975, -12.25 - 0.05, 16.05, false, true);
    addStripe(-11.975, -12.25 + 0.05, 16.05, false, true);

    // D. PHAM VAN DONG BOULEVARD (EAST BANK): Connects Han River Bridge directly to East Sea Park (X = +3.95 to +20.02, Z = -12.25)
    const pvdLen = 20.02 - 3.95;
    const pvdXCen = (3.95 + 20.02) / 2.0;
    // Dual-direction carriageways (North & South)
    addRoad(pvdXCen, -12.25 - 0.06, 0.11, pvdLen, true);
    addRoad(pvdXCen, -12.25 + 0.06, 0.11, pvdLen, true);
    // Lane divider markings
    addStripe(pvdXCen, -12.25 - 0.095, pvdLen, false, true);
    addStripe(pvdXCen, -12.25 - 0.025, pvdLen, false, true);
    addStripe(pvdXCen, -12.25 + 0.025, pvdLen, false, true);
    addStripe(pvdXCen, -12.25 + 0.095, pvdLen, false, true);
    // Center median with greenery and streetlights
    const pvdMedLen = pvdLen - 0.35;
    const pvdMedCen = 3.95 + pvdMedLen / 2.0;
    const pvdMedGeo = new THREE.BoxGeometry(pvdMedLen, 0.005, 0.024);
    const pvdMed = new THREE.Mesh(pvdMedGeo, this.grassMat);
    pvdMed.position.set(pvdMedCen, 0.014, -12.25);
    roadsGroup.add(pvdMed);
    const numPvdLights = Math.floor(pvdMedLen / 1.6);
    for (let i = 0; i <= numPvdLights; i++) {
      const xl = 3.95 + (i / Math.max(1, numPvdLights)) * pvdMedLen;
      const poleGeo = new THREE.CylinderGeometry(0.003, 0.004, 0.09, 6);
      const pole = new THREE.Mesh(poleGeo, this.railingMat);
      pole.position.set(xl, 0.055, -12.25);
      roadsGroup.add(pole);
      const armGeo = new THREE.BoxGeometry(0.003, 0.002, 0.032);
      const arm = new THREE.Mesh(armGeo, this.railingMat);
      arm.position.set(xl, 0.098, -12.25);
      roadsGroup.add(arm);
    }
    // Pedestrian sidewalks flanking Pham Van Dong (set back 0.10m before junctions)
    const pvdSwLen = pvdLen - 0.10;
    const pvdSwCen = 3.95 + pvdSwLen / 2.0;
    for (const signZ of [-1.0, 1.0]) {
      const swZ = -12.25 + signZ * 0.145;
      const swGeo = new THREE.BoxGeometry(pvdSwLen, 0.006, 0.05);
      const swMesh = new THREE.Mesh(swGeo, this.sidewalkMat);
      swMesh.position.set(pvdSwCen, 0.015, swZ);
      roadsGroup.add(swMesh);
    }

    // E. VO NGUYEN GIAP COASTAL BLVD: 2.4km beach corridor (Z = -16.0 to +8.0 at X = 20.15)
    // Connects East Sea Park, Pham Van Dong Beach, My Khe Beach, T20 Beach, and An Thuong Tourist Quarter
    const vngLen = 24.0;
    const vngZCen = -4.0;
    addRoad(20.15, vngZCen, 0.26, vngLen, false);
    // Double solid yellow centerline
    addStripe(20.15 - 0.002, vngZCen, vngLen, true, false);
    addStripe(20.15 + 0.002, vngZCen, vngLen, true, false);
    // White lane dividers
    addStripe(20.08, vngZCen, vngLen, false, false);
    addStripe(20.22, vngZCen, vngLen, false, false);
    // West sidewalk (segmented at intersections to preserve unobstructed vehicular turns)
    const addVngWestSwSegment = (zFrom, zTo) => {
      const sLen = Math.abs(zTo - zFrom);
      const sCen = (zFrom + zTo) / 2.0;
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.006, sLen), this.sidewalkMat);
      sw.position.set(19.98, 0.015, sCen);
      roadsGroup.add(sw);
    };
    addVngWestSwSegment(-16.0, -12.44); // North of Pham Van Dong Blvd
    addVngWestSwSegment(-12.06, -8.62); // Between Pham Van Dong & Duong Dinh Nghe
    addVngWestSwSegment(-8.38, -4.62);  // Between Duong Dinh Nghe & Nguyen Cong Tru
    addVngWestSwSegment(-4.38, -0.20);  // Between Nguyen Cong Tru & Vo Van Kiet
    addVngWestSwSegment(0.20, 1.70);    // Between Vo Van Kiet & An Thuong 1
    addVngWestSwSegment(1.90, 3.10);    // Between An Thuong 1 & An Thuong 2
    addVngWestSwSegment(3.30, 4.70);    // Between An Thuong 2 & An Thuong 3
    addVngWestSwSegment(4.90, 8.0);     // South of An Thuong 3
    // East seaside promenade facing My Khe Beach surf
    const vngEastSw = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.006, vngLen),
      this.sidewalkMat
    );
    vngEastSw.position.set(20.34, 0.015, vngZCen);
    roadsGroup.add(vngEastSw);

    // E2. TRUONG SA COASTAL BLVD: Scenic coastal highway connecting My Khe south to Marble Mountains
    // Smooth curve from X = 20.15, Z = 8.0 down to X = 35.5, Z = 64.0
    const tsSegments = 20;
    for (let s = 0; s < tsSegments; s++) {
      const u0 = s / tsSegments;
      const u1 = (s + 1) / tsSegments;
      const z0 = 8.0 + u0 * 56.0;
      const z1 = 8.0 + u1 * 56.0;
      const x0 = 20.15 + (35.5 - 20.15) * Math.sin(u0 * Math.PI * 0.5);
      const x1 = 20.15 + (35.5 - 20.15) * Math.sin(u1 * Math.PI * 0.5);

      const dx = x1 - x0;
      const dz = z1 - z0;
      const sLen = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);
      const midX = (x0 + x1) * 0.5;
      const midZ = (z0 + z1) * 0.5;

      const segRoad = new THREE.Mesh(new THREE.PlaneGeometry(0.24, sLen), this.asphaltMat);
      segRoad.rotation.x = -Math.PI / 2;
      segRoad.rotation.z = -angle;
      segRoad.position.set(midX, 0.003, midZ);
      segRoad.receiveShadow = true;
      roadsGroup.add(segRoad);

      const segStripe = new THREE.Mesh(new THREE.PlaneGeometry(0.005, sLen), this.yellowStripeMat);
      segStripe.rotation.x = -Math.PI / 2;
      segStripe.rotation.z = -angle;
      segStripe.position.set(midX, 0.004, midZ);
      roadsGroup.add(segStripe);
    }

    // F. HO NGHINH ST: Hotel & culinary tourist avenue (X = 14.20, Z = -13.0 to +0.5)
    const hnLen = 13.5;
    const hnZCen = -6.25;
    addRoad(14.20, hnZCen, 0.18, hnLen, false);
    addStripe(14.20, hnZCen, hnLen, true, false);
    addStripe(14.20 - 0.045, hnZCen, hnLen, false, false);
    addStripe(14.20 + 0.045, hnZCen, hnLen, false, false);
    for (const signX of [-1.0, 1.0]) {
      const swGeo = new THREE.BoxGeometry(0.045, 0.006, hnLen);
      const swMesh = new THREE.Mesh(swGeo, this.sidewalkMat);
      swMesh.position.set(14.20 + signX * 0.115, 0.015, hnZCen);
      roadsGroup.add(swMesh);
    }

    // G. NGUYEN CONG TRU ST: Cross connector connecting Ngo Quyen to the beach (Z = -4.50, X = 5.80 to 20.15)
    const nctLen = 20.15 - 5.80;
    const nctXCen = (5.80 + 20.15) / 2.0;
    addRoad(nctXCen, -4.50, 0.16, nctLen, true);
    addStripe(nctXCen, -4.50, nctLen, true, true);
    for (const signZ of [-1.0, 1.0]) {
      const swGeo = new THREE.BoxGeometry(nctLen, 0.006, 0.04);
      const swMesh = new THREE.Mesh(swGeo, this.sidewalkMat);
      swMesh.position.set(nctXCen, 0.015, -4.50 + signZ * 0.10);
      roadsGroup.add(swMesh);
    }

    // H. DUONG DINH NGHE ST: Cross connector connecting Ngo Quyen to the beach (Z = -8.50, X = 5.80 to 20.15)
    addRoad(nctXCen, -8.50, 0.16, nctLen, true);
    addStripe(nctXCen, -8.50, nctLen, true, true);
    for (const signZ of [-1.0, 1.0]) {
      const swGeo = new THREE.BoxGeometry(nctLen, 0.006, 0.04);
      const swMesh = new THREE.Mesh(swGeo, this.sidewalkMat);
      swMesh.position.set(nctXCen, 0.015, -8.50 + signZ * 0.10);
      roadsGroup.add(swMesh);
    }

    // I. AN THUONG TOURIST QUARTER & TRAN BACH DANG ST (X = 18.20, Z = -1.5 to +6.5)
    const atLen = 8.0;
    const atZCen = 2.5;
    addRoad(18.20, atZCen, 0.16, atLen, false);
    addStripe(18.20, atZCen, atLen, true, false);
    // An Thuong 1, 2, 3 pedestrian streets connecting to Vo Nguyen Giap Blvd
    for (const atZ of [1.8, 3.2, 4.8]) {
      const walkLen = 20.15 - 17.2;
      const walkXCen = (17.2 + 20.15) / 2.0;
      addRoad(walkXCen, atZ, 0.12, walkLen, true);
    }

    // J. BACH DANG ST (WEST RIVERSIDE): Runs along west bank at X = -3.12 (Z = -20.0 to +14.0)
    addRoad(-3.12, -3.0, 0.22, 34.0);
    addStripe(-3.12, -3.0, 34.0, true);
    addStripe(-3.12 - 0.05, -3.0, 34.0, false);
    addStripe(-3.12 + 0.05, -3.0, 34.0, false);

    // K. TRAN HUNG DAO ST (EAST RIVERSIDE): Runs along east bank at X = +3.12 (Z = -20.0 to +14.0)
    addRoad(3.12, -3.0, 0.22, 34.0);
    addStripe(3.12, -3.0, 34.0, true);
    addStripe(3.12 - 0.05, -3.0, 34.0, false);
    addStripe(3.12 + 0.05, -3.0, 34.0, false);

    // L. PARALLEL & INTERSECTING URBAN ARTERIALS
    // Tran Phu St (West Bank X = -4.60):
    addRoad(-4.60, -3.0, 0.22, 34.0);
    addStripe(-4.60, -3.0, 34.0, true);

    // 2 Thang 9 St (West Bank connecting Dragon Bridge south junction, Z = 0 to +14):
    addRoad(-3.12, 7.0, 0.24, 14.0);

    // Ngo Quyen Blvd (Major East Bank arterial, X = +5.80, Z = -16.0 to +8.0):
    addRoad(5.80, -4.0, 0.28, 24.0);
    addStripe(5.80, -4.0, 24.0, true);
    addStripe(5.80 - 0.065, -4.0, 24.0, false);
    addStripe(5.80 + 0.065, -4.0, 24.0, false);

    // M. REAL-WORLD ROUNDABOUTS & CIVIC PLAZAS
    // 1. Ngo Quyen - Vo Van Kiet Roundabout (X = 5.80, Z = 0.0)
    const rb1 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.008, 24), this.grassMat);
    rb1.position.set(5.80, 0.016, 0.0);
    roadsGroup.add(rb1);

    // 2. Ngo Quyen - Pham Van Dong Roundabout (X = 5.80, Z = -12.25)
    const rb2 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.008, 24), this.grassMat);
    rb2.position.set(5.80, 0.016, -12.25);
    roadsGroup.add(rb2);

    // 3. My Khe Beach Civic Plaza (situated on East seaside promenade, X = 20.36, Z = 0.0)
    const sqBeach = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.008, 0.38),
      this.sidewalkMat
    );
    sqBeach.position.set(20.36, 0.016, 0.0);
    roadsGroup.add(sqBeach);

    // 4. East Sea Park Civic Plaza (situated on East seaside promenade, X = 20.36, Z = -12.25)
    const sqEastSea = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.008, 0.38),
      this.sidewalkMat
    );
    sqEastSea.position.set(20.36, 0.016, -12.25);
    roadsGroup.add(sqEastSea);

    // West Bank intersecting urban streets (Thai Phien, Hung Vuong, Quang Trung, Ha Thi Than):
    addRoad(-3.86, -4.0, 0.16, 1.48, true);  // Thai Phien St
    addRoad(-3.86, -8.0, 0.18, 1.48, true);  // Hung Vuong St
    addRoad(-3.86, -15.5, 0.18, 1.48, true); // Quang Trung
    addRoad(4.46, -4.5, 0.16, 2.68, true);   // Ha Thi Than St
    addRoad(4.46, -8.5, 0.16, 2.68, true);   // An Hai Bac St

    this.group.add(roadsGroup);
  }

  // -------------------------------------------------------------------------
  // 3. HAN RIVER EMBANKMENT & PROMENADES (RIVERWALK & QUAYS)
  // -------------------------------------------------------------------------
  _buildSidewalksAndQuays() {
    const swGroup = new THREE.Group();
    const quayH = 0.055; // Elevated 5.5m above water level

    // Paved stone promenade and concrete river wall running North to South (Z = -20 to +14)
    // Passes under Dragon Bridge & Han River Bridge clear of traffic lanes
    for (const signX of [-1.0, 1.0]) {
      const isWest = signX < 0;
      const wallX = signX * 2.79;       // Riverside quay edge
      const promX = signX * 2.90;       // Riverwalk promenade centerline

      // 1. White stone quay retaining wall
      const wallGeo = new THREE.BoxGeometry(0.04, quayH, 34.0);
      const wallMesh = new THREE.Mesh(wallGeo, this.quayMat);
      wallMesh.position.set(wallX, quayH / 2, -3.0);
      wallMesh.receiveShadow = true;
      swGroup.add(wallMesh);

      // 2. Riverwalk sidewalks along Bach Dang & Tran Hung Dao (0.18 width)
      const promGeo = new THREE.BoxGeometry(0.18, 0.02, 34.0);
      const promMesh = new THREE.Mesh(promGeo, this.sidewalkMat);
      promMesh.position.set(promX, quayH, -3.0);
      promMesh.receiveShadow = true;
      swGroup.add(promMesh);

      // 3. Decorative riverside safety railings
      const riverRailGeo = new THREE.BoxGeometry(0.008, 0.008, 34.0);
      const riverRail = new THREE.Mesh(riverRailGeo, this.railingMat);
      riverRail.position.set(wallX + (isWest ? -0.015 : 0.015), quayH + 0.012, -3.0);
      swGroup.add(riverRail);
    }

    this.group.add(swGroup);
  }

  // -------------------------------------------------------------------------
  // 4. ICONIC DA NANG CITY ARCHITECTURE & LANDMARKS
  // -------------------------------------------------------------------------
  _buildIconicLandmarks() {
    const lmGroup = new THREE.Group();

    // A. DANANG ADMINISTRATIVE CENTER ("CORN TOWER" 34 FLOORS, 167M HEIGHT)
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

    // B. NOVOTEL DANANG PREMIER HAN RIVER (37 FLOORS, 150M GLASS TOWER)
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

    // C. HILTON DANANG & INDOCHINA RIVERSIDE TOWERS (28 FLOORS)
    const hiltonGeo = new THREE.BoxGeometry(0.32, 1.15, 0.48);
    const hiltonMesh = new THREE.Mesh(hiltonGeo, this.glassMat);
    hiltonMesh.position.set(-3.60, 1.15 / 2 + 0.02, -9.8);
    hiltonMesh.castShadow = true;
    lmGroup.add(hiltonMesh);

    // D. APEC PEACE PARK WITH ICONIC KITE CANOPY
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

    // E. MUSEUM OF CHAM SCULPTURE
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

    // F. LOVE LOCK BRIDGE & CARP-DRAGON STATUE (SON TRA EAST BANK)
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

    // G. VINPEARL CONDOTEL (SON TRA EAST BANK)
    const vinpearlGeo = new THREE.BoxGeometry(0.35, 1.25, 0.52);
    const vinpearlMesh = new THREE.Mesh(vinpearlGeo, this.glassMat);
    vinpearlMesh.position.set(3.75, 1.25 / 2 + 0.02, -11.5);
    vinpearlMesh.castShadow = true;
    lmGroup.add(vinpearlMesh);

    this.group.add(lmGroup);
  }

  // -------------------------------------------------------------------------
  // 5. URBAN GRID ARCHITECTURAL BLOCKS & RESIDENTIAL QUARTERS
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

      // 1. Shophouses & commercial storefronts flanking Vo Van Kiet Blvd towards My Khe Beach
      { minX: 6.2, maxX: 19.8, minZ: -1.2, maxZ: -0.3, minH: 0.25, maxH: 0.70, cols: 20, rows: 2 },
      { minX: 6.2, maxX: 19.8, minZ: 0.3, maxZ: 1.2, minH: 0.25, maxH: 0.70, cols: 20, rows: 2 },

      // 2. High-rise hotel row along Pham Van Dong Blvd towards East Sea Park
      { minX: 4.2, maxX: 19.8, minZ: -13.5, maxZ: -12.6, minH: 0.25, maxH: 0.65, cols: 22, rows: 2 },
      { minX: 4.2, maxX: 19.8, minZ: -11.9, maxZ: -11.0, minH: 0.25, maxH: 0.65, cols: 22, rows: 2 },

      // 3. Son Tra urban residential district (between Ngo Quyen and Ho Nghinh):
      // North Sector (Pham Van Dong to Duong Dinh Nghe)
      { minX: 6.2, maxX: 13.8, minZ: -11.8, maxZ: -8.8, minH: 0.18, maxH: 0.42, cols: 10, rows: 5 },
      // Central Sector (Duong Dinh Nghe to Nguyen Cong Tru)
      { minX: 6.2, maxX: 13.8, minZ: -8.2, maxZ: -4.8, minH: 0.18, maxH: 0.45, cols: 10, rows: 6 },
      // South Sector (Nguyen Cong Tru to Vo Van Kiet)
      { minX: 6.2, maxX: 13.8, minZ: -4.2, maxZ: -1.5, minH: 0.20, maxH: 0.48, cols: 10, rows: 5 },

      // 4. Beachfront luxury hotels and high-rise condominiums (between Ho Nghinh and Vo Nguyen Giap):
      // Son Tra - My Khe beachfront high-rise resort strip
      { minX: 14.6, maxX: 19.8, minZ: -11.8, maxZ: -8.8, minH: 0.35, maxH: 0.90, cols: 8, rows: 4 },
      { minX: 14.6, maxX: 19.8, minZ: -8.2, maxZ: -4.8, minH: 0.40, maxH: 0.95, cols: 8, rows: 5 },
      { minX: 14.6, maxX: 19.8, minZ: -4.2, maxZ: -1.5, minH: 0.38, maxH: 0.92, cols: 8, rows: 4 },

      // 5. An Thuong tourist quarter & South Son Tra district (South of Vo Van Kiet):
      { minX: 6.2, maxX: 19.8, minZ: 1.5, maxZ: 7.2, minH: 0.18, maxH: 0.55, cols: 20, rows: 8 },
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
  // 6. TROPICAL STREET TREES, PALMS & URBAN LIGHTING
  // -------------------------------------------------------------------------
  _buildTreesAndStreetFurniture() {
    const vegGroup = new THREE.Group();
    const treeCount = 48;
    const treeGeo = new THREE.ConeGeometry(0.045, 0.10, 6);
    const trunkGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.05, 5);

    for (let i = 0; i < treeCount; i++) {
      const z = -17.0 + (i / treeCount) * 32.0;
      if (Math.abs(z) < 0.35 || Math.abs(z - -12.25) < 0.35) continue;

      // West bank roadside trees (X ≈ -3.02)
      const tWest = new THREE.Group();
      const trW = new THREE.Mesh(trunkGeo, this.trunkMat);
      trW.position.y = 0.025;
      const crW = new THREE.Mesh(treeGeo, this.foliageMat);
      crW.position.y = 0.075;
      tWest.add(trW);
      tWest.add(crW);
      tWest.position.set(-3.02, 0.035, z);
      vegGroup.add(tWest);

      // East bank roadside trees (X ≈ +3.02)
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

    // Tropical coconut palms along Vo Nguyen Giap seaside promenade
    const beachPalmCount = 32;
    for (let p = 0; p < beachPalmCount; p++) {
      const z = -15.0 + (p / beachPalmCount) * 22.5;
      if (Math.abs(z) < 0.22 || Math.abs(z - -12.25) < 0.22) continue; // Keep entrance clear towards civic plaza & monument
      const tBeach = new THREE.Group();
      const trP = new THREE.Mesh(trunkGeo, this.trunkMat);
      trP.position.y = 0.03;
      trP.rotation.z = -0.08;
      const crP = new THREE.Mesh(treeGeo, this.foliageMat);
      crP.position.set(-0.008, 0.085, 0);
      tBeach.add(trP);
      tBeach.add(crP);
      tBeach.position.set(20.38, 0.015, z);
      vegGroup.add(tBeach);
    }

    // Shaded canopy trees along Vo Van Kiet sidewalks
    for (let k = 0; k < 18; k++) {
      const x = 5.0 + k * 0.82;
      for (const signZ of [-1, 1]) {
        const tVvk = new THREE.Group();
        const trV = new THREE.Mesh(trunkGeo, this.trunkMat);
        trV.position.y = 0.025;
        const crV = new THREE.Mesh(treeGeo, this.foliageMat);
        crV.position.y = 0.075;
        tVvk.add(trV);
        tVvk.add(crV);
        tVvk.position.set(x, 0.015, signZ * 0.178);
        vegGroup.add(tVvk);
      }
    }

    this.group.add(vegGroup);
  }

  // -------------------------------------------------------------------------
  // 6b. GEOLOCATED DA NANG STREET SIGNS & OVERHEAD HIGHWAY GANTRIES
  // -------------------------------------------------------------------------
  _buildStreetSignageSystem() {
    const signsGroup = new THREE.Group();

    // Helper 1: Renders street signage texture on HTML5 Canvas
    const createSignTex = (opts) => {
      const { title, sub = '', width = 512, height = 160, isGantry = false, arrows = '' } = opts;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Sign background: Cobalt Blue (#004b87) for urban corners, Highway Green (#00733e) for gantries
      const bgColor = isGantry ? '#00733e' : '#004b87';
      ctx.fillStyle = bgColor;
      const r = 16;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, r);
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, width, height);
      }

      // Dual retroreflective border per Vietnamese highway standards
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(8, 8, width - 16, height - 16, 12);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(14, 14, width - 28, height - 28, 8);
        ctx.stroke();
      } else {
        ctx.strokeRect(8, 8, width - 16, height - 16);
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isGantry) {
        // Overhead gantry signboard
        if (sub) {
          ctx.fillStyle = '#ffde59';
          ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
          ctx.fillText(sub, width / 2, 42);
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 36px "Segoe UI", Arial, sans-serif';
        ctx.fillText(title, width / 2, sub ? 96 : height / 2 - 14);

        if (arrows) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
          ctx.fillText(arrows, width / 2, height - 38);
        }
      } else {
        // Street corner intersection nameplate
        if (sub) {
          ctx.fillStyle = '#ffde59';
          ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
          ctx.fillText(sub, width / 2, 40);

          ctx.fillStyle = '#ffffff';
          ctx.font = '900 42px "Segoe UI", Arial, sans-serif';
          ctx.fillText(title, width / 2, 102);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 46px "Segoe UI", Arial, sans-serif';
          ctx.fillText(title, width / 2, height / 2);
        }
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.anisotropy = 4;
      return tex;
    };

    // Helper 2: Double-sided metallic signboard mesh
    const createPlateMesh = (title, sub, w = 0.13, h = 0.042) => {
      const tex = createSignTex({ title, sub, width: 512, height: 160 });
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: tex,
        emissiveIntensity: 0.25,
        roughness: 0.35,
        metalness: 0.15
      });
      this.signMaterials.push(mat);

      const plateGroup = new THREE.Group();
      const geo = new THREE.PlaneGeometry(w, h);

      // Front face
      const front = new THREE.Mesh(geo, mat);
      front.position.z = 0.0012;
      plateGroup.add(front);

      // Rear face (flipped 180 deg for correct readability from both directions)
      const back = new THREE.Mesh(geo, mat);
      back.position.z = -0.0012;
      back.rotation.y = Math.PI;
      plateGroup.add(back);

      // Protective metallic backing plate
      const frameGeo = new THREE.BoxGeometry(w + 0.003, h + 0.003, 0.002);
      const frame = new THREE.Mesh(frameGeo, this.railingMat);
      plateGroup.add(frame);

      return plateGroup;
    };

    // Helper 3: Dual-axis corner street namepost (two perpendicular signboards)
    const addStreetCornerSign = (x, z, streetX, streetZ, district = 'QUẬN SƠN TRÀ') => {
      const postGroup = new THREE.Group();
      postGroup.position.set(x, 0.012, z);

      // Galvanized steel tubular post
      const poleH = 0.082;
      const poleGeo = new THREE.CylinderGeometry(0.0025, 0.003, poleH, 8);
      const pole = new THREE.Mesh(poleGeo, this.railingMat);
      pole.position.y = poleH / 2;
      postGroup.add(pole);

      // Concrete foundation footing
      const baseGeo = new THREE.CylinderGeometry(0.006, 0.008, 0.006, 8);
      const base = new THREE.Mesh(baseGeo, this.railingMat);
      base.position.y = 0.003;
      postGroup.add(base);

      // Top dome cap
      const capGeo = new THREE.SphereGeometry(0.004, 8, 8);
      const cap = new THREE.Mesh(capGeo, this.railingMat);
      cap.position.y = poleH + 0.003;
      postGroup.add(cap);

      // Sign 1: Mounted along X-axis (visible from Z approach)
      if (streetX) {
        const plateX = createPlateMesh(streetX, district);
        plateX.position.set(0, poleH - 0.012, 0);
        postGroup.add(plateX);
      }

      // Sign 2: Mounted along Z-axis (visible from X approach)
      if (streetZ) {
        const plateZ = createPlateMesh(streetZ, district);
        plateZ.position.set(0, poleH - 0.026, 0);
        plateZ.rotation.y = Math.PI / 2;
        postGroup.add(plateZ);
      }

      signsGroup.add(postGroup);
    };

    // Helper 4: Overhead highway gantry spanning across boulevard carriageways
    const addGantry = (x, z, isAcrossZ, title, sub, arrows, span = 0.36) => {
      const gantryGroup = new THREE.Group();
      gantryGroup.position.set(x, 0.012, z);

      const gantryH = 0.105;
      const halfSpan = span / 2;

      // Twin steel truss support posts on sidewalks
      const colGeo = new THREE.CylinderGeometry(0.004, 0.004, gantryH, 8);
      const colL = new THREE.Mesh(colGeo, this.gantrySteelMat);
      const colR = new THREE.Mesh(colGeo, this.gantrySteelMat);
      if (isAcrossZ) {
        colL.position.set(0, gantryH / 2, -halfSpan);
        colR.position.set(0, gantryH / 2,  halfSpan);
      } else {
        colL.position.set(-halfSpan, gantryH / 2, 0);
        colR.position.set( halfSpan, gantryH / 2, 0);
      }
      gantryGroup.add(colL);
      gantryGroup.add(colR);

      // Horizontal steel truss beam spanning across roadway
      const beamGeo = new THREE.BoxGeometry(
        isAcrossZ ? 0.008 : span,
        0.012,
        isAcrossZ ? span : 0.008
      );
      const beam = new THREE.Mesh(beamGeo, this.gantrySteelMat);
      beam.position.y = gantryH - 0.006;
      gantryGroup.add(beam);

      // Suspended gantry signage plate
      const signW = span * 0.72;
      const signH = 0.058;
      const tex = createSignTex({ title, sub, width: 512, height: 200, isGantry: true, arrows });
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: tex,
        emissiveIntensity: 0.3,
        roughness: 0.35,
        metalness: 0.15
      });
      this.signMaterials.push(mat);

      const signGeo = new THREE.PlaneGeometry(signW, signH);
      const signFront = new THREE.Mesh(signGeo, mat);
      signFront.position.y = gantryH - 0.012;

      const signBack = new THREE.Mesh(signGeo, mat);
      signBack.position.y = gantryH - 0.012;

      if (isAcrossZ) {
        signFront.position.x = 0.005;
        signFront.rotation.y = Math.PI / 2;
        signBack.position.x = -0.005;
        signBack.rotation.y = -Math.PI / 2;
      } else {
        signFront.position.z = 0.005;
        signBack.position.z = -0.005;
        signBack.rotation.y = Math.PI;
      }

      gantryGroup.add(signFront);
      gantryGroup.add(signBack);

      signsGroup.add(gantryGroup);
    };

    // =========================================================================
    // A. STREET SIGNS AT KEY INTERSECTIONS CONNECTING MY KHE BEACH & SON TRA PENINSULA
    // All signposts are positioned on sidewalks clear of roadway traffic
    // =========================================================================
    // 1. My Khe Beach junction (Vo Van Kiet & Vo Nguyen Giap - NW & SW sidewalks)
    addStreetCornerSign(19.82, -0.22, 'ĐƯỜNG VÕ VĂN KIỆT', 'ĐƯỜNG VÕ NGUYÊN GIÁP');
    addStreetCornerSign(19.82,  0.22, 'ĐƯỜNG VÕ VĂN KIỆT', 'ĐƯỜNG VÕ NGUYÊN GIÁP');

    // 2. East Sea Park junction (Pham Van Dong & Vo Nguyen Giap - NW & SW sidewalks)
    addStreetCornerSign(19.82, -12.46, 'ĐƯỜNG PHẠM VĂN ĐỒNG', 'ĐƯỜNG VÕ NGUYÊN GIÁP');
    addStreetCornerSign(19.82, -12.04, 'ĐƯỜNG PHẠM VĂN ĐỒNG', 'ĐƯỜNG VÕ NGUYÊN GIÁP');

    // 3. Ho Nghinh - Vo Van Kiet intersection (NW & SW corner sidewalks)
    addStreetCornerSign(14.05, -0.22, 'ĐƯỜNG VÕ VĂN KIỆT', 'ĐƯỜNG HỒ NGHINH');
    addStreetCornerSign(14.05,  0.22, 'ĐƯỜNG VÕ VĂN KIỆT', 'ĐƯỜNG HỒ NGHINH');

    // 4. Ho Nghinh - Pham Van Dong intersection (corner sidewalks)
    addStreetCornerSign(14.05, -12.46, 'ĐƯỜNG PHẠM VĂN ĐỒNG', 'ĐƯỜNG HỒ NGHINH');

    // 5. Ngo Quyen - Vo Van Kiet intersection (Dragon Bridge East Roundabout corners)
    addStreetCornerSign(5.62, -0.22, 'ĐƯỜNG VÕ VĂN KIỆT', 'ĐƯỜNG NGÔ QUYỀN');
    addStreetCornerSign(5.62,  0.22, 'ĐƯỜNG VÕ VĂN KIỆT', 'ĐƯỜNG NGÔ QUYỀN');

    // 6. Ngo Quyen - Pham Van Dong intersection (Han River Bridge East Roundabout corners)
    addStreetCornerSign(5.62, -12.46, 'ĐƯỜNG PHẠM VĂN ĐỒNG', 'ĐƯỜNG NGÔ QUYỀN');

    // 7. Nguyen Cong Tru - Vo Nguyen Giap junction (corner sidewalk)
    addStreetCornerSign(19.82, -4.62, 'ĐƯỜNG NGUYỄN CÔNG TRỨ', 'ĐƯỜNG VÕ NGUYÊN GIÁP');

    // 8. Duong Dinh Nghe - Vo Nguyen Giap junction (corner sidewalk)
    addStreetCornerSign(19.82, -8.62, 'ĐƯỜNG DƯƠNG ĐÌNH NGHỆ', 'ĐƯỜNG VÕ NGUYÊN GIÁP');

    // 9. An Thuong Tourist Quarter - Vo Nguyen Giap junction (corner sidewalk)
    addStreetCornerSign(19.82, 2.38, 'PHỐ DU LỊCH AN THƯỢNG', 'ĐƯỜNG VÕ NGUYÊN GIÁP');

    // 10. Tran Bach Dang St (An Thuong Quarter corner sidewalk)
    addStreetCornerSign(18.05, 2.38, 'PHỐ AN THƯỢNG', 'ĐƯỜNG TRẦN BẠCH ĐẰNG');

    // =========================================================================
    // B. STREET NAMEPLATES AT BRIDGE APPROACHES & HAN RIVER BANKS
    // =========================================================================
    // 11. Dragon Bridge East (Vo Van Kiet - Tran Hung Dao - riverside sidewalk)
    addStreetCornerSign(4.20, 0.22, 'ĐẠI LỘ VÕ VĂN KIỆT', 'ĐƯỜNG TRẦN HƯNG ĐẠO');

    // 12. Dragon Bridge West (Nguyen Van Linh - Bach Dang - Hai Chau riverside sidewalk)
    addStreetCornerSign(-4.20, 0.22, 'ĐẠI LỘ NGUYỄN VĂN LINH', 'ĐƯỜNG BẠCH ĐẰNG', 'QUẬN HẢI CHÂU');

    // 13. Han River Bridge East (Pham Van Dong - Tran Hung Dao riverside sidewalk)
    addStreetCornerSign(3.90, -12.46, 'ĐẠI LỘ PHẠM VĂN ĐỒNG', 'ĐƯỜNG TRẦN HƯNG ĐẠO');

    // 14. Han River Bridge West (Le Duan - Bach Dang - Hai Chau riverside sidewalk)
    addStreetCornerSign(-3.90, -12.46, 'ĐƯỜNG LÊ DUẨN', 'ĐƯỜNG BẠCH ĐẰNG', 'QUẬN HẢI CHÂU');

    // =========================================================================
    // C. OVERHEAD HIGHWAY GANTRY SIGNS
    // =========================================================================
    // 1. Overhead gantry on Vo Van Kiet Blvd facing My Khe Beach (X = 18.2, Z = 0.0)
    addGantry(
      18.20, 0.0, true,
      'BIỂN MỸ KHÊ | MY KHE BEACH',
      'ĐẠI LỘ VÕ VĂN KIỆT (200m)',
      '⬅ BÃI PHẠM VĂN ĐỒNG   ⬆ BÃI MỸ KHÊ   BÃI T20 ➡',
      0.38
    );

    // 2. Overhead gantry on Pham Van Dong Blvd facing the ocean (X = 18.2, Z = -12.25)
    addGantry(
      18.20, -12.25, true,
      'CÔNG VIÊN BIỂN ĐÔNG',
      'EAST SEA PARK',
      '⬅ BÁN ĐẢO SƠN TRÀ   ⬆ QUẢNG TRƯỜNG   BIỂN MỸ KHÊ ➡',
      0.36
    );

    // 3. Overhead gantry on Vo Nguyen Giap Coastal Blvd (X = 20.15, Z = -6.0)
    addGantry(
      20.15, -6.0, false,
      'ĐƯỜNG VÕ NGUYÊN GIÁP',
      'TUYẾN ĐƯỜNG VEN BIỂN ĐÀ NẴNG',
      '⬆ SƠN TRÀ / HOÀNG SA   |   BIỂN MỸ KHÊ / HỘI AN ⬇',
      0.36
    );

    // 4. Overhead gantry on Vo Van Kiet Blvd towards Dragon Bridge & City Center (X = 6.8, Z = 0.0)
    addGantry(
      6.80, 0.0, true,
      'CẦU RỒNG - TRUNG TÂM TP',
      'ĐẠI LỘ VÕ VĂN KIỆT',
      '⬅ CẦU SÔNG HÀN   ⬆ CẦU RỒNG   CẦU TRẦN THỊ LÝ ➡',
      0.38
    );

    // 5. Overhead gantry on Nguyen Van Linh Blvd towards Dragon Bridge (X = -6.5, Z = 0.0)
    addGantry(
      -6.50, 0.0, true,
      'CẦU RỒNG - BIỂN MỸ KHÊ',
      'ĐẠI LỘ NGUYỄN VĂN LINH',
      '⬅ SÂN BAY ĐÀ NẴNG   ⬆ CẦU RỒNG   BẢO TÀNG CHĂM ➡',
      0.38
    );

    // 6. Overhead gantry on Truong Sa Blvd approaching Marble Mountains (X = 35.0, Z = 60.0)
    addGantry(
      35.0, 60.0, false,
      'DANH THẮNG NGŨ HÀNH SƠN',
      'MARBLE MOUNTAINS • NON NƯỚC',
      '⬆ NÚI NGŨ HÀNH SƠN   |   PHỐ CỔ HỘI AN ⬇',
      0.36
    );

    // =========================================================================
    // D. MY KHE BEACH WELCOME MONUMENT PYLON
    // Installed on East seaside promenade plaza, facing directly down Vo Van Kiet Blvd
    // =========================================================================
    const welcomePylon = new THREE.Group();
    welcomePylon.position.set(20.40, 0.015, 0.0);
    welcomePylon.rotation.y = -Math.PI / 2; // Facing West towards oncoming traffic from Dragon Bridge

    const wTex = createSignTex({
      title: 'BIỂN MỸ KHÊ',
      sub: 'MY KHE BEACH ★ TOP 6 PLANET',
      width: 512,
      height: 160,
      isGantry: false
    });
    const wMat = new THREE.MeshStandardMaterial({
      map: wTex,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: wTex,
      emissiveIntensity: 0.35
    });
    this.signMaterials.push(wMat);
    const pylonMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.065, 0.02), wMat);
    pylonMesh.position.y = 0.05;
    welcomePylon.add(pylonMesh);
    const pBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.05), this.quayMat);
    pBase.position.y = 0.01;
    welcomePylon.add(pBase);
    signsGroup.add(welcomePylon);

    this.group.add(signsGroup);
  }

  // -------------------------------------------------------------------------
  // 7. DYNAMIC VEHICULAR TRAFFIC SIMULATION
  // -------------------------------------------------------------------------
  _buildTrafficVehicles() {
    const trafficGroup = new THREE.Group();

    // Low-poly vehicle generator: chassis + cabin + 4 wheels + headlights & taillights
    const createVehicle = (type = 'car', colorMat = this.carColors[0]) => {
      const veh = new THREE.Group();

      let bodyW = 0.022, bodyH = 0.012, bodyL = 0.046;
      if (type === 'bus') {
        bodyW = 0.028; bodyH = 0.024; bodyL = 0.092;
      } else if (type === 'bike') {
        bodyW = 0.009; bodyH = 0.014; bodyL = 0.024;
      }

      // Vehicle chassis body
      const bodyGeo = new THREE.BoxGeometry(bodyL, bodyH, bodyW);
      const body = new THREE.Mesh(bodyGeo, colorMat);
      body.position.y = bodyH / 2 + 0.003;
      body.castShadow = true;
      veh.add(body);

      // Glass cabin
      if (type !== 'bike') {
        const cabH = bodyH * 0.75;
        const cabGeo = new THREE.BoxGeometry(bodyL * 0.55, cabH, bodyW * 0.88);
        const cabin = new THREE.Mesh(cabGeo, this.glassMat);
        cabin.position.set(-bodyL * 0.05, bodyH + cabH / 2 + 0.002, 0);
        veh.add(cabin);
      }

      // Headlights (warm white) & Taillights (red)
      const hlGeo = new THREE.BoxGeometry(0.002, 0.003, bodyW * 0.7);
      const hl = new THREE.Mesh(hlGeo, this.headlightMat);
      hl.position.set(bodyL / 2 + 0.001, bodyH * 0.6, 0);
      veh.add(hl);

      const tl = new THREE.Mesh(hlGeo, this.taillightMat);
      tl.position.set(-bodyL / 2 - 0.001, bodyH * 0.6, 0);
      veh.add(tl);

      // Rooftop taxi sign for Mai Linh / Tien Sa vehicles
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

    // Define traffic flow routes:
    // Route 1: Dragon Bridge corridor (East - West between Son Tra and Hai Chau)
    // 3 Westbound lanes (X: +18 down to -18): Z = -0.045, -0.085, -0.125
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
          dir: -1, // Westbound (from beach towards Dragon Bridge)
          laneZ: laneZ,
          x: 19.4 - k * 8.5 - (idx * 2.8),
          speed: 1.6 + Math.random() * 0.8,
          xMin: -19.5,
          xMax: 19.65
        });
      }
    });

    // 3 Eastbound lanes (X: -18 up to +19.65 towards My Khe Beach): Z = +0.045, +0.085, +0.125
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
          dir: 1, // Eastbound towards ocean
          laneZ: laneZ,
          x: -18.0 + k * 8.5 + (idx * 2.8),
          speed: 1.6 + Math.random() * 0.8,
          xMin: -19.5,
          xMax: 19.65
        });
      }
    });

    // Route 2: Han River Bridge corridor (Le Duan <-> Pham Van Dong towards East Sea Park, Z = -12.25)
    for (let k = 0; k < 4; k++) {
      // Westbound direction
      const vW = createVehicle('car', this.carColors[k % this.carColors.length]);
      trafficGroup.add(vW);
      this.vehicles.push({
        mesh: vW,
        corridor: 'cau-song-han',
        dir: -1,
        laneZ: -12.25 - 0.022,
        x: 18.5 - k * 8.5,
        speed: 1.4 + Math.random() * 0.6,
        xMin: -19.0,
        xMax: 19.65
      });

      // Eastbound direction towards beach
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
        xMax: 19.65
      });
    }

    // Route 3: Riverside corridors: Bach Dang (X = -3.12) & Tran Hung Dao (X = +3.12)
    for (let k = 0; k < 6; k++) {
      // Bach Dang St (South & North lanes)
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

      // Tran Hung Dao St (South & North lanes)
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

    // Route 4: Vo Nguyen Giap Coastal Blvd (X = 20.15) along My Khe Beach
    for (let k = 0; k < 6; k++) {
      const isSouth = k % 2 === 0;
      const vVNG = createVehicle(k === 3 ? 'bus' : 'car', this.carColors[(k + 4) % this.carColors.length]);
      trafficGroup.add(vVNG);
      this.vehicles.push({
        mesh: vVNG,
        corridor: 'vo-nguyen-giap',
        dir: isSouth ? 1 : -1,
        laneX: isSouth ? 20.08 : 20.22,
        z: isSouth ? -14.0 + k * 4.5 : 6.5 - k * 4.5,
        speed: 1.4 + Math.random() * 0.5,
        zMin: -15.5,
        zMax: 7.5
      });
    }

    // Route 5: Ngo Quyen Blvd (X = 5.80) primary Son Tra arterial
    for (let k = 0; k < 4; k++) {
      const isSouth = k % 2 === 0;
      const vNQ = createVehicle('car', this.carColors[(k + 2) % this.carColors.length]);
      trafficGroup.add(vNQ);
      this.vehicles.push({
        mesh: vNQ,
        corridor: 'ngo-quyen',
        dir: isSouth ? 1 : -1,
        laneX: isSouth ? 5.74 : 5.86,
        z: isSouth ? -14.0 + k * 6.5 : 6.5 - k * 6.5,
        speed: 1.5 + Math.random() * 0.4,
        zMin: -15.5,
        zMax: 7.5
      });
    }

    this.group.add(trafficGroup);
  }

  setTrafficEnabled(enabled = true) {
    this.trafficEnabled = enabled;
  }

  // -------------------------------------------------------------------------
  // PER-FRAME UPDATE: VEHICLE POSITION, ROAD HEIGHT INTERPOLATION & PITCH
  // -------------------------------------------------------------------------
  update(time, delta = 0.016) {
    if (!this.trafficEnabled) return;
    const dt = Math.min(delta, 0.1);

    this.vehicles.forEach(veh => {
      if (veh.corridor === 'cau-rong') {
        veh.x += veh.dir * veh.speed * dt;

        // Wrap vehicle when reaching corridor bounds
        if (veh.dir > 0 && veh.x > veh.xMax) veh.x = veh.xMin;
        if (veh.dir < 0 && veh.x < veh.xMin) veh.x = veh.xMax;

        // Calculate Y elevation and pitch angle according to Dragon Bridge ramp geometry:
        // - On main bridge span (|X| <= 3.33): Y = 0.095
        // - On approach ramp (3.33 < |X| <= 4.25): linear interpolation from 0.095 down to 0.012
        // - On ground boulevard (|X| > 4.25): Y = 0.012
        const absX = Math.abs(veh.x);
        let y = 0.012;
        let pitch = 0.0;

        if (absX <= 3.33) {
          y = 0.095;
          pitch = 0.0;
        } else if (absX <= 4.25) {
          const t = (absX - 3.33) / (4.25 - 3.33);
          y = 0.095 * (1.0 - t) + 0.012 * t;
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

        veh.mesh.position.set(veh.laneX, 0.012, veh.z);
        veh.mesh.rotation.set(0, veh.dir > 0 ? -Math.PI / 2 : Math.PI / 2, 0);

      } else if (veh.corridor === 'vo-nguyen-giap' || veh.corridor === 'ngo-quyen') {
        veh.z += veh.dir * veh.speed * dt;

        if (veh.dir > 0 && veh.z > veh.zMax) veh.z = veh.zMin;
        if (veh.dir < 0 && veh.z < veh.zMin) veh.z = veh.zMax;

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

    // Increase retroreflective sign emission during night mode
    if (this.signMaterials && this.signMaterials.length > 0) {
      this.signMaterials.forEach(mat => {
        mat.emissiveIntensity = isNight ? 0.85 : 0.25;
      });
    }
  }

  addTo(scene) {
    scene.add(this.group);
  }
}
