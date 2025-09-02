const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdminFromEnv() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Admin Kullanıcı';
    
    if (!adminEmail || !adminPassword) {
      console.log('❌ ADMIN_EMAIL ve ADMIN_PASSWORD environment variable\'ları gereklidir!');
      console.log('\nKullanım:');
      console.log('ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=güçlüşifre123 node scripts/create-admin-env.js');
      process.exit(1);
    }
    
    if (adminPassword.length < 8) {
      console.log('❌ Admin şifresi en az 8 karakter olmalıdır!');
      process.exit(1);
    }
    
    console.log('🔄 Admin kullanıcısı oluşturuluyor...');
    
    // Önce admin var mı kontrol et
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    
    if (existingAdmin) {
      console.log('⚠️  Admin kullanıcısı zaten var, güncelleniyor...');
      
      const updatedAdmin = await prisma.user.update({
        where: { email: adminEmail },
        data: {
          passwordHash: passwordHash,
          role: 'ADMIN',
          emailVerifiedAt: new Date(),
          name: adminName
        }
      });
      
      console.log('✅ Admin kullanıcısı güncellendi');
    } else {
      const newAdmin = await prisma.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          passwordHash: passwordHash,
          role: 'ADMIN',
          emailVerifiedAt: new Date()
        }
      });
      
      console.log('✅ Yeni admin kullanıcısı oluşturuldu');
    }
    
    console.log('\n🎉 Admin başarıyla oluşturuldu!');
    console.log(`📧 Email: ${adminEmail}`);
    console.log('🔑 Şifre: [gizli]');
    console.log('👑 Rol: ADMIN');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminFromEnv();
