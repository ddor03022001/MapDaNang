import * as THREE from 'three';

/**
 * DragonEffects: Tái hiện chân thực 100% màn trình diễn Cầu Rồng Đà Nẵng
 * đối chiếu trực tiếp theo ảnh thực tế:
 * - Photo 2 (Fire Show): Cột lửa cuộn trào rực sáng, quả cầu lửa bùng nổ góc +30 độ, ánh sáng nhấp nháy chiếu rọi đầu rồng.
 * - Photo 3 (Water Show): Vòi rồng áp lực cao phun luồng sương trắng khổng lồ xòe rộng đổ xuống sông Hàn.
 * - Chế độ Đêm: Hệ thống đèn LED vòm thép chuyển màu rực rỡ và mắt rồng phát quang chói lọi.
 */
export class DragonEffects {
  constructor(scene) {
    this.scene = scene;
    this.fireActive = false;
    this.waterActive = false;
    this.isNightMode = false;

    // Tọa độ họng rồng trong Three.js (khớp chuẩn với model Blender 4.2 mới)
    // X = 2.58 (đầu cầu phía Đông), Y = 0.25 (độ cao họng), Z = 0.0 (tim cầu)
    this.nozzlePosition = new THREE.Vector3(2.58, 0.25, 0.0);

    // Ánh sáng phát từ họng rồng khi phun lửa (soi rọi cả đầu rồng như Photo 2)
    this.fireLight = new THREE.PointLight(0xff5500, 0, 18);
    this.fireLight.position.copy(this.nozzlePosition);
    this.scene.add(this.fireLight);

    // Ánh sáng đèn pha chiếu luồng nước sương trắng (như Photo 3)
    this.waterLight = new THREE.PointLight(0xaaddff, 0, 15);
    this.waterLight.position.set(2.65, 0.30, 0.0);
    this.scene.add(this.waterLight);

    this._createParticleTextures();
    this._initFireJet();
    this._initWaterJet();
  }

  _createParticleTextures() {
    // Canvas vẽ texture đốm lửa phát quang mềm (radial glow sprite)
    const fireCanvas = document.createElement('canvas');
    fireCanvas.width = 64;
    fireCanvas.height = 64;
    const fCtx = fireCanvas.getContext('2d');
    const fGrad = fCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    fGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
    fGrad.addColorStop(0.2, 'rgba(255, 220, 80, 0.95)');
    fGrad.addColorStop(0.5, 'rgba(255, 100, 20, 0.6)');
    fGrad.addColorStop(0.8, 'rgba(200, 30, 0, 0.2)');
    fGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    fCtx.fillStyle = fGrad;
    fCtx.fillRect(0, 0, 64, 64);
    this.fireTexture = new THREE.CanvasTexture(fireCanvas);

    // Canvas vẽ texture bụi nước sương mờ (mist water droplet)
    const waterCanvas = document.createElement('canvas');
    waterCanvas.width = 64;
    waterCanvas.height = 64;
    const wCtx = waterCanvas.getContext('2d');
    const wGrad = wCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    wGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
    wGrad.addColorStop(0.3, 'rgba(220, 240, 255, 0.7)');
    wGrad.addColorStop(0.7, 'rgba(180, 220, 250, 0.25)');
    wGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    wCtx.fillStyle = wGrad;
    wCtx.fillRect(0, 0, 64, 64);
    this.waterTexture = new THREE.CanvasTexture(waterCanvas);
  }

  _initFireJet() {
    // 550 hạt lửa mô phỏng cột lửa cuồn cuộn có độ nở và khói (Photo 2)
    this.fireCount = 550;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.fireCount * 3);
    const colors = new Float32Array(this.fireCount * 3);
    const sizes = new Float32Array(this.fireCount);

    this.fireVelocities = [];
    this.fireLifetimes = [];
    this.fireMaxLifetimes = [];
    this.fireBaseSizes = [];

