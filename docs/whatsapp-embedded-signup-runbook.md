# WhatsApp Embedded Signup (Coexistence) — Operator Runbook

**Goal:** make the owner's number **+92 323 6016684** send MALAC OTPs via the
WhatsApp Cloud API **while staying live in his WhatsApp Business app**.

**Why this flow exists:** linking the WhatsApp Business *app* account into the
MALAC Store portfolio from Business Settings only *claims* it — Meta does not
convert it into a Cloud API Messaging account, so templates are rejected
("WABA not allowed to manage templates") and sends fail with #133010
("Account not registered"). The conversion happens **only** when the number is
onboarded through **Embedded Signup with coexistence**
(`extras.featureType = "whatsapp_business_app_onboarding"`) run from our own
Meta app. When the flow completes, Meta converts the account **keeping the
same account ID**, and the number becomes usable by the Cloud API and the app
at the same time.

**Pieces already in the repo:**

| Piece | Path |
|---|---|
| Connect page (Facebook SDK + `FB.login`) | `client/public/whatsapp-connect.html` → served at `/whatsapp-connect.html` |
| Server endpoint (code exchange + app subscription) | `POST /api/whatsapp/embedded-signup` (Super Admin only) |
| Graph helpers | `server/src/services/metaEmbeddedSignupService.js` |
| App credentials config | `server/src/config/env.js` → `env.meta` (`META_APP_ID` / `META_APP_SECRET`) |

---

## Step 1 — Meta app dashboard checklist (one-time)

App: **MALAC**, App ID **3071438539856171**, at <https://developers.facebook.com/apps/3071438539856171>.
Do these signed in as **Abdullah Sheikh** (app Admin). Follow on-screen prompts
where the dashboard offers them — the Embedded Signup screens change often.

1. **WhatsApp product present.** Left rail → if *WhatsApp* is missing:
   **Add a product** (or **Use cases → Connect with customers through WhatsApp**)
   → **Set up**. Confirm the app is owned by the **MALAC Store** portfolio
   (Business ID `1416296264013555`) under **Settings → Basic**.
2. **Settings → Basic:**
   - **App Domains:** `malac1.vercel.app`
   - **Privacy Policy URL:** `https://malac1.vercel.app/policy`
   - **Add Platform → Website → Site URL:** `https://malac1.vercel.app/`
   - Note the **App Secret** (Show → password re-entry). It goes ONLY into the
     Vercel env var `META_APP_SECRET` (Step 2) — never into chat, files, or git.
3. **Tech Provider enrolment.** Open **WhatsApp → Embedded Signup**. Meta
   requires the app to belong to a **Solution Partner / Tech Provider** to run
   Embedded Signup — if the page shows a *Become a Tech Provider* /
   registration prompt, complete it (it routes through **Business Settings →
   Business info**; business verification may be requested and can take days —
   start early). Onboarding our *own* business still uses this same enrolment.
4. **Create the Embedded Signup configuration.** **WhatsApp → Embedded
   Signup → Configurations → Create configuration** (in the newer dashboard:
   **Use cases → Connect with customers through WhatsApp → Customize →
   Facebook Login for Business → Configurations → Create**):
   - Name: `MALAC Coexistence`
   - Response type: **Code** (the server exchanges it — do NOT choose Token)
   - Asset requested: the **WhatsApp Business account**, login with the
     **MALAC Store** portfolio
   - If the form offers a **WhatsApp Business app onboarding / coexistence**
     feature toggle, turn it **ON** (current v5 flows enable it by default;
     the connect page also forces it via `extras.featureType`)
   - If a **session logging** option appears, leave it **ON** (required for
     coexistence; the page already sends `sessionInfoVersion: 3`)
   - **Save → copy the Configuration ID.**
5. **Login settings (if shown):** **Facebook Login for Business → Settings** →
   *Client OAuth Login* = **ON**, and add Valid OAuth Redirect URI
   `https://malac1.vercel.app/whatsapp-connect.html` (the JS-SDK flow is
   covered by App Domains; this is belt-and-braces).
6. **App mode:** the owner is an Admin of the app, so the flow works for him
   even in **Development** mode. If Meta refuses with an app-not-live error,
   flip the dashboard's top-bar mode switch to **Live/Published** (needs the
   Privacy Policy URL from item 2).

## Step 2 — Vercel env vars + redeploy

Project **malac** (team `developersbiuros-projects`), **Production**, then
**redeploy** so the server picks them up:

| Variable | Value |
|---|---|
| `META_APP_ID` | `3071438539856171` |
| `META_APP_SECRET` | App Secret from Step 1.2 (Secure Vault / dashboard only) |
| `WHATSAPP_CONFIG_ID` | Configuration ID from Step 1.4 |

Then give the connect page the configuration ID — either paste it into the
`CONFIG_ID` constant at the top of `client/public/whatsapp-connect.html`, or
simply open the page as `/whatsapp-connect.html?config_id=<ID>`.

Sanity check after redeploy: `https://malac1.vercel.app/api/health` → `ok`.

## Step 3 — Remove the leftover app account (do this right before the flow)

