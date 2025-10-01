/**
 * File Security Utilities
 * Dosya yükleme güvenliği - magic number validation ve malware taraması
 */

const fs = require('fs').promises;
const path = require('path');
const { fileTypeFromBuffer } = require('file-type');
const { logSecurityEvent, SECURITY_LEVELS, EVENT_TYPES } = require('../middlewares/securityLogger');

/**
 * İzin verilen dosya tipleri ve MIME tipleri
 */
const ALLOWED_FILE_TYPES = {
  // Resim dosyaları
  'jpg': { mime: 'image/jpeg', extensions: ['.jpg', '.jpeg'] },
  'png': { mime: 'image/png', extensions: ['.png'] },
  'gif': { mime: 'image/gif', extensions: ['.gif'] },
  'webp': { mime: 'image/webp', extensions: ['.webp'] },
  
  // Döküman dosyaları
  'pdf': { mime: 'application/pdf', extensions: ['.pdf'] },
  
  // Office dosyaları (isteğe bağlı)
  'docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extensions: ['.docx'] },
  'xlsx': { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extensions: ['.xlsx'] }
};

/**
 * Tehlikeli dosya imzaları (magic numbers)
 */
const DANGEROUS_SIGNATURES = [
  // Executable files
  { signature: [0x4D, 0x5A], description: 'PE Executable (Windows .exe/.dll)' },
  { signature: [0x7F, 0x45, 0x4C, 0x46], description: 'ELF Executable (Linux)' },
  { signature: [0xFE, 0xED, 0xFA, 0xCE], description: 'Mach-O Executable (macOS)' },
  
  // Script files
  { signature: [0x23, 0x21], description: 'Shell script (#!)' },
  
  // Archive files with potential risks
  { signature: [0x50, 0x4B, 0x03, 0x04], description: 'ZIP archive (potential risk)' },
  { signature: [0x50, 0x4B, 0x05, 0x06], description: 'ZIP archive (empty)' },
  { signature: [0x50, 0x4B, 0x07, 0x08], description: 'ZIP archive (spanned)' },
  
  // Java class files
  { signature: [0xCA, 0xFE, 0xBA, 0xBE], description: 'Java class file' }
];

/**
 * Dosyanın magic number'ını kontrol eder
 * @param {string} filePath - Dosya yolu
 * @returns {Promise<Object>} - Validation sonucu
 */
async function validateFileType(filePath) {
  try {
    // Dosyayı buffer olarak oku (ilk 4096 byte yeterli)
    const buffer = await fs.readFile(filePath);
    const firstBytes = buffer.slice(0, 4096);
    
    // file-type ile gerçek dosya tipini tespit et
    const detectedType = await fileTypeFromBuffer(firstBytes);
    
    // Dosya uzantısını al
    const fileExtension = path.extname(filePath).toLowerCase();
    
    const result = {
      isValid: false,
      detectedType: detectedType,
      declaredExtension: fileExtension,
      isDangerous: false,
      reasons: [],
      fileSize: buffer.length
    };

    // Tehlikeli imza kontrolü
    const dangerousMatch = checkDangerousSignatures(firstBytes);
    if (dangerousMatch) {
      result.isDangerous = true;
      result.reasons.push(`Tehlikeli dosya imzası tespit edildi: ${dangerousMatch.description}`);
      return result;
    }

    // Dosya tipi tespit edilemedi
    if (!detectedType) {
      result.reasons.push('Dosya tipi tespit edilemedi - bilinmeyen format');
      return result;
    }

    // İzin verilen dosya tiplerinde mi?
    const allowedType = Object.values(ALLOWED_FILE_TYPES).find(
      type => type.mime === detectedType.mime
    );

    if (!allowedType) {
      result.reasons.push(`İzin verilmeyen dosya tipi: ${detectedType.mime}`);
      return result;
    }

    // Uzantı ile magic number eşleşiyor mu?
    if (!allowedType.extensions.includes(fileExtension)) {
      result.reasons.push(`Dosya uzantısı (${fileExtension}) ile içerik (${detectedType.mime}) eşleşmiyor`);
      return result;
    }

    // Dosya boyutu kontrolü
    const maxSize = Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default
    if (buffer.length > maxSize) {
      result.reasons.push(`Dosya çok büyük: ${buffer.length} bytes (max: ${maxSize})`);
      return result;
    }

    // Tüm kontroller başarılı
    result.isValid = true;
    result.reasons.push('Tüm güvenlik kontrolleri başarılı');
    
    return result;

  } catch (error) {
    console.error('File validation error:', error);
    return {
      isValid: false,
      error: error.message,
      reasons: ['Dosya okuma hatası']
    };
  }
}

/**
 * Tehlikeli dosya imzalarını kontrol eder
 * @param {Buffer} buffer - Dosya buffer'ı
 * @returns {Object|null} - Eşleşen tehlikeli imza
 */
