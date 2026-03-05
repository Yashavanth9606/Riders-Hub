const User = require('../models/User');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Ticket = require('../models/Ticket');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_jwt_secret_key_123', {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, bikeModel } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bikeModel: bikeModel || 'Sports Bike (600cc+)',
      stats: {
        rides: 42,
        distance: 1250,
        points: 2850,
        badges: 8
      }
    });

    // Create empty cart for user
    await Cart.create({
      userId: user._id,
      items: []
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        bikeModel: user.bikeModel,
        stats: user.stats,
        token: generateToken(user._id)
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      bikeModel: user.bikeModel,
      stats: user.stats,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.fullName = req.body.fullName || user.fullName;
    user.bikeModel = req.body.bikeModel || user.bikeModel;
    user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
    
    if (req.body.address) {
      user.address = { ...user.address, ...req.body.address };
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      bikeModel: updatedUser.bikeModel,
      phoneNumber: updatedUser.phoneNumber,
      address: updatedUser.address,
      stats: updatedUser.stats
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user cart
// @route   GET /api/users/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) {
      cart = await Cart.create({
        userId: req.user.id,
        items: []
      });
    }
    
    res.json({ items: cart.items });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add to cart
// @route   POST /api/users/cart/add
// @access  Private
const addToCart = async (req, res) => {
  try {
    const { product } = req.body;
    
    let cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) {
      cart = await Cart.create({
        userId: req.user.id,
        items: []
      });
    }

    const existingItem = cart.items.find(item => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items.push({ ...product, quantity: 1 });
    }

    await cart.save();
    res.json({ items: cart.items });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/users/cart/update/:id
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    
    const cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.id === parseInt(id));
    
    if (itemIndex > -1) {
      if (quantity < 1) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }
      await cart.save();
    }
    
    res.json({ items: cart.items });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Remove from cart
// @route   DELETE /api/users/cart/remove/:id
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;
    
    const cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item.id !== parseInt(id));
    await cart.save();
    
    res.json({ items: cart.items });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user orders
// @route   GET /api/users/orders
// @access  Private
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create order
// @route   POST /api/users/orders/create
// @access  Private
const createOrder = async (req, res) => {
  try {
    const {
      id,
      items,
      total,
      totalUSD,
      totalINR,
      shippingInfo,
      payment,
      paymentMethod,
      status,
      createdAt
    } = req.body;

    // Use totalUSD from frontend, fallback to total
    const orderTotalUSD = totalUSD || total || 0;
    const orderTotalINR = totalINR || Math.round(orderTotalUSD * 83);

    const order = await Order.create({
      id: id || ('ORD' + Date.now()),
      userId: req.user.id,
      items: items || [],
      total: orderTotalUSD,
      totalUSD: orderTotalUSD,
      totalINR: orderTotalINR,
      shippingInfo: shippingInfo || {},
      payment: payment || {},
      paymentMethod: paymentMethod || 'razorpay',
      status: status || 'Order Placed',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    });

    // Clear cart after order
    await Cart.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { items: [] } }
    );

    // Populate userId for admin to see customer name/email
    const populated = await Order.findById(order._id).populate('userId', 'fullName email');

    res.status(201).json({ order: populated });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all products
// @route   GET /api/users/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const products = await Product.find(query).sort({ category: 1, id: 1 });
    
    res.json({
      success: true,
      products: products || []
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message,
      products: []
    });
  }
};

