const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');
const { sendOrderConfirmationEmail } = require('../services/emailService');

// Create a new order
router.post('/', auth, async (req, res) => {
  try {
    const { orderType, items, totalAmount, currency, shippingAddress, notes } = req.body;
    const user = req.user;

    const order = await Order.create({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phone,
      orderType,
      items,
      totalAmount,
      currency,
      shippingAddress,
      notes,
    });

    // Send order confirmation email (non-blocking)
    sendOrderConfirmationEmail({ to: user.email, name: user.name, order }).catch(err =>
      console.error('Order email failed:', err.message)
    );

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current user's orders
router.get('/my', auth, async (req, res) => {
  try {
    const orders = await Order.findByUser(req.userId);
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all orders (admin)
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    const { status, orderType, paymentStatus } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (orderType) filters.orderType = orderType;
    if (paymentStatus) filters.paymentStatus = paymentStatus;

    const orders = await Order.findAll(filters);
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update payment info after successful payment
router.put('/:id/payment', auth, async (req, res) => {
  try {
    const { paymentId, paymentOrderId, paymentSignature, paymentMethod } = req.body;
    const order = await Order.updatePayment(req.params.id, {
      paymentId,
      paymentOrderId,
      paymentSignature,
      paymentMethod,
    });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update order status (admin)
router.put('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    const order = await Order.updateStatus(req.params.id, req.body.status);
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
