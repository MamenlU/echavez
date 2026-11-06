import { authenticateToken } from '../middleware/auth.js';

import express from 'express';

import bcrypt from 'bcrypt';

import jwt from 'jsonwebtoken';

import crypto from 'crypto';

import nodemailer from 'nodemailer';

import pool from '../db.js';



const router = express.Router();





const PH_MOBILE_PATTERN = /^\+639\d{9}$/;



const getStrongPasswordMissingRequirements = (passwordValue) => {

    const missing = [];



    if (passwordValue.length < 8) missing.push('at least 8 characters');

    if (!/[A-Z]/.test(passwordValue)) missing.push('an uppercase letter');

    if (!/[a-z]/.test(passwordValue)) missing.push('a lowercase letter');

    if (!/\d/.test(passwordValue)) missing.push('a number');

    if (!/[^A-Za-z0-9]/.test(passwordValue)) missing.push('a special character');



    return missing;

};



const validateStrongRegistrationPassword = (passwordValue) => {

    const missing = getStrongPasswordMissingRequirements(passwordValue);

    return missing.length === 0

        ? null

        : `Password must include ${missing.join(', ')}.`;

};


// Send a non-critical account-creation confirmation email after normal
// customer registration. Registration remains successful even if email
// delivery is temporarily unavailable.
const sendRegistrationWelcomeEmail = async ({ email, firstName, username }) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
            console.warn(
                'Welcome email skipped: EMAIL_USER or EMAIL_APP_PASSWORD is missing.'
            );
            return;
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            }
        });

        const displayName = String(firstName || '').trim();
        const accountUsername = String(username || '').trim();
        const escapeHtml = (value) =>
            String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

        const safeDisplayName = escapeHtml(displayName);
        const safeUsername = escapeHtml(accountUsername);
        const safeEmail = escapeHtml(email);

const frontendUrl = String(
    process.env.FRONTEND_URL || 'http://localhost:5173'
).replace(/\/+$/, '');

