const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id:            { type: Number, required: true, unique: true },
  name:          { type: String, required: true },
  price:         { type: Number, required: true },
  image:         { type: String, default: '📦' },
  discount:      { type: String, default: '' },
  originalPrice: { type: Number },
  category:      { type: String, required: true },
  bikeType:      { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);