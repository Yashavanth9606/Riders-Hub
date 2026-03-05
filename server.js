/**
 * server.js – Rider's Hub backend  (DEFINITIVE VERSION)
 */

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
require('dotenv').config();

const app      = express();
const PORT     = process.env.PORT     || 5000;
const MONGO    = process.env.MONGO_URI || 'mongodb://localhost:27017/smartcart';
const SECRET   = process.env.JWT_SECRET || 'riders_hub_secret_2024';

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// ── DB ────────────────────────────────────────────────────────────────────────
mongoose.connect(MONGO)
  .then(() => console.log('✅ MongoDB connected →', MONGO))
  .catch(e  => { console.error('❌ MongoDB failed:', e.message); process.exit(1); });

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════
const userSchema = new mongoose.Schema({
  fullName:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  phone:     { type: String, default: '' },
  bikeType:  { type: String, default: 'Sports Bike (600cc+)' },
  role:      { type: String, enum: ['user','admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model('User', userSchema);

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    id: mongoose.Schema.Types.Mixed,
    name: String, price: Number, quantity: Number,
    category: String, bikeType: String, image: String,
    discount: String, originalPrice: Number,
  }],
  shippingInfo: { fullName: String, email: String, phone: String, address: String, city: String, state: String, zipCode: String },
  payment:      { payment_id: String, order_id: String, signature: String, method: { type: String, default: 'Razorpay' } },
  totalUSD:  Number,
  totalINR:  Number,
  status:    { type: String, default: 'Order Placed', enum: ['Pending','Pending COD','Order Placed','Processing','Shipped','Delivered','Cancelled'] },
  createdAt: { type: Date, default: Date.now },
});
const Order = mongoose.model('Order', orderSchema);

const productSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  price:         { type: Number, required: true },
  originalPrice: { type: Number, required: true },
  discount:      { type: String, default: '0%' },
  category:      { type: String, required: true },
  bikeType:      { type: String, default: 'All' },
  image:         { type: String, default: '📦' },
  rating:        { type: Number, default: 4.5 },
  reviews:       { type: Number, default: 0 },
  createdAt:     { type: Date, default: Date.now },
});
const Product = mongoose.model('Product', productSchema);

const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items:  { type: Array, default: [] },
});
const Wishlist = mongoose.model('Wishlist', wishlistSchema);

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items:  { type: Array, default: [] },
});
const CartSave = mongoose.model('CartSave', cartSchema);

// ── NEW: Ticket Schema ────────────────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['user', 'admin'], required: true },
  text:   { type: String, required: true },
  sentAt: { type: Date, default: Date.now },
});
const ticketSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId:  { type: String, default: '' },
  subject:  { type: String, required: true },
  type:     { type: String, enum: ['order_tracking','cancel_order','complaint','other'], default: 'other' },
  status:   { type: String, enum: ['open','in_progress','resolved','closed'], default: 'open' },
  messages: [messageSchema],
  priority: { type: String, enum: ['low','medium','high'], default: 'medium' },
}, { timestamps: true });
const Ticket = mongoose.model('Ticket', ticketSchema);

// ══════════════════════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ══════════════════════════════════════════════════════════════════════════════
const auth = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(h.split(' ')[1], SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, phone, bikeType } = req.body;
    if (!fullName || !email || !password) return res.status(400).json({ message: 'Missing fields' });
    if (await User.findOne({ email })) return res.status(409).json({ message: 'Email already registered' });
    const user  = await User.create({ fullName, email, password: await bcrypt.hash(password, 12), phone, bikeType });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: { _id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, bikeType: user.bikeType, role: user.role } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, SECRET, { expiresIn: '30d' });
    res.json({ token, user: { _id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, bikeType: user.bikeType, role: user.role } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);
});

app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.role !== 'admin') return res.status(403).json({ message: 'Not an admin account' });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, SECRET, { expiresIn: '30d' });
    res.json({ token, user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Alias for admin login (AdminDashboard calls /api/admin/login)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.role !== 'admin') return res.status(403).json({ message: 'Not an admin account' });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, SECRET, { expiresIn: '30d' });
    res.json({ _id: user._id, fullName: user.fullName, email: user.email, role: 'admin', token });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/auth/make-admin', async (req, res) => {
  try {
    const { email, secretKey } = req.body;
    if (secretKey !== 'RIDERS_HUB_ADMIN_2024') return res.status(403).json({ message: 'Wrong secret' });
    const user = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `${user.fullName} is now admin`, role: user.role });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ORDER ROUTES
// ══════════════════════════════════════════════════════════════════════════════
const optionalAuth = async (req, res, next) => {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) {
    try { req.user = jwt.verify(h.split(' ')[1], SECRET); } catch {}
  }
  next();
};

