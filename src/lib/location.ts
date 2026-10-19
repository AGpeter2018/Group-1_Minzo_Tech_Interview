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

/**
 * Calculates straight-line distance in kilometers between two coordinates using the Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

/**
 * Fallback coordinate resolver: returns exact coordinates if available,
 * or the centroid coordinates of the county capital.
 */
export function resolveCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  county: string | null | undefined
): { lat: number; lng: number } {
  if (latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)) {
    return { lat: latitude, lng: longitude };
  }

  if (county && LIBERIAN_COUNTIES[county]) {
    return LIBERIAN_COUNTIES[county];
  }

  // Default to central Monrovia (Montserrado)
  return LIBERIAN_COUNTIES['Montserrado'];
}
