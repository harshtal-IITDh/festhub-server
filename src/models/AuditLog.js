import mongoose from "mongoose";

// Append-only. Never edit or delete.
const auditLogSchema = new mongoose.Schema(
  {
    // e.g. PAYMENT_APPROVED, PASS_REISSUED, COMPETITION_DELETED
    action: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    targetType: { type: String },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);