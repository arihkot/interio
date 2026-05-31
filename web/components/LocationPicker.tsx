"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

type Props = {
  onConfirm: (value: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
  }) => void;
};

type CityOption = {
  name: string;
  latitude: number;
  longitude: number;
};

const STATE_CITY_OPTIONS: Record<string, CityOption[]> = {
  Maharashtra: [
    { name: "Mumbai", latitude: 19.076, longitude: 72.8777 },
    { name: "Pune", latitude: 18.5204, longitude: 73.8567 },
    { name: "Nagpur", latitude: 21.1458, longitude: 79.0882 },
    { name: "Nashik", latitude: 19.9975, longitude: 73.7898 }
  ],
  Karnataka: [
    { name: "Bengaluru", latitude: 12.9716, longitude: 77.5946 },
    { name: "Mysuru", latitude: 12.2958, longitude: 76.6394 },
    { name: "Mangaluru", latitude: 12.9141, longitude: 74.856 },
    { name: "Hubballi", latitude: 15.3647, longitude: 75.124 }
  ],
  "Tamil Nadu": [
    { name: "Chennai", latitude: 13.0827, longitude: 80.2707 },
    { name: "Coimbatore", latitude: 11.0168, longitude: 76.9558 },
    { name: "Madurai", latitude: 9.9252, longitude: 78.1198 },
    { name: "Salem", latitude: 11.6643, longitude: 78.146 } 
  ],
  Delhi: [
    { name: "New Delhi", latitude: 28.6139, longitude: 77.209 },
    { name: "Dwarka", latitude: 28.5921, longitude: 77.046 },
    { name: "Rohini", latitude: 28.7495, longitude: 77.0565 }
  ],
  Gujarat: [
    { name: "Ahmedabad", latitude: 23.0225, longitude: 72.5714 },
    { name: "Surat", latitude: 21.1702, longitude: 72.8311 },
    { name: "Vadodara", latitude: 22.3072, longitude: 73.1812 },
    { name: "Rajkot", latitude: 22.3039, longitude: 70.8022 }
  ],
  "Uttar Pradesh": [
    { name: "Lucknow", latitude: 26.8467, longitude: 80.9462 },
    { name: "Kanpur", latitude: 26.4499, longitude: 80.3319 },
    { name: "Noida", latitude: 28.5355, longitude: 77.391 },
    { name: "Varanasi", latitude: 25.3176, longitude: 82.9739 }
  ],
  "West Bengal": [
    { name: "Kolkata", latitude: 22.5726, longitude: 88.3639 },
    { name: "Howrah", latitude: 22.5958, longitude: 88.2636 },
    { name: "Durgapur", latitude: 23.5204, longitude: 87.3119 },
    { name: "Siliguri", latitude: 26.7271, longitude: 88.3953 }
  ],
  Kerala: [
    { name: "Kochi", latitude: 9.9312, longitude: 76.2673 },
    { name: "Thiruvananthapuram", latitude: 8.5241, longitude: 76.9366 },
    { name: "Kozhikode", latitude: 11.2588, longitude: 75.7804 },
    { name: "Thrissur", latitude: 10.5276, longitude: 76.2144 }
  ],
  Chhattisgarh: [
    { name: "Raipur", latitude: 21.2514, longitude: 81.6296 },
    { name: "Bilaspur", latitude: 22.0797, longitude: 82.1391 },
    { name: "Durg", latitude: 21.1904, longitude: 81.2849 },
    { name: "Korba", latitude: 22.3595, longitude: 82.7501 }
  ],
  Rajasthan: [
    { name: "Jaipur", latitude: 26.9124, longitude: 75.7873 },
    { name: "Udaipur", latitude: 24.5854, longitude: 73.7125 },
    { name: "Jodhpur", latitude: 26.2389, longitude: 73.0243 },
    { name: "Kota", latitude: 25.2138, longitude: 75.8648 }
  ]
};

const stateOptions = Object.keys(STATE_CITY_OPTIONS);

function nearestCity(latitude: number, longitude: number): { state: string; city: CityOption } {
  let nearestState = stateOptions[0];
  let nearestCityOption = STATE_CITY_OPTIONS[nearestState][0];
  let minDistance = Number.POSITIVE_INFINITY;

  for (const state of stateOptions) {
    for (const city of STATE_CITY_OPTIONS[state]) {
      const dLat = latitude - city.latitude;
      const dLon = longitude - city.longitude;
      const distance = dLat * dLat + dLon * dLon;
      if (distance < minDistance) {
        minDistance = distance;
        nearestState = state;
        nearestCityOption = city;
      }
    }
  }

  return { state: nearestState, city: nearestCityOption };
}

export function LocationPicker({ onConfirm }: Props) {
  const [city, setCity] = useState("Mumbai");
  const [state, setState] = useState("Maharashtra");
  const [latitude, setLatitude] = useState(19.076);
  const [longitude, setLongitude] = useState(72.8777);
  const [detecting, setDetecting] = useState(false);

  const cityOptions = useMemo(() => STATE_CITY_OPTIONS[state] ?? [], [state]);

  useEffect(() => {
    const selected = cityOptions.find((option) => option.name === city) ?? cityOptions[0];
    if (!selected) return;
    if (selected.name !== city) {
      setCity(selected.name);
    }
    setLatitude(Number(selected.latitude.toFixed(6)));
    setLongitude(Number(selected.longitude.toFixed(6)));
  }, [state]);

  function onCityChange(nextCity: string) {
    setCity(nextCity);
    const selected = cityOptions.find((option) => option.name === nextCity);
    if (!selected) return;
    setLatitude(Number(selected.latitude.toFixed(6)));
    setLongitude(Number(selected.longitude.toFixed(6)));
  }

  useEffect(() => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lon = Number(position.coords.longitude.toFixed(6));
        const nearest = nearestCity(lat, lon);
        setState(nearest.state);
        setCity(nearest.city.name);
        setLatitude(Number(nearest.city.latitude.toFixed(6)));
        setLongitude(Number(nearest.city.longitude.toFixed(6)));
        setDetecting(false);
      },
      () => setDetecting(false),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  return (
    <section className="panel location-panel">
      <div className="panel-header">
        <h2>Project Location</h2>
        <p>Choose state and city. Coordinates are auto-filled for climate and pricing analysis.</p>
      </div>

      <div className="location-grid">
        <div className="field-group">
          <label htmlFor="state">State</label>
          <select id="state" value={state} onChange={(event) => setState(event.target.value)}>
            {stateOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="city">City</label>
          <select id="city" value={city} onChange={(event) => onCityChange(event.target.value)}>
            {cityOptions.map((option) => (
              <option key={`${state}-${option.name}`} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row-action">
        <div className="location-help">
          {detecting ? (
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Loader2 size={14} className="animate-spin" /> Detecting current location...
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <MapPin size={14} /> Nearest supported city selected.
            </span>
          )}
          <span>Selected: {city}, {state}</span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onConfirm({ latitude, longitude, city, state })}
        >
          Confirm Location
        </button>
      </div>
    </section>
  );
}
