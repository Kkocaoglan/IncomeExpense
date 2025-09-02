const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

function askPassword(question) {
  return new Promise(resolve => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    process.stdin.on('data', key => {
      if (key === '\u0003') { // Ctrl+C
        process.exit();
      }
      if (key === '\r' || key === '\n') { // Enter
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\n');
        resolve(password);
        return;
      }
      if (key === '\u007f') { // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      password += key;
      process.stdout.write('*');
    });
  });
}

async function createSecureAdmin() {
  try {
    console.log('🔐 Güvenli Admin Kullanıcısı Oluşturma\n');
    
    // Admin bilgilerini kullanıcıdan al
    const email = await askQuestion('Admin Email: ');
    const name = await askQuestion('Admin Adı: ');
    const password = await askPassword('Admin Şifresi (gizli): ');
    
    if (!email || !password) {
      console.log('\n❌ Email ve şifre gereklidir!');
      process.exit(1);
    }
    
    if (password.length < 8) {
      console.log('\n❌ Şifre en az 8 karakter olmalıdır!');
      process.exit(1);
    }
    
    console.log('\n🔄 Admin kullanıcısı oluşturuluyor...');
    
    // Önce admin var mı kontrol et
    const existingAdmin = await prisma.user.findUnique({
      where: { email: email }
    });
    
    const passwordHash = await bcrypt.hash(password, 12);
    
    if (existingAdmin) {
      console.log('⚠️  Kullanıcı zaten var, güncelleniyor...');
      
      const updatedAdmin = await prisma.user.update({
        where: { email: email },
        data: {
          passwordHash: passwordHash,
          role: 'ADMIN',
          emailVerifiedAt: new Date(),
          name: name || 'Admin Kullanıcı'
        }
      });
      
      console.log('✅ Admin kullanıcısı güncellendi');
    } else {
      const newAdmin = await prisma.user.create({
        data: {
          email: email,
          name: name || 'Admin Kullanıcı',
          passwordHash: passwordHash,
          role: 'ADMIN',
          emailVerifiedAt: new Date()
        }
      });
      
      console.log('✅ Yeni admin kullanıcısı oluşturuldu');
    }
    
    console.log('\n🎉 Admin başarıyla oluşturuldu!');
    console.log(`📧 Email: ${email}`);
    console.log('🔑 Şifre: [gizli]');
    console.log('👑 Rol: ADMIN');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createSecureAdmin();
