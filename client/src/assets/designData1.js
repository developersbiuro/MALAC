// Design artwork now served as real image files from /design-img/
// (server/src/assets/siteImageAssets.js) with immutable cache headers —
// these exports are plain URLs, not embedded data URIs, so the JS
// bundle stays small and the photos cache between visits.
export const ABOUT_STORE = "/design-img/about-store.jpg";
export const HERO_MAIN = "/design-img/hero-main.jpg";
