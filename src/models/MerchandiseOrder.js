import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    // _id of the subdocument in Product.variants
    variant: { type: mongoose.Schema.Types.ObjectId },
    quantity: { type: Number, required: true, default: 1 },
    // Price at time of purchase, so later price changes do not affect history
    priceAtPurchase: { type: Number, required: true },
  },
  { _id: false }
);

const merchandiseOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    fulfillmentType: { type: String, enum: ["collect", "ship"], required: true },
    status: {
      type: String,
      enum: ["paid", "processing", "ready_for_pickup", "collected", "shipped", "delivered"],
      default: "paid",
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("MerchandiseOrder", merchandiseOrderSchema);