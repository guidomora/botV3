import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PROVIDER_TEMPORARY_ERROR_MESSAGE } from 'src/constants';
import { ErrorResponseBody, ProviderError } from 'src/lib';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly internalServerErrorStatusCode = 500;

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    if (exception instanceof HttpException) {
      this.logHttpException(exception);
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    if (exception instanceof ProviderError) {
      this.logger.error(
        `Error temporal del proveedor ${exception.provider}`,
        this.getErrorDetail(exception),
      );
      response
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .json(
          this.buildErrorResponse(
            HttpStatus.SERVICE_UNAVAILABLE,
            PROVIDER_TEMPORARY_ERROR_MESSAGE,
            request,
          ),
        );
      return;
    }

    this.logger.error(
      'Error interno no controlado',
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        this.buildErrorResponse(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Ocurrió un error interno inesperado.',
          request,
        ),
      );
  }

  private logHttpException(exception: HttpException): void {
    const status = exception.getStatus();
    const payload = exception.getResponse();
    const serializedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);

    if (status >= this.internalServerErrorStatusCode) {
      this.logger.error(`HttpException ${status}`, serializedPayload);
      return;
    }

    this.logger.warn(`HttpException ${status}: ${serializedPayload}`);
  }

  private buildErrorResponse(
    statusCode: number,
    message: string,
    request: Request,
  ): ErrorResponseBody {
    return {
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };
  }

  private getErrorDetail(error: ProviderError): string {
    if (error.originalError instanceof Error) {
      return error.originalError.stack ?? error.originalError.message;
    }

    if (typeof error.originalError === 'string') {
      return error.originalError;
    }

    return error.message;
  }
}
