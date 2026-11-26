export class BentoMediaError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 409 | 410 | 503,
  ) {
    super(message);
  }
}
