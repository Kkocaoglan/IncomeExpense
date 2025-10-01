#!/usr/bin/env node
/**
 * Health Check Script
 * Sistemi düzenli olarak kontrol eder
 * Usage: node scripts/health-check.js [--verbose] [--json]
 */

const { PrismaClient } = require('@prisma/client');
const redis = require('ioredis');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// CLI Arguments
const args = process.argv.slice(2);
const isVerbose = args.includes('--verbose');
const isJson = args.includes('--json');
const BASE_URL = 'http://localhost:5001';

class HealthChecker {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      checks: {},
      summary: {}
    };
  }

  log(message, level = 'info') {
    if (!isJson) {
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
      console.log(`${prefix} ${message}`);
    }
  }

  async checkDatabase() {
    const checkName = 'database';
    this.log('Database bağlantısı kontrol ediliyor...', 'info');
    
    const prisma = new PrismaClient();
    try {
      const result = await prisma.$queryRaw`SELECT 1 as test, NOW() as time`;
      await prisma.$disconnect();
      
      this.results.checks[checkName] = {
        status: 'healthy',
        responseTime: Date.now(),
        details: { query_result: result[0] }
      };
      
      this.log('Database: HEALTHY', 'info');
      return true;
    } catch (error) {
      this.results.checks[checkName] = {
        status: 'unhealthy',
        error: error.message,
        details: { connection_string: process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@') }
      };
      
      this.log(`Database: ERROR - ${error.message}`, 'error');
      return false;
    } finally {
      await prisma.$disconnect();
    }
  }

  async checkRedis() {
    const checkName = 'redis';
    this.log('Redis bağlantısı kontrol ediliyor...', 'info');
    
    const redisClient = new redis(process.env.REDIS_URL || 'redis://localhost:6379');
    try {
      const start = Date.now();
      const pong = await redisClient.ping();
      const responseTime = Date.now() - start;
      
      // Test key operations
      await redisClient.set('health:check', 'ok', 'EX', 10);
      const value = await redisClient.get('health:check');
      
      this.results.checks[checkName] = {
        status: 'healthy',
        responseTime,
        details: { 
          ping: pong,
          test_operation: value === 'ok' ? 'success' : 'failed'
        }
      };
      
      this.log(`Redis: HEALTHY (${responseTime}ms)`, 'info');
      return true;
    } catch (error) {
      this.results.checks[checkName] = {
        status: 'unhealthy',
        error: error.message,
        details: { redis_url: process.env.REDIS_URL || 'redis://localhost:6379' }
      };
      
      this.log(`Redis: ERROR - ${error.message}`, 'error');
      return false;
    } finally {
      redisClient.disconnect();
    }
  }

  async checkAPIEndpoints() {
    const checkName = 'api_endpoints';
    this.log('API endpoints kontrol ediliyor...', 'info');
    
    const endpoints = [
      { path: '/healthz', expected: 200 },
      { path: '/readyz', expected: 200 },
      { path: '/metrics', expected: 200 },
      { path: '/cors-test', expected: 200 }
    ];

    const results = {};
    let allHealthy = true;

    for (const endpoint of endpoints) {
      try {
        const start = Date.now();
        const response = await axios.get(`${BASE_URL}${endpoint.path}`, {
          timeout: 5000,
          validateStatus: () => true
        });
        const responseTime = Date.now() - start;
        
        const isHealthy = response.status === endpoint.expected;
        if (!isHealthy) allHealthy = false;
        
        results[endpoint.path] = {
          status: isHealthy ? 'healthy' : 'unhealthy',
          statusCode: response.status,
          responseTime,
          expected: endpoint.expected
        };
        
        this.log(`${endpoint.path}: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (${response.status})`, isHealthy ? 'info' : 'error');
        
      } catch (error) {
        allHealthy = false;
        results[endpoint.path] = {
          status: 'unhealthy',
          error: error.message,
          expected: endpoint.expected
        };
        
        this.log(`${endpoint.path}: ERROR - ${error.message}`, 'error');
      }
    }

    this.results.checks[checkName] = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      details: results
    };

    return allHealthy;
  }

  async checkSecurityHeaders() {
    const checkName = 'security_headers';
    this.log('Security headers kontrol ediliyor...', 'info');
    
    try {
      const response = await axios.get(`${BASE_URL}/healthz`);
      const headers = response.headers;
      
      const requiredHeaders = [
        'content-security-policy',
        'x-frame-options',
        'x-content-type-options',
        'strict-transport-security'
      ];
      
      const headerResults = {};
      let allPresent = true;
      
      for (const header of requiredHeaders) {
        const isPresent = !!headers[header];
        if (!isPresent) allPresent = false;
        
        headerResults[header] = {
          present: isPresent,
          value: headers[header] || null
        };
      }
      
      this.results.checks[checkName] = {
        status: allPresent ? 'healthy' : 'unhealthy',
        details: headerResults
      };
      
      this.log(`Security Headers: ${allPresent ? 'HEALTHY' : 'INCOMPLETE'}`, allPresent ? 'info' : 'warn');
      return allPresent;
      
    } catch (error) {
      this.results.checks[checkName] = {
        status: 'unhealthy',
        error: error.message
      };
      
      this.log(`Security Headers: ERROR - ${error.message}`, 'error');
      return false;
    }
  }

  async checkFeatureFlags() {
    const checkName = 'feature_flags';
    this.log('Feature flags kontrol ediliyor...', 'info');
    
    try {
      const { logFeatureFlags, flags } = require('../src/config/flags');
      
      const enabledFlags = Object.entries(flags).filter(([_, enabled]) => enabled);
      const flagCount = Object.keys(flags).length;
      const enabledCount = enabledFlags.length;
      
      this.results.checks[checkName] = {
        status: 'healthy',
        details: {
          total_flags: flagCount,
          enabled_flags: enabledCount,
          enabled_list: enabledFlags.map(([name, _]) => name)
        }
      };
      
      this.log(`Feature Flags: HEALTHY (${enabledCount}/${flagCount} enabled)`, 'info');
      return true;
      
    } catch (error) {
      this.results.checks[checkName] = {
        status: 'unhealthy',
        error: error.message
      };
      
      this.log(`Feature Flags: ERROR - ${error.message}`, 'error');
      return false;
    }
  }

  async saveResults() {
    if (!isJson) return;
    
    try {
      const logsDir = path.join(__dirname, '../logs');
      await fs.mkdir(logsDir, { recursive: true });
      
      const filename = `health-check-${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(logsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
      this.log(`Results saved to: ${filepath}`, 'info');
    } catch (error) {
      this.log(`Failed to save results: ${error.message}`, 'error');
    }
  }

  generateSummary() {
    const checks = this.results.checks;
    const total = Object.keys(checks).length;
    const healthy = Object.values(checks).filter(check => check.status === 'healthy').length;
    const unhealthy = total - healthy;
    
    this.results.overall = healthy === total ? 'healthy' : 'degraded';
    this.results.summary = {
      total_checks: total,
      healthy_checks: healthy,
      unhealthy_checks: unhealthy,
      health_percentage: Math.round((healthy / total) * 100)
    };
  }

  async run() {
    if (!isJson) {
      console.log('🏥 Sistem Health Check Başlatılıyor...\n');
    }
    
    // Run all checks
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkAPIEndpoints(),
      this.checkSecurityHeaders(),
      this.checkFeatureFlags()
    ]);
    
    this.generateSummary();
    
    if (isJson) {
      console.log(JSON.stringify(this.results, null, 2));
    } else {
      console.log('\n📊 Health Check Özeti:');
      console.log('=====================');
      console.log(`Toplam Kontrol: ${this.results.summary.total_checks}`);
      console.log(`Sağlıklı: ${this.results.summary.healthy_checks}`);
      console.log(`Sorunlu: ${this.results.summary.unhealthy_checks}`);
      console.log(`Sağlık Oranı: %${this.results.summary.health_percentage}`);
      console.log(`\n🎯 Genel Durum: ${this.results.overall === 'healthy' ? '✅ SAĞLIKLI' : '⚠️ BOZULMUŞ'}`);
    }
    
    await this.saveResults();
    
    // Exit code
    process.exit(this.results.overall === 'healthy' ? 0 : 1);
  }
}

// Run health check
const healthChecker = new HealthChecker();
healthChecker.run().catch(error => {
  console.error('Health check failed:', error);
  process.exit(1);
});
