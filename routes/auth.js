

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken'); // להוספת JSON Web Token
const User = require('../models/user'); // הנחת שיש לך תיקייה models עם קובץ user.js

router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    console.log('Register request body:', req.body); // הוסף לוג

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Hashed password during registration:', hashedPassword);

        const user = new User({ email, password: hashedPassword });

        const secret = speakeasy.generateSecret({ name: 'YourAppName' });
        user.twoFactorSecret = secret.base32;
        console.log('Generated 2FA secret:', secret.base32);

        await user.save();
        res.status(200).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('Server error:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});



router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // מציאת המשתמש לפי האימייל
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials email' });
        }
        
        // השוואת הסיסמה המוזנת עם הסיסמה המוצפנת
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials password' });
        }

        // יצירת QR Code על בסיס ה-2FA secret של המשתמש
        const secret = user.twoFactorSecret;
        console.log('Stored 2FA secret for user:', secret);

        const otpauthUrl = speakeasy.otpauthURL({
            secret: secret,
            label: 'YourAppName',
            encoding: 'base32'
        });

        console.log('Generated otpauth URL:', otpauthUrl);

        const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
        console.log('Generated QR code URL:', qrCodeUrl);

        res.json({ message: 'Enter the 2FA token', qrCodeUrl, userId: user._id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});


router.post('/verify-2fa', async (req, res) => {
    const { userId, token } = req.body;

    try {
        // מציאת המשתמש
        const user = await User.findById(userId);
        if (!user) {
            console.log('User not found');
            return res.status(404).json({ message: 'User not found' });
        }

        // הדפסת הסוד שנשמר (בפורמט גולמי)
        const secret = user.twoFactorSecret;
        console.log('Stored secret (raw):', secret);

        // הדפסת הטוקן שהוזן
        console.log('Token received:', token);

        // יצירת טוקן בצד השרת להשוואה
        const serverGeneratedToken = speakeasy.totp({
            secret: secret,
            encoding: 'base32'
        });
        console.log('Server generated token for comparison:', serverGeneratedToken);

        // אימות טוקן 2FA עם טווח זמן נוסף
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token,
            window: 5 // נסה טווח זמן נוסף של 2 טווחים
        });

        // הדפסת תוצאת האימות
        console.log('Token verification result:', verified);

        if (verified) {
            // יצירת טוקן JWT עבור המשתמש
            const jwtToken = jwt.sign({ userId: user._id }, 'your_jwt_secret', { expiresIn: '24h' });
            res.json({ token: jwtToken });
        } else {
            res.status(400).json({ message: 'Invalid 2FA token' });
        }
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});



module.exports = router;
