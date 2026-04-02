// Location detection service using OpenStreetMap Nominatim reverse geocoding

interface LocationResult {
  estate: string;
  neighborhood: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export async function detectLocation(latitude: number, longitude: number): Promise<LocationResult> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=18`,
      {
        headers: {
          'User-Agent': 'WhereApp/1.0 (https://where-com.lovable.app)',
          'Accept-Language': 'en',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      throw new Error(data?.error || 'No results from Nominatim');
    }

    const address = data.address || {};

    // Extract estate: prefer building/amenity/residential, fall back to road
    const estate =
      address.building ||
      address.amenity ||
      address.residential ||
      address.road ||
      address.hamlet ||
      data.name ||
      'Unknown Location';

    // Extract neighborhood: prefer neighbourhood/suburb/city_district
    const neighborhood =
      address.neighbourhood ||
      address.suburb ||
      address.city_district ||
      address.town ||
      address.city ||
      null;

    // Determine confidence based on available detail
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (address.building || address.amenity || address.residential) {
      confidence = 'high';
    } else if (address.road && (address.neighbourhood || address.suburb)) {
      confidence = 'medium';
    }

    return { estate, neighborhood, confidence };
  } catch (error) {
    console.error('Nominatim reverse geocoding failed:', error);
    // Return a generic fallback instead of fake estate names
    return {
      estate: 'Unknown Location',
      neighborhood: null,
      confidence: 'low',
    };
  }
}
