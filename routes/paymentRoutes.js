const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment
} = require('../controller/razorpayController');
const { protect } = require('../middleware/authMiddleware');

// Payment routes (protected)
router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);

module.exports = router;