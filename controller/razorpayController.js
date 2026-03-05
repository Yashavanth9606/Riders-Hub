const Razorpay = require('razorpay');
const crypto = require('crypto');

let razorpay;

// Initialize Razorpay function
const initializeRazorpay = () => {
  try {
    // Check if keys are available
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('❌ Razorpay keys are missing in .env file');
      console.error('Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file');
      return false;
    }

    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    console.log('✅ Razorpay initialized successfully');
    console.log('Key ID:', process.env.RAZORPAY_KEY_ID);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Razorpay:', error.message);
    return false;
  }
};

// Initialize Razorpay
const isRazorpayInitialized = initializeRazorpay();

// @desc    Create Razorpay order
// @route   POST /api/payments/create-order
// @access  Private
const createOrder = async (req, res) => {
  try {
    // Check if Razorpay is initialized
    if (!isRazorpayInitialized || !razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured properly. Please check server logs.'
      });
    }

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    console.log('Creating Razorpay order for amount (paise):', amount);

    const options = {
      amount: amount,
      currency: 'INR',
      receipt: 'receipt_' + Date.now(),
      payment_capture: 1,
      notes: {
        payment_for: 'Motorcycle accessories'
      }
    };

    const order = await razorpay.orders.create(options);

    console.log('Razorpay order created:', order.id);

    res.json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order',
      error: error.message
    });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/payments/verify-payment
// @access  Private
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    console.log('Verifying payment:', {
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id
    });

    // Generate signature for verification
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    console.log('Signature verification:', {
      expected: expectedSignature,
      received: razorpay_signature
    });

    // Verify signature
    if (expectedSignature === razorpay_signature) {
      // Payment successful
      console.log('Payment verified successfully for order:', razorpay_order_id);

      res.json({
        success: true,
        message: 'Payment verified successfully',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id
      });
    } else {
      console.error('Invalid payment signature');
      res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment
};