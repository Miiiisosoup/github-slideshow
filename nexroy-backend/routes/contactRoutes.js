const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage'); // Adjust path if needed

// @route   POST /api/contact/submit
// @desc    Submit a contact form message
// @access  Public
router.post('/submit', async (req, res) => {
    try {
        // req.body will contain name, email, subject, message
        const { name, email, subject, message } = req.body;

        // Basic validation (Mongoose schema will also validate)
        if (!name || !email || !message) {
            return res.status(400).json({ msg: 'Please enter all required fields (name, email, message).' });
        }

        const newContactMessage = new ContactMessage({
            name,
            email,
            subject,
            message
        });

        const savedMessage = await newContactMessage.save();
        res.status(201).json({ 
            msg: 'Message received successfully!', 
            messageData: savedMessage 
        });

    } catch (err) {
        console.error('Error saving contact message:', err.message);
        if (err.name === 'ValidationError') {
            // Extract validation messages from Mongoose error
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ msg: 'Validation Error', errors: messages });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
