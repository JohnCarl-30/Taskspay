import { describe, it, expect } from 'vitest';
import type { VerificationResult } from './verification';

describe('verification module', () => {
  describe('VerificationResult interface', () => {
    it('should define matching status correctly', () => {
      const result: VerificationResult = {
        status: 'matching',
        confidence: 90,
        feedback: 'Test feedback',
      };
      
      expect(result.status).toBe('matching');
      expect(result.confidence).toBe(90);
      expect(result.feedback).toBe('Test feedback');
    });

    it('should define partial status with gaps', () => {
      const result: VerificationResult = {
        status: 'partial',
        confidence: 60,
        feedback: 'Test feedback',
        gaps: ['Gap 1', 'Gap 2'],
      };
      
      expect(result.gaps).toEqual(['Gap 1', 'Gap 2']);
    });

    it('should define not_matching status', () => {
      const result: VerificationResult = {
        status: 'not_matching',
        confidence: 30,
        feedback: 'Does not match',
        gaps: ['Missing feature'],
      };
      
      expect(result.status).toBe('not_matching');
    });

    it('should define error status', () => {
      const result: VerificationResult = {
        status: 'error',
        confidence: 0,
        feedback: 'Error occurred',
      };
      
      expect(result.status).toBe('error');
      expect(result.confidence).toBe(0);
    });
  });

  describe('verifyMilestones function signature', () => {
    it('should export verifyMilestones function', async () => {
      // This test verifies the function signature exists
      const module = await import('./verification');
      
      expect(typeof module.verifyMilestones).toBe('function');
    });
  });
});


describe('Task 14.1: Verification result caching', () => {
  it('should export verifyMilestonesCached function', async () => {
    // This test verifies that the caching function is exported
    const module = await import('./verification');
    
    expect(typeof module.verifyMilestonesCached).toBe('function');
  });

  it('should export clearVerificationCache function', async () => {
    // This test verifies that cache clearing is available
    const module = await import('./verification');
    
    expect(typeof module.clearVerificationCache).toBe('function');
  });
});
