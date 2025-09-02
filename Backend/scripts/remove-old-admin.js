const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeOldAdmin() {
  try {
    console.log('🔍 Eski admin kullanıcısı aranıyor...');
    
    // admin@example.com kullanıcısını bul
    const oldAdmin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });
    
    if (!oldAdmin) {
      console.log('✅ admin@example.com kullanıcısı bulunamadı (zaten silinmiş)');
      return;
    }
    
    console.log(`❌ Eski admin bulundu: ${oldAdmin.email} (ID: ${oldAdmin.id})`);
    console.log('🗑️  Siliniyor...');
    
    // Kullanıcıyı sil
    await prisma.user.delete({
      where: { email: 'admin@example.com' }
    });
    
    console.log('✅ Eski admin kullanıcısı başarıyla silindi!');
    
    // Mevcut admin'leri listele
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, email: true, name: true, role: true }
    });
    
    console.log('\n👑 Mevcut admin kullanıcıları:');
    admins.forEach(admin => {
      console.log(`  - ${admin.email} (${admin.name || 'İsimsiz'}) - ${admin.role}`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

removeOldAdmin();
