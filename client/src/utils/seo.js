import { useEffect } from "react";

// Per-page SEO for the SPA: sets document.title and upserts the meta
// description / robots tags, and (when given) injects a page-level
// JSON-LD <script>. The static site-wide defaults live in index.html;
// this hook only overrides them while the page is mounted.
const JSON_LD_ID = "malac-page-jsonld";

// Interim default share image: the seeded Women Embroidered 3-Piece Lawn
// Suit product photo (picsum seed "fas-wom-lawn3") at 1200x630. Replace
// with a hosted brand share image once durable image hosting (Cloudinary)
// lands. Mirrors the og:image in index.html.
export const SITE_IMAGE = "https://picsum.photos/seed/fas-wom-lawn3/1200/630";

function upsertMeta(name, content) {
  let tag = document.head.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertProperty(property, content) {
  let tag = document.head.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export function useSeo({ title, description, robots, jsonLd, image } = {}) {
  // Serialize during render so the effect only re-runs when the
  // structured data actually changes (callers build fresh objects).
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : null;

  useEffect(() => {
    if (title) document.title = title;
    if (description) upsertMeta("description", description);
    if (robots) upsertMeta("robots", robots);
    // Share image: a page may pass its own (e.g. a product photo);
    // otherwise the site-wide default applies.
    const shareImage = image || SITE_IMAGE;
    upsertProperty("og:image", shareImage);
    upsertMeta("twitter:image", shareImage);
    if (jsonLdText) {
      let script = document.getElementById(JSON_LD_ID);
      if (!script) {
        script = document.createElement("script");
        script.id = JSON_LD_ID;
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = jsonLdText;
    }
    return () => {
      // Page JSON-LD must not leak into the next route.
      document.getElementById(JSON_LD_ID)?.remove();
    };
  }, [title, description, robots, jsonLdText, image]);
}

export default useSeo;
