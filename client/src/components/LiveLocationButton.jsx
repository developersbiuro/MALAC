import { useState } from "react";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";

// "Use My Live Location" — captures the customer's device GPS position
// (browser geolocation, HTTPS only) so they can order to exactly where
// they are standing. On success it calls:
//   onLocation({ lat, lng, mapsUrl, addressLine, area, city })
// where addressLine/area/city are best-effort suggestions reverse-geocoded
// from the free OpenStreetMap Nominatim service (no API key). If the
// reverse lookup fails, the coordinates alone are still delivered — the
// pin is what matters for the rider. Denied permission or an unsupported
// device only shows a friendly inline note; manual address entry always
// stays available and is never blocked by this component.
export default function LiveLocationButton({ onLocation, className = "" }) {
  const [state, setState] = useState("idle"); // idle | locating | done | error
  const [note, setNote] = useState("");

  const capture = () => {
    if (!("geolocation" in navigator)) {
      setState("error");
      setNote("Is device par live location support nahi hai. Location allow karein ya address manually likhein.");
      return;
    }
    setState("locating");
    setNote("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let addressLine = "";
        let area = "";
        let city = "";
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
          );
          if (r.ok) {
            const j = await r.json();
            const a = j.address || {};
            city = a.city || a.town || a.village || a.state || "";
            area = a.suburb || a.neighbourhood || a.quarter || "";
            addressLine =
              [a.house_number, a.road].filter(Boolean).join(" ") ||
              (j.display_name ? j.display_name.split(",").slice(0, 2).join(",").trim() : "");
          }
        } catch { /* reverse geocode is best-effort — coordinates still count */ }
        setState("done");
        setNote("Live location mil gayi hai — address check karke order karein.");
        onLocation({
          lat,
          lng,
          mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
          addressLine,
          area,
          city,
        });
      },
      (err) => {
        setState("error");
        setNote(
          err && err.code === err.PERMISSION_DENIED
            ? "Location ki permission nahi mili. Location allow karein ya address manually likhein."
            : "Live location hasil nahi ho saki. Location allow karein ya address manually likhein."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={capture}
        disabled={state === "locating"}
        className="inline-flex items-center gap-2 border border-lux-amber text-lux-burnt rounded-full px-4 py-2 text-sm font-medium hover:bg-cream-alt disabled:opacity-60"
      >
        {state === "locating"
          ? <Loader2 size={16} className="animate-spin" />
          : state === "done"
            ? <CheckCircle2 size={16} className="text-green-600" />
            : <MapPin size={16} />}
        {state === "locating" ? "Location dhoondh rahe hain..." : "Use My Live Location"}
      </button>
      {note && (
        <p className={`text-xs mt-1.5 ${state === "error" ? "text-red-500" : "text-green-600"}`}>{note}</p>
      )}
    </div>
  );
}
