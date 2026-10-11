import mongoose from "mongoose";

const roundSchema = new mongoose.Schema(
  {
    competition: { type: mongoose.Schema.Types.ObjectId, ref: "Competition", required: true },
    name: { type: String, required: true, trim: true },
    roundNumber: { type: Number, required: true },
    date: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["upcoming", "live", "completed", "cancelled"],
      default: "upcoming",
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Venue is not stored here, rounds use the Competition's venue
export default mongoose.model("Round", roundSchema);