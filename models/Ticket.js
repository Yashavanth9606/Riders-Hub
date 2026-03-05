const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['user', 'admin'], required: true },
  text:   { type: String, required: true },
  sentAt: { type: Date, default: Date.now },
});

const ticketSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId:   { type: String, default: '' },
  subject:   { type: String, required: true },
  type:      { type: String, enum: ['order_tracking', 'cancel_order', 'complaint', 'other'], default: 'other' },
  status:    { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  messages:  [messageSchema],
  priority:  { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);