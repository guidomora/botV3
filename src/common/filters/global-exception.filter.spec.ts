import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { PROVIDER_TEMPORARY_ERROR_MESSAGE } from 'src/constants';
import { ProviderError, ProviderName } from 'src/lib';
import { GlobalExceptionFilter } from './global-exception.filter';

type MockResponse = {
  json: jest.Mock;
  status: jest.Mock;
};

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it('should preserve HttpException payloads', () => {
    const response = createResponseMock();
    const host = createHostMock(response, '/bot/communication/queue');
    const exception = new BadRequestException('Campo requerido ausente o vacio: WaId');

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(exception.getResponse());
  });

  it('should map ProviderError to a generic 503 response', () => {
    const response = createResponseMock();
    const host = createHostMock(response, '/bot/communication/queue');
    const exception = new ProviderError(
      ProviderName.OPEN_AI,
      'Error al interactuar con OpenAI',
      new Error('sdk failed'),
    );

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: PROVIDER_TEMPORARY_ERROR_MESSAGE,
        path: '/bot/communication/queue',
      }),
    );
  });

  it('should map unknown errors to a generic 500 response', () => {
    const response = createResponseMock();
    const host = createHostMock(response, '/bot/dates');

    filter.catch(new Error('boom'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ocurrió un error interno inesperado.',
        path: '/bot/dates',
      }),
    );
  });
});

function createResponseMock(): MockResponse {
  const response: MockResponse = {
    status: jest.fn(),
    json: jest.fn(),
  };

  response.status.mockReturnValue(response);

  return response;
}

function createHostMock(response: MockResponse, url: string): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ url }),
      getResponse: () => response,
    }),
  } as ArgumentsHost;
}
