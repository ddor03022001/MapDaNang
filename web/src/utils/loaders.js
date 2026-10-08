import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Creates and configures a GLTFLoader instance with Draco compression decoding support.
 * Shared across all 3D model loading routines in the application.
 * @returns {GLTFLoader}
 */
export function createGltfLoader() {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  return gltfLoader;
}
