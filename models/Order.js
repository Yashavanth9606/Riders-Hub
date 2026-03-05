const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  id: Number,
  name: String,
  price: Number,
  quantity: Number,
  image: String,
  category: String,
  bikeType: String
});

const shippingInfoSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,
  cardNumber: String,
  expiryDate: String,
  cvv: String
});

const paymentSchema = new mongoose.Schema({
  payment_id: String,
  order_id: String,
  signature: String,
  method: String,
  last4: String,
  vpa: String,
  bank: String
});

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  total: Number,
  totalUSD: Number,
  totalINR: Number,
  shippingInfo: shippingInfoSchema,
  payment: paymentSchema,
  paymentMethod: { type: String, default: 'razorpay' },
  status: { type: String, default: 'Order Placed' },
  estimatedDelivery: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);