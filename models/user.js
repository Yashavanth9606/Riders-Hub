const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  bikeModel: { type: String, default: 'Sports Bike (600cc+)' },
  phoneNumber: { type: String, default: '' },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: 'USA' }
  },
  stats: {
    rides: { type: Number, default: 42 },
    distance: { type: Number, default: 1250 },
    points: { type: Number, default: 2850 },
    badges: { type: Number, default: 8 }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);