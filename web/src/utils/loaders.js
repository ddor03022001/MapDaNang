import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Tạo sẵn 1 instance GLTFLoader có cấu hình DRACOLoader,
 * dùng chung cho toàn bộ việc load model .glb trong project.
 */
export function createGltfLoader() {
  const dracoLoader = new DRACOLoader();
  // decoder của three.js, dùng CDN giống phiên bản examples/jsm có sẵn trong package three
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  return gltfLoader;
}
