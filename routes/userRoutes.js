const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  getOrders,
  createOrder,
  getProducts,
  initializeProducts,
  createTicket,
  getMyTickets,
  replyToMyTicket,
} = require('../controller/userController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/products', getProducts);
router.post('/products/init', initializeProducts);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

// Cart routes
router.get('/cart', protect, getCart);
router.post('/cart/add', protect, addToCart);
router.put('/cart/update/:id', protect, updateCartItem);
router.delete('/cart/remove/:id', protect, removeFromCart);

// Order routes
router.get('/orders', protect, getOrders);
router.post('/orders/create', protect, createOrder);

// Support ticket routes
router.post('/tickets', protect, createTicket);
router.get('/tickets', protect, getMyTickets);
router.post('/tickets/:id/reply', protect, replyToMyTicket);

module.exports = router;