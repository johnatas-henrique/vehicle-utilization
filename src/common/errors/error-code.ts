export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'REQUEST_ERROR'
  | 'NOT_FOUND'
  | 'VEHICLE_PLATE_TAKEN'
  | 'VEHICLE_IN_USE'
  | 'DRIVER_IN_USE'
  | 'USAGE_ALREADY_FINISHED'
  | 'USAGE_START_IN_FUTURE'
  | 'INTERNAL_ERROR';

export interface HttpErrorPayload {
  code: ErrorCode;
  message: string;
  details?: unknown;
}
