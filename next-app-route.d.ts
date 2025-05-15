import { NextRequest } from 'next/server';

// Augment Next.js app router route handling
declare module 'next/server' {
  // Type for route params
  export interface RouteContext<T = Record<string, string>> {
    params: T;
  }
  
  // Make params simple Record<string, string> rather than Promise<any>
  export type ParamCheck<T> = T extends { params: infer P } ? { params: Record<string, string> } : T;
} 