import "server-only";

export class BentoItemPageConflictError extends Error {
  constructor() {
    super("A Bento item ID belongs to another page.");
    this.name = "BentoItemPageConflictError";
  }
}
