# Veritabanı Bakım Rehberi

Bu dokümantasyon, self-hosted PostgreSQL veritabanı için bakım işlemlerini açıklar.

## Otomatik Bakım İşlemleri

### 1. Security Log Temizleme
- **Sıklık**: Her gün 03:00 UTC
- **Amaç**: 90+ günlük güvenlik loglarını temizler
- **Konfigürasyon**: `SECURITY_LOG_RETENTION_DAYS` environment variable
- **Varsayılan**: 90 gün

### 2. Session Cleanup
- **Sıklık**: Her gün 03:00 UTC
- **Amaç**: Eski ve şüpheli session'ları temizler
- **Kapsam**: Redis session key'leri ve veritabanı refresh token'ları

## Manuel Bakım İşlemleri

### PostgreSQL VACUUM ve ANALYZE

#### 1. Otomatik VACUUM Ayarları
PostgreSQL'de otomatik VACUUM zaten etkin olmalıdır. Kontrol etmek için:

```sql
-- Otomatik VACUUM durumunu kontrol et
SELECT name, setting, unit, context 
FROM pg_settings 
WHERE name LIKE '%autovacuum%';

-- VACUUM istatistiklerini görüntüle
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, 
       last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
FROM pg_stat_user_tables;
```

#### 2. Manuel VACUUM (Gerekirse)
Eğer tablolar çok büyükse veya otomatik VACUUM yetersizse:

```sql
-- Tüm tablolar için VACUUM ANALYZE
VACUUM ANALYZE;

-- Belirli bir tablo için
VACUUM ANALYZE "User";
VACUUM ANALYZE "Transaction";
VACUUM ANALYZE "Investment";
VACUUM ANALYZE "Receipt";
VACUUM ANALYZE "SecurityLog";
VACUUM ANALYZE "RefreshToken";
```

#### 3. Agresif VACUUM (Çok büyük tablolar için)
```sql
-- FULL VACUUM (downtime gerektirir)
VACUUM FULL;

-- Belirli bir tablo için
VACUUM FULL "SecurityLog";
```

### İndeks Optimizasyonu

#### 1. İndeks Kullanım İstatistikleri
```sql
-- En az kullanılan indeksleri bul
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read ASC;

-- Büyük indeksleri bul
SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

#### 2. İndeks Yeniden Oluşturma
```sql
-- Belirli bir indeksi yeniden oluştur
REINDEX INDEX CONCURRENTLY "idx_user_email";

-- Tüm indeksleri yeniden oluştur (downtime gerektirir)
REINDEX DATABASE income_expense;
```

### Performans İzleme

#### 1. Yavaş Sorguları Tespit Et
```sql
-- En yavaş sorguları bul
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- En sık çalışan sorguları bul
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;
```

#### 2. Tablo Boyutları
```sql
-- Tablo boyutlarını görüntüle
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Backup ve Recovery

#### 1. Otomatik Backup (Cron Job)
```bash
# Her gün 02:00'da backup al
0 2 * * * pg_dump -h localhost -U app income_expense > /backups/income_expense_$(date +\%Y\%m\%d).sql

# Haftalık full backup
0 1 * * 0 pg_dump -h localhost -U app -Fc income_expense > /backups/income_expense_weekly_$(date +\%Y\%m\%d).dump
```

#### 2. Backup Restore
```bash
# SQL dump restore
psql -h localhost -U app income_expense < backup.sql

# Custom format restore
pg_restore -h localhost -U app -d income_expense backup.dump
```

### Konfigürasyon Önerileri

#### postgresql.conf Ayarları
```conf
# Memory ayarları
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# VACUUM ayarları
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50

# Logging
log_min_duration_statement = 1000  # 1 saniyeden uzun sorguları logla
log_checkpoints = on
log_connections = on
log_disconnections = on

# Performance
random_page_cost = 1.1
effective_io_concurrency = 200
```

### Monitoring ve Alerting

#### 1. Temel Metrikler
- Disk kullanımı
- CPU kullanımı
- Memory kullanımı
- Bağlantı sayısı
- Yavaş sorgu sayısı

#### 2. Alerting Kuralları
```yaml
# Prometheus alerting rules
groups:
- name: postgresql
  rules:
  - alert: PostgreSQLDown
    expr: pg_up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "PostgreSQL is down"
      
  - alert: PostgreSQLHighConnections
    expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "PostgreSQL high connection usage"
```

### Troubleshooting

#### 1. Yaygın Problemler
- **Lock contention**: `pg_locks` tablosunu kontrol et
- **Deadlocks**: `log_lock_waits = on` ile logla
- **Disk space**: `df -h` ile kontrol et
- **Memory leaks**: `pg_stat_activity` ile kontrol et

#### 2. Acil Durum Prosedürleri
```sql
-- Tüm bağlantıları sonlandır (dikkatli kullan!)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'income_expense' AND pid <> pg_backend_pid();

-- Emergency VACUUM
VACUUM FREEZE;

-- Database boyutunu kontrol et
SELECT pg_size_pretty(pg_database_size('income_expense'));
```

### Bakım Zamanlaması

#### Günlük
- Otomatik VACUUM kontrolü
- Disk space kontrolü
- Error log kontrolü

#### Haftalık
- Backup testi
- İndeks kullanım analizi
- Performans metrikleri inceleme

#### Aylık
- Manuel VACUUM ANALYZE (gerekirse)
- İndeks optimizasyonu
- Konfigürasyon gözden geçirme

#### Yıllık
- PostgreSQL major version upgrade planlaması
- Hardware gereksinimleri değerlendirmesi
- Disaster recovery testi
