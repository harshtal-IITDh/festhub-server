import mongoose from "mongoose";

const notificationTemplateSchema = new mongoose.Schema(
  {
    // Template identifier, e.g. "PAYMENT_APPROVED"
    key: { type: String, required: true, unique: true, trim: true },
    subject: { type: String, required: true },
    // Supports placeholders like {{name}}, {{competition}}
    body: { type: String, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("NotificationTemplate", notificationTemplateSchema);