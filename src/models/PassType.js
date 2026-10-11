import mongoose from "mongoose";

const passTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    validityStart: { type: Date, required: true },
    validityEnd: { type: Date, required: true },
    includesAccommodation: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("PassType", passTypeSchema);