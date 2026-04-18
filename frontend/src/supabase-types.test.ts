import { describe, it, expect } from 'vitest';
import type {
  WorkSubmission,
  WorkSubmissionInsert,
  DeliveryVerification,
  DeliveryVerificationInsert,
  SubmissionWithVerification,
  Database,
} from './supabase';

describe('Supabase Type Definitions', () => {
  describe('WorkSubmission interfaces', () => {
    it('should define WorkSubmission with all required fields', () => {
      const submission: WorkSubmission = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2024-01-15T10:30:00Z',
        escrow_id: '123e4567-e89b-12d3-a456-426614174001',
        milestone_index: 0,
        submitter_address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        description: 'Completed the first milestone',
        urls: ['https://example.com/proof'],
      };

      expect(submission.id).toBeDefined();
      expect(submission.created_at).toBeDefined();
      expect(submission.escrow_id).toBeDefined();
      expect(submission.milestone_index).toBeDefined();
      expect(submission.submitter_address).toBeDefined();
      expect(submission.description).toBeDefined();
      expect(submission.urls).toBeDefined();
    });

    it('should define WorkSubmissionInsert without id and created_at', () => {
      const insert: WorkSubmissionInsert = {
        escrow_id: '123e4567-e89b-12d3-a456-426614174001',
        milestone_index: 0,
        submitter_address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        description: 'Completed the first milestone',
        urls: ['https://example.com/proof'],
      };

      expect(insert.escrow_id).toBeDefined();
      expect(insert.milestone_index).toBeDefined();
      expect(insert.submitter_address).toBeDefined();
      expect(insert.description).toBeDefined();
      expect(insert.urls).toBeDefined();
    });
  });

  describe('DeliveryVerification interfaces', () => {
    it('should define DeliveryVerification with all required fields', () => {
      const verification: DeliveryVerification = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        created_at: '2024-01-15T10:31:00Z',
        submission_id: '123e4567-e89b-12d3-a456-426614174000',
        score: 85,
        recommendation: 'approve',
        feedback: 'The submission meets all requirements',
        gaps: null,
        raw_response: { model: 'gpt-4o-mini', usage: {} },
      };

      expect(verification.id).toBeDefined();
      expect(verification.created_at).toBeDefined();
      expect(verification.submission_id).toBeDefined();
      expect(verification.score).toBeDefined();
      expect(verification.recommendation).toBeDefined();
      expect(verification.feedback).toBeDefined();
      expect(verification.raw_response).toBeDefined();
    });

    it('should define DeliveryVerificationInsert without id and created_at', () => {
      const insert: DeliveryVerificationInsert = {
        submission_id: '123e4567-e89b-12d3-a456-426614174000',
        score: 85,
        recommendation: 'approve',
        feedback: 'The submission meets all requirements',
        gaps: null,
        raw_response: { model: 'gpt-4o-mini', usage: {} },
      };

      expect(insert.submission_id).toBeDefined();
      expect(insert.score).toBeDefined();
      expect(insert.recommendation).toBeDefined();
      expect(insert.feedback).toBeDefined();
      expect(insert.raw_response).toBeDefined();
    });

    it('should allow all valid recommendation values', () => {
      const approve: DeliveryVerification['recommendation'] = 'approve';
      const requestChanges: DeliveryVerification['recommendation'] = 'request_changes';
      const reject: DeliveryVerification['recommendation'] = 'reject';

      expect(approve).toBe('approve');
      expect(requestChanges).toBe('request_changes');
      expect(reject).toBe('reject');
    });

    it('should allow gaps to be null or string array', () => {
      const withGaps: DeliveryVerification = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        created_at: '2024-01-15T10:31:00Z',
        submission_id: '123e4567-e89b-12d3-a456-426614174000',
        score: 65,
        recommendation: 'request_changes',
        feedback: 'Some requirements are missing',
        gaps: ['Missing documentation', 'Incomplete tests'],
        raw_response: {},
      };

      const withoutGaps: DeliveryVerification = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        created_at: '2024-01-15T10:32:00Z',
        submission_id: '123e4567-e89b-12d3-a456-426614174001',
        score: 90,
        recommendation: 'approve',
        feedback: 'Excellent work',
        gaps: null,
        raw_response: {},
      };

      expect(withGaps.gaps).toHaveLength(2);
      expect(withoutGaps.gaps).toBeNull();
    });
  });

  describe('SubmissionWithVerification interface', () => {
    it('should combine submission and verification', () => {
      const combined: SubmissionWithVerification = {
        submission: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          created_at: '2024-01-15T10:30:00Z',
          escrow_id: '123e4567-e89b-12d3-a456-426614174001',
          milestone_index: 0,
          submitter_address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          description: 'Completed the first milestone',
          urls: ['https://example.com/proof'],
        },
        verification: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          created_at: '2024-01-15T10:31:00Z',
          submission_id: '123e4567-e89b-12d3-a456-426614174000',
          score: 85,
          recommendation: 'approve',
          feedback: 'The submission meets all requirements',
          gaps: null,
          raw_response: {},
        },
      };

      expect(combined.submission).toBeDefined();
      expect(combined.verification).toBeDefined();
    });

    it('should allow verification to be null', () => {
      const pending: SubmissionWithVerification = {
        submission: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          created_at: '2024-01-15T10:30:00Z',
          escrow_id: '123e4567-e89b-12d3-a456-426614174001',
          milestone_index: 0,
          submitter_address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          description: 'Completed the first milestone',
          urls: ['https://example.com/proof'],
        },
        verification: null,
      };

      expect(pending.submission).toBeDefined();
      expect(pending.verification).toBeNull();
    });
  });

  describe('Database schema types', () => {
    it('should include work_submissions table in Database schema', () => {
      type WorkSubmissionsTable = Database['public']['Tables']['work_submissions'];
      type Row = WorkSubmissionsTable['Row'];
      type Insert = WorkSubmissionsTable['Insert'];
      type Update = WorkSubmissionsTable['Update'];

      // Type assertions to verify structure
      const row: Row = {} as Row;
      const insert: Insert = {} as Insert;
      const update: Update = {} as Update;

      expect(row).toBeDefined();
      expect(insert).toBeDefined();
      expect(update).toBeDefined();
    });

    it('should include delivery_verifications table in Database schema', () => {
      type DeliveryVerificationsTable = Database['public']['Tables']['delivery_verifications'];
      type Row = DeliveryVerificationsTable['Row'];
      type Insert = DeliveryVerificationsTable['Insert'];
      type Update = DeliveryVerificationsTable['Update'];

      // Type assertions to verify structure
      const row: Row = {} as Row;
      const insert: Insert = {} as Insert;
      const update: Update = {} as Update;

      expect(row).toBeDefined();
      expect(insert).toBeDefined();
      expect(update).toBeDefined();
    });
  });
});
