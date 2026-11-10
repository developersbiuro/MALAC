// Preset colour palette shared by the admin product form (quick-add
// colour chips) and the storefront (swatch dots on the product page).
// Admins can also type any custom colour name — a name outside this
// list simply renders without a swatch dot.
export const COLOR_PRESETS = [
  { name: "Black", hex: "#1f2937" },
  { name: "White", hex: "#f9fafb" },
  { name: "Red", hex: "#dc2626" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Green", hex: "#16a34a" },
  { name: "Brown", hex: "#92400e" },
  { name: "Grey", hex: "#6b7280" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Orange", hex: "#f97316" },
  { name: "Maroon", hex: "#7f1d1d" },
  { name: "Navy", hex: "#1e3a8a" },
  { name: "Beige", hex: "#d6c7a8" },
  { name: "Gold", hex: "#c9a227" },
  { name: "Silver", hex: "#c0c0c0" },
];

export const colorHex = (name) =>
  COLOR_PRESETS.find((c) => c.name.toLowerCase() === String(name || "").trim().toLowerCase())?.hex || null;
