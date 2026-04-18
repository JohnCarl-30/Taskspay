import { describe, it, expect } from 'vitest';
import { filterEscrows, paginateItems, calculateTotalPages } from './escrow-filters';

describe('filterEscrows', () => {
  const mockEscrows = [
    { id: 1, status: 'Pending', created_at: '2024-01-15T10:00:00Z' },
    { id: 2, status: 'Released', created_at: '2024-01-20T10:00:00Z' },
    { id: 3, status: 'Pending', created_at: '2024-01-25T10:00:00Z' },
    { id: 4, status: 'Refunded', created_at: '2024-02-01T10:00:00Z' },
    { id: 5, status: 'Released', created_at: '2024-02-10T10:00:00Z' },
  ];

  describe('status filtering', () => {
    it('should return all escrows when filter is "All"', () => {
      const result = filterEscrows(mockEscrows, 'All');
      expect(result).toHaveLength(5);
    });

    it('should filter by Pending status', () => {
      const result = filterEscrows(mockEscrows, 'Pending');
      expect(result).toHaveLength(2);
      expect(result.every(e => e.status === 'Pending')).toBe(true);
    });

    it('should filter by Released status', () => {
      const result = filterEscrows(mockEscrows, 'Released');
      expect(result).toHaveLength(2);
      expect(result.every(e => e.status === 'Released')).toBe(true);
    });

    it('should filter by Refunded status', () => {
      const result = filterEscrows(mockEscrows, 'Refunded');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Refunded');
    });

    it('should return empty array for non-matching status', () => {
      const result = filterEscrows(mockEscrows, 'NonExistent');
      expect(result).toHaveLength(0);
    });
  });

  describe('date range filtering', () => {
    it('should filter by start date', () => {
      const result = filterEscrows(mockEscrows, 'All', '2024-01-25');
      expect(result).toHaveLength(3);
      expect(result.map(e => e.id)).toEqual([3, 4, 5]);
    });

    it('should filter by end date', () => {
      const result = filterEscrows(mockEscrows, 'All', undefined, '2024-01-25');
      expect(result).toHaveLength(3);
      expect(result.map(e => e.id)).toEqual([1, 2, 3]);
    });

    it('should filter by date range', () => {
      const result = filterEscrows(mockEscrows, 'All', '2024-01-20', '2024-02-01');
      expect(result).toHaveLength(3);
      expect(result.map(e => e.id)).toEqual([2, 3, 4]);
    });

    it('should handle escrows without created_at when date filter is applied', () => {
      const escrowsWithoutDate = [
        { id: 1, status: 'Pending' },
        { id: 2, status: 'Released', created_at: '2024-01-20T10:00:00Z' },
      ];
      const result = filterEscrows(escrowsWithoutDate, 'All', '2024-01-15');
      expect(result).toHaveLength(2); // Both should be included (one has no date, one matches)
    });
  });

  describe('combined filtering', () => {
    it('should filter by both status and date range', () => {
      const result = filterEscrows(mockEscrows, 'Pending', '2024-01-20', '2024-01-31');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(3);
    });

    it('should return empty array when no escrows match combined filters', () => {
      const result = filterEscrows(mockEscrows, 'Refunded', '2024-01-01', '2024-01-15');
      expect(result).toHaveLength(0);
    });
  });
});

describe('paginateItems', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('should return first page correctly', () => {
    const result = paginateItems(items, 1, 3);
    expect(result).toEqual([1, 2, 3]);
  });

  it('should return second page correctly', () => {
    const result = paginateItems(items, 2, 3);
    expect(result).toEqual([4, 5, 6]);
  });

  it('should return last page with remaining items', () => {
    const result = paginateItems(items, 4, 3);
    expect(result).toEqual([10]);
  });

  it('should return empty array for page beyond total pages', () => {
    const result = paginateItems(items, 5, 3);
    expect(result).toEqual([]);
  });

  it('should handle page size larger than total items', () => {
    const result = paginateItems(items, 1, 20);
    expect(result).toEqual(items);
  });

  it('should handle empty array', () => {
    const result = paginateItems([], 1, 10);
    expect(result).toEqual([]);
  });
});

describe('calculateTotalPages', () => {
  it('should calculate correct number of pages', () => {
    expect(calculateTotalPages(10, 3)).toBe(4);
    expect(calculateTotalPages(9, 3)).toBe(3);
    expect(calculateTotalPages(20, 20)).toBe(1);
  });

  it('should return 0 for empty list', () => {
    expect(calculateTotalPages(0, 10)).toBe(0);
  });

  it('should handle single item', () => {
    expect(calculateTotalPages(1, 10)).toBe(1);
  });

  it('should handle exact page size multiples', () => {
    expect(calculateTotalPages(20, 10)).toBe(2);
    expect(calculateTotalPages(30, 10)).toBe(3);
  });
});
