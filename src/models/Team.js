import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["invited", "accepted", "rejected", "removed"],
      default: "invited",
    },
    isLeader: { type: Boolean, default: false },
    invitedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },
    // invitedAt + 8 hours
    invitationExpiresAt: { type: Date },
    // max 2 retries
    retryCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    competition: { type: mongoose.Schema.Types.ObjectId, ref: "Competition", required: true },
    teamLeader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    teamName: { type: String, trim: true },
    members: [teamMemberSchema],
    status: {
      type: String,
      enum: ["forming", "finalized", "eliminated", "cancelled"],
      default: "forming",
    },
    // Locks membership
    isFinalized: { type: Boolean, default: false },
    finalizedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Team", teamSchema);