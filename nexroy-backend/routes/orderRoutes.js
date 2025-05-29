const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto'); // For generating unique receipt IDs, if needed
require('dotenv').config();

const Order = require('../models/Order'); // Ensure Order model is imported

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @route   POST /api/orders/razorpay-create-order
// @desc    Create a Razorpay order
// @access  Public (or protected if users are logged in)
router.post('/razorpay-create-order', async (req, res) => {
    try {
        const { totalAmount } = req.body; // Expect amount in Rupees

        if (!totalAmount || isNaN(parseFloat(totalAmount)) || parseFloat(totalAmount) <= 0) {
            return res.status(400).json({ msg: 'Invalid total amount provided.' });
        }

        const amountInPaise = Math.round(parseFloat(totalAmount) * 100); // Convert to paise

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `receipt_order_${crypto.randomBytes(6).toString('hex')}`, // Generate a unique receipt ID
        };

        const razorpayOrder = await razorpayInstance.orders.create(options);

        if (!razorpayOrder) {
            return res.status(500).json({ msg: 'Razorpay order creation failed.' });
        }

        // Send back only necessary order details to front-end
        res.status(201).json({
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount, // Amount in paise
            currency: razorpayOrder.currency
        });

    } catch (err) {
        console.error('Error creating Razorpay order:', err.message, err.stack);
        res.status(500).send('Server Error creating Razorpay order');
    }
});

// @route   POST /api/orders/razorpay-verify
// @desc    Verify Razorpay payment and save order (Webhook)
// @access  Public (Webhook from Razorpay)
router.post('/razorpay-verify', async (req, res) => {
    const secret = process.env.RAZORPAY_KEY_SECRET;

    try {
        // IMPORTANT: Razorpay sends the raw JSON body.
        // Express.json() middleware should parse it. If issues arise, ensure raw body isn't being overly processed before this.
        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(JSON.stringify(req.body));
        const digest = shasum.digest('hex');

        if (digest === req.headers['x-razorpay-signature']) {
            console.log('Payment verification successful. Signature matches.');
            const paymentEvent = req.body.event;
            const paymentPayload = req.body.payload.payment.entity;
            const orderPayload = req.body.payload.order.entity; // Contains notes

            // Handle successful payment events
            if (paymentEvent === 'payment.captured' || paymentEvent === 'order.paid') {
                try {
                    // Simplified: Extract customer/item details.
                    // In a real app, use orderPayload.notes or a pre-stored temporary order context.
                    let itemsFromNotes = [];
                    if (orderPayload.notes && orderPayload.notes.items) {
                        try {
                            itemsFromNotes = JSON.parse(orderPayload.notes.items);
                        } catch (parseError) {
                            console.error('Error parsing items from notes:', parseError);
                            // Decide how to handle: save order without items, or log as problematic.
                        }
                    }

                    const newOrder = new Order({
                        customerName: (orderPayload.notes && orderPayload.notes.customer_name) ? orderPayload.notes.customer_name : 'N/A',
                        customerEmail: paymentPayload.email || ((orderPayload.notes && orderPayload.notes.customer_email) ? orderPayload.notes.customer_email : 'N/A'),
                        items: itemsFromNotes,
                        totalAmount: paymentPayload.amount / 100, // Convert paise back to Rupees
                        currency: paymentPayload.currency,
                        orderStatus: 'paid',
                        razorpayOrderId: paymentPayload.order_id,
                        razorpayPaymentId: paymentPayload.id,
                        razorpaySignature: req.headers['x-razorpay-signature']
                    });

                    await newOrder.save();
                    console.log('Order saved to database:', newOrder._id);
                    res.status(200).json({ status: 'ok', message: 'Webhook processed successfully and order saved.' });

                } catch (dbError) {
                    console.error('Error saving order to DB after webhook verification:', dbError.message, dbError.stack);
                    // Still respond 200 to Razorpay if signature was ok, but log internal error
                    res.status(200).json({ status: 'ok_db_error', message: 'Webhook processed, but DB save error.' });
                }
            } else {
                console.log(`Received event: ${paymentEvent}, not processing for order save.`);
                res.status(200).json({ status: 'ok_event_not_handled', message: `Event ${paymentEvent} not handled for order save.` });
            }
        } else {
            console.warn('Webhook signature verification failed.');
            res.status(400).json({ status: 'error', message: 'Invalid signature.' });
        }
    } catch (error) {
        console.error('Error in Razorpay webhook processing:', error.message, error.stack);
        res.status(500).send('Server Error during webhook processing.');
    }
});

module.exports = router;
