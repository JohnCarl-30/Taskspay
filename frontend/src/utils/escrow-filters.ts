/**
 * Utility functions for filtering and paginating escrow records
 */

export interface FilterableEscrow {
  status: string;
  created_at?: string;
}

export type StatusFilter = "All" | string;

/**
 * Filter escrows by status and date range
 * 
 * @param escrows - Array of escrows to filter
 * @param statusFilter - Status to filter by ("All" for no filter)
 * @param startDate - Start date for date range filter (ISO string)
 * @param endDate - End date for date range filter (ISO string)
 * @returns Filtered array of escrows
 */
export const filterEscrows = <T extends FilterableEscrow>(
  escrows: T[],
  statusFilter: StatusFilter,
  startDate?: string,
  endDate?: string
): T[] => {
  return escrows.filter((escrow) => {
    // Status filter
    if (statusFilter !== "All" && escrow.status !== statusFilter) {
      return false;
    }
    
    // Date range filter (only apply if escrow has created_at)
    if ((startDate || endDate) && escrow.created_at) {
      const escrowDate = new Date(escrow.created_at);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (escrowDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (escrowDate > end) return false;
      }
    }
    
    return true;
  });
};

/**
 * Paginate an array of items
 * 
 * @param items - Array of items to paginate
 * @param page - Current page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated array of items
 */
export const paginateItems = <T>(
  items: T[],
  page: number,
  pageSize: number
): T[] => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return items.slice(startIndex, endIndex);
};

/**
 * Calculate total number of pages
 * 
 * @param totalItems - Total number of items
 * @param pageSize - Number of items per page
 * @returns Total number of pages
 */
export const calculateTotalPages = (
  totalItems: number,
  pageSize: number
): number => {
  return Math.ceil(totalItems / pageSize);
};
