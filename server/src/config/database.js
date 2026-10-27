import mongoose from "mongoose";

export async function connectDatabase(uri) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 2500,
    connectTimeoutMS: 2500
  });
  return mongoose.connection;
}
