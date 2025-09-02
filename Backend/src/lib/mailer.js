const nodemailer = require('nodemailer');

async function sendMail({ to, subject, html }) {
  if (process.env.CONSOLE_MAILER === 'true') {
    console.log('MAIL >>', { to, subject, html });
    return;
  }

  // Gmail SMTP transporter
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: to,
    subject: subject,
    html: html
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully to:', to);
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw error;
  }
}

module.exports = { sendMail };
