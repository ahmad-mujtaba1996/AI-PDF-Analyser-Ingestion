import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Converts every exception thrown anywhere in the app - whether it's a
 * NestJS HttpException or a raw JS Error from a third-party library like
 * pdf-parse or the Gemini SDK - into one consistent JSON error shape.
 *
 * This means the frontend never has to guess at the error format; it can
 * always read `error.message`.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong while processing your request.';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const body = response as Record<string, unknown>;
        message = (body.message as string) ?? message;
        details = body.error ?? undefined;
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
    }

    this.logger.error(
      `${request.method} ${request.url} -> ${status}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      details,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
