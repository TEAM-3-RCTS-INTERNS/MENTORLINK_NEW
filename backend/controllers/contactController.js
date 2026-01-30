const { MailtrapClient } = require("mailtrap");

// SECURITY FIX: Load token from environment variable
const TOKEN = process.env.MAILTRAP_TOKEN;

if (!TOKEN) {
  console.warn('WARNING: MAILTRAP_TOKEN not set in environment variables');
}

const client = TOKEN ? new MailtrapClient({
  token: TOKEN,
}) : null;

const sender = {
  email: "hello@demomailtrap.co",
  name: "MentorLink Contact Form",
};

// SECURITY FIX: HTML escape function to prevent XSS in emails
const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Simple in-memory rate limiting (for production, use Redis)
const submissionTracker = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_HOUR = 3; // Max 3 submissions per hour per IP

// Email validation - check format and common disposable domains
const disposableDomains = [
  'tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com',
  'temp-mail.org', '10minutemail.com', 'fakeinbox.com', 'trashmail.com',
  'yopmail.com', 'getnada.com', 'tempail.com', 'dispostable.com'
];

const validateEmail = (email) => {
  // Check basic format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'Invalid email format' };
  }

  // Check for disposable email domains
  const domain = email.split('@')[1].toLowerCase();
  if (disposableDomains.includes(domain)) {
    return { valid: false, reason: 'Disposable email addresses are not allowed' };
  }

  // Check for suspicious patterns
  if (email.includes('test@') || email.includes('fake@') || email.includes('spam@')) {
    return { valid: false, reason: 'Please use a valid email address' };
  }

  return { valid: true };
};

// Rate limiting check
const checkRateLimit = (ip) => {
  const now = Date.now();
  const submissions = submissionTracker.get(ip) || [];

  // Filter out old submissions
  const recentSubmissions = submissions.filter(time => now - time < RATE_LIMIT_WINDOW);

  if (recentSubmissions.length >= MAX_SUBMISSIONS_PER_HOUR) {
    return { allowed: false, remaining: 0 };
  }

  // Update tracker
  recentSubmissions.push(now);
  submissionTracker.set(ip, recentSubmissions);

  return { allowed: true, remaining: MAX_SUBMISSIONS_PER_HOUR - recentSubmissions.length };
};

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
const submitContactForm = async (req, res) => {
  const { name, email, subject, message, honeypot } = req.body;

  // Honeypot check - if filled, it's a bot
  if (honeypot) {
    console.log('Bot detected - honeypot filled');
    // Return success to not alert the bot
    return res.status(200).json({ message: 'Message sent successfully' });
  }

  // Basic validation
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'Please fill in all fields' });
  }

  // Name validation
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
  }

  // Message validation
  if (message.length < 10 || message.length > 5000) {
    return res.status(400).json({ message: 'Message must be between 10 and 5000 characters' });
  }

  // Email validation
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) {
    return res.status(400).json({ message: emailCheck.reason });
  }

  // Rate limiting
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const rateCheck = checkRateLimit(clientIP);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      message: 'Too many submissions. Please try again later.',
      retryAfter: RATE_LIMIT_WINDOW / 1000
    });
  }

  // Check if email client is configured
  if (!client) {
    console.error('Mailtrap client not configured - MAILTRAP_TOKEN missing');
    return res.status(503).json({ message: 'Email service temporarily unavailable' });
  }

  try {
    const recipients = [
      {
        email: process.env.CONTACT_EMAIL || "mentorlink9@gmail.com",
      }
    ];

    // SECURITY FIX: Escape all user input before embedding in HTML
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    const result = await client.send({
      from: sender,
      to: recipients,
      subject: `Contact Form: ${safeSubject}`,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
        <hr>
        <p><em>Reply to: ${safeEmail}</em></p>
        <p><small>Submissions remaining for this IP: ${rateCheck.remaining}</small></p>
      `,
      category: "Contact Form",
    });

    console.log('Email sent successfully via Mailtrap:', result);
    res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error.message);
    // SECURITY FIX: Don't expose internal error details to client
    res.status(500).json({ message: 'Failed to send message. Please try again later.' });
  }
};

module.exports = {
  submitContactForm,
};
