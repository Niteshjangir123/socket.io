const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/userData', { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    mobile: String,
    address: String,
    loginId: String,
    password: String
});

const User = mongoose.model('User', UserSchema);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Local variable to store active users
let liveUsers = {};

// Serve static files
app.use(express.static('public'));

// Socket.io connection
io.on('connection', (socket) => {
    console.log('New client connected, socket id:', socket.id);

    // Listen for new user event
    socket.on('new_user', (userData) => {
        const { email, name } = userData;
        liveUsers[socket.id] = { email, name, socketId: socket.id };
        
        // Join user to the "live_users" room
        socket.join('live_users');

        // Send updated user list to all clients
        io.to('live_users').emit('user_list', liveUsers);
    });

    // Listen for disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        delete liveUsers[socket.id];
        
        // Update the user list
        io.to('live_users').emit('user_list', liveUsers);
    });
});

// Endpoint to get full user details
app.get('/user/:socketId', async (req, res) => {
    const socketId = req.params.socketId;
    const user = liveUsers[socketId];

    if (user) {
        try {
            const dbUser = await User.findOne({ email: user.email });
            res.json(dbUser);
        } catch (error) {
            res.status(500).json({ error: 'User not found' });
        }
    } else {
        res.status(404).json({ error: 'Socket ID not found' });
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
