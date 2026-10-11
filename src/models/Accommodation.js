import mongoose from "mongoose";

const accommodationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pass: { type: mongoose.Schema.Types.ObjectId, ref: "Pass", required: true },
    hostel: { type: String, trim: true },
    floor: { type: String, trim: true },
    room: { type: String, trim: true },
    bed: { type: String, trim: true },
    checkInInfo: { type: String },
    checkOutInfo: { type: String },
    // Admin who made the assignment
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Accommodation", accommodationSchema);