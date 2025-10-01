# PEPPER Disaster Recovery Plan

## 🚨 PEPPER Kaybolma Senaryosu

PEPPER değişkeni kaybedildiğinde **TÜM KULLANICILAR** giriş yapamaz hale gelir. Bu kritik bir güvenlik olayıdır.

## 🛡️ Önleyici Tedbirler

### 1. PEPPER Backup Stratejisi
```bash
# Primary PEPPER (Production)
PEPPER=a58013d9c9933a767d973bc30fbfce06b2e14f86797e1e92a9e5e359fd6ad3fd

# Backup locations:
# - Azure Key Vault
# - AWS Secrets Manager  
# - 1Password/Bitwarden (encrypted)
# - Offline USB (encrypted)
```

### 2. Environment Protection
```yaml
# kubernetes secret
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  PEPPER: <base64-encoded-pepper>
```

### 3. Access Control
- **Sadece DevOps Lead** erişebilir
- **2FA zorunlu** vault erişimi için
- **Audit log** her erişimde
- **Emergency contact** listesi

## 🚨 Acil Durum Prosedürü

### Durum 1: PEPPER Kayboldu - Backup Var
```bash
# 1. Maintenance mode aç
kubectl scale deployment app --replicas=0

# 2. Backup'tan PEPPER'ı restore et
kubectl patch secret app-secrets -p='{"data":{"PEPPER":"<backup-base64>"}}'

# 3. Pods'ları restart et
kubectl scale deployment app --replicas=3

# 4. Health check
curl -f https://api.domain.com/healthz
```

### Durum 2: PEPPER Kayboldu - Backup Yok (FELAKET)
```bash
# 1. Emergency announcement
echo "CRITICAL: All user authentication is down"

# 2. Database migration gerekli
# Tüm users tablosunu backup al
pg_dump -t users > users_backup.sql

# 3. Password migration script çalıştır
node scripts/emergency-password-migration.js

# 4. User communication
# Email/SMS ile tüm kullanıcılara password reset
```

### Durum 3: PEPPER Değişti (Yanlışlıkla)
```bash
# 1. Önceki PEPPER'ı bul (git history, backup)
git log --oneline -p .env | grep PEPPER

# 2. Dual PEPPER sistemi aktifleştir
PEPPER_CURRENT=new_pepper_value
PEPPER_PREVIOUS=old_pepper_value

# 3. Background migration başlat
node scripts/pepper-migration.js
```

## 🛠️ Recovery Scripts

### Emergency Password Migration
```javascript
// scripts/emergency-password-migration.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function emergencyPasswordMigration() {
  console.log('🚨 EMERGENCY: PEPPER kayboldu, password migration başlıyor...');
  
  // Yeni PEPPER oluştur
  const newPepper = crypto.randomBytes(32).toString('hex');
  console.log('🔑 Yeni PEPPER:', newPepper);
  
  // Tüm kullanıcılara geçici password ata
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const tempHash = await bcrypt.hash(tempPassword, 14);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordHash: tempHash,
        requiresPasswordReset: true
      }
    });
    
    console.log(`User ${user.email}: temp password = ${tempPassword}`);
    
    // Email gönder (emergency template)
    await sendEmergencyPasswordReset(user.email, tempPassword);
  }
  
  console.log('✅ Migration tamamlandı');
  console.log('📧 Tüm kullanıcılara email gönderildi');
  console.log('🔑 Yeni PEPPER:', newPepper);
}
```

### Dual PEPPER System
```javascript
// Geçiş dönemi için dual verification
async function verifyPasswordWithDualPepper(plainPassword, hashedPassword) {
  const currentPepper = process.env.PEPPER_CURRENT;
  const previousPepper = process.env.PEPPER_PREVIOUS;
  
  // Önce current pepper ile dene
  if (currentPepper) {
    const currentPepperedPassword = crypto
      .createHmac('sha256', currentPepper)
      .update(plainPassword)
      .digest('hex');
    
    const currentMatch = await bcrypt.compare(currentPepperedPassword, hashedPassword);
    if (currentMatch) {
      return { success: true, migration: false };
    }
  }
  
  // Sonra previous pepper ile dene
  if (previousPepper) {
    const previousPepperedPassword = crypto
      .createHmac('sha256', previousPepper)
      .update(plainPassword)
      .digest('hex');
    
    const previousMatch = await bcrypt.compare(previousPepperedPassword, hashedPassword);
    if (previousMatch) {
      // Background'da yeni pepper ile re-hash et
      schedulePasswordRehash(userId, plainPassword);
      return { success: true, migration: true };
    }
  }
  
  return { success: false };
}
```

## 📊 Monitoring & Alerts

### PEPPER Health Check
```javascript
function validatePepperHealth() {
  const pepper = process.env.PEPPER;
  
  if (!pepper) {
    // CRITICAL ALERT
    sendAlert('CRITICAL', 'PEPPER environment variable missing');
    return false;
  }
  
  if (pepper.length < 32) {
    sendAlert('HIGH', 'PEPPER too short, security risk');
    return false;
  }
  
  if (pepper === 'your_secure_random_pepper_string...') {
    sendAlert('CRITICAL', 'PEPPER is default value, security breach');
    return false;
  }
  
  return true;
}
```

### Automated Backup
```bash
#!/bin/bash
# scripts/backup-pepper.sh

# Daily PEPPER backup to secure locations
PEPPER_VALUE=$(grep "^PEPPER=" .env | cut -d'=' -f2)

# Azure Key Vault
az keyvault secret set \
  --vault-name "app-vault" \
  --name "pepper-backup" \
  --value "$PEPPER_VALUE"

# Encrypted file backup
echo "$PEPPER_VALUE" | gpg --cipher-algo AES256 --compress-algo 1 \
  --symmetric --output "/backup/pepper-$(date +%Y%m%d).gpg"
```

## 🎯 Best Practices

### 1. PEPPER Management
- **ASLA git'e commit etme**
- **Slack/email'de paylaşma**
- **Screenshot alma**
- **Production'da change etme**

### 2. Change Management
- **Planned maintenance** window
- **Full backup** before change
- **Rollback plan** ready
- **Communication** to users

### 3. Team Training
- **Incident response** drills
- **Access to emergency scripts**
- **Contact information** updated
- **Recovery procedure** tested

## 📞 Emergency Contacts

```
DevOps Lead: +90-XXX-XXX-XXXX
System Admin: +90-XXX-XXX-XXXX
CTO: +90-XXX-XXX-XXXX

Slack: #emergency-ops
PagerDuty: incident-response
```

## ✅ Recovery Checklist

- [ ] Identify PEPPER issue (missing/changed/corrupted)
- [ ] Enable maintenance mode
- [ ] Attempt backup restore
- [ ] If backup fails, execute emergency migration
- [ ] Notify users (email/SMS/dashboard)
- [ ] Monitor system health post-recovery
- [ ] Post-incident review and documentation
- [ ] Update backup procedures
- [ ] Team training on lessons learned

---
**Last updated:** 2025-01-05  
**Reviewed by:** DevOps Team  
**Next review:** 2025-02-01
