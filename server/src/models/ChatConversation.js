import mongoose from "mongoose";

// One MALAC Assistant chat session (master-prompt §10/§12). Messages are
// embedded so a whole conversation reads/writes as ONE document — the
// volume here is one store's support chat, not a social feed. Records
// are never deleted by the app (owner's data-retention rule); a session
// is only marked closed / admin-taken-over.
//
// Isolation: `user` is set ONLY from a verified JWT on the server — a
// client-supplied id is never trusted. Guests carry a random client
// sessionId; their rows are readable by staff but never linked to an
// account they don't own.
const chatMessageSchema = new mongoose.Schema({
  from: { type: String, enum: ["user", "bot", "admin"], required: true },
  text: { type: String, default: "" },
  products: [{
    slug: String, title: String, category: String,
    image: String, price: Number, wasPrice: Number,
    _id: false,
  }],
  at: { type: Date, default: Date.now },
}, { _id: false });

const chatConversationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  customerName: { type: String, default: "" },
  status: { type: String, enum: ["open", "closed"], default: "open", index: true },
  // Set when a staff member takes the conversation over from the admin
  // panel: the bot then stays silent and only staff replies are added.
  takenOverBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  messages: { type: [chatMessageSchema], default: [] },
  lastMessageAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

// Keep the embedded array bounded: a support chat never needs more
// than the most recent few hundred turns kept verbatim.
chatConversationSchema.methods.appendMessages = function (list) {
  for (const m of list) this.messages.push(m);
  if (this.messages.length > 300) {
    this.messages = this.messages.slice(-300);
  }
  this.lastMessageAt = new Date();
};

export default mongoose.model("ChatConversation", chatConversationSchema);
