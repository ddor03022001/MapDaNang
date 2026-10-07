/**
 * geo.js — quy đổi toạ độ GPS thật sang toạ độ scene (Three.js), dùng chung
 * giữa script tính toán (Node, build-time) và app runtime (browser).
 *
 * Phép chiếu: Equirectangular cục bộ (local tangent plane / flat-earth),
 * đủ chính xác cho phạm vi 1 thành phố. Xem chi tiết trong data/map-config.json.
 *
 * Quy ước trục:
 *   +X = hướng Đông (kinh độ tăng)
 *   +Z = hướng Nam (vĩ độ giảm) — để khớp Three.js (camera mặc định nhìn về -Z là hướng Bắc)
 *   Y  = độ cao (elevation), không tính từ GPS, lấy riêng theo dữ liệu địa hình
 */

/**
 * @param {{lat: number, lng: number}} point - toạ độ GPS cần quy đổi
 * @param {object} config - nội dung data/map-config.json
 * @param {number} [elevation=0] - độ cao (mét), gán vào y
 * @returns {{x: number, y: number, z: number}}
 */
export function gpsToScene(point, config, elevation = 0) {
  const R = config.projection.earthRadiusMeters;
  const metersPerUnit = config.scale.metersPerUnit;

  const originLatRad = toRadians(config.origin.lat);
  const deltaLatRad = toRadians(point.lat - config.origin.lat);
  const deltaLngRad = toRadians(point.lng - config.origin.lng);

  // Khoảng cách theo hướng Bắc-Nam (mét): arc length = R * deltaLat
  const northMeters = R * deltaLatRad;
  // Khoảng cách theo hướng Đông-Tây (mét): hiệu chỉnh theo cos(latitude)
  // vì 1 độ kinh độ ở gần cực ngắn hơn 1 độ kinh độ ở xích đạo.
  const eastMeters = R * deltaLngRad * Math.cos(originLatRad);

  return {
    x: eastMeters / metersPerUnit,
    y: elevation / metersPerUnit,
    z: -northMeters / metersPerUnit // +Z = hướng Nam nên đảo dấu northMeters
  };
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
