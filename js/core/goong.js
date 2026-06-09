import { GOONG_KEY } from './config.js';

const BASE = 'https://rsapi.goong.io';

// Place autocomplete v2 — returns array of suggestions
// options.location: { lat, lng } — bias results toward this point
// options.origin:   { lat, lng } — reference point for distance_meters
// options.limit:    number       — max results (default 5)
// options.radius:   number       — search radius in km (default 50)
export async function placeAutocomplete(query, options = {}) {
  if (!query || query.trim().length < 2) return [];
  const { location = null, origin = null, limit = 5, radius = 50 } = options;
  try {
    const params = new URLSearchParams({
      api_key: GOONG_KEY,
      input: query.trim(),
      limit,
      radius,
    });
    if (location) params.set('location', `${location.lat},${location.lng}`);
    if (origin)   params.set('origin',   `${origin.lat},${origin.lng}`);
    const res = await fetch(`${BASE}/v2/place/autocomplete?${params}`);
    const data = await res.json();
    if (!res.ok) {
      const code = data?.error?.code;
      if (code === 'API_KEY_UNAUTHORIZED') return { error: 'unauthorized' };
      return [];
    }
    return (data.predictions || []).map(p => ({
      placeId:         p.place_id,
      description:     p.description,
      mainText:        p.structured_formatting?.main_text || p.description,
      secondaryText:   p.structured_formatting?.secondary_text,
      distanceMeters:  p.distance_meters ?? null,
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
// Uses Goong Trip API v2 for 5+ points, nearest-neighbor otherwise
// options.vehicle: 'car' | 'motorcycle' | 'taxi' | 'truck' | 'hd' (default: 'car')
// options.roundtrip: boolean — return back to origin (default: false)
export async function optimizeRoute(waypoints, { vehicle = 'car', roundtrip = false } = {}) {
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
      vehicle,
      roundtrip: String(roundtrip),
    });
    if (waypointStr) params.set('waypoints', waypointStr);

    const res = await fetch(`${BASE}/v2/trip?${params}`);
    if (!res.ok) throw new Error('Trip API v2 failed');
    const data = await res.json();

    const ws = data.waypoints;
    if (!ws?.length) return nearestNeighbor(waypoints);

    // Sort input indices by their optimized position (waypoint_index)
    const order = ws
      .map((w, i) => ({ i, pos: w.waypoint_index }))
      .sort((a, b) => a.pos - b.pos)
      .map(w => w.i);

    return order;
  } catch {
    return nearestNeighbor(waypoints);
  }
}