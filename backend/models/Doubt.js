// backend/models/Doubt.js
import mongoose from "mongoose";

const doubtSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  queryType: { type: String, enum: ["text", "image", "voice"], default: "text" },
  queryText: { type: String, required: true },
  subject: { type: String, required: true },
  topic: { type: String, default: "Unclassified" },
  solutionSteps: [
    { step: Number, text: String, concept: String }
  ],
  confidence: { type: Number, default: 0.9 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Doubt", doubtSchema);
