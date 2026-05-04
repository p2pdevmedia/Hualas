'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

type Coordinates = {
  latitude: number;
  longitude: number;
};

interface LocationMapPickerProps {
  value: Coordinates | null;
  onChange: (nextValue: Coordinates) => void;
  center?: Coordinates;
}

const DEFAULT_CENTER: Coordinates = {
  latitude: -40.157,
  longitude: -71.351,
};

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
});

function MapClickHandler({
  onChange,
}: {
  onChange: (nextValue: Coordinates) => void;
}) {
  useMapEvents({
    click(event) {
      onChange({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

function MapRecenter({ value }: { value: Coordinates | null }) {
  const map = useMap();

  useEffect(() => {
    if (!value) return;
    map.setView([value.latitude, value.longitude], Math.max(map.getZoom(), 15));
  }, [map, value]);

  return null;
}

export default function LocationMapPicker({
  value,
  onChange,
  center = DEFAULT_CENTER,
}: LocationMapPickerProps) {
  const initialCenter = value ?? center;
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { 'Accept-Language': 'es' } }
      );
      const results = await res.json();
      if (!results.length) {
        setError('No se encontró la ubicación. Intentá con otro nombre.');
        return;
      }
      onChange({
        latitude: parseFloat(results[0].lat),
        longitude: parseFloat(results[0].lon),
      });
    } catch {
      setError('Error al buscar. Verificá tu conexión.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="Buscar lugar o dirección…"
          className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          disabled={searching}
          onClick={handleSearch}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {searching ? 'Buscando…' : 'Buscar'}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="overflow-hidden rounded-lg border bg-muted/20">
        <MapContainer
          center={[initialCenter.latitude, initialCenter.longitude]}
          zoom={13}
          scrollWheelZoom
          className="h-80 w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onChange={onChange} />
          <MapRecenter value={value} />
          {value && <Marker position={[value.latitude, value.longitude]} />}
        </MapContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        Buscá el lugar o hacé clic sobre el mapa para elegir el punto exacto.
      </p>
      {value && (
        <p className="text-xs font-medium text-foreground">
          Coordenadas seleccionadas: {value.latitude.toFixed(6)},{' '}
          {value.longitude.toFixed(6)}
        </p>
      )}
    </div>
  );
}
