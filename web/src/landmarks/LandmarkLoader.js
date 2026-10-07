import { createGltfLoader } from '../utils/loaders.js';
import { Landmark } from './Landmark.js';

/**
 * LandmarkLoader: đọc data/landmarks.json và load từng model .glb tương ứng.
 * Những landmark chưa có model (model.status === "pending") sẽ bị bỏ qua
 * và chỉ log cảnh báo, để không làm vỡ app khi model chưa được dựng xong.
 */
export class LandmarkLoader {
  constructor() {
    this.gltfLoader = createGltfLoader();
  }

  /**
   * @param {string} jsonUrl - đường dẫn tới landmarks.json
   * @param {string} mapConfigUrl - đường dẫn tới map-config.json (quy ước scale/origin)
   * @returns {Promise<Landmark[]>}
   */
  async loadAll(jsonUrl, mapConfigUrl) {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    const finalJsonUrl = jsonUrl || `${cleanBase}data/landmarks.json`;
    const finalMapConfigUrl = mapConfigUrl || `${cleanBase}data/map-config.json`;

    const [landmarksRes, mapConfigRes] = await Promise.all([fetch(finalJsonUrl), fetch(finalMapConfigUrl)]);

    if (!landmarksRes.ok) {
      throw new Error(`Không tải được metadata địa danh từ ${finalJsonUrl} (status ${landmarksRes.status})`);
    }
    if (!mapConfigRes.ok) {
      throw new Error(`Không tải được map-config từ ${finalMapConfigUrl} (status ${mapConfigRes.status})`);
    }

    const { landmarks } = await landmarksRes.json();
    const mapConfig = await mapConfigRes.json();
    const results = [];

    for (const data of landmarks) {
      if (data.model?.status !== 'ready') {
        console.warn(`[LandmarkLoader] Bỏ qua "${data.name}" (${data.id}): model chưa sẵn sàng (status = ${data.model?.status}).`);
        continue;
      }

      try {
        const landmark = await this._loadOne(data, mapConfig);
        results.push(landmark);
      } catch (err) {
        console.error(`[LandmarkLoader] Lỗi khi load model cho "${data.name}" (${data.id}):`, err);
      }
    }

    return results;
  }

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