// @desc    Initialize products (seed data)
// @route   POST /api/users/products/init
// @access  Public
const initializeProducts = async (req, res) => {
  try {
    // Check if products already exist
    const count = await Product.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'Products already initialized' });
    }

    // Complete products data
    const products = [
      // Helmets
      { id: 101, name: 'Carbon Fiber Helmet', price: 299, image: '🪖', discount: '20%', originalPrice: 374, category: 'helmets', bikeType: 'Sports' },
      { id: 102, name: 'Full Face Racing Helmet', price: 449, image: '⛑️', discount: '15%', originalPrice: 529, category: 'helmets', bikeType: 'Racing' },
      { id: 103, name: 'Modular Touring Helmet', price: 349, image: '🪖', discount: '10%', originalPrice: 388, category: 'helmets', bikeType: 'Touring' },
      { id: 104, name: 'Off-Road Motocross Helmet', price: 279, image: '🪖', discount: '25%', originalPrice: 372, category: 'helmets', bikeType: 'Off-road' },
      { id: 105, name: 'Vintage Style Open Face', price: 199, image: '🪖', discount: '15%', originalPrice: 234, category: 'helmets', bikeType: 'Cruiser' },
      { id: 106, name: 'Kids Dirt Bike Helmet', price: 129, image: '🪖', discount: '10%', originalPrice: 143, category: 'helmets', bikeType: 'Kids' },
      
      // Gloves
      { id: 201, name: 'Racing Gloves', price: 89, image: '🧤', discount: '15%', originalPrice: 105, category: 'gloves', bikeType: 'Sports' },
      { id: 202, name: 'Winter Thermal Gloves', price: 79, image: '🧤', discount: '20%', originalPrice: 99, category: 'gloves', bikeType: 'Touring' },
      { id: 203, name: 'Off-Road MX Gloves', price: 59, image: '🧤', discount: '10%', originalPrice: 66, category: 'gloves', bikeType: 'Off-road' },
      { id: 204, name: 'Carbon Knuckle Gloves', price: 119, image: '🧤', discount: '25%', originalPrice: 159, category: 'gloves', bikeType: 'Racing' },
      { id: 205, name: 'Cruiser Leather Gloves', price: 69, image: '🧤', discount: '15%', originalPrice: 81, category: 'gloves', bikeType: 'Cruiser' },
      { id: 206, name: 'Waterproof Touring Gloves', price: 99, image: '🧤', discount: '20%', originalPrice: 124, category: 'gloves', bikeType: 'Touring' },
      
      // Jackets
      { id: 301, name: 'Racing Jacket', price: 199, image: '🧥', discount: '25%', originalPrice: 265, category: 'jackets', bikeType: 'Sports' },
      { id: 302, name: 'Adventure Touring Jacket', price: 299, image: '🧥', discount: '20%', originalPrice: 374, category: 'jackets', bikeType: 'Adventure' },
      { id: 303, name: 'Leather Cruiser Jacket', price: 249, image: '🧥', discount: '15%', originalPrice: 293, category: 'jackets', bikeType: 'Cruiser' },
      { id: 304, name: 'Mesh Summer Jacket', price: 159, image: '🧥', discount: '10%', originalPrice: 177, category: 'jackets', bikeType: 'Touring' },
      { id: 305, name: 'Textile Commuter Jacket', price: 179, image: '🧥', discount: '20%', originalPrice: 224, category: 'jackets', bikeType: 'Commuter' },
      { id: 306, name: 'Heated Winter Jacket', price: 399, image: '🧥', discount: '15%', originalPrice: 469, category: 'jackets', bikeType: 'Touring' },
      
      // Boots
      { id: 401, name: 'Racing Boots', price: 249, image: '👢', discount: '15%', originalPrice: 293, category: 'boots', bikeType: 'Racing' },
      { id: 402, name: 'Adventure Touring Boots', price: 279, image: '👢', discount: '20%', originalPrice: 349, category: 'boots', bikeType: 'Adventure' },
      { id: 403, name: 'Cruiser Boots', price: 189, image: '👢', discount: '10%', originalPrice: 210, category: 'boots', bikeType: 'Cruiser' },
      { id: 404, name: 'Off-Road MX Boots', price: 329, image: '👢', discount: '25%', originalPrice: 439, category: 'boots', bikeType: 'Off-road' },
      { id: 405, name: 'Waterproof Touring Boots', price: 219, image: '👢', discount: '15%', originalPrice: 258, category: 'boots', bikeType: 'Touring' },
      { id: 406, name: 'Urban Commuter Shoes', price: 139, image: '👞', discount: '10%', originalPrice: 154, category: 'boots', bikeType: 'Commuter' },
      
      // Luggage
      { id: 501, name: 'Tail Bag 20L', price: 89, image: '🧳', discount: '15%', originalPrice: 105, category: 'luggage', bikeType: 'Touring' },
      { id: 502, name: 'Tank Bag Magnetic', price: 69, image: '👜', discount: '10%', originalPrice: 77, category: 'luggage', bikeType: 'Sports' },
      { id: 503, name: 'Saddle Bags Pair', price: 199, image: '🧳', discount: '20%', originalPrice: 249, category: 'luggage', bikeType: 'Cruiser' },
      { id: 504, name: 'Waterproof Dry Bag', price: 79, image: '🎒', discount: '15%', originalPrice: 93, category: 'luggage', bikeType: 'Adventure' },
      { id: 505, name: 'Backpack with Hydration', price: 119, image: '🎒', discount: '10%', originalPrice: 132, category: 'luggage', bikeType: 'Off-road' },
      { id: 506, name: 'Top Case 45L', price: 159, image: '📦', discount: '20%', originalPrice: 199, category: 'luggage', bikeType: 'Touring' },
      
      // Protection
      { id: 601, name: 'Back Protector', price: 89, image: '🛡️', discount: '15%', originalPrice: 105, category: 'protection', bikeType: 'Sports' },
      { id: 602, name: 'Knee Guards', price: 49, image: '🦵', discount: '10%', originalPrice: 54, category: 'protection', bikeType: 'Off-road' },
      { id: 603, name: 'Chest Protector', price: 79, image: '🛡️', discount: '20%', originalPrice: 99, category: 'protection', bikeType: 'Motocross' },
      { id: 604, name: 'Elbow Guards', price: 39, image: '💪', discount: '15%', originalPrice: 46, category: 'protection', bikeType: 'Off-road' },
      { id: 605, name: 'Armored Shirt', price: 149, image: '👕', discount: '25%', originalPrice: 199, category: 'protection', bikeType: 'Adventure' },
      { id: 606, name: 'Neck Brace', price: 199, image: '🔰', discount: '15%', originalPrice: 234, category: 'protection', bikeType: 'Motocross' }
    ];

    // Insert products
    await Product.insertMany(products);
    
    res.status(201).json({ 
      success: true,
      message: 'Products initialized successfully', 
      count: products.length 
    });
  } catch (error) {
    console.error('Init error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// ─── TICKET / CUSTOMER SUPPORT ───────────────────────────────────────────────

// @desc    Create a support ticket
// @route   POST /api/users/tickets
// @access  Private
const createTicket = async (req, res) => {
  try {
    const { subject, type, orderId, message } = req.body;
    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }
    const ticket = await Ticket.create({
      userId: req.user.id,
      orderId: orderId || '',
      subject: subject.trim(),
      type: type || 'other',
      messages: [{ sender: 'user', text: message.trim() }],
    });
    const populated = await Ticket.findById(ticket._id).populate('userId', 'fullName email');
    res.status(201).json({ success: true, ticket: populated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user's own tickets
// @route   GET /api/users/tickets
// @access  Private
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    User reply to own ticket
// @route   POST /api/users/tickets/:id/reply
// @access  Private
const replyToMyTicket = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Reply text required' });

    const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.user.id });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.messages.push({ sender: 'user', text: text.trim() });
    ticket.status = 'open';
    await ticket.save();
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// EXPORT ALL FUNCTIONS
module.exports = {
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
  replyToMyTicket
};