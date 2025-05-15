// Type declarations to fix Next.js App Router dynamic route params

import { NextRequest } from 'next/server';

declare module 'next/dist/server/future/route-modules/app-route/module' {
  interface RouteModule {
    GET?(
      request: NextRequest,
      context: { params: Record<string, string> }
    ): Promise<Response> | Response;
    POST?(
      request: NextRequest,
      context: { params: Record<string, string> }
    ): Promise<Response> | Response;
    PUT?(
      request: NextRequest,
      context: { params: Record<string, string> }
    ): Promise<Response> | Response;
    DELETE?(
      request: NextRequest, 
      context: { params: Record<string, string> }
    ): Promise<Response> | Response;
    PATCH?(
      request: NextRequest,
      context: { params: Record<string, string> }
    ): Promise<Response> | Response;
  }
}

// This allows the params object to be properly typed with Next.js
declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
  }
} 