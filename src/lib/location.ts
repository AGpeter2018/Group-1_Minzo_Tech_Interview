// Liberia County Centroid Coordinates
export const LIBERIAN_COUNTIES: Record<string, { lat: number; lng: number }> = {
  'Montserrado': { lat: 6.3156, lng: -10.8074 },      // Monrovia
  'Nimba': { lat: 7.3621, lng: -8.7047 },             // Sanniquellie / Ganta
  'Bong': { lat: 7.0097, lng: -9.4714 },              // Gbarnga
  'Margibi': { lat: 6.5311, lng: -10.3536 },          // Kakata
  'Grand Bassa': { lat: 5.8808, lng: -10.0447 },      // Buchanan
  'Lofa': { lat: 8.2783, lng: -9.7489 },              // Voinjama
  'Maryland': { lat: 4.3756, lng: -7.7169 },          // Harper
  'Sinoe': { lat: 5.0000, lng: -9.0333 },             // Greenville
  'Grand Cape Mount': { lat: 6.7533, lng: -11.3681 }, // Robertsport
  'Grand Gedeh': { lat: 6.0667, lng: -8.1333 },       // Zwedru
  'Bomi': { lat: 6.7567, lng: -10.8453 },             // Tubmanburg
  'River Cess': { lat: 5.5000, lng: -9.5000 },        // Cestos City
  'River Gee': { lat: 5.2500, lng: -7.6667 },         // Fish Town
  'Gbarpolu': { lat: 7.5000, lng: -10.0833 },         // Bopolu
  'Grand Kru': { lat: 4.7500, lng: -8.2167 },         // Barclayville
};

export const COUNTIES_LIST = Object.keys(LIBERIAN_COUNTIES).sort();
export const LIBERIA_COUNTIES = COUNTIES_LIST;

export interface Coordinates {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
}

export function getCountyCoordinates(county: string): { latitude: number; longitude: number } {
  const c = LIBERIAN_COUNTIES[county] || LIBERIAN_COUNTIES['Montserrado'];
  return { latitude: c.lat, longitude: c.lng };
}

/**
 * Calculates straight-line distance in kilometers between two coordinates using the Haversine formula.
 * Supports both object coordinates or 4 numeric arguments.
 */
export function calculateHaversineDistance(
  coordOrLat1: Coordinates | { latitude: number; longitude: number } | number,
  coordOrLon1?: Coordinates | { latitude: number; longitude: number } | number,
  lat2?: number,
  lon2?: number
): number {
  let p1Lat: number;
  let p1Lng: number;
  let p2Lat: number;
  let p2Lng: number;

  if (typeof coordOrLat1 === 'object' && coordOrLat1 !== null && typeof coordOrLon1 === 'object' && coordOrLon1 !== null) {
    p1Lat = (coordOrLat1 as any).lat ?? (coordOrLat1 as any).latitude ?? 0;
    p1Lng = (coordOrLat1 as any).lng ?? (coordOrLat1 as any).longitude ?? 0;
    p2Lat = (coordOrLon1 as any).lat ?? (coordOrLon1 as any).latitude ?? 0;
    p2Lng = (coordOrLon1 as any).lng ?? (coordOrLon1 as any).longitude ?? 0;
  } else {
    p1Lat = Number(coordOrLat1);
    p1Lng = Number(coordOrLon1);
    p2Lat = Number(lat2 ?? 0);
    p2Lng = Number(lon2 ?? 0);
  }

  const R = 6371; // Earth's radius in km
  const dLat = (p2Lat - p1Lat) * (Math.PI / 180);
  const dLon = (p2Lng - p1Lng) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1Lat * (Math.PI / 180)) *
      Math.cos(p2Lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

/**
 * Fallback coordinate resolver: returns exact coordinates if available,
 * or the centroid coordinates of the county capital.
 * Supports passing a business object or (latitude, longitude, county).
 */
export function resolveCoordinates(
  businessOrLat: { latitude?: number | null; longitude?: number | null; county?: string | null } | number | null | undefined,
  longitude?: number | null | undefined,
  county?: string | null | undefined
): { lat: number; lng: number } {
  let lat: number | null | undefined;
  let lng: number | null | undefined;
  let cty: string | null | undefined;

  if (typeof businessOrLat === 'object' && businessOrLat !== null) {
    lat = businessOrLat.latitude;
    lng = businessOrLat.longitude;
    cty = businessOrLat.county;
  } else {
    lat = businessOrLat;
    lng = longitude;
    cty = county;
  }

  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    return { lat, lng };
  }

  if (cty && LIBERIAN_COUNTIES[cty]) {
    return LIBERIAN_COUNTIES[cty];
  }

  // Default to central Monrovia (Montserrado)
  return LIBERIAN_COUNTIES['Montserrado'];
}