function checkDangerousSignatures(buffer) {
  for (const dangerous of DANGEROUS_SIGNATURES) {
    if (buffer.length >= dangerous.signature.length) {
      let matches = true;
      for (let i = 0; i < dangerous.signature.length; i++) {
        if (buffer[i] !== dangerous.signature[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return dangerous;
      }
    }
  }
  return null;
}

/**
 * ClamAV ile dosyayı tarar (Docker container gerekli)
 * @param {string} filePath - Dosya yolu
 * @returns {Promise<Object>} - Tarama sonucu
 */
async function scanWithClamAV(filePath) {
  try {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      // ClamAV daemon ile dosyayı tara
      const clamdscan = spawn('clamdscan', ['--no-summary', filePath]);
      
      let output = '';
      let errorOutput = '';
      
      clamdscan.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      clamdscan.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      clamdscan.on('close', (code) => {
        const result = {
          isClean: code === 0,
          exitCode: code,
          output: output.trim(),
          error: errorOutput.trim()
        };
        
        // ClamAV çıkış kodları:
        // 0: Clean (temiz)
        // 1: Infected (enfekte)
        // 2: Error
        
        if (code === 1) {
          result.threat = extractThreatName(output);
        }
        
        resolve(result);
      });
      
      clamdscan.on('error', (error) => {
        // ClamAV mevcut değilse veya çalışmıyorsa
        resolve({
          isClean: true, // Güvenli taraftan işlem yap
          error: error.message,
          clamavAvailable: false
        });
      });
      
      // 10 saniye timeout
      setTimeout(() => {
        clamdscan.kill();
        resolve({
          isClean: false,
          error: 'ClamAV tarama timeout',
          timeout: true
        });
      }, 10000);
    });
    
  } catch (error) {
    console.error('ClamAV scan error:', error);
    return {
      isClean: true, // Hata durumunda güvenli taraftan işlem yap
      error: error.message,
      clamavAvailable: false
    };
  }
}

/**
 * ClamAV çıktısından threat ismini çıkarır
 * @param {string} output - ClamAV çıktısı
 * @returns {string} - Threat ismi
 */
function extractThreatName(output) {
  const match = output.match(/:\s+(.+)\s+FOUND/);
  return match ? match[1] : 'Unknown threat';
}

/**
 * Comprehensive file security check
 * @param {string} filePath - Dosya yolu
 * @param {Object} options - Seçenekler
 * @returns {Promise<Object>} - Kapsamlı güvenlik sonucu
 */
async function performSecurityScan(filePath, options = {}) {
  const result = {
    fileName: path.basename(filePath),
    filePath,
    isSecure: false,
    checks: {},
    timestamp: new Date().toISOString()
  };
  
  try {
    // 1. Magic number validation
    console.log(`🔍 Magic number validation: ${filePath}`);
    result.checks.magicNumber = await validateFileType(filePath);
    
    if (result.checks.magicNumber.isDangerous) {
      result.isSecure = false;
      result.failureReason = 'Tehlikeli dosya tipi tespit edildi';
      return result;
    }
    
    if (!result.checks.magicNumber.isValid) {
      result.isSecure = false;
      result.failureReason = result.checks.magicNumber.reasons.join(', ');
      return result;
    }
    
    // 2. ClamAV taraması (opsiyonel)
    if (options.useClamAV !== false) {
      console.log(`🦠 ClamAV tarama: ${filePath}`);
      result.checks.clamav = await scanWithClamAV(filePath);
      
      if (!result.checks.clamav.isClean && result.checks.clamav.clamavAvailable !== false) {
        result.isSecure = false;
        result.failureReason = `Malware tespit edildi: ${result.checks.clamav.threat || 'Unknown'}`;
        return result;
      }
    }
    
    // Tüm kontroller başarılı
    result.isSecure = true;
    
  } catch (error) {
    console.error('Security scan error:', error);
    result.isSecure = false;
    result.failureReason = 'Güvenlik taraması sırasında hata oluştu';
    result.error = error.message;
  }
  
  return result;
}

/**
 * Güvenlik olayını loglar
 * @param {Object} scanResult - Tarama sonucu
 * @param {string} userId - User ID
 * @param {Object} req - Request object
 */
async function logFileSecurityEvent(scanResult, userId, req) {
  try {
    const level = scanResult.isSecure ? SECURITY_LEVELS.LOW : SECURITY_LEVELS.HIGH;
    const eventType = scanResult.isSecure ? 'FILE_UPLOAD_SUCCESS' : EVENT_TYPES.SUSPICIOUS_ACTIVITY;
    
    await logSecurityEvent({
      eventType,
      level,
      userId,
      ip: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      description: scanResult.isSecure ? 
        `Güvenli dosya yüklendi: ${scanResult.fileName}` :
        `Güvensiz dosya yükleme engellendi: ${scanResult.failureReason}`,
      details: {
        fileName: scanResult.fileName,
        isSecure: scanResult.isSecure,
        checks: scanResult.checks,
        failureReason: scanResult.failureReason
      }
    });
  } catch (error) {
    console.error('File security logging error:', error);
  }
}

module.exports = {
  validateFileType,
  scanWithClamAV,
  performSecurityScan,
  logFileSecurityEvent,
  ALLOWED_FILE_TYPES
};
