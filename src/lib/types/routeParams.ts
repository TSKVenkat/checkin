// Define route parameter types for Next.js API route handlers

/**
 * Type for route handlers with specific parameter (e.g., [id])
 * This matches the expected signature for Next.js App Router
 */
export interface IdRouteParams {
  params: {
    id: string;
  };
  searchParams?: { [key: string]: string | string[] };
}

/**
 * Type for route handlers with multiple parameters
 */
export interface MultiParamRouteParams {
  params: {
    [key: string]: string;
  };
  searchParams?: { [key: string]: string | string[] };
}

/**
 * Type for route handlers with event id parameter
 */
export interface EventIdRouteParams {
  params: {
    eventId: string;
  };
  searchParams?: { [key: string]: string | string[] };
}

/**
 * Type for route handlers with day parameter
 */
export interface DayRouteParams {
  params: {
    day: string;
  };
  searchParams?: { [key: string]: string | string[] };
}

/**
 * Type for route handlers with resource parameter
 */
export interface ResourceRouteParams {
  params: {
    resourceId: string;
  };
  searchParams?: { [key: string]: string | string[] };
}

/**
 * Type for route handlers with attendee parameter
 */
export interface AttendeeRouteParams {
  params: {
    attendeeId: string;
  };
  searchParams?: { [key: string]: string | string[] };
} 