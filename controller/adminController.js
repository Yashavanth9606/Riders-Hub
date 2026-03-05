const Admin = require('../models/Admin');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_123';

// Generate admin JWT (has isAdmin: true flag)
const generateAdminToken = (id) => {
  return jwt.sign({ id, isAdmin: true }, JWT_SECRET, { expiresIn: '7d' });
};

// ─── @desc  Register new admin
// ─── @route POST /api/admin/register
// ─── @access Public (protect with secret code in production)
const registerAdmin = async (req, res) => {
  try {
    const { fullName, email, password, secretCode } = req.body;

    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'RIDERS_ADMIN_2024';
    if (secretCode !== ADMIN_SECRET) {
      return res.status(403).json({ message: 'Invalid admin secret code' });
    }

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const exists = await Admin.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: 'Admin with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await Admin.create({ fullName, email, password: hashedPassword });

    res.status(201).json({
      _id: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      role: 'admin',
      token: generateAdminToken(admin._id),
    });
  } catch (error) {
    console.error('Admin register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── @desc  Login admin
// ─── @route POST /api/admin/login
// ─── @access Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      role: 'admin',
      token: generateAdminToken(admin._id),
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── @desc  Get all products
// ─── @route GET /api/admin/products
// ─── @access Admin
const getProducts = async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category && category !== 'all') query.category = category;
    const products = await Product.find(query).sort({ category: 1, id: 1 });
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── @desc  Add new product
// ─── @route POST /api/admin/products
// ─── @access Admin
const addProduct = async (req, res) => {
  try {
    const { name, price, originalPrice, discount, image, category, bikeType } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ message: 'name, price and category are required' });
    }

    const categoryPrefixes = {
      helmets: 100, gloves: 200, jackets: 300, boots: 400, luggage: 500, protection: 600,
    };
    const prefix = categoryPrefixes[category] || 700;
    const lastInCategory = await Product.findOne({ id: { $gte: prefix, $lt: prefix + 100 } }).sort({ id: -1 });
    const newId = lastInCategory ? lastInCategory.id + 1 : prefix + 1;

    const product = await Product.create({
      id: newId,
      name,
      price: parseFloat(price),
      originalPrice: parseFloat(originalPrice) || parseFloat(price),
      discount: discount || '',
      image: image || '📦',
      category,
      bikeType: bikeType || '',
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── @desc  Update product
// ─── @route PUT /api/admin/products/:id
// ─── @access Admin
const updateProduct = async (req, res) => {
  try {
    const { name, price, originalPrice, discount, image, category, bikeType } = req.body;

    const product = await Product.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      {
        name,
        price: parseFloat(price),
        originalPrice: parseFloat(originalPrice) || parseFloat(price),
        discount: discount || '',
        image,
        category,
        bikeType: bikeType || '',
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── @desc  Delete product
// ─── @route DELETE /api/admin/products/:id
// ─── @access Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ id: parseInt(req.params.id) });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ success: true, message: `"${product.name}" deleted successfully` });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── @desc  Get all orders (all users)
// ─── @route GET /api/admin/orders
// ─── @access Admin
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 }).limit(500);
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── @desc  Update order status
// ─── @route PUT /api/admin/orders/:id/status
// ─── @access Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const VALID = ['Pending', 'Order Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    if (!VALID.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: 'Order not found' });

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── @desc  Get dashboard stats
// ─── @route GET /api/admin/stats
// ─── @access Admin
const getStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const delivered = await Order.countDocuments({ status: 'Delivered' });
    const pending = await Order.countDocuments({ status: { $in: ['Order Placed', 'Processing'] } });
    const openTickets = await Ticket.countDocuments({ status: { $in: ['open', 'in_progress'] } });

    const revenueData = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalUSD' } } }
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    res.json({
      success: true,
      stats: { totalProducts, totalOrders, delivered, pending, totalRevenue, openTickets },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── TICKET / CUSTOMER SUPPORT ───────────────────────────────────────────────

// ─── @desc  Get all tickets
// ─── @route GET /api/admin/tickets
// ─── @access Admin
const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({})
      .populate('userId', 'fullName email')
      .sort({ updatedAt: -1 });
    res.json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── @desc  Reply to a ticket
// ─── @route POST /api/admin/tickets/:id/reply
// ─── @access Admin
const replyToTicket = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Reply text required' });

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        $push: { messages: { sender: 'admin', text: text.trim() } },
        status: 'in_progress',
      },
      { new: true }
    ).populate('userId', 'fullName email');

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── @desc  Update ticket status
// ─── @route PUT /api/admin/tickets/:id/status
// ─── @access Admin
const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const VALID = ['open', 'in_progress', 'resolved', 'closed'];
    if (!VALID.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('userId', 'fullName email');

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
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
};