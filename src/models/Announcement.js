import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    // General, Competition, Schedule, Important, Accommodation, Merchandise, Emergency
    category: { type: String, default: "General" },
    priority: { type: String, enum: ["normal", "high"], default: "normal" },
    // Max 3 pinned at once, enforce in the controller
    isPinned: { type: Boolean, default: false },
    image: { type: String },
    link: { type: String },
    targetAudience: {
      scope: {
        type: String,
        enum: [
          "everyone",
          "competition_participants",
          "specific_competition",
          "specific_teams",
          "specific_users",
          "pass_holders",
        ],
        default: "everyone",
      },
      competition: { type: mongoose.Schema.Types.ObjectId, ref: "Competition" },
      teams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
      users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },
    // Hidden from the site after this, but kept in the database
    expiresAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Announcement", announcementSchema);