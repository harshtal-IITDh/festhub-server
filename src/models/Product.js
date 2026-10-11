import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({ size: String }, { _id: true });

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    images: [String],
    price: { type: Number, required: true },
    variants: [variantSchema],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);