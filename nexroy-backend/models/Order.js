const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
    productId: { // Corresponds to data-id from front-end
        type: String, // Or mongoose.Schema.Types.ObjectId, ref: 'Product' if using Product model
        required: true
    },
    name: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: { // Price of a single unit at the time of order (in Rupees)
        type: Number,
        required: true
    }
}, { _id: false }); // Don't create separate _id for subdocuments if not needed

const OrderSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    customerEmail: {
        type: String,
        required: true,
        trim: true,
        match: [ /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email' ]
    },
    // Add customerAddress fields if needed from checkout
    items: [OrderItemSchema],
    totalAmount: { // Total order amount (in Rupees)
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true,
        default: 'INR'
    },
    orderStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    razorpayOrderId: { // Order ID from Razorpay
        type: String
    },
    razorpayPaymentId: { // Payment ID from Razorpay after successful payment
        type: String
    },
    razorpaySignature: { // For verifying webhook
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
    // You might add shippingAddress, billingAddress etc. later
});

module.exports = mongoose.model('Order', OrderSchema);
