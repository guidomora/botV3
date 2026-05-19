export class CreateReservationQueueError extends Error {
  constructor(
    message: string,
    readonly enqueued: boolean,
    readonly originalError?: unknown,
  ) {
    super(message);
    this.name = CreateReservationQueueError.name;
  }

  static from(error: unknown, enqueued: boolean): CreateReservationQueueError {
    const message = error instanceof Error ? error.message : String(error);
    return new CreateReservationQueueError(message, enqueued, error);
  }
}
