import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ErrorCode, HttpErrorPayload } from './error-code.js';

export interface ErrorEnvelope {
  error: HttpErrorPayload;
}

const CODE_BY_STATUS = new Map<number, ErrorCode>([
  [HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR'],
  [HttpStatus.NOT_FOUND, 'NOT_FOUND'],
  [HttpStatus.CONFLICT, 'REQUEST_ERROR'],
]);

const hasCode = (value: unknown): value is HttpErrorPayload =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { code?: unknown }).code === 'string';

const messagesOf = (payload: unknown): string[] => {
  if (typeof payload === 'string') {
    return [payload];
  }
  if (typeof payload === 'object' && payload !== null) {
    const { message } = payload as { message?: unknown };
    if (Array.isArray(message)) {
      return message.filter((item): item is string => typeof item === 'string');
    }
    if (typeof message === 'string') {
      return [message];
    }
  }
  return [];
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json(this.envelope(exception, status));
  }

  private envelope(exception: unknown, status: number): ErrorEnvelope {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (hasCode(payload)) {
        return { error: payload };
      }

      const messages = messagesOf(payload);
      const [first] = messages;
      const code = CODE_BY_STATUS.get(status) ?? 'REQUEST_ERROR';
      return {
        error: {
          code,
          message: first ?? exception.message,
          ...(messages.length > 1 ? { details: messages } : {}),
        },
      };
    }

    const description =
      exception instanceof Error ? exception.message : String(exception);
    this.logger.error(
      `Unhandled exception: ${description}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    return {
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    };
  }
}
