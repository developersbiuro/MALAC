import { useEffect, useState } from "react";
import api from "../api/client.js";

// Live store Settings for the storefront (public subset of
// GET /api/settings/public — the same values the owner edits in
// Admin → Settings). ONE cached fetch is shared by every component
// (header, footer, cart, checkout, product pages, home…), so a change
// in the admin panel shows up across the whole store on the next page
// load. The fallbacks below are only the current canonical values,
// used for the first paint or if the fetch fails — the panel values
// always win once loaded.
export const FALLBACK_FEES = { standard: 249, express: 399, freeThreshold: 3000 };

let cache = null;
let inflight = null;

function load() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = api
      .get("/settings/public")
      .then((r) => {
        cache = r.data.payments || {};
        return cache;
      })
      .catch(() => ({}))
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function usePublicSettings() {
  const [payments, setPayments] = useState(cache);
  useEffect(() => {
    let on = true;
    load().then((p) => {
      if (on) setPayments(p);
    });
    return () => {
      on = false;
    };
  }, []);
  const fees = {
    standard: payments?.defaultShippingFee ?? FALLBACK_FEES.standard,
    express: payments?.expressShippingFee ?? FALLBACK_FEES.express,
    freeThreshold: payments?.freeShippingThreshold ?? FALLBACK_FEES.freeThreshold,
  };
  return { payments, fees, loaded: payments != null };
}
