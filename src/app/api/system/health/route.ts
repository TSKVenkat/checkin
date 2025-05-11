// API route for system health check
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Check database connection by running a simple query
    const dbConnected = await checkDatabaseConnection();
    const dbStatus = dbConnected ? 'connected' : 'disconnected';
    
    // Get server status
    const serverStatus = 'online';
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    
    // Check uptime
    const uptime = process.uptime();
    
    // Return health status
    return NextResponse.json({
      success: true,
      data: {
        status: 'healthy',
        components: {
          server: {
            status: serverStatus,
            uptime: uptime
          },
          database: {
            status: dbStatus
          }
        },
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB'
        },
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        success: false,
        data: {
          status: 'unhealthy',
          error: (error as Error).message,
          timestamp: new Date()
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Check if database connection is working by making a simple query
 */
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Execute a simple query that doesn't require any specific table
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
} 