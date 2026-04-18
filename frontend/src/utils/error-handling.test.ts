import { describe, it, expect } from 'vitest';
import { 
  EscrowError, 
  ErrorCodes, 
  handleError, 
  validateEscrowInputs,
  retryWithBackoff 
} from './error-handling';

describe('EscrowError', () => {
  it('should create an error with all properties', () => {
    const error = new EscrowError(
      'Test error',
      ErrorCodes.NETWORK_ERROR,
      true,
      'User friendly message'
    );

    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
    expect(error.recoverable).toBe(true);
    expect(error.userMessage).toBe('User friendly message');
    expect(error.name).toBe('EscrowError');
  });
});

describe('handleError', () => {
  it('should return EscrowError as-is', () => {
    const originalError = new EscrowError(
      'Test',
      ErrorCodes.NETWORK_ERROR,
      true,
      'Message'
    );
    const result = handleError(originalError);
    expect(result).toBe(originalError);
  });

  it('should handle network errors', () => {
    const networkError = new TypeError('fetch failed');
    const result = handleError(networkError);
    
    expect(result.code).toBe(ErrorCodes.NETWORK_ERROR);
    expect(result.recoverable).toBe(true);
    expect(result.userMessage).toContain('Connection lost');
  });

  it('should handle RLS policy violations', () => {
    const rlsError = { code: 'PGRST301', message: 'RLS policy violation' };
    const result = handleError(rlsError);
    
    expect(result.code).toBe(ErrorCodes.RLS_POLICY_VIOLATION);
    expect(result.recoverable).toBe(false);
    expect(result.userMessage).toContain('Authentication required');
  });

  it('should handle constraint violations', () => {
    const constraintError = { code: '23514', message: 'constraint violation' };
    const result = handleError(constraintError);
    
    expect(result.code).toBe(ErrorCodes.CONSTRAINT_VIOLATION);
    expect(result.recoverable).toBe(false);
    expect(result.userMessage).toContain('Invalid data');
  });

  it('should handle timeout errors', () => {
    const timeoutError = { name: 'AbortError', message: 'Request timeout' };
    const result = handleError(timeoutError);
    
    expect(result.code).toBe(ErrorCodes.TIMEOUT_ERROR);
    expect(result.recoverable).toBe(true);
    expect(result.userMessage).toContain('timed out');
  });

  it('should handle transaction rejection', () => {
    const rejectionError = { message: 'User declined transaction' };
    const result = handleError(rejectionError);
    
    expect(result.code).toBe(ErrorCodes.TRANSACTION_REJECTED);
    expect(result.recoverable).toBe(true);
    expect(result.userMessage).toContain('cancelled');
  });

  it('should handle insufficient balance', () => {
    const balanceError = { message: 'insufficient balance' };
    const result = handleError(balanceError);
    
    expect(result.code).toBe(ErrorCodes.INSUFFICIENT_BALANCE);
    expect(result.recoverable).toBe(false);
    expect(result.userMessage).toContain('Insufficient XLM');
  });

  it('should handle OpenAI rate limit', () => {
    const rateLimitError = { status: 429 };
    const result = handleError(rateLimitError);
    
    expect(result.code).toBe(ErrorCodes.OPENAI_ERROR);
    expect(result.recoverable).toBe(true);
    expect(result.userMessage).toContain('busy');
  });

  it('should handle unknown errors', () => {
    const unknownError = new Error('Something went wrong');
    const result = handleError(unknownError);
    
    expect(result.code).toBe(ErrorCodes.UNKNOWN_ERROR);
    expect(result.recoverable).toBe(false);
    expect(result.userMessage).toContain('unexpected error');
  });
});

describe('validateEscrowInputs', () => {
  const validAddress = 'GABC123456789012345678901234567890123456789012345678ABCD';

  it('should return null for valid inputs', () => {
    const result = validateEscrowInputs(
      validAddress,
      '100.5',
      'Build a landing page with responsive design'
    );
    expect(result).toBeNull();
  });

  it('should reject empty address', () => {
    const result = validateEscrowInputs('', '100', 'Description');
    expect(result).not.toBeNull();
    expect(result?.code).toBe(ErrorCodes.MISSING_FIELD);
    expect(result?.userMessage).toContain('address');
  });

  it('should reject invalid address format', () => {
    const result = validateEscrowInputs('INVALID', '100', 'Description');
    expect(result).not.toBeNull();
    expect(result?.code).toBe(ErrorCodes.INVALID_ADDRESS);
    expect(result?.userMessage).toContain('valid Stellar address');
  });

  it('should reject empty amount', () => {
    const result = validateEscrowInputs(
      validAddress,
      '',
      'Description'
    );
    expect(result).not.toBeNull();
    expect(result?.code).toBe(ErrorCodes.MISSING_FIELD);
    expect(result?.userMessage).toContain('amount');
  });

  it('should reject zero amount', () => {
    const result = validateEscrowInputs(
      validAddress,
      '0',
      'Description'
    );
    expect(result).not.toBeNull();
    expect(result?.code).toBe(ErrorCodes.INVALID_AMOUNT);
    expect(result?.userMessage).toContain('greater than 0');
  });

  it('should reject negative amount', () => {
    const result = validateEscrowInputs(
      validAddress,
      '-10',
      'Description'
    );
    expect(result).not.toBeNull();
    expect(result?.code).toBe(ErrorCodes.INVALID_AMOUNT);
  });

  it('should reject empty description', () => {
    const result = validateEscrowInputs(
      validAddress,
      '100',
      ''
    );
    expect(result).not.toBeNull();
    expect(result?.code).toBe(ErrorCodes.MISSING_FIELD);
    expect(result?.userMessage).toContain('description');
  });

  it('should reject too short description', () => {
    const result = validateEscrowInputs(
      validAddress,
      '100',
      'Short'
    );
    expect(result).not.toBeNull();
    expect(result?.code).toBe(ErrorCodes.MISSING_FIELD);
    expect(result?.userMessage).toContain('detailed');
  });
});

describe('retryWithBackoff', () => {
  it('should succeed on first try', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      return 'success';
    };

    const result = await retryWithBackoff(fn, 3, 10);
    expect(result).toBe('success');
    expect(attempts).toBe(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) {
        throw new EscrowError('Retry', ErrorCodes.NETWORK_ERROR, true, 'Retry');
      }
      return 'success';
    };

    const result = await retryWithBackoff(fn, 3, 10);
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should throw after max retries', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new EscrowError('Fail', ErrorCodes.NETWORK_ERROR, true, 'Fail');
    };

    await expect(retryWithBackoff(fn, 3, 10)).rejects.toThrow();
    expect(attempts).toBe(3);
  });

  it('should not retry non-recoverable errors', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new EscrowError('Fatal', ErrorCodes.INVALID_AMOUNT, false, 'Fatal');
    };

    await expect(retryWithBackoff(fn, 3, 10)).rejects.toThrow();
    expect(attempts).toBe(1);
  });
});
