import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const vehicleIcon = new L.Icon({
  iconUrl: "https://img.icons8.com/color/48/000000/scooter.png",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const pinIcon = new L.Icon({
  iconUrl: "https://img.icons8.com/color/48/000000/marker.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function LiveMap({ data }: { data: any }) {
  const driverLoc = data?.driver?.location;
  const pickupLoc = data?.booking?.pickup?.location;
  const dropoffLoc = data?.booking?.dropOff?.location;

  const positions: [number, number][] = [];
  if (driverLoc) positions.push([driverLoc.latitude, driverLoc.longitude]);
  if (pickupLoc) positions.push([pickupLoc.latitude, pickupLoc.longitude]);
  if (dropoffLoc) positions.push([dropoffLoc.latitude, dropoffLoc.longitude]);

  const defaultCenter: [number, number] = positions.length > 0 ? positions[0] : [0, 0];

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-slate-200">
      {/* @ts-ignore */}
      <MapContainer center={defaultCenter} zoom={15} style={{ height: "100%", width: "100%", zIndex: 1 } as any}>
        {/* @ts-ignore */}
        <TileLayer
          /* @ts-ignore */
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={defaultCenter} zoom={15} />

        {pickupLoc && (
          /* @ts-ignore */
          <Marker position={[pickupLoc.latitude, pickupLoc.longitude]} icon={pinIcon as any}>
            <Popup><strong>Pickup:</strong> {data?.booking?.pickup?.keywords || "Unknown"}</Popup>
          </Marker>
        )}
        
        {dropoffLoc && (
          /* @ts-ignore */
          <Marker position={[dropoffLoc.latitude, dropoffLoc.longitude]} icon={pinIcon as any}>
            <Popup><strong>Dropoff:</strong> {data?.booking?.dropOff?.keywords || "Unknown"}</Popup>
          </Marker>
        )}

        {driverLoc && (
          /* @ts-ignore */
          <Marker position={[driverLoc.latitude, driverLoc.longitude]} icon={vehicleIcon as any}>
            <Popup>
              <strong>{data?.driver?.name || "Driver"}</strong><br />
              {data?.driver?.vehiclePlateNumber || "Unknown"}
            </Popup>
          </Marker>
        )}

        {positions.length > 1 && (
          /* @ts-ignore */
          <Polyline positions={positions} color="#ea580c" weight={4} opacity={0.7} dashArray="10, 10" />
        )}
      </MapContainer>
    </div>
  );
}
