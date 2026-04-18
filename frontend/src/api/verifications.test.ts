import { describe, it, expect, vi } from 'vitest';
import {
  buildVerificationPrompt,
  validateVerificationResponse,
  clearVerificationCache,
} from './verifications';
import type { WorkSubmission } from '../supabase';
import type { Milestone } from '../openai';

// Mock the supabase client
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('buildVerificationPrompt', () => {
  it('should build a prompt with milestone and submission details', () => {
    const milestone: Milestone = {
      name: 'Initial Wireframes',
      description: 'Create wireframes for all main pages',
      percentage: 30,
      xlm: 30.0,
    };
    
    const submission: WorkSubmission = {
      id: 'test-id',
      created_at: '2024-01-01T00:00:00Z',
      escrow_id: 'escrow-id',
      milestone_index: 0,
      submitter_address: 'GTEST123456789012345678901234567890123456789012345678',
      description: 'Completed wireframes for homepage, dashboard, and settings pages',
      urls: ['https://figma.com/wireframes', 'https://example.com/preview'],
    };
    
    const prompt = buildVerificationPrompt(milestone, submission);
    
    expect(prompt).toContain('Initial Wireframes');
    expect(prompt).toContain('Create wireframes for all main pages');
    expect(prompt).toContain('Completed wireframes for homepage');
    expect(prompt).toContain('https://figma.com/wireframes');
    expect(prompt).toContain('https://example.com/preview');
    expect(prompt).toContain('EVALUATION CRITERIA');
    expect(prompt).toContain('Return ONLY valid JSON');
  });
  
  it('should handle submissions with no URLs', () => {
    const milestone: Milestone = {
      name: 'Code Review',
      description: 'Review and approve code changes',
      percentage: 20,
      xlm: 20.0,
    };
    
    const submission: WorkSubmission = {
      id: 'test-id',
      created_at: '2024-01-01T00:00:00Z',
      escrow_id: 'escrow-id',
      milestone_index: 0,
      submitter_address: 'GTEST123456789012345678901234567890123456789012345678',
      description: 'Reviewed all code and provided feedback',
      urls: [],
    };
    
    const prompt = buildVerificationPrompt(milestone, submission);
    
    expect(prompt).toContain('No URLs provided');
    expect(prompt).not.toContain('URLs Provided:');
  });
});

describe('validateVerificationResponse', () => {
  it('should accept valid response with all required fields', () => {
    const response = {
      score: 85,
      recommendation: 'approve',
      feedback: 'Excellent work that meets all requirements.',
      gaps: [],
    };
    
    expect(() => validateVerificationResponse(response)).not.toThrow();
  });
  
  it('should accept valid response without gaps array', () => {
    const response = {
      score: 90,
      recommendation: 'approve',
      feedback: 'Outstanding work.',
    };
    
    expect(() => validateVerificationResponse(response)).not.toThrow();
  });
  
  it('should reject response with invalid score (negative)', () => {
    const response = {
      score: -10,
      recommendation: 'reject',
      feedback: 'Invalid score test',
    };
    
    expect(() => validateVerificationResponse(response)).toThrow('Invalid score');
  });
  
  it('should reject response with invalid score (over 100)', () => {
    const response = {
      score: 150,
      recommendation: 'approve',
      feedback: 'Invalid score test',
    };
    
    expect(() => validateVerificationResponse(response)).toThrow('Invalid score');
  });
  
  it('should reject response with invalid recommendation', () => {
    const response = {
      score: 75,
      recommendation: 'maybe',
      feedback: 'Invalid recommendation test',
    };
    
    expect(() => validateVerificationResponse(response)).toThrow('Invalid recommendation');
  });
  
  it('should reject response with missing feedback', () => {
    const response = {
      score: 80,
      recommendation: 'approve',
      feedback: '',
    };
    
    expect(() => validateVerificationResponse(response)).toThrow('Invalid feedback');
  });
  
  it('should reject response with non-string feedback', () => {
    const response = {
      score: 80,
      recommendation: 'approve',
      feedback: 123,
    };
    
    expect(() => validateVerificationResponse(response)).toThrow('Invalid feedback');
  });
  
  it('should warn on score-recommendation mismatch (high score, not approved)', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const response = {
      score: 85,
      recommendation: 'reject',
      feedback: 'Mismatch test',
    };
    
    validateVerificationResponse(response);
    
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Score-recommendation mismatch: high score but not approved')
    );
    
    consoleWarnSpy.mockRestore();
  });
  
  it('should warn on score-recommendation mismatch (low score, not rejected)', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const response = {
      score: 30,
      recommendation: 'approve',
      feedback: 'Mismatch test',
    };
    
    validateVerificationResponse(response);
    
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Score-recommendation mismatch: low score but not rejected')
    );
    
    consoleWarnSpy.mockRestore();
  });
});

describe('clearVerificationCache', () => {
  it('should clear the cache without errors', () => {
    expect(() => clearVerificationCache()).not.toThrow();
  });
});
