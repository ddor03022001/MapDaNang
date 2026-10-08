import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * SceneManager: Central controller for Three.js Scene, Camera, OrbitControls,
 * Lighting Environments (Day, Sunset, Night), and Post-processing Bloom.
 */
export class SceneManager {
  /**
   * @param {string} [containerSelector='#app']
   */
  constructor(containerSelector = '#app') {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      throw new Error(`[SceneManager] Render container "${containerSelector}" not found.`);
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
    this._initCameraPresets();

    this.setLightingMode('day');

    window.addEventListener('resize', () => this._onResize());
  }

  /**
   * Initializes WebGLRenderer with tone mapping and shadow maps.
   * @private
   */
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

  /**
   * Initializes standard PerspectiveCamera.
   * @private
   */
  _initCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.05, 3000);
    this.camera.position.set(4.2, 2.6, 4.8);
  }

  /**
   * Configures OrbitControls with smooth damping and pitch bounds.
   * @private
   */
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

  /**
   * Configures directional sun, sky hemisphere, and fill bounce lights.
   * @private
   */
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

  /**
   * Configures post-processing effect composer and subtle bloom pass.
   * @private
   */
  _initPostProcessing() {
    const renderScene = new RenderPass(this.scene, this.camera);
    const size = new THREE.Vector2(this.container.clientWidth, this.container.clientHeight);
    this.bloomPass = new UnrealBloomPass(size, 0.35, 0.28, 0.85);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(this.bloomPass);
  }

  /**
   * Initializes standardized namespaced camera presets ([landmarkId]:[angleKey]).
   * @private
   */
  _initCameraPresets() {
    this.cameraPresets = {
      // 1. CITY OVERVIEW
      'overview:city': {
        pos: new THREE.Vector3(-7.5, 5.4, -6.0),
        target: new THREE.Vector3(0.0, 0.2, -6.0)
      },
      'overview:han-river': {
        pos: new THREE.Vector3(0.0, 4.5, 8.0),
        target: new THREE.Vector3(0.0, 0.1, -6.0)
      },
      'overview:axis': {
        pos: new THREE.Vector3(-9.5, 3.8, 2.8),
        target: new THREE.Vector3(12.0, 0.2, 0.0)
      },

      // 2. DRAGON BRIDGE (CAU RONG)
      'cau-rong:overview': {
        pos: new THREE.Vector3(4.2, 2.6, 4.8),
        target: new THREE.Vector3(0, 0.25, 0)
      },
      'cau-rong:head': {
        pos: new THREE.Vector3(3.30, 0.40, 0.62),
        target: new THREE.Vector3(2.62, 0.285, 0.0)
      },
      'cau-rong:deck': {
        pos: new THREE.Vector3(0.5, 0.12, 0.08),
        target: new THREE.Vector3(2.2, 0.14, 0.08)
      },
      'cau-rong:tail': {
        pos: new THREE.Vector3(-3.25, 0.38, 0.55),
        target: new THREE.Vector3(-2.52, 0.20, 0.0)
      },
      'cau-rong:river': {
        pos: new THREE.Vector3(0.0, 0.08, 2.8),
        target: new THREE.Vector3(0.0, 0.32, 0.0)
      },

      // 3. HAN RIVER SWING BRIDGE (CAU SONG HAN)
      'cau-song-han:overview': {
        pos: new THREE.Vector3(3.8, 2.2, -9.5),
        target: new THREE.Vector3(0.0, 0.20, -12.25)
      },
      'cau-song-han:pylon': {
        pos: new THREE.Vector3(1.6, 0.55, -11.0),
        target: new THREE.Vector3(0.0, 0.35, -12.25)
      },
      'cau-song-han:deck': {
        pos: new THREE.Vector3(-1.8, 0.16, -12.25),
        target: new THREE.Vector3(0.6, 0.16, -12.25)
      },
      'cau-song-han:river': {
        pos: new THREE.Vector3(0.0, 0.08, -10.2),
        target: new THREE.Vector3(0.0, 0.22, -12.25)
      },

      // 4. MY KHE BEACH (BIEN MY KHE)
      'my-khe:overview': {
        pos: new THREE.Vector3(23.6, 2.0, 3.8),
        target: new THREE.Vector3(20.65, 0.18, 0.0)
      },
      'my-khe:junction': {
        pos: new THREE.Vector3(18.6, 0.42, 0.65),
        target: new THREE.Vector3(20.4, 0.08, 0.0)
      },
      'my-khe:beach': {
        pos: new THREE.Vector3(21.4, 0.25, -0.6),
        target: new THREE.Vector3(21.8, 0.12, 0.4)
      },
      'my-khe:waves': {
        pos: new THREE.Vector3(22.6, 0.35, 1.2),
        target: new THREE.Vector3(22.0, 0.05, 0.0)
      },

      // 5. MARBLE MOUNTAINS (NGU HANH SON)
      'ngu-hanh-son:overview': {
        pos: new THREE.Vector3(41.00, 0.95, 66.75),
        target: new THREE.Vector3(38.20, 0.45, 64.95)
      },
      'ngu-hanh-son:thap-xa-loi': {
        pos: new THREE.Vector3(39.57, 0.38, 65.48),
        target: new THREE.Vector3(38.62, 0.32, 64.93)
      },
      'ngu-hanh-son:dong-huyen-khong': {
        pos: new THREE.Vector3(38.19, 0.24, 66.01),
        target: new THREE.Vector3(37.64, 0.16, 65.36)
      },
      'ngu-hanh-son:chua-linh-ung': {
        pos: new THREE.Vector3(39.29, 0.28, 65.94),
        target: new THREE.Vector3(38.44, 0.20, 65.29)
      },
      'ngu-hanh-son:vong-hai-dai': {
        pos: new THREE.Vector3(37.20, 1.35, 64.23),
        target: new THREE.Vector3(37.90, 1.25, 64.83)
      }
    };

    // Backward-compatibility aliases for legacy keys
    this.presetAliases = {
      'ngu-hanh-son': 'ngu-hanh-son:overview',
      'nguhanh-son': 'ngu-hanh-son:overview',
      'overview': 'cau-rong:overview',
      'head': 'cau-rong:head',
      'tail': 'cau-rong:tail',
      'deck': 'cau-rong:deck',
      'river': 'cau-rong:river',
      'song-han': 'cau-song-han:overview',
      'song-han-pylon': 'cau-song-han:pylon',
      'song-han-deck': 'cau-song-han:deck',
      'song-han-river': 'cau-song-han:river',
      'my-khe': 'my-khe:overview',
      'my-khe-junction': 'my-khe:junction',
      'my-khe-sand': 'my-khe:beach',
      'my-khe-waves': 'my-khe:waves',
      'city': 'overview:city',
      'city-hanriver': 'overview:han-river',
      'city-eastwest': 'overview:axis'
    };
  }

  /**
   * Sets the atmospheric sky and lighting mode.
   * @param {'day'|'sunset'|'night'} mode
   */
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
      if (this.bloomPass) this.bloomPass.strength = 0.48;
    }
  }

  /**
   * Smoothly interpolates the camera and controls target to a given preset.
   * Supports both standardized format ('[landmarkId]:[angle]') and legacy aliases.
   * @param {string} presetKey
   */
  setCameraPreset(presetKey) {
    const resolvedKey = this.cameraPresets[presetKey]
      ? presetKey
      : (this.presetAliases[presetKey] || presetKey);

    const targetConfig = this.cameraPresets[resolvedKey];
    if (targetConfig) {
      this.startCameraPos = this.camera.position.clone();
      this.startControlsTarget = this.controls.target.clone();
      this.targetCameraPos = targetConfig.pos.clone();
      this.targetControlsTarget = targetConfig.target.clone();
      this.transitionProgress = 0.0;
    } else {
      console.warn(`[SceneManager] Camera preset "${presetKey}" not found.`);
    }
  }

  /**
   * Handles window resizing.
   * @private
   */
  _onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.composer) this.composer.setSize(width, height);
  }

  /**
   * Updates camera transition and OrbitControls.
   * @param {number} delta - Frame delta time in seconds
   */
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

  /**
   * Renders the current frame via composer or WebGLRenderer.
   */
  render() {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
