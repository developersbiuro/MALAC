// Daraz-style order buckets for the My Account hub and the My Orders
// filter. ONE definition drives both the hub's counts and the filtered
// list (via /orders?bucket=<key>) so the two can never disagree.
const OPEN_STATUSES = ["Pending", "Confirmed", "Packed", "Shipped", "OutForDelivery", "Delivered"];

export const ORDER_BUCKETS = [
  {
    key: "topay",
    label: "To Pay",
    // Manual-transfer orders whose payment is not Paid yet (COD is paid
    // at the door, so it never sits in To Pay).
    test: (o) => o.paymentMethod !== "COD" && o.paymentStatus !== "Paid" && OPEN_STATUSES.includes(o.status),
  },
  {
    key: "toship",
    label: "To Ship",
    test: (o) => ["Pending", "Confirmed", "Packed"].includes(o.status),
  },
  {
    key: "toreceive",
    label: "To Receive",
    test: (o) => o.status === "Shipped" || o.status === "OutForDelivery",
  },
  {
    key: "toreview",
    label: "To Review",
    test: (o) => o.status === "Delivered",
  },
  {
    key: "returns",
    label: "Returns & Cancellations",
    shortLabel: "Returns",
    test: (o) => o.status === "Returned" || o.status === "Cancelled" || !!o.returnRequestedAt,
  },
];

export const bucketByKey = (key) => ORDER_BUCKETS.find((b) => b.key === key) || null;
