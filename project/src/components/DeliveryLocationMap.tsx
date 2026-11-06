import { useEffect, useMemo, useState } from 'react';
import * as L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface DeliveryCoordinates {
  latitude: number;
  longitude: number;
}

interface DeliveryLocationMapProps {
  value: DeliveryCoordinates | null;
  onConfirm: (coordinates: DeliveryCoordinates) => void;
  onClear: () => void;
}

const DEFAULT_CENTER: L.LatLngExpression = [8.49, 124.32];

const deliveryPinIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 30px;
      height: 30px;
      border-radius: 9999px 9999px 9999px 4px;
      transform: rotate(-45deg);
      background: #15803d;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,.28);
      position: relative;
    ">
      <div style="
        width: 8px;
        height: 8px;
        border-radius: 9999px;
        background: white;
        position: absolute;
        left: 8px;
        top: 8px;
      "></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function MapClickHandler({
  onSelect,
}: {
  onSelect: (coordinates: DeliveryCoordinates) => void;
}) {
  useMapEvents({
    click(event: L.LeafletMouseEvent) {
      onSelect({
        latitude: Number(event.latlng.lat.toFixed(7)),
        longitude: Number(event.latlng.lng.toFixed(7)),
      });
    },
  });

  return null;
}

export function DeliveryLocationMap({
  value,
  onConfirm,
  onClear,
}: DeliveryLocationMapProps) {
  const [draft, setDraft] = useState<DeliveryCoordinates | null>(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const markerPosition = useMemo<L.LatLngExpression | null>(() => {
    if (!draft) return null;
    return [draft.latitude, draft.longitude];
  }, [draft]);

  const confirmed =
    Boolean(value && draft) &&
    value?.latitude === draft?.latitude &&
    value?.longitude === draft?.longitude;

  return (
    <div className="space-y-2.5 rounded-xl border border-emerald-100 bg-white p-2.5 shadow-[0_10px_24px_-22px_rgba(21,128,61,0.5)]">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
          Exact Delivery Location *
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
          Click the map to place the pin, adjust it if needed, then select Use This Location.
          Both the written delivery address and a confirmed map location are required.
          The pin does not affect the delivery fee.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <MapContainer
          center={value ? [value.latitude, value.longitude] : DEFAULT_CENTER}
          zoom={12}
          scrollWheelZoom={false}
          className="h-52 w-full sm:h-56 lg:h-48"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onSelect={setDraft} />
          {markerPosition && (
            <Marker
              position={markerPosition}
              icon={deliveryPinIcon}
              draggable
              eventHandlers={{
                dragend: (event: L.LeafletEvent) => {
                  const marker = event.target as L.Marker;
                  const position = marker.getLatLng();
                  setDraft({
                    latitude: Number(position.lat.toFixed(7)),
                    longitude: Number(position.lng.toFixed(7)),
                  });
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {draft && (
        <div className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-[10px] text-gray-600">
          Selected coordinates: <strong>{draft.latitude.toFixed(7)}, {draft.longitude.toFixed(7)}</strong>
        </div>
      )}

      {confirmed && (
        <p className="text-[10px] font-bold text-emerald-700">
          Delivery location confirmed.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!draft}
          onClick={() => draft && onConfirm(draft)}
          className="rounded-lg bg-[#15803d] px-3 py-1.5 text-[10px] font-bold text-white transition-all duration-150 hover:bg-[#166534] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use This Location
        </button>
        {(draft || value) && (
          <button
            type="button"
            onClick={() => {
              setDraft(null);
              onClear();
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-bold text-gray-600 transition-all duration-150 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2"
          >
            Clear Pin
          </button>
        )}
      </div>

      <p className="text-[9px] leading-relaxed text-gray-400">
        A confirmed map location is required before a Local Delivery order can be submitted.
        The map is used only to record the delivery location and does not calculate the fee.
      </p>
    </div>
  );
}
