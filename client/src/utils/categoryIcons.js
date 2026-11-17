// Category icons by name — the DB stores an icon NAME per category
// (e.g. "Shirt", "Watch"). Importing lucide-react as a namespace
// (`import * as icons`) defeated tree-shaking and shipped the ENTIRE
// icon library (~700 KB) to every phone — a real part of the slow
// page loads Abdullah reported on 2026-11-17. This curated map keeps
// every icon a category can plausibly use and nothing else.
import {
  Baby, Briefcase, Crown, Footprints, Gem, Glasses, Headphones,
  Heart, Shirt, ShoppingBag, Smartphone, Sparkles, Star, Tag, User,
  Users, Watch, Zap,
} from "lucide-react";

export const CATEGORY_ICONS = {
  Baby, Briefcase, Crown, Footprints, Gem, Glasses, Headphones,
  Heart, Shirt, ShoppingBag, Smartphone, Sparkles, Star, Tag, User,
  Users, Watch, Zap,
};

export const categoryIcon = (name) => CATEGORY_ICONS[name] || ShoppingBag;
