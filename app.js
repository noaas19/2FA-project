const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const authRoutes = require('./routes/auth');
const mongoose = require('mongoose');

// הגדרת נתיב סטטי לקבצים בתיקיית public
app.use(express.static('public'));

// מידלוור לטיפול בבקשות JSON
app.use(express.json());

// חיבור לבסיס הנתונים
const dbURI = 'mongodb+srv://noa:N200221@cluster0.vvehi.mongodb.net/2FA?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(dbURI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.log('Error connecting to MongoDB Atlas:', err));

// שימוש ב-routes לאימות
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


module.exports = app;