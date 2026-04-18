/**
 * Error handling utilities for the escrow application
 * Provides structured error classification and user-friendly messaging
 */

export class EscrowError extends Error {
  code: string;
  recoverable: boolean;
  userMessage: string;

  constructor(
    message: string,
    code: string,
    recoverable: boolean,
    userMessage: string
  ) {
    super(message);
    this.name = 'EscrowError';
    this.code = code;
    this.recoverable = recoverable;
    this.userMessage = userMessage;
  }
}

export const ErrorCodes = {
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  MISSING_FIELD: 'MISSING_FIELD',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RLS_POLICY_VIOLATION: 'RLS_POLICY_VIOLATION',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  TRANSACTION_REJECTED: 'TRANSACTION_REJECTED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  CONTRACT_ERROR: 'CONTRACT_ERROR',
  API_ERROR: 'API_ERROR',
  OPENAI_ERROR: 'OPENAI_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export const handleError = (error: unknown): EscrowError => {
  if (error instanceof EscrowError) {
    return error;
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new EscrowError(
      'Network request failed',
      ErrorCodes.NETWORK_ERROR,
      true,
      'Connection lost. Your data is saved locally and will sync when online.'
    );
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: string }).code;
    const message = (error as { message?: string }).message || '';

    if (code === 'PGRST301' || message.includes('RLS')) {
      return new EscrowError(
        'RLS policy violation',
        ErrorCodes.RLS_POLICY_VIOLATION,
        false,
        'Authentication required. Please reconnect your wallet.'
      );
    }

    if (code === '23514' || message.includes('constraint')) {
      return new EscrowError(
        'Database constraint violation',
        ErrorCodes.CONSTRAINT_VIOLATION,
        false,
        'Invalid data provided. Please check your inputs and try again.'
      );
    }

    if (code?.startsWith('PG') || code?.startsWith('23')) {
      return new EscrowError(
        'Database operation failed',
        ErrorCodes.DATABASE_ERROR,
        true,
        'Database error occurred. Please try again in a moment.'
      );
    }
  }

  if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
    return new EscrowError(
      'Request timeout',
      ErrorCodes.TIMEOUT_ERROR,
      true,
      'Request timed out. Please check your connection and try again.'
    );
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message || '';

    if (message.includes('User declined') || message.includes('rejected')) {
      return new EscrowError(
        'Transaction rejected by user',
        ErrorCodes.TRANSACTION_REJECTED,
        true,
        'Transaction was cancelled. You can try again when ready.'
      );
    }

    if (message.includes('insufficient') || message.includes('balance')) {
      return new EscrowError(
        'Insufficient balance',
        ErrorCodes.INSUFFICIENT_BALANCE,
        false,
        'Insufficient XLM balance. Please add funds to your wallet.'
      );
    }

    if (message.includes('contract')) {
      return new EscrowError(
        'Smart contract error',
        ErrorCodes.CONTRACT_ERROR,
        false,
        'Smart contract error occurred. Please contact support.'
      );
    }
  }

  // OpenAI API errors
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: number }).status;
    
    if (status !== undefined) {
      if (status === 429) {
        return new EscrowError(
          'OpenAI rate limit exceeded',
          ErrorCodes.OPENAI_ERROR,
          true,
          'AI service is busy. Please try again in a moment.'
        );
      }

      if (status === 401 || status === 403) {
        return new EscrowError(
          'OpenAI authentication failed',
          ErrorCodes.OPENAI_ERROR,
          false,
          'AI service authentication failed. Please contact support.'
        );
      }

      if (status >= 500) {
        return new EscrowError(
          'OpenAI service error',
          ErrorCodes.OPENAI_ERROR,
          true,
          'AI service is temporarily unavailable. Please try again later.'
        );
      }
    }
  }

  // Default unknown error
  return new EscrowError(
    String(error),
    ErrorCodes.UNKNOWN_ERROR,
    false,
    'An unexpected error occurred. Please try again.'
  );
};

export const validateEscrowInputs = (
  address: string,
  amount: string,
  description: string
): EscrowError | null => {
  if (!address.trim()) {
    return new EscrowError(
      'Freelancer address is required',
      ErrorCodes.MISSING_FIELD,
      false,
      'Please enter the freelancer Stellar address.'
    );
  }

  if (!address.startsWith('G') || address.length !== 56) {
    return new EscrowError(
      'Invalid Stellar address format',
      ErrorCodes.INVALID_ADDRESS,
      false,
      'Please enter a valid Stellar address (starts with G, 56 characters).'
    );
  }

  if (!amount.trim()) {
    return new EscrowError(
      'Amount is required',
      ErrorCodes.MISSING_FIELD,
      false,
      'Please enter the total XLM amount.'
    );
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return new EscrowError(
      'Invalid amount',
      ErrorCodes.INVALID_AMOUNT,
      false,
      'Please enter a valid amount greater than 0.'
    );
  }

  if (!description.trim()) {
    return new EscrowError(
      'Project description is required',
      ErrorCodes.MISSING_FIELD,
      false,
      'Please enter a project description.'
    );
  }

  if (description.trim().length < 10) {
    return new EscrowError(
      'Description too short',
      ErrorCodes.MISSING_FIELD,
      false,
      'Please provide a more detailed project description (at least 10 characters).'
    );
  }

  return null;
};

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }

      const escrowError = handleError(error);
      if (!escrowError.recoverable) {
        throw escrowError;
      }

      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
};