const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    productId: { // e.g., 'poster-design-std' from front-end data-id
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: { // Price in smallest currency unit (e.g., paise for INR)
        type: Number,
        required: true
    },
    description: String,
    category: String,
    // Add other relevant fields if needed in the future, e.g., imageUrl
});

module.exports = mongoose.model('Product', ProductSchema);
