import mongoose from "mongoose";

const competitionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    participationType: { type: String, enum: ["solo", "team"], required: true },
    // Only used when participationType is "team"
    minTeamSize: { type: Number },
    maxTeamSize: { type: Number },
    // Solo: max participants. Team: max completed teams.
    maxCapacity: { type: Number, required: true },
    registrationStart: { type: Date, required: true },
    registrationEnd: { type: Date, required: true },
    competitionDateTime: { type: Date, required: true },
    venue: { type: String, trim: true },
    passRequired: { type: mongoose.Schema.Types.ObjectId, ref: "PassType" },
    rules: { type: String },
    status: {
      type: String,
      enum: [
        "draft",
        "published",
        "registration_open",
        "registration_closed",
        "ongoing",
        "completed",
        "cancelled",
      ],
      default: "draft",
    },
    // Denormalized counters, update on confirm/cancel
    currentSoloCount: { type: Number, default: 0 },
    currentCompletedTeamCount: { type: Number, default: 0 },
    // Admin manual override for "Live Now"
    isLive: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Competition", competitionSchema);