'use client';

import { useEffect } from 'react';
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

  return (
    <div className="space-y-2">
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
        Hacé clic sobre el mapa para elegir el punto exacto.
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