app.post('/api/orders', optionalAuth, async (req, res) => {
  try {
    const { items, shippingInfo, payment, totalUSD, totalINR, status } = req.body;
    if (!items?.length) return res.status(400).json({ message: 'Cart is empty' });
    let userId = req.user?.id;
    if (!userId && shippingInfo?.email) {
      const u = await User.findOne({ email: shippingInfo.email.toLowerCase() });
      if (u) userId = u._id;
    }
    if (!userId) userId = new mongoose.Types.ObjectId();
    const order = await Order.create({ userId, items, shippingInfo, payment, totalUSD, totalINR, status: status || 'Order Placed' });
    console.log(`📦 Order saved: ${order._id} | ${shippingInfo?.email || 'unknown'}`);
    res.status(201).json({ message: 'Order placed', order });
  } catch (e) {
    console.error('Order save error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/orders', optionalAuth, async (req, res) => {
  try {
    let orders = [];
    if (req.user?.id) {
      orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    } else if (req.query.email) {
      const u = await User.findOne({ email: req.query.email.toLowerCase() });
      if (u) orders = await Order.find({ userId: u._id }).sort({ createdAt: -1 });
    }
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── /api/users/orders aliases (Dashboard.jsx calls these URLs) ───────────────
app.get('/api/users/orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/users/orders/create', auth, async (req, res) => {
  try {
    const { items, shippingInfo, payment, totalUSD, totalINR, status, id } = req.body;
    if (!items?.length) return res.status(400).json({ message: 'Cart is empty' });
    const order = await Order.create({
      userId: req.user.id,
      items, shippingInfo, payment,
      totalUSD, totalINR,
      status: status || 'Order Placed',
    });
    console.log(`📦 Order saved: ${order._id} | user: ${req.user.id}`);
    const populated = await Order.findById(order._id).populate('userId', 'fullName email');
    res.status(201).json({ order: populated });
  } catch (e) {
    console.error('Create order error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCT ROUTES
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/admin/products', auth, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ products });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/admin/products', auth, async (req, res) => {
  try {
    const { name, price, originalPrice, discount, category, bikeType, image } = req.body;
    if (!name || !price || !category) return res.status(400).json({ message: 'name, price, category required' });
    const p = await Product.create({ name, price: +price, originalPrice: +(originalPrice || price), discount: discount || '0%', category, bikeType: bikeType || 'All', image: image || '📦' });
    res.status(201).json({ message: 'Product created', product: p });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/products/:id', auth, async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Updated', product: p });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/admin/products/:id', auth, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/orders', auth, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('userId', 'fullName email');
    res.json({ orders });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/orders/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Pending','Pending COD','Order Placed','Processing','Shipped','Delivered','Cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Status updated', order });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/stats', auth, async (req, res) => {
  try {
    const [tp, to, delivered, pending, rev, openTickets] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ status: 'Delivered' }),
      Order.countDocuments({ status: { $in: ['Order Placed','Processing','Pending','Pending COD'] } }),
      Order.aggregate([{ $group: { _id: null, t: { $sum: '$totalUSD' } } }]),
      Ticket.countDocuments({ status: { $in: ['open','in_progress'] } }),
    ]);
    res.json({ stats: { totalProducts: tp, totalOrders: to, delivered, pending, totalRevenue: rev[0]?.t || 0, openTickets } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── NEW: Admin ticket routes ──────────────────────────────────────────────────
app.get('/api/admin/tickets', auth, async (req, res) => {
  try {
    const tickets = await Ticket.find().populate('userId', 'fullName email').sort({ updatedAt: -1 });
    res.json({ success: true, tickets });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/admin/tickets/:id/reply', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Reply text required' });
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $push: { messages: { sender: 'admin', text: text.trim() } }, status: 'in_progress' },
      { new: true }
    ).populate('userId', 'fullName email');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/tickets/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const VALID = ['open','in_progress','resolved','closed'];
    if (!VALID.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('userId', 'fullName email');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// USER TICKET ROUTES (Customer Support)
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/users/tickets', auth, async (req, res) => {
  try {
    const { subject, type, orderId, message } = req.body;
    if (!subject?.trim() || !message?.trim()) return res.status(400).json({ message: 'Subject and message are required' });
    const ticket = await Ticket.create({
      userId:   req.user.id,
      orderId:  orderId || '',
      subject:  subject.trim(),
      type:     type || 'other',
      messages: [{ sender: 'user', text: message.trim() }],
    });
    const populated = await Ticket.findById(ticket._id).populate('userId', 'fullName email');
    console.log(`🎫 New ticket from user ${req.user.id}: "${subject}"`);
    res.status(201).json({ success: true, ticket: populated });
  } catch (e) {
    console.error('createTicket error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/users/tickets', auth, async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json({ success: true, tickets });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/users/tickets/:id/reply', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Reply text required' });
    const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.user.id });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    ticket.messages.push({ sender: 'user', text: text.trim() });
    ticket.status = 'open';
    await ticket.save();
    res.json({ success: true, ticket });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// WISHLIST & CART
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/wishlist', auth, async (req, res) => {
  const w = await Wishlist.findOne({ userId: req.user.id }); res.json(w?.items || []);
});
app.put('/api/wishlist', auth, async (req, res) => {
  await Wishlist.findOneAndUpdate({ userId: req.user.id }, { userId: req.user.id, items: req.body.items }, { upsert: true });
  res.json({ ok: true });
});
app.get('/api/cart', auth, async (req, res) => {
  const c = await CartSave.findOne({ userId: req.user.id }); res.json(c?.items || []);
});
app.put('/api/cart', auth, async (req, res) => {
  await CartSave.findOneAndUpdate({ userId: req.user.id }, { userId: req.user.id, items: req.body.items }, { upsert: true });
  res.json({ ok: true });
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));

app.listen(PORT, () => {
  console.log(`🚀 Server → http://localhost:${PORT}`);
  console.log(`📌 To make yourself admin: POST /api/auth/make-admin { email, secretKey: "RIDERS_HUB_ADMIN_2024" }`);
  console.log(`🎫 Ticket routes ready: POST/GET /api/users/tickets | GET/POST /api/admin/tickets`);
});