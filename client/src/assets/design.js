import { HERO_MAIN, HERO_STANDING, HERO_STANDING2, ABOUT_STORE } from "./designData1.js";
import { CAT_WOMEN, CAT_BAGS, P_POLO, P_WATCH } from "./designData2.js";
import { P_HOODIE, P_SUNGLASSES, P_WALLET, P_CAP, CAT_MOBILE, CAT_WATCH_DARK, CAT_EYEWEAR_DARK } from "./designData3.js";

// Design assets for Abdullah's final reference designs (2026-11-16 night):
// the "MORE THAN STYLE. IT'S YOUR IDENTITY." homepage and the silver
// storefront. Photos are generated black/silver studio shots shipped as
// base64 data-URI modules (designData1-3.js) — the repo's push route is
// text-only, same pattern as hero.js. The five product photos were also
// uploaded to the matching catalogue products via the admin panel.
export const DESIGN_HERO = HERO_STANDING;
// Hero slider (Abdullah's storefront reference, 2026-11-16 23:55): the
// standing-model shot leads; the seated campaign frame is slide 3.
export const DESIGN_HERO_SLIDES = [HERO_STANDING, HERO_STANDING2, HERO_MAIN];
export const DESIGN_ABOUT_STORE = ABOUT_STORE;

export const CATEGORY_PHOTOS = {
  "Men's Fashion": P_POLO,
  "Women's Fashion": CAT_WOMEN,
  Watches: CAT_WATCH_DARK,
  Eyewear: CAT_EYEWEAR_DARK,
  "Bags & Accessories": CAT_BAGS,
  "Mobile Accessories": CAT_MOBILE,
};

// Featured Collections strip (Abdullah's fragment, 2026-11-16 night):
// six light-grey studio tiles. Links are resolved against the live
// catalogue in Home.jsx, with category fallbacks.
export const FEATURED_TILES = [
  { img: P_POLO, label: "MALAC Premium Polo", match: /polo/i, fallback: "/category/Men's Fashion" },
  { img: P_HOODIE, label: "MALAC Hoodie", match: /hoodie/i, fallback: "/category/Men's Fashion" },
  { img: P_WATCH, label: "MALAC Signature Watch", match: /signature watch/i, fallback: "/category/Watches" },
  { img: P_CAP, label: "MALAC Cap", match: /\bcap\b/i, fallback: "/category/Men's Fashion" },
  { img: P_SUNGLASSES, label: "MALAC Sunglasses", match: /sunglasses/i, fallback: "/category/Eyewear" },
  { img: P_WALLET, label: "MALAC Wallet", match: /wallet/i, fallback: "/category/Bags & Accessories" },
];
