"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useLocale } from "next-intl";

interface FieldPoint {
  id: string;
  name: string;
  address: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
}

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:30px;height:30px;border-radius:50% 50% 50% 0;
    background:#1FD16B;border:2px solid #06210F;transform:rotate(-45deg);
    box-shadow:0 4px 10px rgba(0,0,0,.5);
  ">
    <div style="
      width:10px;height:10px;border-radius:50%;background:#06210F;
      position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(45deg);
    "></div>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

function Fit({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [points, map]);
  return null;
}

export default function FieldMap({
  fields,
  height = 280,
}: {
  fields: FieldPoint[];
  height?: number;
}) {
  const locale = useLocale();
  const points = fields
    .filter(
      (f): f is FieldPoint & { latitude: number; longitude: number } =>
        f.latitude !== null && f.longitude !== null,
    )
    .map((f) => ({ ...f, lat: f.latitude, lng: f.longitude }));

  if (points.length === 0) {
    return (
      <div
        style={{ height }}
        className="rounded-2xl bg-surface border border-border flex items-center justify-center text-text-muted text-[13px]"
      >
        Координаты не указаны
      </div>
    );
  }

  const center: [number, number] = [points[0].lat, points[0].lng];

  return (
    <div
      style={{ height }}
      className="rounded-2xl overflow-hidden border border-border"
    >
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: "#0a0a0a" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Fit points={points} />
        {points.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon}>
            <Popup>
              <div style={{ fontFamily: "Manrope, sans-serif", color: "#0B0E0D" }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#5c615e", marginTop: 2 }}>
                  {p.address}
                </div>
                <Link
                  href={`/${locale}/fields/${p.id}`}
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    color: "#0f5530",
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  Открыть →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
