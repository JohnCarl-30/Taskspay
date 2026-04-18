/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitWork, fetchMilestoneSubmissions, fetchSubmissionById, SubmissionValidationError } from './submissions';
import { supabase } from '../supabase';

// Mock the supabase client
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Valid Stellar address for testing (56 characters starting with G)
const VALID_STELLAR_ADDRESS = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

describe('submissions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitWork', () => {
    it('should validate and submit work successfully', async () => {
      const mockSubmission = {
        id: 'test-id',
        created_at: '2024-01-01T00:00:00Z',
        escrow_id: 'escrow-123',
        milestone_index: 0,
        submitter_address: VALID_STELLAR_ADDRESS,
        description: 'Completed the milestone work',
        urls: ['https://example.com/proof'],
      };

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockSubmission, error: null }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      (supabase.from as any) = mockFrom;

      const result = await submitWork({
        escrowId: 'escrow-123',
        milestoneIndex: 0,
        submitterAddress: VALID_STELLAR_ADDRESS,
        description: 'Completed the milestone work',
        urls: ['https://example.com/proof'],
      });

      expect(result).toEqual(mockSubmission);
      expect(mockFrom).toHaveBeenCalledWith('work_submissions');
      expect(mockInsert).toHaveBeenCalledWith({
        escrow_id: 'escrow-123',
        milestone_index: 0,
        submitter_address: VALID_STELLAR_ADDRESS,
        description: 'Completed the milestone work',
        urls: ['https://example.com/proof'],
      });
    });

    it('should reject empty description', async () => {
      await expect(
        submitWork({
          escrowId: 'escrow-123',
          milestoneIndex: 0,
          submitterAddress: VALID_STELLAR_ADDRESS,
          description: '',
          urls: [],
        })
      ).rejects.toThrow(SubmissionValidationError);
    });

    it('should reject description over 2000 characters', async () => {
      const longDescription = 'a'.repeat(2001);
      
      await expect(
        submitWork({
          escrowId: 'escrow-123',
          milestoneIndex: 0,
          submitterAddress: VALID_STELLAR_ADDRESS,
          description: longDescription,
          urls: [],
        })
      ).rejects.toThrow(SubmissionValidationError);
    });

    it('should reject more than 5 URLs', async () => {
      const urls = [
        'https://example.com/1',
        'https://example.com/2',
        'https://example.com/3',
        'https://example.com/4',
        'https://example.com/5',
        'https://example.com/6',
      ];

      await expect(
        submitWork({
          escrowId: 'escrow-123',
          milestoneIndex: 0,
          submitterAddress: VALID_STELLAR_ADDRESS,
          description: 'Test',
          urls,
        })
      ).rejects.toThrow(SubmissionValidationError);
    });

    it('should reject invalid URL format', async () => {
      await expect(
        submitWork({
          escrowId: 'escrow-123',
          milestoneIndex: 0,
          submitterAddress: VALID_STELLAR_ADDRESS,
          description: 'Test',
          urls: ['not-a-valid-url'],
        })
      ).rejects.toThrow(SubmissionValidationError);
    });

    it('should reject ftp:// URLs', async () => {
      await expect(
        submitWork({
          escrowId: 'escrow-123',
          milestoneIndex: 0,
          submitterAddress: VALID_STELLAR_ADDRESS,
          description: 'Test',
          urls: ['ftp://example.com/file'],
        })
      ).rejects.toThrow(SubmissionValidationError);
    });

    it('should reject negative milestone index', async () => {
      await expect(
        submitWork({
          escrowId: 'escrow-123',
          milestoneIndex: -1,
          submitterAddress: VALID_STELLAR_ADDRESS,
          description: 'Test',
          urls: [],
        })
      ).rejects.toThrow(SubmissionValidationError);
    });

    it('should reject invalid Stellar address', async () => {
      await expect(
        submitWork({
          escrowId: 'escrow-123',
          milestoneIndex: 0,
          submitterAddress: 'invalid-address',
          description: 'Test',
          urls: [],
        })
      ).rejects.toThrow(SubmissionValidationError);
    });

    it('should accept submission with no URLs', async () => {
      const mockSubmission = {
        id: 'test-id',
        created_at: '2024-01-01T00:00:00Z',
        escrow_id: 'escrow-123',
        milestone_index: 0,
        submitter_address: VALID_STELLAR_ADDRESS,
        description: 'Completed work without URLs',
        urls: [],
      };

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockSubmission, error: null }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      (supabase.from as any) = mockFrom;

      const result = await submitWork({
        escrowId: 'escrow-123',
        milestoneIndex: 0,
        submitterAddress: VALID_STELLAR_ADDRESS,
        description: 'Completed work without URLs',
        urls: [],
      });

      expect(result).toEqual(mockSubmission);
    });

    it('should trim description and URLs', async () => {
      const mockSubmission = {
        id: 'test-id',
        created_at: '2024-01-01T00:00:00Z',
        escrow_id: 'escrow-123',
        milestone_index: 0,
        submitter_address: VALID_STELLAR_ADDRESS,
        description: 'Trimmed description',
        urls: ['https://example.com/proof'],
      };

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockSubmission, error: null }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      (supabase.from as any) = mockFrom;

      await submitWork({
        escrowId: 'escrow-123',
        milestoneIndex: 0,
        submitterAddress: VALID_STELLAR_ADDRESS,
        description: '  Trimmed description  ',
        urls: ['  https://example.com/proof  '],
      });

      expect(mockInsert).toHaveBeenCalledWith({
        escrow_id: 'escrow-123',
        milestone_index: 0,
        submitter_address: VALID_STELLAR_ADDRESS,
        description: 'Trimmed description',
        urls: ['https://example.com/proof'],
      });
    });
  });

  describe('fetchMilestoneSubmissions', () => {
    it('should fetch submissions for a milestone', async () => {
      const mockSubmissions = [
        {
          id: 'sub-1',
          created_at: '2024-01-02T00:00:00Z',
          escrow_id: 'escrow-123',
          milestone_index: 0,
          submitter_address: VALID_STELLAR_ADDRESS,
          description: 'Second submission',
          urls: [],
        },
        {
          id: 'sub-2',
          created_at: '2024-01-01T00:00:00Z',
          escrow_id: 'escrow-123',
          milestone_index: 0,
          submitter_address: VALID_STELLAR_ADDRESS,
          description: 'First submission',
          urls: [],
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockSubmissions, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      (supabase.from as any) = mockFrom;

      const result = await fetchMilestoneSubmissions('escrow-123', 0);

      expect(result).toEqual(mockSubmissions);
      expect(mockFrom).toHaveBeenCalledWith('work_submissions');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq1).toHaveBeenCalledWith('escrow_id', 'escrow-123');
      expect(mockEq2).toHaveBeenCalledWith('milestone_index', 0);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return empty array when no submissions exist', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      (supabase.from as any) = mockFrom;

      const result = await fetchMilestoneSubmissions('escrow-123', 0);

      expect(result).toEqual([]);
    });
  });

  describe('fetchSubmissionById', () => {
    it('should fetch a submission by ID', async () => {
      const mockSubmission = {
        id: 'sub-1',
        created_at: '2024-01-01T00:00:00Z',
        escrow_id: 'escrow-123',
        milestone_index: 0,
        submitter_address: VALID_STELLAR_ADDRESS,
        description: 'Test submission',
        urls: ['https://example.com'],
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockSubmission, error: null });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      (supabase.from as any) = mockFrom;

      const result = await fetchSubmissionById('sub-1');

      expect(result).toEqual(mockSubmission);
      expect(mockFrom).toHaveBeenCalledWith('work_submissions');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 'sub-1');
    });

    it('should return null when submission not found', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      (supabase.from as any) = mockFrom;

      const result = await fetchSubmissionById('non-existent');

      expect(result).toBeNull();
    });
  });
});
