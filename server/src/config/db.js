import mongoose from "mongoose";
import env from "./env.js";

export async function connectDB() {
  mongoose.set("strictQuery", true);
  // maxPoolSize 10: under concurrent load, requests reuse pooled
  // connections instead of queueing behind the driver's small default
  // pool handshake-by-handshake.
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 });
  console.log(`[MALAC] MongoDB connected: ${mongoose.connection.host}`);
}
export default connectDB;
