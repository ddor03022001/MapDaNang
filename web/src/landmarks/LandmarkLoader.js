import { createGltfLoader } from '../utils/loaders.js';
import { Landmark } from './Landmark.js';

/**
 * LandmarkLoader fetches landmark metadata and loads the corresponding .glb 3D models.
 * Landmarks whose models are still pending or unavailable are logged with warnings
 * rather than terminating application initialization.
 */
export class LandmarkLoader {
  constructor() {
    this.gltfLoader = createGltfLoader();
  }

  /**
   * Fetches metadata from landmarks.json and map-config.json, then loads all ready assets in parallel.
   * @param {string} [jsonUrl] - Custom endpoint for landmarks.json
   * @param {string} [mapConfigUrl] - Custom endpoint for map-config.json
   * @param {(loadedCount: number, totalCount: number) => void} [onProgress] - Optional progress notification callback
   * @returns {Promise<Landmark[]>} Array of successfully loaded Landmark instances
   */
  async loadAll(jsonUrl, mapConfigUrl, onProgress) {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    const finalJsonUrl = jsonUrl || `${cleanBase}data/landmarks.json`;
    const finalMapConfigUrl = mapConfigUrl || `${cleanBase}data/map-config.json`;

    const [landmarksRes, mapConfigRes] = await Promise.all([
      fetch(finalJsonUrl),
      fetch(finalMapConfigUrl)
    ]);

    if (!landmarksRes.ok) {
      throw new Error(`Failed to fetch landmark metadata from ${finalJsonUrl} (status: ${landmarksRes.status})`);
    }
    if (!mapConfigRes.ok) {
      throw new Error(`Failed to fetch map configuration from ${finalMapConfigUrl} (status: ${mapConfigRes.status})`);
    }

    const { landmarks } = await landmarksRes.json();
    const mapConfig = await mapConfigRes.json();

    const readyLandmarks = landmarks.filter((data) => data.model?.status === 'ready');
    const totalCount = readyLandmarks.length;
    let loadedCount = 0;

    const loadTasks = readyLandmarks.map(async (data) => {
      try {
        const landmark = await this._loadOne(data, mapConfig);
        loadedCount++;
        if (onProgress) {
          onProgress(loadedCount, totalCount);
        }
        return landmark;
      } catch (err) {
        console.error(`[LandmarkLoader] Failed to load 3D model for "${data.name}" (${data.id}):`, err);
        loadedCount++;
        if (onProgress) {
          onProgress(loadedCount, totalCount);
        }
        return null;
      }
    });

    const settledResults = await Promise.all(loadTasks);
    return settledResults.filter(Boolean);
  }

  /**
   * Loads a single GLTF asset and constructs a Landmark instance.
   * @private
   * @param {object} data
   * @param {object} mapConfig
   * @returns {Promise<Landmark>}
   */
  _loadOne(data, mapConfig) {
    return new Promise((resolve, reject) => {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

      let modelPath = data.model.path;
      if (modelPath.startsWith('/')) {
        modelPath = cleanBase + modelPath.slice(1);
      } else {
        modelPath = cleanBase + modelPath;
      }

      this.gltfLoader.load(
        modelPath,
        (gltf) => {
          const landmark = new Landmark(data, gltf.scene, mapConfig);
          resolve(landmark);
        },
        undefined,
        (err) => reject(err)
      );
    });
  }
}
