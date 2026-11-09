import { useEffect } from "react";

// Per-page SEO for the SPA: sets document.title and upserts the meta
// description / robots tags, and (when given) injects a page-level
// JSON-LD <script>. The static site-wide defaults live in index.html;
// this hook only overrides them while the page is mounted.
const JSON_LD_ID = "malac-page-jsonld";

// Default share image: the branded 1200x630 MALAC share image (official
// logo artwork on the site's cream background), served by the API at
// /og-image.png. Mirrors the og:image in index.html.
export const SITE_IMAGE = "https://www.malac.pp.ua/og-image.png";

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
