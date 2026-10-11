import mongoose from "mongoose";

const sponsorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    logo: { type: String },
    website: { type: String },
    // e.g. Title Sponsor, Gold, Silver
    category: { type: String },
    displayOrder: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Sponsor", sponsorSchema);