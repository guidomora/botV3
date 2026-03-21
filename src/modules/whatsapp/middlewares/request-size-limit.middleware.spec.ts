import { PayloadTooLargeException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { MAX_REQUEST_BODY_SIZE_BYTES, WARNING_REQUEST_BODY_SIZE_BYTES } from 'src/constants';
import { RequestSizeLimitMiddleware } from './request-size-limit.middleware';

describe('RequestSizeLimitMiddleware', () => {
  let middleware: RequestSizeLimitMiddleware;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    middleware = new RequestSizeLimitMiddleware();
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should call next when request is below warning threshold', () => {
    const request = {
      headers: { 'content-length': '200' },
      body: { From: 'whatsapp:+5491112345678' },
      originalUrl: '/communication/queue',
    } as Request;

    middleware.use(request, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should warn and continue when request is near configured limit', () => {
    const warnSpy = jest.spyOn(
      (middleware as unknown as { logger: { warn: (message: string) => void } }).logger,
      'warn',
    );

    const request = {
      headers: { 'content-length': String(WARNING_REQUEST_BODY_SIZE_BYTES) },
      body: { From: 'whatsapp:+5491112345678' },
      originalUrl: '/communication/queue',
    } as Request;

    middleware.use(request, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('should throw payload too large when request exceeds hard limit', () => {
    const request = {
      headers: { 'content-length': String(MAX_REQUEST_BODY_SIZE_BYTES + 1) },
      body: { From: 'whatsapp:+5491112345678' },
      originalUrl: '/communication/queue',
    } as Request;

    expect(() => middleware.use(request, {} as Response, next)).toThrow(PayloadTooLargeException);
    expect(next).not.toHaveBeenCalled();
  });

  it('should calculate size from body when content-length header is missing', () => {
    const request = {
      headers: {},
      body: { Body: 'Hola', From: 'whatsapp:+5491112345678' },
      originalUrl: '/communication/queue',
    } as Request;

    middleware.use(request, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
