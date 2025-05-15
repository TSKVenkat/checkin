import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Cache duration in seconds - 1 minute
const CACHE_DURATION = 60;

export async function GET(req: NextRequest) {
  try {
    // Check database connection
    const dbStatus = await checkDatabase();
    
    // Check app version
    const version = process.env.APP_VERSION || '1.0.0';
    
    // Check environment
    const environment = process.env.NODE_ENV || 'development';
    
    // Get current time
    const timestamp = new Date().toISOString();
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    
    // System health data
    const healthData = {
      status: dbStatus ? 'healthy' : 'degraded',
      components: {
        server: {
          status: 'online',
          uptime: process.uptime()
        },
        database: {
          status: dbStatus ? 'online' : 'offline'
        }
      },
      memory: {
        rss: formatBytes(memoryUsage.rss),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        heapUsed: formatBytes(memoryUsage.heapUsed)
      },
      timestamp,
      version,
      environment
    };
    
    // Return with HTTP caching headers
    return NextResponse.json(
      {
        success: true,
        data: healthData
      },
      {
        headers: {
          'Cache-Control': `public, max-age=${CACHE_DURATION}, s-maxage=${CACHE_DURATION}`,
          'Vary': 'Accept-Encoding, Accept', // Vary header for proper cache invalidation
          'ETag': `"${generateETag(healthData)}"` // Add ETag for caching
        }
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        status: 'error',
        message: 'System health check failed', 
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}

async function checkDatabase() {
  try {
    // Try a simple query to verify database connection
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

// Format bytes to human-readable size
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Generate a simple ETag hash for caching
function generateETag(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
} 