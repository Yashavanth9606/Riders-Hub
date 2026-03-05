const express = require('express');
const router = express.Router();
const {
  registerAdmin,
  loginAdmin,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getAllOrders,
  updateOrderStatus,
  getStats,
  getAllTickets,
  replyToTicket,
  updateTicketStatus,
} = require('../controller/adminController');
const { protectAdmin } = require('../middleware/adminMiddleware');

// ── Auth (public) ─────────────────────────────────────────────────────────────
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

// ── Products (admin protected) ────────────────────────────────────────────────
router.get('/products', protectAdmin, getProducts);
router.post('/products', protectAdmin, addProduct);
router.put('/products/:id', protectAdmin, updateProduct);
router.delete('/products/:id', protectAdmin, deleteProduct);

// ── Orders (admin protected) ──────────────────────────────────────────────────
router.get('/orders', protectAdmin, getAllOrders);
router.put('/orders/:id/status', protectAdmin, updateOrderStatus);

// ── Stats (admin protected) ───────────────────────────────────────────────────
router.get('/stats', protectAdmin, getStats);

// ── Support Tickets (admin protected) ────────────────────────────────────────
router.get('/tickets', protectAdmin, getAllTickets);
router.post('/tickets/:id/reply', protectAdmin, replyToTicket);
router.put('/tickets/:id/status', protectAdmin, updateTicketStatus);

module.exports = router;