The earlier Business-Settings link left an unconverted **"WhatsApp Business
App"** account (`Malac`, ID `963854200108869`, number shows **Offline**) inside
the MALAC Store portfolio. Per Meta's partner troubleshooting for exactly
this state, remove it first — this does **not** delete the number or chats in
the WhatsApp Business app:

1. Meta Business Suite → **Settings** → portfolio **MALAC Store** →
   **Accounts → Messaging accounts / WhatsApp accounts** → the **Malac**
   account → **⋯ → Remove from business portfolio** (repeat if it reappears
   as "disabled").
2. **Wait ~5 minutes.**

## Step 4 — The owner runs the connect flow

1. In the **same browser**, sign in at `https://malac1.vercel.app/admin`
   (Super Admin) — the connect page sends this session token to the endpoint,
   which is Super-Admin-only because its result contains a live access token.
2. Open `https://malac1.vercel.app/whatsapp-connect.html` and click
   **Connect WhatsApp**.
3. In the Meta popup: log in as **Abdullah Sheikh** → choose **connect the
   existing WhatsApp Business app account** → **type the number
   `03236016684` manually** (do not pick a dropdown entry marked "Ineligible").
4. On the phone: open the **WhatsApp Business app** and confirm (enter the
   code shown / tap **Connect to the Business Platform → Confirm**).
   The Business app must be version **2.24.17+** and recently active.
5. Finish the popup and **keep the tab open**: the page captures the returned
   code + the session event (`FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` with
   `waba_id` / `phone_number_id`) and POSTs them to the server automatically.
   A **SUCCESS** block appears with everything Step 5 needs. Check its
   `health` field: `is_on_biz_app: true` + `platform_type: CLOUD_API` is the
   healthy coexistence state. **Never** run any classic SMS "Verify" or
   deregister flow on this number afterwards.

> The signup code is single-use and expires in minutes. If the page reports
> an expired/invalid code, just run the flow again from step 2 of this
> section — do not retry the same result.

## Step 5 — After the flow: wire up sending

1. **Vercel (Production) → redeploy:**
   - `WHATSAPP_PHONE_NUMBER_ID` = `phone_number_id` from the SUCCESS block
   - `WHATSAPP_ACCESS_TOKEN` = `access_token` from the SUCCESS block
2. **Template:** WhatsApp Manager → the converted account → **Message
   templates → Create → Authentication** → name exactly **`malac_otp`**,
   language **en** (must match `WHATSAPP_OTP_TEMPLATE` / `WHATSAPP_OTP_TEMPLATE_LANG`),
   standard authentication body (one `{{1}}` code variable) + **copy-code
   button** → Submit → wait until **Approved**.
3. **Payment method (required before templates can actually be SENT):**
   Business Suite → **Billing → Messaging accounts → Add payment method** for
   this account. Choose the billing currency deliberately — it may not be
   changeable later.
4. **Exactly ONE test OTP:** `/admin` → phone OTP → `03236016684` → confirm
   the code arrives in the WhatsApp Business app. (If it errors, read the
   fresh error in Vercel → Logs before changing anything — do not spam
   retries; rate limits apply.)
5. Keep the history/contact sync window in mind: Meta expects the partner
   (us) to begin sync within **24 hours** of onboarding — for OTP-only use
   there is nothing to sync, but do not leave a half-finished flow overnight.

## Step 6 — Recommended: permanent System User token

The exchanged token works, but Meta's documented production pattern is a
permanent System User token. To switch (optional, do it once things work):

1. Business Settings → **Users → System users** → **`malac_api`**.
2. **Assign Assets** — BOTH, under **Full control**:
   - the **app** `3071438539856171` → *Manage app*
   - the **converted WhatsApp account** → *Manage WhatsApp Business accounts*
3. **Generate token** → app `3071438539856171` → permissions
   `business_management`, `whatsapp_business_messaging`,
   `whatsapp_business_management` → copy it once → replace
   `WHATSAPP_ACCESS_TOKEN` on Vercel → redeploy → one confirmation OTP.
   (Assign assets BEFORE generating — a token generated first fails with
   permission errors even though it looks valid.)

## Ongoing / troubleshooting

- **Keep the Business app alive:** open it on the phone at least every
  ~14 days. Inactivity (`PRIMARY_INACTIVITY`) disconnects coexistence and the
  number drops back to **Offline** — recovery is re-running Step 4.
- **#133010 "Account not registered"** after the flow = the sending token/IDs
  belong to a different account, or Step 5.1 wasn't redeployed. Verify the
  env values are the converted account's IDs, not the old WABA's
  (`1139809421780914` / `1312908995249956` are the OLD, pre-conversion IDs).
- **Number shows Offline in the converted account** = repeat Step 3's check:
  a leftover "WhatsApp Business App" account may still be hanging around.
- **In-flow "not eligible" (#3441045)** = Meta wants more recent activity in
  the Business app on that number; use it normally for a while and retry.
- **Never** delete the number from the WhatsApp Business app and never call
  the Deregister API on it — either one breaks coexistence by design.
