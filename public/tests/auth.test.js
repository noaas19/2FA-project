const request = require('supertest');
const app = require('../../app'); // Path to your app file
const User = require('../../models/user');
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');

const dbURI = 'mongodb+srv://noa:N200221@cluster0.vvehi.mongodb.net/2FA?retryWrites=true&w=majority&appName=Cluster0';

beforeAll(async () => {
    await mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('User Registration and Login', () => {
    it('should register a new user', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({ email: 'test@example.com', password: 'Password123!' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User registered successfully');
    
        const user = await User.findOne({ email: 'test@example.com' });
        expect(user).not.toBeNull();
    });
    
    // Test registering with an existing email
    it('should not register a user with an existing email', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({ email: 'test@example.com', password: 'Password123!' });

        const response = await request(app)
            .post('/api/auth/register')
            .send({ email: 'test@example.com', password: 'AnotherPassword123!' });
        
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Email already in use');
    });

    // Test user login
    it('should login an existing user', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'Password123!' });
        
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Enter the 2FA token');
        expect(response.body.qrCodeUrl).toBeDefined();
        expect(response.body.userId).toBeDefined();
    });

    // Test login with invalid credentials
    it('should not login with invalid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'WrongPassword!' });
        
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid credentials password');
    });

    // Test verifying 2FA token
    it('should verify 2FA token successfully', async () => {
        const user = await User.findOne({ email: 'test@example.com' });
        const secret = user.twoFactorSecret;
        const token = speakeasy.totp({
            secret: secret,
            encoding: 'base32'
        });

        const response = await request(app)
            .post('/api/auth/verify-2fa')
            .send({ userId: user._id, token });

        expect(response.status).toBe(200);
        expect(response.body.token).toBeDefined();
    });

    // Test verifying 2FA token with incorrect token
    it('should not verify 2FA token with incorrect token', async () => {
        const user = await User.findOne({ email: 'test@example.com' });
        const response = await request(app)
            .post('/api/auth/verify-2fa')
            .send({ userId: user._id, token: 'WrongToken' });
        
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid 2FA token');
    });
});
