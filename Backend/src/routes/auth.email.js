const { Router } = require('express');
const { randomBytes } = require('crypto');
const prisma = require('../lib/prisma.js');
const { sendMail } = require('../lib/mailer.js');
const { z } = require('zod');

const r = Router();

// kayıt sonrası çağır veya register içinde tetikle
r.post('/email/send', async (req, res, next) => {
  try {
    console.log('📧 EMAIL SEND REQUEST:', req.body);
    const SendSchema = z.object({ userId: z.string().min(1) });
    const parsed = SendSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_error', details: parsed.error.issues });
    const { userId } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'not_found' });

    // önceki tokenları iptal et
    await prisma.emailVerificationToken.deleteMany({ where: { userId } });

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 haneli kod
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 dk
    await prisma.emailVerificationToken.create({ 
      data: { userId, token: code, expiresAt: expires } 
    });

    try {
      await sendMail({
        to: user.email,
        subject: 'E-posta doğrulama kodu',
        html: `<p>Merhaba, e-posta doğrulama kodun: <strong>${code}</strong></p><p>Bu kod 15 dakika geçerlidir.</p>`
      });
      
      console.log('✅ Email sent successfully to:', user.email);
      res.json({ ok: true });
    } catch (emailError) {
      console.log('❌ Email send failed:', emailError.message);
      // Development'ta email hatası kritik değil
      res.json({ 
        ok: true, 
        warning: 'Email gönderilemedi ama kullanıcı oluşturuldu',
        emailError: emailError.message 
      });
    }
  } catch (e) { 
    next(e); 
  }
});

r.post('/email/verify', async (req, res, next) => {
  try {
    console.log('🔍 EMAIL VERIFY REQUEST:', req.body);
    const VerifySchema = z.object({ token: z.string().regex(/^\d{6}$/) });
    const parsed = VerifySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_error', details: parsed.error.issues });
    const { token } = parsed.data;
    const rec = await prisma.emailVerificationToken.findUnique({ where: { token } });
    console.log('🔍 Token record found:', rec);
    
    if (!rec) {
      console.log('❌ Token not found');
      return res.status(400).json({ error: 'invalid_or_expired' });
    }
    
    if (rec.usedAt) {
      console.log('❌ Token already used at:', rec.usedAt);
      return res.status(400).json({ error: 'invalid_or_expired' });
    }
    
    if (rec.expiresAt < new Date()) {
      console.log('❌ Token expired at:', rec.expiresAt);
      return res.status(400).json({ error: 'invalid_or_expired' });
    }
    
    console.log('✅ Token is valid');
    
    await prisma.$transaction([
      prisma.user.update({ 
        where: { id: rec.userId }, 
        data: { emailVerifiedAt: new Date() } 
      }),
      prisma.emailVerificationToken.update({ 
        where: { token }, 
        data: { usedAt: new Date() } 
      })
    ]);
    
    res.json({ ok: true });
  } catch (e) { 
    next(e); 
  }
});

module.exports = r;
