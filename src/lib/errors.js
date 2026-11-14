// Errors that map to a specific HTTP status. Anything else becomes a 500.
export class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', details } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, { status: 400, code: 'VALIDATION_ERROR', details });
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(message, { status: 404, code: 'NOT_FOUND' });
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, { status: 409, code: 'CONFLICT' });
  }
}

export class OutOfStockError extends AppError {
  // shortages: [{ productId, name, requested, available }]
  constructor(shortages) {
    const names = shortages.map((s) => `${s.name} (only ${s.available} left)`).join(', ');
    super(`Not enough stock: ${names}`, { status: 409, code: 'OUT_OF_STOCK', details: shortages });
  }
}
