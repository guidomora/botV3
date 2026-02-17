import {
  Injectable,
  Logger,
  NestMiddleware,
  PayloadTooLargeException,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { MAX_REQUEST_BODY_SIZE_BYTES, WARNING_REQUEST_BODY_SIZE_BYTES } from 'src/constants';


@Injectable()
export class RequestSizeLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestSizeLimitMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    const requestSizeBytes = this.getRequestSizeBytes(req);

    if (requestSizeBytes >= WARNING_REQUEST_BODY_SIZE_BYTES) {
      const from = this.getSenderFromBody(req.body);
      this.logger.warn(
        `Request body cerca del limite permitido (${requestSizeBytes} bytes de ${MAX_REQUEST_BODY_SIZE_BYTES} bytes). From: ${from}`,
      );
    }

    if (requestSizeBytes > MAX_REQUEST_BODY_SIZE_BYTES) {
      this.logger.error(
        `Request body excede el limite permitido (${requestSizeBytes} bytes > ${MAX_REQUEST_BODY_SIZE_BYTES} bytes). Path: ${req.originalUrl}`,
      );
      throw new PayloadTooLargeException(
        'El tamaño del request excede el máximo permitido.',
      );
    }

    next();
  }

  private getRequestSizeBytes(req: Request): number {
    const contentLengthHeader = req.headers['content-length'];

    if (typeof contentLengthHeader === 'string') {
      const parsedContentLength = Number.parseInt(contentLengthHeader, 10);
      if (!Number.isNaN(parsedContentLength) && parsedContentLength >= 0) {
        return parsedContentLength;
      }
    }

    if (req.body) {
      return Buffer.byteLength(JSON.stringify(req.body), 'utf8');
    }

    return 0;
  }

  private getSenderFromBody(body: unknown): string {
    if (
      typeof body === 'object' &&
      body !== null &&
      'From' in body &&
      typeof body.From === 'string'
    ) {
      return body.From;
    }

    return 'unknown';
  }
}
