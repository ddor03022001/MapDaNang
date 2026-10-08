/**
 * geo.js — Converts real-world GPS coordinates (WGS84) to Three.js scene coordinates.
 * Shared between build-time scripts (Node.js) and runtime clients (Browser).
 *
 * Projection: Local equirectangular tangent plane, optimal for city-scale precision.
 * Coordinate axes convention:
 *   +X = East (increasing longitude)
 *   +Z = South (decreasing latitude) — aligns with Three.js default view towards -Z (North)
 *   Y  = Vertical elevation (meters)
 */

/**
 * Projects GPS coordinates onto the 3D scene grid based on map configuration.
 * @param {{lat: number, lng: number}} point - GPS coordinate point to project
 * @param {object} config - Map configuration loaded from data/map-config.json
 * @param {number} [elevation=0] - Vertical height in meters
 * @returns {{x: number, y: number, z: number}}
 */
export function gpsToScene(point, config, elevation = 0) {
  const R = config.projection.earthRadiusMeters;
  const metersPerUnit = config.scale.metersPerUnit;

  const originLatRad = toRadians(config.origin.lat);
  const deltaLatRad = toRadians(point.lat - config.origin.lat);
  const deltaLngRad = toRadians(point.lng - config.origin.lng);

  // North-South distance in meters: arc length = R * deltaLat
  const northMeters = R * deltaLatRad;
  // East-West distance in meters: adjusted by cos(latitude)
  const eastMeters = R * deltaLngRad * Math.cos(originLatRad);

  return {
    x: eastMeters / metersPerUnit,
    y: elevation / metersPerUnit,
    z: -northMeters / metersPerUnit // +Z is South, negate northMeters
  };
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
