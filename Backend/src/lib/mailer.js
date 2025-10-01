const nodemailer = require('nodemailer');

function makeTransporter() {
  if (process.env.MAIL_PROVIDER === 'sendgrid') {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }
  
  if (process.env.MAIL_PROVIDER === 'mailgun') {
    return nodemailer.createTransport({
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAILGUN_SMTP_USER || 'postmaster',
        pass: process.env.MAILGUN_SMTP_PASS
      }
    });
  }
  
  if (process.env.MAIL_PROVIDER === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false // Development için SSL sertifika problemini atla
      }
    });
  }
  
  // Fallback (dev only) - console transport
  return nodemailer.createTransport({ 
    jsonTransport: true 
  });
}

async function sendMail({ to, subject, html }) {
  if (process.env.CONSOLE_MAILER === 'true') {
    console.log('📧 CONSOLE MAIL >>', { to, subject, html });
    return;
  }

  const transporter = makeTransporter();
  const mailFrom = process.env.MAIL_FROM || process.env.GMAIL_USER || 'no-reply@example.com';

  const mailOptions = {
    from: mailFrom,
    to: to,
    subject: subject,
    html: html
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully to:', to, 'Provider:', process.env.MAIL_PROVIDER || 'fallback');
    
    // JSON transport için console output
    if (process.env.MAIL_PROVIDER === undefined || process.env.MAIL_PROVIDER === 'console') {
      console.log('📧 JSON Transport Result:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw error;
  }
}

module.exports = { sendMail, makeTransporter };