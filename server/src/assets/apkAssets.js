// APK binaries as base64 text (the snapshot push accepts UTF-8 text only).
// Embedded as code so the serverless bundler always includes them —
// runtime fs reads of loose asset files proved unreliable on Vercel.
// The base64 is split across chunk modules under ./apk/ because a single
// combined file exceeded the push request size limit (HTTP 413).
import { CUSTOMER_APK_B64_1 } from "./apk/customerApk1.js";
import { CUSTOMER_APK_B64_2 } from "./apk/customerApk2.js";
import { CUSTOMER_APK_B64_3 } from "./apk/customerApk3.js";
import { ADMIN_APK_B64_1 } from "./apk/adminApk1.js";
import { ADMIN_APK_B64_2 } from "./apk/adminApk2.js";
import { ADMIN_APK_B64_3 } from "./apk/adminApk3.js";

export const CUSTOMER_APK_B64 = CUSTOMER_APK_B64_1 + CUSTOMER_APK_B64_2 + CUSTOMER_APK_B64_3;
export const ADMIN_APK_B64 = ADMIN_APK_B64_1 + ADMIN_APK_B64_2 + ADMIN_APK_B64_3;