const loginUrl = `${frontendUrl}/login`;

        await transporter.sendMail({
    from: `"Rayjin Hardware" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to Rayjin Hardware — Your Account Is Ready!',

    text: `
Hello${displayName ? ` ${displayName}` : ''},

Welcome to Rayjin Hardware!

Your customer account has been successfully created and is ready to use.

YOUR ACCOUNT

${accountUsername ? `Username: ${accountUsername}` : ''}
Email: ${email}

You can now use your Rayjin Hardware account to:

- Browse and search available hardware products
- Place orders online
- Choose Pickup, Delivery, or Shop & Go
- Monitor your order and payment status
- Manage your customer profile

Sign in to your account:
${loginUrl}

If you did not create this account, please contact Rayjin Hardware.

Thank you for choosing Rayjin Hardware. We look forward to serving you.

Rayjin Hardware
Brgy. Poblacion, Zone 11
Initao, Misamis Oriental

This is an automated account notification. Please do not reply to this email.
    `,

    html: `
    <div style="
        margin: 0;
        padding: 32px 12px;
        background-color: #f4f7f5;
        font-family: Arial, Helvetica, sans-serif;
        color: #17372d;
    ">

        <div style="
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #e2e8e5;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(20, 83, 45, 0.08);
        ">

            <!-- HEADER -->
            <div style="
                background-color: #14532d;
                padding: 24px 32px;
                text-align: center;
            ">
                <div style="
                    color: #ffffff;
                    font-size: 21px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                ">
                    RAYJIN HARDWARE
                </div>

                <div style="
                    margin-top: 5px;
                    color: #bbf7d0;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 2px;
                ">
                    ONLINE STORE
                </div>
            </div>

            <!-- MAIN CONTENT -->
            <div style="padding: 36px 32px;">

                <!-- SUCCESS ICON -->
                <div style="
                    text-align: center;
                    margin-bottom: 18px;
                ">
                    <div style="
                        display: inline-block;
                        width: 58px;
                        height: 58px;
                        line-height: 58px;
                        border-radius: 50%;
                        background-color: #f0fdf4;
                        border: 1px solid #bbf7d0;
                        color: #15803d;
                        font-size: 28px;
                        font-weight: bold;
                    ">
                        ✓
                    </div>
                </div>

                <div style="
                    text-align: center;
                    color: #15803d;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 1.6px;
                    margin-bottom: 9px;
                ">
                    ACCOUNT CREATED
                </div>

                <h1 style="
                    margin: 0;
                    text-align: center;
                    color: #14532d;
                    font-size: 26px;
                    line-height: 1.3;
                ">
                    Welcome to Rayjin Hardware!
                </h1>

                <p style="
                    margin: 10px 0 28px;
                    text-align: center;
                    color: #64756e;
                    font-size: 14px;
                    line-height: 1.6;
                ">
                    Your customer account is ready.
                </p>

                <p style="
                    margin: 0 0 14px;
                    font-size: 15px;
                    line-height: 1.7;
                ">
                    Hello${safeDisplayName ? ` ${safeDisplayName}` : ''},
                </p>

                <p style="
                    margin: 0;
                    color: #40564d;
                    font-size: 14px;
                    line-height: 1.75;
                ">
                    Thank you for creating an account with Rayjin Hardware.
                    Your customer account has been successfully created,
                    and you can now access our online ordering services.
                </p>

                <!-- ACCOUNT DETAILS -->
                <div style="
                    margin: 26px 0;
                    padding: 18px;
                    background-color: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    border-radius: 11px;
                ">

                    <div style="
                        margin-bottom: 12px;
                        color: #166534;
                        font-size: 11px;
                        font-weight: 800;
                        letter-spacing: 1px;
                    ">
                        YOUR ACCOUNT
                    </div>

                    ${safeUsername ? `
                    <div style="
                        margin-bottom: 9px;
                        color: #40564d;
                        font-size: 13px;
                    ">
                        <span style="color: #6b7f76;">
                            Username:
                        </span>
                        <strong style="
                            margin-left: 5px;
                            color: #17372d;
                        ">
                            ${safeUsername}
                        </strong>
                    </div>
                    ` : ''}

                    <div style="
                        color: #40564d;
                        font-size: 13px;
                    ">
                        <span style="color: #6b7f76;">
                            Email:
                        </span>
                        <strong style="
                            margin-left: 5px;
                            color: #17372d;
                        ">
                            ${safeEmail}
                        </strong>
                    </div>

                </div>

                <!-- SIGN IN BUTTON -->
                <div style="
                    text-align: center;
                    margin: 30px 0;
                ">
                    <a
                        href="${loginUrl}"
                        style="
                            display: inline-block;
                            background-color: #15803d;
                            color: #ffffff;
                            text-decoration: none;
                            padding: 14px 30px;
                            border-radius: 9px;
                            font-size: 14px;
                            font-weight: 700;
                            letter-spacing: 0.3px;
                        "
                    >
                        Sign In to Your Account
                    </a>
                </div>

                <!-- FEATURES -->
                <div style="
                    margin-top: 28px;
                    padding-top: 24px;
                    border-top: 1px solid #e5ebe7;
                ">

                    <div style="
                        margin-bottom: 15px;
                        color: #14532d;
                        font-size: 12px;
                        font-weight: 800;
                        letter-spacing: 0.8px;
                    ">
                        WITH YOUR RAYJIN HARDWARE ACCOUNT
                    </div>

                    <div style="
                        color: #40564d;
                        font-size: 13px;
                        line-height: 2;
                    ">
                        ✓ Browse and search available hardware products<br>
                        ✓ Place orders conveniently online<br>
                        ✓ Choose Pickup, Delivery, or Shop &amp; Go<br>
                        ✓ Monitor your order and payment status<br>
                        ✓ Manage your customer profile
                    </div>

                </div>

                <!-- SECURITY / HELP -->
                <div style="
                    margin-top: 26px;
                    padding: 16px 18px;
                    background-color: #f8faf9;
                    border: 1px solid #e2e8e5;
                    border-radius: 10px;
                ">
                    <div style="
                        color: #52675e;
                        font-size: 12px;
                        line-height: 1.65;
                    ">
                        If you did not create this Rayjin Hardware account,
                        please contact Rayjin Hardware so we can assist you.
                    </div>
                </div>

                <p style="
                    margin: 28px 0 0;
                    color: #40564d;
                    font-size: 14px;
                    line-height: 1.7;
                ">
                    Thank you for choosing Rayjin Hardware.
                    We look forward to serving you.
                </p>

                <p style="
                    margin: 18px 0 0;
                    color: #40564d;
                    font-size: 14px;
                    line-height: 1.7;
                ">
                    <strong style="color: #14532d;">
                        Rayjin Hardware
                    </strong>
                </p>

            </div>

            <!-- FOOTER -->
            <div style="
                padding: 22px 32px;
                background-color: #f8faf9;
                border-top: 1px solid #e5ebe7;
                text-align: center;
            ">

                <div style="
                    color: #14532d;
                    font-size: 13px;
                    font-weight: 700;
                ">
                    Rayjin Hardware
                </div>

                <div style="
                    margin-top: 6px;
                    color: #708078;
                    font-size: 11px;
                    line-height: 1.6;
                ">
                    Brgy. Poblacion, Zone 11<br>
                    Initao, Misamis Oriental
                </div>

                <div style="
                    margin-top: 14px;
                    color: #94a39c;
                    font-size: 10px;
                    line-height: 1.5;
                ">
                    This is an automated account notification.<br>
                    Please do not reply to this email.
                </div>

            </div>

        </div>
    </div>
    `
});

        console.log(`Welcome email sent successfully to ${email}`);

    } catch (error) {
        // Welcome email is informational only. Never roll back or report a
        // failed registration after the customer account has been created.
        console.error(
    'Welcome email error:',
    error?.message || error
);
    }
};



// Register a new CUSTOMER account

//

// IMPORTANT:

// Public registration is for customers only.

// Admin accounts must already be authorized/provisioned

// and cannot be created by sending role: "admin".

router.post('/register', async (req, res) => {

    try {

        const {

            username,

            email,

            password,

            role,

            first_name,

            last_name,

            phone_number,

            address

        } = req.body;



        const firstName = String(first_name || '').trim();

        const lastName = String(last_name || '').trim();

        const normalizedUsername = String(username || '').trim();

        const normalizedEmail = String(email || '').trim().toLowerCase();

        const phone = String(phone_number || '').trim();

        const normalizedPhone = phone.replace(/[\s\-()]/g, '');

        const customerAddress = String(address || '').trim();



        // Required fields

        if (

            !firstName ||

            !lastName ||

            !normalizedUsername ||

            !normalizedEmail ||

            !phone ||

            !customerAddress ||

            !password

        ) {

            return res.status(400).json({

                error:

                    'First name, last name, username, email, contact number, address, and password are required.'

            });

        }



        // Email validation

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {

            return res.status(400).json({

                error: 'Please provide a valid email address.'

            });

        }



        // Contact-number validation

        if (!PH_MOBILE_PATTERN.test(normalizedPhone)) {

            return res.status(400).json({

                error: 'Please provide a valid Philippine mobile number in the format +639XXXXXXXXX.'

            });

        }



        // Strong-password security for customer registration.

        const passwordError = validateStrongRegistrationPassword(String(password || ''));

        if (passwordError) {

            return res.status(400).json({ error: passwordError });

        }



        // Public registration must never create an Admin.

        if (role && role !== 'customer') {

            return res.status(403).json({

                error:

                    'Public admin registration is not allowed. Admin accounts must be authorized.'

            });

        }



        // Check duplicate email or username.

        const [existing] = await pool.query(

            `SELECT id

             FROM users

             WHERE LOWER(email) = ?

                OR username = ?

             LIMIT 1`,

            [normalizedEmail, normalizedUsername]

        );



        if (existing.length > 0) {

            return res.status(400).json({

                error:

                    'User with this email or username already exists.'

            });

        }



        const passwordHash = await bcrypt.hash(password, 10);



        const [result] = await pool.query(

            `INSERT INTO users

            (

                username,

                email,

                password_hash,

                role,

                first_name,

                last_name,

                phone_number,

                address

            )

            VALUES (?, ?, ?, 'customer', ?, ?, ?, ?)`,

            [

                normalizedUsername,

                normalizedEmail,

                passwordHash,

                firstName,

                lastName,

                normalizedPhone,

                customerAddress

            ]

        );



        // Send the welcome email only after the customer account has been
        // successfully created. Email delivery is non-critical and does not
        // change the registration result.
        await sendRegistrationWelcomeEmail({
    email: normalizedEmail,
    firstName,
    username: normalizedUsername
});



        res.status(201).json({

            message: 'Customer account registered successfully',

            userId: result.insertId

        });



    } catch (error) {

        console.error('Error during registration:', error);



        if (error?.code === 'ER_DUP_ENTRY') {

            return res.status(400).json({

                error:

                    'User with this email or username already exists.'

            });

        }



        res.status(500).json({

            error: 'Internal server error'

        });

    }

});



// Login

router.post('/login', async (req, res) => {

    try {

        const { username, password } = req.body;



        if (!username || !password) {

            return res.status(400).json({ error: 'Username and password are required' });

        }



        // Find user

        const [users] = await pool.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);

        if (users.length === 0) {

            return res.status(401).json({ error: 'Invalid credentials' });

        }



        const user = users[0];



        if (

    user.status &&

    user.status !== 'active'

) {

    return res.status(403).json({

        error:

            'This account is inactive. Please contact Rayjin Hardware.'

    });

}



        // Google-only account — no password set

        if (!user.password_hash) {

            return res.status(401).json({ error: 'This account uses Google Sign-In. Please use the "Continue with Google" button.' });

        }



        // Check password

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {

            return res.status(401).json({ error: 'Invalid credentials' });

        }



        // Generate JWT



if (!process.env.JWT_SECRET) {

    console.error('JWT_SECRET is not configured.');



    return res.status(500).json({

        error: 'Server authentication configuration error.'

    });

}



const token = jwt.sign(

    {

        id: user.id,

        username: user.username,

        role: user.role

    },

    process.env.JWT_SECRET,

    {

        expiresIn: '24h'

    }

);



        res.json({

            message: 'Login successful',

            token,

            user: {

                id: user.id,

                username: user.username,

                email: user.email,

                role: user.role,

                first_name: user.first_name,

                last_name: user.last_name,

                phone_number: user.phone_number,

                address: user.address,

                supporting_address: user.supporting_address

            }

        });

    } catch (error) {

        console.error('Error during login:', error);

        res.status(500).json({ error: 'Internal server error' });

    }

});



// ─────────────────────────────────────────────

// Forgot Password

// ─────────────────────────────────────────────

router.post('/forgot-password', async (req, res) => {

    try {

        const { email } = req.body;



        if (!email) {

            return res.status(400).json({

                error: 'Email address is required.'

            });

        }



        // Find user by email

        const [users] = await pool.query(

            'SELECT id, email, first_name FROM users WHERE email = ? LIMIT 1',

            [email]

        );



        // Always return a generic response if account does not exist.

        // This prevents revealing which emails are registered.

        if (users.length === 0) {

            return res.json({

                message: 'If an account exists with that email, a password reset link has been sent.'

            });

        }



        const user = users[0];



        // Generate a secure random token

        const resetToken = crypto.randomBytes(32).toString('hex');



        // Store only a hash of the token in the database

        const tokenHash = crypto

            .createHash('sha256')

            .update(resetToken)

            .digest('hex');



        // Remove previous unused reset tokens for this user

        await pool.query(

            'DELETE FROM password_reset_tokens WHERE user_id = ?',

            [user.id]

        );



        // Token expires after 15 minutes

        await pool.query(

            `INSERT INTO password_reset_tokens

             (user_id, token_hash, expires_at)

             VALUES (?, ?, NOW() + INTERVAL '15 minutes')`,

            [user.id, tokenHash]

        );



        const frontendUrl =

            process.env.FRONTEND_URL || 'http://localhost:5173';



        const resetUrl =

            `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;



        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {

            console.error('EMAIL_USER or EMAIL_APP_PASSWORD is missing.');

            return res.status(500).json({

                error: 'Email service is not configured.'

            });

        }



        const transporter = nodemailer.createTransport({

            service: 'gmail',

            auth: {

                user: process.env.EMAIL_USER,

                pass: process.env.EMAIL_APP_PASSWORD

            }

        });



        await transporter.sendMail({
    from: `"Rayjin Hardware" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Reset Your Rayjin Hardware Password',

    text: `
Hello${user.first_name ? ` ${user.first_name}` : ''},

We received a request to reset the password for your Rayjin Hardware account.

Use the link below to create a new password:

${resetUrl}

This password reset link will expire in 15 minutes.

SECURITY NOTICE

If you did not request this password reset, you can safely ignore this email. Your current password will remain unchanged.

For your security, do not forward or share this password reset link with anyone.

Thank you,
Rayjin Hardware
Brgy. Poblacion, Zone 11
Initao, Misamis Oriental

This is an automated security notification. Please do not reply to this email.
    `,

    html: `
    <div style="
        margin: 0;
        padding: 32px 12px;
        background-color: #f4f7f5;
        font-family: Arial, Helvetica, sans-serif;
        color: #17372d;
    ">
        <div style="
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #e2e8e5;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(20, 83, 45, 0.08);
        ">

            <!-- HEADER -->
            <div style="
                background-color: #14532d;
                padding: 24px 32px;
                text-align: center;
            ">
                <div style="
                    color: #ffffff;
                    font-size: 21px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                ">
                    RAYJIN HARDWARE
                </div>

                <div style="
                    margin-top: 5px;
                    color: #bbf7d0;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 2px;
                ">
                    ACCOUNT SECURITY
                </div>
            </div>

            <!-- MAIN CONTENT -->
            <div style="padding: 36px 32px;">

                <!-- SECURITY ICON -->
                <div style="text-align: center; margin-bottom: 18px;">
                    <div style="
                        display: inline-block;
                        width: 58px;
                        height: 58px;
                        line-height: 58px;
                        border-radius: 50%;
                        background-color: #f0fdf4;
                        border: 1px solid #bbf7d0;
                        color: #15803d;
                        font-size: 27px;
                    ">
                        🔒
                    </div>
                </div>

                <h1 style="
                    margin: 0;
                    text-align: center;
                    color: #14532d;
                    font-size: 26px;
                    line-height: 1.3;
                ">
                    Reset Your Password
                </h1>

                <p style="
                    margin: 10px 0 28px;
                    text-align: center;
                    color: #64756e;
                    font-size: 14px;
                    line-height: 1.6;
                ">
                    We received a password reset request for your
                    Rayjin Hardware customer account.
                </p>

                <p style="
                    margin: 0 0 14px;
                    font-size: 15px;
                    line-height: 1.7;
                ">
                    Hello${user.first_name ? ` ${user.first_name}` : ''},
                </p>

                <p style="
                    margin: 0 0 24px;
                    color: #40564d;
                    font-size: 14px;
                    line-height: 1.7;
                ">
                    Click the button below to create a new password for
                    your Rayjin Hardware account.
                </p>

                <!-- RESET BUTTON -->
                <div style="
                    text-align: center;
                    margin: 30px 0;
                ">
                    <a
                        href="${resetUrl}"
                        style="
                            display: inline-block;
                            background-color: #15803d;
                            color: #ffffff;
                            text-decoration: none;
                            padding: 14px 30px;
                            border-radius: 9px;
                            font-size: 14px;
                            font-weight: 700;
                            letter-spacing: 0.3px;
                        "
                    >
                        Reset Password
                    </a>
                </div>

                <!-- EXPIRATION NOTICE -->
                <div style="
                    margin: 0 0 24px;
                    padding: 14px 16px;
                    border-radius: 10px;
                    background-color: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    text-align: center;
                ">
                    <div style="
                        color: #166534;
                        font-size: 13px;
                        font-weight: 700;
                    ">
                        This link expires in 15 minutes.
                    </div>
                </div>

                <!-- SECURITY NOTICE -->
                <div style="
                    margin-top: 26px;
                    padding: 18px;
                    background-color: #fffbeb;
                    border: 1px solid #fde68a;
                    border-radius: 10px;
                ">
                    <div style="
                        margin-bottom: 7px;
                        color: #92400e;
                        font-size: 12px;
                        font-weight: 800;
                        letter-spacing: 0.7px;
                    ">
                        SECURITY NOTICE
                    </div>

                    <p style="
                        margin: 0;
                        color: #78350f;
                        font-size: 13px;
                        line-height: 1.65;
                    ">
                        If you did not request this password reset,
                        you can safely ignore this email. Your current
                        password will remain unchanged.
                    </p>

                    <p style="
                        margin: 9px 0 0;
                        color: #78350f;
                        font-size: 13px;
                        line-height: 1.65;
                    ">
                        For your security, never forward or share this
                        password reset link with anyone.
                    </p>
                </div>

                <p style="
                    margin: 28px 0 0;
                    color: #40564d;
                    font-size: 14px;
                    line-height: 1.7;
                ">
                    Thank you,<br>
                    <strong style="color: #14532d;">
                        Rayjin Hardware
                    </strong>
                </p>
            </div>

            <!-- FOOTER -->
            <div style="
                padding: 22px 32px;
                background-color: #f8faf9;
                border-top: 1px solid #e5ebe7;
                text-align: center;
            ">
                <div style="
                    color: #14532d;
                    font-size: 13px;
                    font-weight: 700;
                ">
                    Rayjin Hardware
                </div>

                <div style="
                    margin-top: 6px;
                    color: #708078;
                    font-size: 11px;
                    line-height: 1.6;
                ">
                    Brgy. Poblacion, Zone 11<br>
                    Initao, Misamis Oriental
                </div>

                <div style="
                    margin-top: 14px;
                    color: #94a39c;
                    font-size: 10px;
                    line-height: 1.5;
                ">
                    This is an automated account security notification.<br>
                    Please do not reply to this email.
                </div>
            </div>

        </div>
    </div>
    `
});


        res.json({

            message: 'If an account exists with that email, a password reset link has been sent.'

        });



    } catch (error) {

        console.error('Forgot password error:', error);



        res.status(500).json({

            error: 'Unable to send password reset email. Please try again.'

        });

    }

});





// ─────────────────────────────────────────────

// Reset Password

// ─────────────────────────────────────────────

router.post('/reset-password', async (req, res) => {

    try {

        const { token, password } = req.body;



        if (!token || !password) {

            return res.status(400).json({

                error: 'Reset token and new password are required.'

            });

        }



        if (password.length < 8) {

            return res.status(400).json({

                error: 'Password must contain at least 8 characters.'

            });

        }



        const tokenHash = crypto

            .createHash('sha256')

            .update(token)

            .digest('hex');



        const [tokens] = await pool.query(

            `SELECT prt.id, prt.user_id

             FROM password_reset_tokens prt

             WHERE prt.token_hash = ?

               AND prt.used_at IS NULL

               AND prt.expires_at > NOW()

             LIMIT 1`,

            [tokenHash]

        );



        if (tokens.length === 0) {

            return res.status(400).json({

                error: 'This password reset link is invalid or has expired.'

            });

        }



        const resetRecord = tokens[0];



        const passwordHash = await bcrypt.hash(password, 10);



        await pool.query(

            'UPDATE users SET password_hash = ? WHERE id = ?',

            [passwordHash, resetRecord.user_id]

        );



        await pool.query(

            'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',

            [resetRecord.id]

        );



        // Remove any other outstanding reset tokens for the user

        await pool.query(

            `DELETE FROM password_reset_tokens

             WHERE user_id = ? AND id <> ?`,

            [resetRecord.user_id, resetRecord.id]

        );



        res.json({

            message: 'Password successfully reset. You can now sign in with your new password.'

        });



    } catch (error) {

        console.error('Reset password error:', error);



        res.status(500).json({

            error: 'Unable to reset password. Please try again.'

        });

    }

});



// ─────────────────────────────────────────────

// Google OAuth Authentication

// Existing customers -> Sign In

// New/incomplete customers -> Complete Registration

// ─────────────────────────────────────────────



const createGoogleRegistrationToken = ({

    googleId,

    email,

    firstName,

    lastName,

    avatarUrl,

    existingUserId = null

}) => {



    if (!process.env.JWT_SECRET) {

        throw new Error(

            'JWT_SECRET is not configured.'

        );

    }



    return jwt.sign(

        {

            type:

                'google_registration',



            google_id:

                googleId,



            email,



            first_name:

                firstName || '',



            last_name:

                lastName || '',



            avatar_url:

                avatarUrl || null,



            existing_user_id:

                existingUserId

        },



        process.env.JWT_SECRET,



        {

            expiresIn: '15m'

        }

    );

};





// ─────────────────────────────────────────────

// Google Sign-In / Start Google Registration

// ─────────────────────────────────────────────



router.post(

    '/google',

    async (req, res) => {



        try {



            const {

                id_token,

                mode

            } = req.body;



            const requestedMode =

                mode === 'register'

                    ? 'register'

                    : 'login';



            if (!id_token) {

                return res

                    .status(400)

                    .json({

                        error:

                            'Google ID token is required.'

                    });

            }



            if (

                !process.env

                    .GOOGLE_CLIENT_ID

            ) {

                console.error(

                    'GOOGLE_CLIENT_ID is not configured.'

                );



                return res

                    .status(500)

                    .json({

                        error:

                            'Google authentication is not configured.'

                    });

            }





            // Verify token server-side

            const {

                OAuth2Client

            } =

                await import(

                    'google-auth-library'

                );



            const client =

                new OAuth2Client(

                    process.env

                        .GOOGLE_CLIENT_ID

                );



            let payload;



            try {



                const ticket =

                    await client

                        .verifyIdToken({

                            idToken:

                                id_token,



                            audience:

                                process

                                    .env

                                    .GOOGLE_CLIENT_ID

                        });



                payload =

                    ticket.getPayload();



            } catch (

                verifyError

            ) {



                console.error(

                    'Google token verification failed:',

                    verifyError?.message

                );



                return res

                    .status(401)

                    .json({

                        error:

                            'Invalid Google token. Please try signing in again.'

                    });

            }





            if (!payload) {

                return res

                    .status(401)

                    .json({

                        error:

                            'Google authentication information could not be verified.'

                    });

            }





            const {

                sub:

                    googleId,



                email,



                email_verified:

                    emailVerified,



                given_name:

                    givenName,



                family_name:

                    familyName,



                picture

            } = payload;





            if (

                !email ||

                !googleId

            ) {

                return res

                    .status(400)

                    .json({

                        error:

                            'Google did not provide the required account information.'

                    });

            }





            // Only use Google emails Google says are verified.

            if (

                emailVerified !== true

            ) {

                return res

                    .status(403)

                    .json({

                        error:

                            'Your Google email address must be verified before it can be used with Rayjin Hardware.'

                    });

            }





            const normalizedEmail =

                String(email)

                    .trim()

                    .toLowerCase();





            // ---------------------------------

            // Look for existing account

            // First by google_id, then email

            // ---------------------------------



            let user = null;





            const [

                usersByGoogle

            ] =

                await pool.query(

                    `

                    SELECT *

                    FROM users

                    WHERE google_id = ?

                    LIMIT 1

                    `,

                    [googleId]

                );





            if (

                usersByGoogle.length > 0

            ) {



                user =

                    usersByGoogle[0];



            } else {



                const [

                    usersByEmail

                ] =

                    await pool.query(

                        `

                        SELECT *

                        FROM users

                        WHERE LOWER(email) = ?

                        LIMIT 1

                        `,

                        [

                            normalizedEmail

                        ]

                    );





                if (

                    usersByEmail.length > 0

                ) {

                    user =

                        usersByEmail[0];

                }

            }





            // =================================

            // EXISTING ACCOUNT

            // =================================



            if (user) {



                // Google authentication is

                // only an enhancement for Customers.

                if (

                    user.role !==

                    'customer'

                ) {



                    return res

                        .status(403)

                        .json({

                            error:

                                'Google Sign-In is available for customer accounts only.'

                        });

                }





                if (

                    user.status &&

                    user.status !==

                        'active'

                ) {



                    return res

                        .status(403)

                        .json({

                            error:

                                'This customer account is inactive. Please contact Rayjin Hardware.'

                        });

                }





                // Prevent linking a different

                // Google identity to an already

                // linked Rayjin account.

                if (

                    user.google_id &&

                    user.google_id !==

                        googleId

                ) {



                    return res

                        .status(409)

                        .json({

                            error:

                                'This Rayjin Hardware account is already linked to another Google account.'

                        });

                }





                const needsCompletion =

                    !String(

                        user.first_name ||

                            ''

                    ).trim() ||



                    !String(

                        user.last_name ||

                            ''

                    ).trim() ||



                    !String(

                        user.username ||

                            ''

                    ).trim() ||



                    !String(

                        user.phone_number ||

                            ''

                    ).trim() ||



                    !user.password_hash;





                // ---------------------------------

                // OLD / INCOMPLETE GOOGLE ACCOUNT

                // ---------------------------------



                if (

                    needsCompletion

                ) {



                    const registrationToken =

                        createGoogleRegistrationToken(

                            {

                                googleId,



                                email:

                                    String(

                                        user.email ||

                                            normalizedEmail

                                    )

                                        .trim()

                                        .toLowerCase(),



                                firstName:

                                    user.first_name ||

                                    givenName ||

                                    '',



                                lastName:

                                    user.last_name ||

                                    familyName ||

                                    '',



                                avatarUrl:

                                    picture ||

                                    user.avatar_url ||

                                    null,



                                existingUserId:

                                    user.id

                            }

                        );





                    return res.json({

                        requires_registration:

                            true,



                        google_registration_token:

                            registrationToken,



                        google_profile:

                            {

                                first_name:

                                    user.first_name ||

                                    givenName ||

                                    '',



                                last_name:

                                    user.last_name ||

                                    familyName ||

                                    '',



                                email:

                                    String(

                                        user.email ||

                                            normalizedEmail

                                    )

                                        .trim()

                                        .toLowerCase(),



                                avatar_url:

                                    picture ||

                                    user.avatar_url ||

                                    null

                            }

                    });

                }





                // ---------------------------------

                // COMPLETE EXISTING CUSTOMER

                // Link Google if needed

                // ---------------------------------



                await pool.query(

                    `

                    UPDATE users

                    SET

                        google_id = ?,

                        avatar_url = ?

                    WHERE id = ?

                    `,

                    [

                        googleId,



                        picture ||

                            user.avatar_url ||

                            null,



                        user.id

                    ]

                );





                user.google_id =

                    googleId;



                user.avatar_url =

                    picture ||

                    user.avatar_url ||

                    null;





                if (

                    !process.env

                        .JWT_SECRET

                ) {



                    console.error(

                        'JWT_SECRET is not configured.'

                    );



                    return res

                        .status(500)

                        .json({

                            error:

                                'Server authentication configuration error.'

                        });

                }





                const token =

                    jwt.sign(

                        {

                            id:

                                user.id,



                            username:

                                user.username,



                            role:

                                user.role

                        },



                        process.env

                            .JWT_SECRET,



                        {

                            expiresIn:

                                '24h'

                        }

                    );





                return res.json({

                    message:

                        'Google authentication successful',



                    token,



                    user:

                        {

                            id:

                                user.id,



                            username:

                                user.username,



                            email:

                                user.email,



                            role:

                                user.role,



                            first_name:

                                user.first_name,



                            last_name:

                                user.last_name,



                            phone_number:

                                user.phone_number,



                            address:

                                user.address,



                            supporting_address:

                                user.supporting_address,



                            avatar_url:

                                user.avatar_url

                        }

                });

            }





            // =================================

            // NEW GOOGLE USER

            // =================================



            if (

                requestedMode !==

                'register'

            ) {



                return res

                    .status(404)

                    .json({

                        error:

                            'No Rayjin Hardware account is registered with this Google email. Please choose Sign Up first.'

                    });

            }





            const registrationToken =

                createGoogleRegistrationToken(

                    {

                        googleId,



                        email:

                            normalizedEmail,



                        firstName:

                            givenName ||

                            '',



                        lastName:

                            familyName ||

                            '',



                        avatarUrl:

                            picture ||

                            null

                    }

                );





            return res.json({

                requires_registration:

                    true,



                google_registration_token:

                    registrationToken,



                google_profile:

                    {

                        first_name:

                            givenName ||

                            '',



                        last_name:

                            familyName ||

                            '',



                        email:

                            normalizedEmail,



                        avatar_url:

                            picture ||

                            null

                    }

            });





        } catch (error) {



            console.error(

                'Error during Google authentication:',

                error

            );



            return res

                .status(500)

                .json({

                    error:

                        'Internal server error during Google authentication.'

                });

        }

    }

);





// ─────────────────────────────────────────────

// Complete Google-assisted Customer Registration

// ─────────────────────────────────────────────



router.post(

    '/google/complete-register',

    async (req, res) => {



        try {



            const {

                google_registration_token,

                first_name,

                last_name,

                username,

                phone_number,

                address,

                password

            } = req.body;





            if (

                !google_registration_token

            ) {

                return res

                    .status(400)

                    .json({

                        error:

                            'Google registration session is missing. Please sign up with Google again.'

                    });

            }





            if (

                !process.env.JWT_SECRET

            ) {

                console.error(

                    'JWT_SECRET is not configured.'

                );



                return res

                    .status(500)

                    .json({

                        error:

                            'Server authentication configuration error.'

                    });

            }





            let googleRegistration;



            try {



                googleRegistration =

                    jwt.verify(

                        google_registration_token,

                        process.env.JWT_SECRET

                    );



            } catch (tokenError) {



                return res

                    .status(401)

                    .json({

                        error:

                            'Your Google registration session is invalid or has expired. Please sign up with Google again.'

                    });

            }





            if (

                !googleRegistration ||

                typeof googleRegistration !==

                    'object' ||

                googleRegistration.type !==

                    'google_registration'

            ) {



                return res

                    .status(401)

                    .json({

                        error:

                            'Invalid Google registration session.'

                    });

            }





            const googleId =

                String(

                    googleRegistration

                        .google_id ||

                        ''

                ).trim();



            const normalizedEmail =

                String(

                    googleRegistration

                        .email ||

                        ''

                )

                    .trim()

                    .toLowerCase();





            if (

                !googleId ||

                !normalizedEmail

            ) {

                return res

                    .status(401)

                    .json({

                        error:

                            'Google registration information is incomplete.'

                    });

            }





            const firstName =

                String(

                    first_name ||

                        ''

                ).trim();



            const lastName =

                String(

                    last_name ||

                        ''

                ).trim();



            const normalizedUsername =

                String(

                    username ||

                        ''

                ).trim();



            const phone =

                String(

                    phone_number ||

                        ''

                ).trim();



            const normalizedPhone =

                phone.replace(

                    /[\s\-()]/g,

                    ''

                );



            const customerAddress =

                String(

                    address ||

                        ''

                ).trim();



            const passwordValue =

                String(

                    password ||

                        ''

                );





            // Required Rayjin customer fields

            if (

                !firstName ||

                !lastName ||

                !normalizedUsername ||

                !phone ||

                !customerAddress ||

                !passwordValue

            ) {



                return res

                    .status(400)

                    .json({

                        error:

                            'First name, last name, username, contact number, address, and password are required.'

                    });

            }





            if (!PH_MOBILE_PATTERN.test(normalizedPhone)) {

                return res

                    .status(400)

                    .json({

                        error:

                            'Please provide a valid Philippine mobile number in the format +639XXXXXXXXX.'

                    });

            }



            const passwordError =

                validateStrongRegistrationPassword(passwordValue);



            if (passwordError) {

                return res

                    .status(400)

                    .json({ error: passwordError });

            }





            const passwordHash =

                await bcrypt.hash(

                    passwordValue,

                    10

                );





            const avatarUrl =

                googleRegistration

                    .avatar_url ||

                null;





            const existingUserId =

                Number(

                    googleRegistration

                        .existing_user_id ||

                        0

                ) || null;





            // =================================

            // COMPLETE LEGACY/INCOMPLETE USER

            // =================================



            if (

                existingUserId

            ) {



                const [

                    existingUsers

                ] =

                    await pool.query(

                        `

                        SELECT *

                        FROM users

                        WHERE id = ?

                        LIMIT 1

                        `,

                        [

                            existingUserId

                        ]

                    );





                if (

                    existingUsers.length ===

                    0

                ) {



                    return res

                        .status(404)

                        .json({

                            error:

                                'Customer account was not found.'

                        });

                }





                const existingUser =

                    existingUsers[0];





                if (

                    existingUser.role !==

                    'customer'

                ) {



                    return res

                        .status(403)

                        .json({

                            error:

                                'Google registration is available for customer accounts only.'

                        });

                }





                if (

                    existingUser.status &&

                    existingUser.status !==

                        'active'

                ) {



                    return res

                        .status(403)

                        .json({

                            error:

                                'This customer account is inactive.'

                        });

                }





                if (

                    String(

                        existingUser.email ||

                            ''

                    )

                        .trim()

                        .toLowerCase() !==

                    normalizedEmail

                ) {



                    return res

                        .status(409)

                        .json({

                            error:

                                'Google registration does not match the existing customer account.'

                        });

                }





                if (

                    existingUser.google_id &&

                    existingUser.google_id !==

                        googleId

                ) {



                    return res

                        .status(409)

                        .json({

                            error:

                                'This customer account is already linked to another Google account.'

                        });

                }



                const alreadyComplete =

    String(existingUser.first_name || '').trim() &&

    String(existingUser.last_name || '').trim() &&

    String(existingUser.username || '').trim() &&

    String(existingUser.phone_number || '').trim() &&

    String(existingUser.address || '').trim() &&

    existingUser.password_hash;



if (alreadyComplete) {

    return res.status(409).json({

        error:

            'This Google registration has already been completed. Please sign in instead.'

    });

}

                const [

                    duplicateUsers

                ] =

                    await pool.query(

                        `

                        SELECT id

                        FROM users

                        WHERE id <> ?

                          AND (

                              username = ?

                              OR google_id = ?

                          )

                        LIMIT 1

                        `,

                        [

                            existingUserId,

                            normalizedUsername,

                            googleId

                        ]

                    );





                if (

                    duplicateUsers.length >

                    0

                ) {



                    return res

                        .status(400)

                        .json({

                            error:

                                'That username is already in use. Please choose another username.'

                        });

                }





                await pool.query(
    `
    UPDATE users
    SET
        username = ?,
        email = ?,
        password_hash = ?,
        first_name = ?,
        last_name = ?,
        phone_number = ?,
        address = ?,
        google_id = ?,
        avatar_url = ?
    WHERE id = ?
    `,
    [
        normalizedUsername,
        normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        normalizedPhone,

        customerAddress ||
            existingUser.address ||
            null,

        googleId,

        avatarUrl ||
            existingUser.avatar_url ||
            null,

        existingUserId
    ]
);

// Send the same non-critical welcome email after
// Google-assisted registration is successfully completed.
await sendRegistrationWelcomeEmail({
    email: normalizedEmail,
    firstName,
    username: normalizedUsername
});

return res.json({
    message:
        'Google customer registration completed successfully.',

    userId:
        existingUserId
});

            }





            // =================================

            // CREATE BRAND-NEW GOOGLE CUSTOMER

            // =================================



            const [

                duplicates

            ] =

                await pool.query(

                    `

                    SELECT id

                    FROM users

                    WHERE

                        LOWER(email) = ?

                        OR username = ?

                        OR google_id = ?

                    LIMIT 1

                    `,

                    [

                        normalizedEmail,

                        normalizedUsername,

                        googleId

                    ]

                );





            if (

                duplicates.length > 0

            ) {



                return res

                    .status(409)

                    .json({

                        error:

                            'A Rayjin Hardware account already exists for this Google account or username. Please try signing in instead.'

                    });

            }





            const [
    result
] =
    await pool.query(
        `
        INSERT INTO users
        (
            username,
            email,
            password_hash,
            role,
            first_name,
            last_name,
            phone_number,
            address,
            google_id,
            avatar_url
        )
        VALUES
        (?, ?, ?, 'customer', ?, ?, ?, ?, ?, ?)
        `,
        [
            normalizedUsername,
            normalizedEmail,
            passwordHash,
            firstName,
            lastName,
            normalizedPhone,
            customerAddress ||
                null,
            googleId,
            avatarUrl
        ]
    );

// Send the same non-critical welcome email after
// the new Google customer is successfully created.
await sendRegistrationWelcomeEmail({
    email: normalizedEmail,
    firstName,
    username: normalizedUsername
});

return res
    .status(201)
    .json({
        message:
            'Google customer registration completed successfully.',

        userId:
            result.insertId
    });


        } catch (error) {



            console.error(

                'Complete Google registration error:',

                error

            );





            if (

                error?.code ===

                'ER_DUP_ENTRY'

            ) {



                return res

                    .status(409)

                    .json({

                        error:

                            'This email, username, or Google account is already registered.'

                    });

            }





            return res

                .status(500)

                .json({

                    error:

                        'Unable to complete Google registration.'

                });

        }

    }

);



// Load the authenticated user's current profile from the database.

router.get('/profile', authenticateToken, async (req, res) => {

    try {

        const [users] = await pool.query(

            `SELECT id, username, email, first_name, last_name, phone_number,

                    address, supporting_address, role, avatar_url

             FROM users WHERE id = ? LIMIT 1`,

            [req.user.id]

        );

        if (!users.length) return res.status(404).json({ error: 'Account was not found.' });

        res.json({ user: users[0] });

    } catch (error) {

        console.error('Profile load error:', error);

        res.status(500).json({ error: 'Failed to load profile.' });

    }

});



// Update authenticated customer's profile

router.put(

    '/profile',

    authenticateToken,

    async (req, res) => {

        try {

            const {

                first_name,

                last_name,

                phone_number,

                address,

                supporting_address

            } = req.body;



            const phone =

                String(phone_number || '').trim();



            const normalizedPhone =

                phone.replace(

                    /[\s\-()]/g,

                    ''

                );



            if (!PH_MOBILE_PATTERN.test(normalizedPhone)) {

                return res.status(400).json({

                    error:

                        'Please provide a valid Philippine mobile number in the format +639XXXXXXXXX.'

                });

            }



            const [result] =

                await pool.query(

                    `

                    UPDATE users

                    SET

                        first_name = ?,

                        last_name = ?,

                        phone_number = ?,

                        address = ?,

                        supporting_address = ?

                    WHERE id = ?

                    `,

                    [

                        String(first_name || '').trim(),

                        String(last_name || '').trim(),

                        normalizedPhone,

                        String(address || '').trim() || null,

                        String(supporting_address || '').trim() || null,

                        req.user.id

                    ]

                );



            if (result.affectedRows === 0) {

                return res.status(404).json({

                    error:

                        'Customer account was not found.'

                });

            }



            const [users] =

                await pool.query(

                    `

                    SELECT

                        id,

                        username,

                        email,

                        first_name,

                        last_name,

                        phone_number,

                        address,

                        supporting_address,

                        role

                    FROM users

                    WHERE id = ?

                    LIMIT 1

                    `,

                    [req.user.id]

                );



            res.json({

                message:

                    'Profile saved successfully.',

                user: users[0]

            });



        } catch (err) {

            console.error(

                'Profile update error:',

                err

            );



            res.status(500).json({

                error:

                    'Failed to update profile.'

            });

        }

    }

);



export default router;
