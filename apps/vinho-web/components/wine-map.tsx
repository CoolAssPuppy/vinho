"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Wine, MapPin, Calendar, Grape } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

// Fix Leaflet default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

interface WineLocation {
  id: string;
  name: string;
  producer: string;
  region: string;
  country: string;
  year: number | null;
  varietals: string[];
  latitude: number | null;
  longitude: number | null;
  vineyard_name: string | null;
}

interface WineMapProps {
  wines: WineLocation[];
  onWineSelect: (wine: WineLocation | null) => void;
  selectedWine: WineLocation | null;
}

// Custom wine marker icon
function createWineIcon(isSelected: boolean = false) {
  const iconHtml = renderToStaticMarkup(
    <div className={`${isSelected ? "text-primary" : "text-primary/70"}`}>
      <Wine className="h-6 w-6" />
    </div>,
  );

  return L.divIcon({
    html: iconHtml,
    className: "wine-marker",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
}

// Component to fit map bounds to markers
function FitBounds({ wines }: { wines: WineLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (wines.length > 0) {
      const validWines = wines.filter((w) => w.latitude && w.longitude);
      if (validWines.length > 0) {
        const bounds = L.latLngBounds(
          validWines.map(
            (w) => [w.latitude!, w.longitude!] as [number, number],
          ),
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [wines, map]);

  return null;
}

export default function WineMap({
  wines,
  onWineSelect,
  selectedWine,
}: WineMapProps) {
  const validWines = wines.filter((w) => w.latitude && w.longitude);

  // Default center (world view)
  const defaultCenter: [number, number] = [20, 0];
  const defaultZoom = 2;

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        style={{ background: "#f3f4f6" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds wines={validWines} />

        {validWines.map((wine) => (
          <Marker
            key={wine.id}
            position={[wine.latitude!, wine.longitude!]}
            icon={createWineIcon(selectedWine?.id === wine.id)}
            eventHandlers={{
              click: () => onWineSelect(wine),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-semibold text-base mb-1">{wine.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {wine.producer}
                </p>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {wine.region}, {wine.country}
                    </span>
                  </div>

                  {wine.year && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{wine.year}</span>
                    </div>
                  )}

                  {wine.varietals.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Grape className="h-3 w-3" />
                      <span>{wine.varietals.join(", ")}</span>
                    </div>
                  )}

                  {wine.vineyard_name && (
                    <div className="pt-1 border-t mt-1">
                      <span className="font-medium">Vineyard: </span>
                      <span>{wine.vineyard_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <style jsx global>{`
        .wine-marker {
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .leaflet-popup-content {
          margin: 0;
          padding: 0;
        }
      `}</style>
    </div>
  );
}
