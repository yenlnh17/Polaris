import { GOONG_KEY } from './config.js';

const BASE = 'https://rsapi.goong.io';

// Place autocomplete — returns array of suggestions
export async function placeAutocomplete(query, centerLatLng = null) {
  if (!query || query.trim().length < 2) return [];
  try {
    const params = new URLSearchParams({
      api_key: GOONG_KEY,
      input: query.trim(),
    });
    if (centerLatLng) params.set('location', `${centerLatLng.lat},${centerLatLng.lng}`);
    const res = await fetch(`${BASE}/Place/AutoComplete?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.predictions || []).map(p => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description,
    }));
  } catch {
    return [];
  }
}

// Get lat/lng for a place_id
export async function getPlaceDetail(placeId) {
  try {
    const params = new URLSearchParams({ place_id: placeId, api_key: GOONG_KEY });
    const res = await fetch(`${BASE}/Place/Detail?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const loc = data.result?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  } catch {
    return null;
  }
}

// Nearest-neighbor greedy algorithm (client-side, no API)
function nearestNeighbor(points) {
  if (points.length <= 1) return points.map((_, i) => i);
  const visited = new Set();
  const order = [0];
  visited.add(0);
  while (order.length < points.length) {
    const last = order[order.length - 1];
    let nearest = -1, minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;
      const d = haversine(points[last], points[i]);
      if (d < minDist) { minDist = d; nearest = i; }
    }
    order.push(nearest);
    visited.add(nearest);
  }
  return order;
}

export function haversine(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Optimize route — returns optimized index order array
// waypoints: [{ lat, lng, label? }]
// Uses Goong Trip API for 5+ points, nearest-neighbor otherwise
export async function optimizeRoute(waypoints) {
  if (!waypoints || waypoints.length < 2) return waypoints?.map((_, i) => i) ?? [];

  if (waypoints.length < 5) {
    return nearestNeighbor(waypoints);
  }

  try {
    const origin = `${waypoints[0].lat},${waypoints[0].lng}`;
    const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`;
    const middle = waypoints.slice(1, -1);
    const waypointStr = middle.map(p => `${p.lat},${p.lng}`).join(';');

    const params = new URLSearchParams({
      api_key: GOONG_KEY,
      origin,
      destination,
    });
    if (waypointStr) params.set('waypoints', waypointStr);

    const res = await fetch(`${BASE}/trip?${params}`);
    if (!res.ok) throw new Error('Trip API failed');
    const data = await res.json();

    // waypoint_index is the optimized order for the middle waypoints
    const waypointIndex = data.waypoints?.map(w => w.waypoint_index) ?? null;
    if (!waypointIndex) return nearestNeighbor(waypoints);

    // Reconstruct full order: origin (0), optimized middles, destination (last)
    const fullOrder = [0, ...waypointIndex.slice(1, -1).map(i => i + 1), waypoints.length - 1];
    return fullOrder;
  } catch {
    // Fallback to nearest-neighbor on API error
    return nearestNeighbor(waypoints);
  }
}