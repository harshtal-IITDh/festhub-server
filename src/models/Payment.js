import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    purpose: { type: String, enum: ["pass", "merchandise"], required: true },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: "Registration" },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    merchandiseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "MerchandiseOrder" },
    // Locked at creation. Never edit after it is set.
    amount: { type: Number, required: true },
    // Current UTR attempt
    utr: { type: String, trim: true },
    // Every UTR ever submitted, including rejected ones
    utrHistory: [
      {
        utr: String,
        submittedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ["pending", "approved", "rejected"] },
        rejectionReason: String,
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reviewedAt: Date,
      },
    ],
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    refundStatus: {
      type: String,
      enum: ["not_applicable", "to_be_refunded", "refunded"],
      default: "not_applicable",
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);