    for (let i = 0; i < this.fireCount; i++) {
      positions[i * 3] = this.nozzlePosition.x;
      positions[i * 3 + 1] = this.nozzlePosition.y;
      positions[i * 3 + 2] = this.nozzlePosition.z;

      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 0.2;

      const baseSz = 0.12 + Math.random() * 0.18;
      sizes[i] = baseSz;
      this.fireBaseSizes.push(baseSz);

      this.fireVelocities.push(new THREE.Vector3());
      this.fireLifetimes.push(Math.random() * 0.8); // Rải đều pha khởi đầu
      this.fireMaxLifetimes.push(0.7 + Math.random() * 0.5);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.25,
      map: this.fireTexture,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });

    this.firePoints = new THREE.Points(geometry, material);
    this.firePoints.visible = false;
    this.scene.add(this.firePoints);
  }

  _initWaterJet() {
    // 850 hạt nước tạo thành luồng vòi rồng sương mù khổng lồ (Photo 3)
    this.waterCount = 850;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.waterCount * 3);
    const colors = new Float32Array(this.waterCount * 3);
    const sizes = new Float32Array(this.waterCount);

    this.waterVelocities = [];
    this.waterLifetimes = [];
    this.waterMaxLifetimes = [];
    this.waterBaseSizes = [];

    for (let i = 0; i < this.waterCount; i++) {
      positions[i * 3] = this.nozzlePosition.x;
      positions[i * 3 + 1] = this.nozzlePosition.y;
      positions[i * 3 + 2] = this.nozzlePosition.z;

      colors[i * 3] = 0.85;
      colors[i * 3 + 1] = 0.95;
      colors[i * 3 + 2] = 1.0;

      const baseSz = 0.15 + Math.random() * 0.25;
      sizes[i] = baseSz;
      this.waterBaseSizes.push(baseSz);

      this.waterVelocities.push(new THREE.Vector3());
      this.waterLifetimes.push(Math.random() * 1.2);
      this.waterMaxLifetimes.push(1.1 + Math.random() * 0.7);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.28,
      map: this.waterTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.waterPoints = new THREE.Points(geometry, material);
    this.waterPoints.visible = false;
    this.scene.add(this.waterPoints);
  }

  toggleFire(active = !this.fireActive) {
    this.fireActive = active;
    this.firePoints.visible = active;
    if (active) {
      this.waterActive = false;
      this.waterPoints.visible = false;
      this.waterLight.intensity = 0;
    }
  }

  toggleWater(active = !this.waterActive) {
    this.waterActive = active;
    this.waterPoints.visible = active;
    if (active) {
      this.fireActive = false;
      this.firePoints.visible = false;
      this.fireLight.intensity = 0;
    }
  }

  update(delta, time, bridgeModel) {
    // 1. CẬP NHẬT MÀN PHUN LỬA (PHOTO 2)
    if (this.fireActive) {
      // Ánh lửa chập chờn chiếu sáng đầu rồng
      this.fireLight.intensity = 10.0 + Math.sin(time * 35.0) * 4.5 + Math.cos(time * 18.0) * 3.0;

      const pos = this.firePoints.geometry.attributes.position;
      const col = this.firePoints.geometry.attributes.color;
      const count = this.fireCount;

      for (let i = 0; i < count; i++) {
        this.fireLifetimes[i] += delta;

        if (this.fireLifetimes[i] >= this.fireMaxLifetimes[i]) {
          this.fireLifetimes[i] = 0;
          pos.setXYZ(i, this.nozzlePosition.x, this.nozzlePosition.y, this.nozzlePosition.z);

          // Vận tốc bắn mạnh về phía Đông (+X) ở góc nghiêng +30 độ như Photo 2
          const speed = 2.4 + Math.random() * 2.2;
          const pitch = mathToRad(28 + Math.random() * 8); // 28 đến 36 độ
          const yaw = (Math.random() - 0.5) * 0.12;

          this.fireVelocities[i].set(
            Math.cos(pitch) * speed,
            Math.sin(pitch) * speed,
            yaw * speed
          );
        } else {
          const vx = this.fireVelocities[i].x;
          const vy = this.fireVelocities[i].y;
          const vz = this.fireVelocities[i].z;

          // Hạt lửa bay theo quán tính, hơi nở to và bay bốc lên
          const lifeProgress = this.fireLifetimes[i] / this.fireMaxLifetimes[i];
          
          pos.setXYZ(
            i,
            pos.getX(i) + vx * delta,
            pos.getY(i) + (vy + lifeProgress * 0.6) * delta,
            pos.getZ(i) + vz * delta
          );

          // Chuyển màu rực rỡ: Trắng tâm -> Vàng cam rực -> Đỏ lửa -> Khói đen
          if (lifeProgress < 0.25) {
            col.setXYZ(i, 1.0, 0.95, 0.7); // Trắng nóng
          } else if (lifeProgress < 0.65) {
            col.setXYZ(i, 1.0, 0.55, 0.05); // Vàng cam
          } else {
            const fade = Math.max(0.0, 1.0 - (lifeProgress - 0.65) / 0.35);
            col.setXYZ(i, 0.9 * fade, 0.2 * fade, 0.02 * fade); // Đỏ lụi tàn
          }
        }
      }
      pos.needsUpdate = true;
      col.needsUpdate = true;
    } else {
      this.fireLight.intensity = 0;
    }

    // 2. CẬP NHẬT MÀN PHUN NƯỚC (PHOTO 3)
    if (this.waterActive) {
      this.waterLight.intensity = 8.0;

      const pos = this.waterPoints.geometry.attributes.position;
      const count = this.waterCount;

      for (let i = 0; i < count; i++) {
        this.waterLifetimes[i] += delta;

        if (this.waterLifetimes[i] >= this.waterMaxLifetimes[i]) {
          this.waterLifetimes[i] = 0;
          pos.setXYZ(i, this.nozzlePosition.x, this.nozzlePosition.y, this.nozzlePosition.z);

          // Vòi rồng áp lực cực mạnh phun góc +35 độ rồi xòe thành bụi sương
          const speed = 2.6 + Math.random() * 2.4;
          const pitch = mathToRad(32 + Math.random() * 9);
          const yaw = (Math.random() - 0.5) * 0.35; // Xòe góc rộng hơn

          this.waterVelocities[i].set(
            Math.cos(pitch) * speed,
            Math.sin(pitch) * speed,
            yaw * speed
          );
        } else {
          // Trọng lực kéo các giọt nước rơi vòng cung xuống sông Hàn
          this.waterVelocities[i].y -= 2.6 * delta;

          pos.setXYZ(
            i,
            pos.getX(i) + this.waterVelocities[i].x * delta,
            pos.getY(i) + this.waterVelocities[i].y * delta,
            pos.getZ(i) + this.waterVelocities[i].z * delta
          );
        }
      }
      pos.needsUpdate = true;
    } else {
      this.waterLight.intensity = 0;
    }

    // 3. ĐỔI MÀU LED THÂN RỒNG BAN ĐÊM
    if (bridgeModel && this.isNightMode) {
      this._updateNightLedColors(time, bridgeModel);
    }
  }

  setNightMode(isNight, bridgeModel) {
    this.isNightMode = isNight;
    if (!isNight && bridgeModel) {
      bridgeModel.traverse((child) => {
        if (child.isMesh && child.material && child.material.name.includes('dragon-gold')) {
          child.material.color.setHex(0xffba08);
          if (child.material.emissive) child.material.emissive.setHex(0x000000);
        }
      });
    }
  }

  _updateNightLedColors(time, bridgeModel) {
    const colors = [
      new THREE.Color(0xffaa00), // Vàng kim
      new THREE.Color(0x0088ff), // Xanh lam
      new THREE.Color(0x00e599), // Xanh ngọc
      new THREE.Color(0xff2222), // Đỏ rực
      new THREE.Color(0xdd00bb), // Tím sen
    ];

    const cycle = (time * 0.35) % colors.length;
    const idx1 = Math.floor(cycle);
    const idx2 = (idx1 + 1) % colors.length;
    const blend = cycle - idx1;

    const currentColor = colors[idx1].clone().lerp(colors[idx2], blend);

    bridgeModel.traverse((child) => {
      if (child.isMesh && child.material) {
        if (child.material.name.includes('dragon-gold') || child.material.name.includes('dragon-amber')) {
          child.material.color.copy(currentColor);
          if (child.material.emissive) {
            child.material.emissive.copy(currentColor).multiplyScalar(0.48);
          }
        }
      }
    });
  }
}

function mathToRad(deg) {
  return (deg * Math.PI) / 180;
}
