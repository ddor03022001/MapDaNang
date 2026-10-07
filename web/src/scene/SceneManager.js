import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * SceneManager: Quản lý Three.js Scene, Camera, OrbitControls,
 * Ánh sáng các chế độ Ngày / Hoàng Hôn / Đêm, và Bloom Post-processing rực rỡ.
 */
export class SceneManager {
  constructor(containerSelector = '#app') {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      throw new Error(`Không tìm thấy container "${containerSelector}" để render scene.`);
    }

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    this.timeMode = 'day';
    this.targetCameraPos = null;
    this.targetControlsTarget = null;
    this.transitionProgress = 1.0;

    this._initRenderer();
    this._initCamera();
    this._initControls();
    this._initLights();
    this._initPostProcessing();
    this.setLightingMode('day');

    window.addEventListener('resize', () => this._onResize());
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);
  }

  _initCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.05, 3000);
    // Vị trí mặc định: ngắm trọn vẹn vẻ đẹp 5 nhịp vòm Cầu Rồng Đà Nẵng
    this.camera.position.set(4.2, 2.6, 4.8);
  }

  _initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 0.25, 0);
    this.controls.minDistance = 0.35;
    this.controls.maxDistance = 250;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.update();
  }

  _initLights() {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff6e5, 2.4);
    this.sunLight.position.set(8.0, 12.0, 6.0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 40.0;
    this.sunLight.shadow.camera.left = -6;
    this.sunLight.shadow.camera.right = 6;
    this.sunLight.shadow.camera.top = 6;
    this.sunLight.shadow.camera.bottom = -6;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0x7fb5d6, 0.8);
    this.fillLight.position.set(-6.0, 5.0, -8.0);
    this.scene.add(this.fillLight);
  }

  _initPostProcessing() {
    const renderScene = new RenderPass(this.scene, this.camera);
    const size = new THREE.Vector2(this.container.clientWidth, this.container.clientHeight);
    // Ngưỡng bloom 0.85 giúp giữ trọn vẹn độ sắc nét của hình khối đầu rồng, chỉ tỏa sáng ở tâm lửa và mắt rồng
    this.bloomPass = new UnrealBloomPass(size, 0.35, 0.28, 0.85);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(this.bloomPass);
  }

  setLightingMode(mode) {
    this.timeMode = mode;
    if (mode === 'day') {
      this.scene.background = new THREE.Color(0x76b8df);
      this.scene.fog = new THREE.Fog(0x76b8df, 40, 600);
      this.hemiLight.color.setHex(0xffffff);
      this.hemiLight.groundColor.setHex(0x3e5246);
      this.hemiLight.intensity = 1.2;

      this.sunLight.color.setHex(0xfffaed);
      this.sunLight.intensity = 2.5;
      this.sunLight.position.set(8.0, 12.0, 6.0);

      this.fillLight.color.setHex(0x8bc3e8);
      this.fillLight.intensity = 0.8;
      this.renderer.toneMappingExposure = 1.10;
      if (this.bloomPass) this.bloomPass.strength = 0.25;
    } else if (mode === 'sunset') {
      this.scene.background = new THREE.Color(0xd66838);
      this.scene.fog = new THREE.Fog(0xd66838, 30, 450);
      this.hemiLight.color.setHex(0xffaa77);
      this.hemiLight.groundColor.setHex(0x3a2518);
      this.hemiLight.intensity = 1.1;

      this.sunLight.color.setHex(0xff8833);
      this.sunLight.intensity = 3.2;
      this.sunLight.position.set(12.0, 4.0, 4.0);

      this.fillLight.color.setHex(0x553377);
      this.fillLight.intensity = 0.7;
      this.renderer.toneMappingExposure = 1.18;
      if (this.bloomPass) this.bloomPass.strength = 0.38;
    } else if (mode === 'night') {
      this.scene.background = new THREE.Color(0x070c18);
      this.scene.fog = new THREE.Fog(0x070c18, 25, 350);
      this.hemiLight.color.setHex(0x1a2e4c);
      this.hemiLight.groundColor.setHex(0x080f1a);
      this.hemiLight.intensity = 0.6;

      this.sunLight.color.setHex(0x335588);
      this.sunLight.intensity = 0.5;
      this.sunLight.position.set(6.0, 12.0, 8.0);

      this.fillLight.color.setHex(0x223355);
      this.fillLight.intensity = 0.3;
      this.renderer.toneMappingExposure = 1.15;
      // Ban đêm: bloom dịu nhẹ vừa đủ lung linh, không làm mờ hoặc chói lóa đầu rồng
      if (this.bloomPass) this.bloomPass.strength = 0.48;
    }
  }

  setCameraPreset(presetKey) {
    const presets = {
      overview: {
        pos: new THREE.Vector3(4.2, 2.6, 4.8),
        target: new THREE.Vector3(0, 0.25, 0)
      },
      head: {
        // Căn chuẩn góc nhìn cận cảnh đầu rồng sắc nét và luồng phun hiệu ứng
        pos: new THREE.Vector3(3.30, 0.40, 0.62),
        target: new THREE.Vector3(2.62, 0.285, 0.0)
      },
      tail: {
        pos: new THREE.Vector3(-3.25, 0.38, 0.55),
        target: new THREE.Vector3(-2.52, 0.20, 0.0)
      },
      deck: {
        pos: new THREE.Vector3(0.5, 0.12, 0.08),
        target: new THREE.Vector3(2.2, 0.14, 0.08)
      },
      river: {
        pos: new THREE.Vector3(0.0, 0.08, 2.8),
        target: new THREE.Vector3(0.0, 0.32, 0.0)
      },
      'song-han': {
        // Toàn cảnh Cầu Sông Hàn nối liền 2 bờ sông với tháp chữ A, dây văng và trụ xoay
        pos: new THREE.Vector3(3.8, 2.2, -9.5),
        target: new THREE.Vector3(0.0, 0.20, -12.25)
      },
      city: {
        // Toàn cảnh sông Hàn nối giữa 2 cầu và các dãy phố cao ốc đôi bờ
        pos: new THREE.Vector3(-7.5, 5.4, -6.0),
        target: new THREE.Vector3(0.0, 0.2, -6.0)
      }
    };

    const targetConfig = presets[presetKey];
    if (targetConfig) {
      this.startCameraPos = this.camera.position.clone();
      this.startControlsTarget = this.controls.target.clone();
      this.targetCameraPos = targetConfig.pos.clone();
      this.targetControlsTarget = targetConfig.target.clone();
      this.transitionProgress = 0.0;
    }
  }

  _onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.composer) this.composer.setSize(width, height);
  }

  update(delta) {
    if (this.transitionProgress < 1.0) {
      this.transitionProgress += delta * 1.5;
      const t = Math.min(1.0, this.transitionProgress);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(this.startCameraPos, this.targetCameraPos, ease);
      this.controls.target.lerpVectors(this.startControlsTarget, this.targetControlsTarget, ease);
      this.controls.update();
    } else {
      this.controls.update();
    }
  }

  render() {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
