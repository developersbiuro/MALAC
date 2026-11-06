import { useId, useMemo } from "react";
import { PROVINCES, citiesOfProvince, areasOfCity } from "../data/pakLocations.js";

// Cascading Province → City → Area picker (Daraz-style), shared by
// Checkout and the Profile Settings address book.
//
//   value:    { province, city, area }
//   onChange: (next) => void — always called with the full next triple.
//   inputClassName: the host form's control styling ("border rounded …"
//                   in Checkout, the pill `input` class in Profile
//                   Settings). Labels are rendered through
//                   labelClassName when the host provides one
//                   (Profile Settings); otherwise plain placeholders /
//                   aria-labels are used (Checkout).
//
// Behaviour notes:
// - Province and city are required selects. Changing the province
//   resets city + area; changing the city resets the area.
// - City options come from the chosen province's districts; when the
//   list is long (> 25) they are grouped with <optgroup> per district,
//   otherwise rendered flat with the district shown after the city.
// - A current city that is NOT in the dataset (e.g. a town adopted from
//   the GPS reverse-geocode) stays available as a pinned first option,
//   so an existing value is never silently dropped. A current province
//   outside the dataset gets the same treatment.
// - Area is a free-text input with a <datalist> of the chosen city's
//   known areas / colonies for major metros: picking a suggestion is
//   optional and any typed value is accepted as-is.
export default function LocationSelect({
  value,
  onChange,
  inputClassName = "",
  labelClassName = "",
  idPrefix,
}) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const uid = idPrefix || `loc-${reactId}`;
  const province = value?.province || "";
  const city = value?.city || "";
  const area = value?.area || "";

  const provinceNames = useMemo(() => PROVINCES.map((p) => p.name), []);
  const cityEntries = useMemo(() => citiesOfProvince(province), [province]);
  const cityInDataset = cityEntries.some((e) => e.city.toLowerCase() === city.toLowerCase());
  const provinceInDataset = provinceNames.some((p) => p.toLowerCase() === province.toLowerCase());
  const grouped = cityEntries.length > 25;
  const groups = useMemo(() => {
    if (!grouped) return [];
    const byDistrict = new Map();
    for (const e of cityEntries) {
      if (!byDistrict.has(e.district)) byDistrict.set(e.district, []);
      byDistrict.get(e.district).push(e.city);
    }
    return [...byDistrict.entries()];
  }, [cityEntries, grouped]);
  const areas = useMemo(() => areasOfCity(city), [city]);

  const pickProvince = (next) => onChange({ province: next, city: "", area: "" });
  const pickCity = (next) => onChange({ province, city: next, area: "" });
  const typeArea = (next) => onChange({ province, city, area: next });

  const renderLabel = (text) => (labelClassName ? <span className={labelClassName}>{text}</span> : null);

  return (
    <>
      <label className="block">
        {renderLabel("Province")}
        <select
          required
          aria-label="Province"
          className={`${inputClassName} ${labelClassName ? "mt-1" : ""}`}
          value={province}
          onChange={(e) => pickProvince(e.target.value)}
        >
          <option value="" disabled>Select province</option>
          {province && !provinceInDataset && <option value={province}>{province}</option>}
          {provinceNames.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <label className="block">
        {renderLabel("City")}
        <select
          required
          aria-label="City"
          className={`${inputClassName} ${labelClassName ? "mt-1" : ""}`}
          value={city}
          onChange={(e) => pickCity(e.target.value)}
          disabled={!province}
        >
          <option value="" disabled>{province ? "Select city" : "Select province first"}</option>
          {city && !cityInDataset && <option value={city}>{city}</option>}
          {grouped
            ? groups.map(([district, cities]) => (
              <optgroup key={district} label={district}>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            ))
            : cityEntries.map((e) => (
              <option key={e.city} value={e.city}>{e.city} ({e.district})</option>
            ))}
        </select>
      </label>
      <label className="block">
        {renderLabel("Area / Town")}
        <input
          required
          placeholder="Area / Town"
          aria-label="Area / Town"
          className={`${inputClassName} ${labelClassName ? "mt-1" : ""}`}
          value={area}
          onChange={(e) => typeArea(e.target.value)}
          list={`${uid}-areas`}
          autoComplete="off"
        />
        <datalist id={`${uid}-areas`}>
          {areas.map((a) => <option key={a} value={a} />)}
        </datalist>
      </label>
    </>
  );
}
