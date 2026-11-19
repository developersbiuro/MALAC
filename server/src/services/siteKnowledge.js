// Full website knowledge for the MALAC Assistant — the store's own
// published pages (About, FAQ, Terms, Privacy Policy, blog) and live
// features (Invite a Friend, coupons, app, account tools), written out
// so the AI can answer anything a customer could read on the website.
// Extracted from the live site content on 2026-11-19 (owner asked for
// the bot to be "trained on the whole website"). Keep this in step
// with the pages when they change; delivery fees and COD state are NOT
// repeated here — they come from the live STORE SETTINGS block.
export const SITE_KNOWLEDGE = `ABOUT THE STORE:
- MALAC stands for "M.A Luxury Apparel Collection". The M.A are the initials of the founder, Muhammad Abdullah, so the store carries its founder's own name. The name is also written as MalacPK. In Urdu script the name is written مالاک (spoken in two syllables).
- MALAC is an online-only store from Faisalabad, Punjab, Pakistan. There is no physical shop and no counter to visit — everything is sold through the website (www.malac.pp.ua) and delivered to the customer's door anywhere in Pakistan.
- It was founded by Muhammad Abdullah so customers in every Pakistani city — not just the big ones — could order the same products at the same prices without travelling to a bazaar.
- Trust: MALAC is run by a real team in Faisalabad and a person checks every order before it is packed — nothing is dispatched on autopilot. Customers who feel paying in advance is risky can choose Cash on Delivery and pay only when the parcel is in their hands.

CATEGORIES (the store has exactly these six):
- Men's Fashion, Women's Fashion, Watches, Eyewear, Bags & Accessories, and Mobile Accessories.
- Inside Watches and Eyewear, customers can filter by Men / Women / Kids / Unisex. Inside Mobile Accessories: Chargers & Cables, Power Banks, Audio, Covers & Protectors, Holders & Stands.
- The Shop page shows everything; each category also has its own page. Prices are always in Pakistani Rupees and shown before ordering.

ACCOUNTS & ORDERING:
- Browsing is free without an account, but an account is required to use the cart, wishlist, order tracking, chat, and to place an order.
- Sign-up is one of three ways: mobile number + password (verified by a WhatsApp OTP), email + password (verified by an email OTP), or Continue with Google. Sign-in accepts the email or the phone number with the password.
- To order: add items to the cart, open checkout, confirm the delivery address saved on the account (a saved address is applied automatically), pick a payment method, and place the order. A checkout email address is required on every order. The team then confirms the order, packs it and hands it to the courier; the customer can follow every step from My Orders.
- Every order gets an order ID like MLC-XXXXXX. Order statuses the customer sees: Pending, Processing (the team has confirmed/packed it), Shipped, Out for Delivery, Delivered, Cancelled, Returned.
- Customers are notified at the big moments — order placed, shipped, out for delivery, delivered — by app notification, email and WhatsApp.
- Forgotten password: the Login page's "Forgot password" sends a reset link by email. In Profile Settings (My Account) the customer can change their name, password and saved addresses, and can change their email or phone number after an OTP verification.

PAYMENT (full rules):
- Cash on Delivery: available all over Pakistan with no extra fee — pay the courier in cash when the parcel arrives (unless the STORE SETTINGS block says COD is currently unavailable).
- Advance payment: JazzCash / Easypaisa / Meezan Bank / NayaPay / SadaPay / FirstPay — HBL Microfinance Bank (account details are in the STORE FACTS above). At checkout the customer sends the order total to the account shown, enters the transaction details and uploads the payment screenshot with the order. The team verifies the transfer before the order is packed; if a payment cannot be matched, the team contacts the customer first and never dispatches an unverified paid order.
- There is NO card payment option.
- Prices are in PKR. If a pricing error ever affects an order, the team contacts the customer before dispatch and the customer may cancel for a full refund of any amount already paid.
- Security: MALAC never asks for a password or one-time code outside the sign-in and checkout flow on this website. Customers should never share their password or OTP codes with anyone.

DELIVERY:
- Delivery is nationwide — Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Hyderabad, Sialkot, Gujranwala and smaller towns — through TCS, Leopards, Trax and PostEx. If a courier can reach the address, MALAC can deliver there.
- Standard delivery normally takes 2–5 working days; Express (where offered at checkout) takes 1–2 working days. The exact charge for an order is always shown before it is placed — no surprise fees at the door beyond what checkout showed (plus the order total itself on COD orders). Fees and the free-shipping threshold are in the STORE SETTINGS block.
- Tracking: the Track Order page takes the order ID or the phone number used for the order; signed-in customers can also open My Orders at any time.

RETURNS, REFUNDS & CANCELLATION (the store's published terms):
- Returns: covered in the STORE FACTS above (7 days, damaged/defective/incorrect only, unused in original packaging, inspection first, then replacement or refund; no change-of-mind returns; some hygiene items cannot be returned).
- Cancellation: a customer can cancel free of charge from My Orders while the order is Pending or Processing (before it is packed for dispatch) — open the order, use the Cancel Order option and give a reason. Once an order has shipped it can no longer be cancelled. If a cancelled order was already paid by JazzCash or Easypaisa, the amount is refunded to the same account after verification.

COUPONS:
- WELCOME10 — 10% off for new customers on their first order.
- MALAC500 — Rs. 500 off on orders of Rs. 5,000 or more.
- Only one coupon can be applied per order; coupons have their own minimum-spend and expiry conditions, no cash value, and entering a valid code in the cart or at checkout shows the saving straight away before paying.

INVITE A FRIEND (referral programme):
- Every signed-in customer has a personal invite link in My Account → Invite a Friend, which they can copy or share on WhatsApp.
- A friend who joins through the link gets FREE delivery on their first order.
- The inviter earns a Rs. 100 coupon (usable on orders of Rs. 500 or more) when the friend creates an account, and a Rs. 300 coupon (usable on orders of Rs. 2,000 or more) when the friend's first order of Rs. 1,500 or more is placed. If that order is cancelled or returned, an unused Rs. 300 coupon is switched off again.

REVIEWS & QUESTIONS:
- After an order is delivered, the customer can review the products in it from My Orders / the product page; reviews appear on the store after the team approves them. Customers can also ask questions on product pages.

SUPPORT:
- Fastest contact: WhatsApp +92 323 6016684. For complaints or anything formal: email info@malac.pp.ua (the support/complaints inbox read by the team).
- In this chat, writing "support ticket" starts a support request: the system takes the customer's details and order information and passes it to the team; the customer can see their tickets under My Orders → My Support Tickets. The assistant itself never approves returns or refunds — the team decides.

MOBILE APP:
- The MALAC Android app can be downloaded from the website (the download button) — it is the same store in app form: browse, order, track, and get a phone notification at every step of the order's journey, plus offers. iPhone users can use the full website in the browser and add it to their home screen.
- A short built-in guide ("How MALAC Works") shows new customers the main buttons step by step; it can be replayed from My Account.

PRIVACY (short version of the published policy):
- MALAC collects account details (name, email, phone), order information and delivery addresses, payment proof for transfer orders (screenshot and transaction details, used only to verify the payment), and reviews/questions the customer posts.
- Information is shared only with what is needed to fulfil the order — for example name, phone and address go to the courier delivering the parcel. MALAC does not sell personal information to third parties.
- Customers may ask to access, correct or delete their personal information at any time via info@malac.pp.ua or WhatsApp; identity may be verified first to protect the account.
- The store uses browser local storage to keep the cart, wishlist and sign-in session working; it is not used to build advertising profiles.

HOW TO DO EVERYTHING ON THE WEBSITE (when a customer asks how or where to do something, give these exact steps, in order — the phone layout has a bottom bar with Home, Categories, Track Order, Cart and Account; on a computer the same things are in the top header):
- Change or add a delivery address: (1) Neeche "Account" tab kholein (computer par upar "Your Account"). (2) "Profile Settings" par jayein. (3) Address Book me apna saved address edit karein ya naya address add karke save kar dein. (4) Checkout par saved address khud apply ho jata hai — wahan bhi order se pehle address confirm/change kar sakte hain.
- Change name or password: Account → Profile Settings → name badal kar save karein, ya password wale hisse se naya password set karein.
- Change email or phone number: Account → Profile Settings → email/phone change karein → wahan ek OTP ayega (email par email OTP, phone par WhatsApp OTP) → OTP darj karne se change confirm ho jata hai.
- Password bhool jayein: Login page → "Forgot password" → apna email dein → email me aya link khol kar naya password bana lein (link 60 minute valid hota hai).
- Order track karna: Neeche "Track Order" tab (ya upar header me Track Order) → apna Order ID (MLC-XXXXXX) ya order wala phone number likhein → order ki mojooda status aur tafseel khul jayegi. Signed-in customers "My Orders" me apne tamam orders bhi dekh sakte hain.
- Order cancel karna: Account → My Orders → jo order cancel karna hai use kholein → "Cancel Order" button → wajah select karke confirm kar dein. Ye sirf Pending ya Processing status par hota hai; parcel ship ho jaye to cancel nahi hota.
- Coupon lagana: Cart page ya checkout par coupon code wala khana (field) hota hai — code likh kar apply karein, discount usi waqt total me nazar aa jayega (masalan WELCOME10).
- Advance payment ka screenshot: Checkout par JazzCash/Easypaisa waghera select karein → dikhaye gaye account par raqam bhejein → usi checkout screen par transaction details aur payment ka screenshot upload karke order place kar dein.
- Product dhundhna: Upar wali search bar me naam likhein, ya neeche "Categories" tab se category kholein. Watches aur Eyewear ke pages par Men / Women / Kids / Unisex ke gol (circle) filters hain — un par tap karne se sirf wahi range nazar ati hai. Homepage par Flash Sale wala hissa bhi hai jahan waqt ke sath chalti hui deals aur countdown nazar ata hai.
- Wishlist: Kisi product par dil (heart) wale nishan par tap karein to wo wishlist me save ho jata hai; wishlist upar header ke heart icon se ya Account se khulti hai. Cart ke liye bag (theli) wala icon hai — upar header me bhi aur neeche Cart tab me bhi.
- Review dena: Order deliver ho jane ke baad My Orders se us product par, ya product page par, apna review likh sakte hain; review team ki approval ke baad store par nazar ata hai. Product page par sawal bhi pooch sakte hain.
- Support ticket dekhna: Account → My Orders → neeche "My Support Tickets" me apne tamam tickets aur un ki status nazar ati hai.
- Dost ko invite karna: Account → "Invite a Friend" → apna personal link copy karein ya WhatsApp par share kar dein.
- Website ka guide dobara dekhna: Account → "How MALAC Works — Guide" — ye naya customer ko har button step by step dikhata hai.
- App download karna: Homepage par download wala button hai (Android app). iPhone par browser me hi website khol kar "Add to Home Screen" kar lein.
- Policies parhna: Page ke neeche (footer) me Terms, Policy (Privacy), FAQ aur About ke links hain; Blog bhi footer aur header se khulta hai.

COMMON PROBLEMS & THEIR SOLUTIONS (troubleshooting — har aam masle ka hal):
- OTP nahi aa raha: Email OTP ke liye inbox ke sath Spam/Junk folder bhi check karein, 1–2 minute intezar karke "resend" kar sakte hain. WhatsApp OTP ke liye ye pakka karein ke number wahi hai jo account par hai aur WhatsApp us par active hai. Phir bhi na aye to WhatsApp support (+92 323 6016684) par rabta karein.
- Login nahi ho raha: Pehle ye check karein ke email ya phone number bilkul sahi likha hai aur password me koi ghalti nahi. Password bhool gaye hain to Login page par "Forgot password" se email link ke zariye naya password bana lein. Google se account banaya tha to "Continue with Google" hi use karein.
- Order place nahi ho raha: Order ke liye login lazmi hai; checkout par email address dena bhi lazmi hai; delivery address save/chuna hua hona chahiye; aur advance payment wale tareeqe par screenshot upload karna lazmi hai. Ye teen cheezein puri hon to order place ho jata hai.
- Coupon kaam nahi kar raha: Code bilkul sahi likhein (masalan WELCOME10). WELCOME10 sirf naye customer ke pehle order par hai; MALAC500 ke liye order Rs. 5,000 ya zyada ka hona chahiye; ek order par sirf ek coupon lagta hai; expired code nahi chalta.
- Free delivery nahi lagi: Free delivery sirf Standard delivery par hai aur sirf Rs. 3,000 ya zyada ke order par. Express par free nahi — express select karne par us ki fee lagegi.
- Order late lag raha hai: Standard delivery 2–5 working days leti hai (kabhi sheher/courier ki wajah se thora zyada). Pehle Track Order se mojooda status dekhein; waqt guzar jaye aur parcel na mile to yahin support ticket bana dein ya WhatsApp par rabta karein — team courier se pata kar ke batati hai.
- Ghalat size/product select ho gaya: Order ship hone se pehle (Pending/Processing) My Orders se cancel karke sahi order dobara kar dein. Ship ho chuka hai to support se rabta karein.
- Payment bhej di lekin order confirm nahi hua: Advance payment team khud verify karti hai — thora waqt lag sakta hai. Screenshot aur transaction details checkout par sahi upload hue hon to fikar na karein; team payment match na kar paye to khud rabta karti hai, aur unverified paid order kabhi dispatch nahi hota.
- Page ya app slow/load nahi ho raha: Page refresh karke dobara try karein; app use kar rahe hain to app band karke dobara kholein. Masla barqarar rahe to WhatsApp par screenshot ke sath bata dein.
- App install nahi ho raha (Android): Website se download ke baad phone browser ko "install unknown apps" ki ijazat mang sakta hai — settings me us browser ko allow kar dein, phir install ho jayega.

BLOG (guides published on the store's blog at /blog — point customers to the matching guide when their question matches):
- "Online Shopping in Pakistan, Without the Worry: How MALAC Earns Your Trust" (/blog/online-shopping-in-pakistan-malac) — how MALAC works and why it can be trusted.
- "Cash on Delivery in Pakistan: Order Online and Pay Only When the Parcel Is in Your Hands" (/blog/cash-on-delivery-online-shopping-pakistan) — how COD works and when advance payment makes sense.
- "Winter Shopping in Pakistan: What to Buy First, and How Not to Waste Money on It" (/blog/winter-shopping-in-pakistan-malac) — the winter range and what to buy first.
- "How to Choose the Right Watch in Pakistan: A Simple Guide for Men and Women" (/blog/how-to-choose-a-watch-in-pakistan-malac) — straps, dials, analog vs smart, and the men's and women's watch ranges with prices.`;
