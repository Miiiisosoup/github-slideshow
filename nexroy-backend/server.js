require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 3000; // Use environment variable for port or default

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Basic test route
app.get('/', (req, res) => {
    res.send('Nexroy Backend Server is running!');
});

// Define Routes
app.use('/api/contact', require('./routes/contactRoutes')); // Mount contact routes
app.use('/api/orders', require('./routes/orderRoutes')); // Mount order routes

// Start the server
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
