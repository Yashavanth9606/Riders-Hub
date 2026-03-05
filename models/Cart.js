const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  id: Number,
  name: String,
  price: Number,
  quantity: Number,
  image: String,
  category: String
});

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [cartItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);