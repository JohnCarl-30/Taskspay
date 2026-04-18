import type { EscrowInsert } from './supabase';

/**
 * Offline escrow record stored in localStorage
 * Extends EscrowInsert with offline-specific fields
 */
export interface OfflineEscrow extends EscrowInsert {
  offline_id: string;
  created_at: string;
  synced: boolean;
}

const OFFLINE_STORAGE_KEY = 'escrow_offline_queue';

/**
 * Save an escrow to localStorage for offline storage
 * 
 * @param escrow - The escrow data to store offline
 * @returns The offline escrow record with generated offline_id
 */
export const saveOfflineEscrow = (escrow: EscrowInsert): OfflineEscrow => {
  try {
    // Generate unique offline ID
    const offline_id = `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create offline escrow record
    const offlineEscrow: OfflineEscrow = {
      ...escrow,
      offline_id,
      created_at: new Date().toISOString(),
      synced: false,
    };
    
    // Get existing offline escrows
    const existingEscrows = getOfflineEscrows();
    
    // Add new escrow to the queue
    const updatedEscrows = [...existingEscrows, offlineEscrow];
    
    // Save to localStorage
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedEscrows));
    
    console.log('Escrow saved offline:', offline_id);
    return offlineEscrow;
  } catch (error) {
    console.error('Failed to save escrow offline:', error);
    throw new Error('Failed to save escrow to offline storage');
  }
};

/**
 * Get all offline escrows from localStorage
 * 
 * @returns Array of offline escrow records
 */
export const getOfflineEscrows = (): OfflineEscrow[] => {
  try {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    
    if (!stored) {
      return [];
    }
    
    const escrows = JSON.parse(stored) as OfflineEscrow[];
    return escrows;
  } catch (error) {
    console.error('Failed to read offline escrows:', error);
    return [];
  }
};

/**
 * Get only unsynced offline escrows
 * 
 * @returns Array of offline escrow records that haven't been synced yet
 */
export const getUnsyncedEscrows = (): OfflineEscrow[] => {
  const allEscrows = getOfflineEscrows();
  return allEscrows.filter(escrow => !escrow.synced);
};

/**
 * Mark an offline escrow as synced
 * 
 * @param offline_id - The offline ID of the escrow to mark as synced
 */
export const markEscrowAsSynced = (offline_id: string): void => {
  try {
    const escrows = getOfflineEscrows();
    
    // Find and update the escrow
    const updatedEscrows = escrows.map(escrow =>
      escrow.offline_id === offline_id
        ? { ...escrow, synced: true }
        : escrow
    );
    
    // Save back to localStorage
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedEscrows));
    
    console.log('Escrow marked as synced:', offline_id);
  } catch (error) {
    console.error('Failed to mark escrow as synced:', error);
    throw new Error('Failed to update offline escrow status');
  }
};

/**
 * Remove synced escrows from localStorage
 * Cleans up the offline queue by removing successfully synced records
 */
export const clearSyncedEscrows = (): void => {
  try {
    const escrows = getOfflineEscrows();
    
    // Keep only unsynced escrows
    const unsyncedEscrows = escrows.filter(escrow => !escrow.synced);
    
    // Save back to localStorage
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(unsyncedEscrows));
    
    const removedCount = escrows.length - unsyncedEscrows.length;
    console.log(`Cleared ${removedCount} synced escrow(s) from offline storage`);
  } catch (error) {
    console.error('Failed to clear synced escrows:', error);
    throw new Error('Failed to clear synced escrows from offline storage');
  }
};

/**
 * Get the count of unsynced offline escrows
 * 
 * @returns Number of escrows waiting to be synced
 */
export const getUnsyncedCount = (): number => {
  return getUnsyncedEscrows().length;
};

/**
 * Clear all offline escrows (use with caution)
 * This removes all offline data including unsynced records
 */
export const clearAllOfflineEscrows = (): void => {
  try {
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
    console.log('All offline escrows cleared');
  } catch (error) {
    console.error('Failed to clear offline escrows:', error);
    throw new Error('Failed to clear offline storage');
  }
};
