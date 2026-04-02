import { useState } from 'react';

export function useGeolocation() {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getCurrentPosition = () => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      setError(null);
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos: GeolocationPosition) => {
          setPosition(pos);
          setLoading(false);
          resolve(pos);
        },
        (err: GeolocationPositionError) => {
          setError(err.message);
          setLoading(false);
          reject(new Error(err.message));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  return { position, error, loading, getCurrentPosition };
}
