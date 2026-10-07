import * as THREE from 'three';

/**
 * SceneManager khởi tạo scene, camera, renderer, ánh sáng và vòng lặp render.
 * Mục tiêu: dùng chung cho toàn bộ map, các landmark sẽ được add vào scene
 * thông qua LandmarkLoader.
 */
export class SceneManager {
  constructor(containerSelector = '#app') {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      throw new Error(`Không tìm thấy container "${containerSelector}" để render scene.`);
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b9d9);
    this.scene.fog = new THREE.Fog(0x87b9d9, 200, 2000);

    this._initCamera();
    this._initRenderer();
    this._initLights();

    window.addEventListener('resize', () => this._onResize());
  }

  _initCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 5000);
    // Vị trí camera mặc định: nhìn tổng quan khu vực trung tâm (gần Cầu Rồng)
    this.camera.position.set(80, 60, 120);
    this.camera.lookAt(0, 0, 0);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
  }

  _initLights() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 1.1);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(150, 200, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 1000;
    sunLight.shadow.camera.left = -300;
    sunLight.shadow.camera.right = 300;
    sunLight.shadow.camera.top = 300;
    sunLight.shadow.camera.bottom = -300;
    this.scene.add(sunLight);
    this.sunLight = sunLight;
  }

  _onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
