# Email DNS Konfigürasyonu

Bu dokümantasyon, IncomeExpense uygulaması için email deliverability'i artırmak amacıyla gerekli DNS kayıtlarını açıklar.

## SPF (Sender Policy Framework)

Emaillerinizin spam olarak işaretlenmemesi için SPF kaydı ekleyin:

```
TXT Record: @
Value: v=spf1 include:sendgrid.net -all
```

**Mailgun kullanıyorsanız:**
```
TXT Record: @  
Value: v=spf1 include:mailgun.org -all
```

**Gmail kullanıyorsanız:**
```
TXT Record: @
Value: v=spf1 include:_spf.google.com -all
```

## DKIM (DomainKeys Identified Mail)

### SendGrid için DKIM
1. SendGrid kontrol paneline giriş yapın
2. Settings > Sender Authentication bölümüne gidin
3. Domain Authentication'ı tıklayın
4. Domainizi ekleyin
5. Verilen CNAME kayıtlarını DNS'e ekleyin:

```
CNAME Record: s1._domainkey.yourdomain.com
Value: s1.domainkey.u1234567.wl123.sendgrid.net

CNAME Record: s2._domainkey.yourdomain.com  
Value: s2.domainkey.u1234567.wl123.sendgrid.net
```

### Mailgun için DKIM
Mailgun kontrol panelinden verilen CNAME kayıtlarını ekleyin:

```
CNAME Record: email._domainkey.yourdomain.com
Value: email.yourdomain.com.mailgun.org
```

## DMARC (Domain-based Message Authentication)

DMARC kaydı ile email güvenliğini artırın:

```
TXT Record: _dmarc.yourdomain.com
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; ruf=mailto:dmarc-failures@yourdomain.com; sp=quarantine; adkim=r; aspf=r;
```

### DMARC Policy Seçenekleri:
- `p=none`: Sadece raporlama, email'leri bloklamaz
- `p=quarantine`: Şüpheli emailleri spam klasörüne gönderir
- `p=reject`: Başarısız authentication'lı emailleri tamamen reddeder

**Önerilen geçiş süreci:**
1. Başlangıçta `p=none` kullanın (1-2 hafta)
2. Raporları analiz edin
3. `p=quarantine` geçin (1-2 hafta)  
4. Son olarak `p=reject` kullanın

## Email Test Etme

DNS kayıtlarınızı test etmek için:

1. **SPF Test:** https://www.kitterman.com/spf/validate.html
2. **DKIM Test:** https://dkimvalidator.com/
3. **DMARC Test:** https://dmarc.org/dmarc-tools/

## Örnek Email Gönderme Test'i

```bash
# Test email gönderme
curl -X POST http://localhost:5001/api/auth/email/send \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

Email headers'ında şunları kontrol edin:
- SPF: `PASS`
- DKIM: `PASS`  
- DMARC: `PASS`

## Troubleshooting

### Email spam'e düşüyorsa:
1. SPF, DKIM, DMARC kayıtlarını kontrol edin
2. IP reputation'ı kontrol edin
3. Email content'ini değerlendirin
4. Bounce rate'i düşürün
5. Unsubscribe mekanizması ekleyin

### DNS propagation süresi:
- SPF/DMARC: 1-4 saat
- DKIM: 24-48 saat

DNS değişikliklerinden sonra test etmeden önce propagation süresini bekleyin.

## Production Checklist

- [ ] SPF kaydı eklendi ve test edildi
- [ ] DKIM kayıtları eklendi ve doğrulandı  
- [ ] DMARC policy ayarlandı
- [ ] Email provider (SendGrid/Mailgun) authentication yapıldı
- [ ] Test email gönderildi ve inbox'ta alındı
- [ ] Email headers kontrol edildi (SPF/DKIM/DMARC PASS)
- [ ] Bounce handling mekanizması kuruldu
