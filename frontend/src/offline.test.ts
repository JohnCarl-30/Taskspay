import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveOfflineEscrow,
  getOfflineEscrows,
  getUnsyncedEscrows,
  markEscrowAsSynced,
  clearSyncedEscrows,
  getUnsyncedCount,
  clearAllOfflineEscrows,
} from './offline';
import type { EscrowInsert } from './supabase';

describe('Offline Storage Module', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    // Replace global localStorage with mock
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    
    // Clear storage before each test
    localStorageMock.clear();
  });

  afterEach(() => {
    // Clean up after each test
    clearAllOfflineEscrows();
  });

  const createMockEscrow = (): EscrowInsert => ({
    user_id: 'test-user-id',
    wallet_address: 'GTEST123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789ABC',
    freelancer_address: 'GFREE123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789ABC',
    amount: 100.5,
    description: 'Test project description',
    milestone_count: 3,
    milestones: [
      { name: 'Milestone 1', description: 'First milestone', percentage: 33, xlm: 33.5 },
      { name: 'Milestone 2', description: 'Second milestone', percentage: 33, xlm: 33.5 },
      { name: 'Milestone 3', description: 'Third milestone', percentage: 34, xlm: 33.5 },
    ],
  });

  describe('saveOfflineEscrow', () => {
    it('should save an escrow to localStorage', () => {
      const escrow = createMockEscrow();
      const result = saveOfflineEscrow(escrow);

      expect(result.offline_id).toBeDefined();
      expect(result.offline_id).toMatch(/^offline-\d+-[a-z0-9]+$/);
      expect(result.synced).toBe(false);
      expect(result.created_at).toBeDefined();
      expect(result.wallet_address).toBe(escrow.wallet_address);
    });

    it('should add escrow to existing queue', () => {
      const escrow1 = createMockEscrow();
      const escrow2 = createMockEscrow();

      saveOfflineEscrow(escrow1);
      saveOfflineEscrow(escrow2);

      const allEscrows = getOfflineEscrows();
      expect(allEscrows).toHaveLength(2);
    });
  });

  describe('getOfflineEscrows', () => {
    it('should return empty array when no escrows stored', () => {
      const escrows = getOfflineEscrows();
      expect(escrows).toEqual([]);
    });

    it('should return all stored escrows', () => {
      const escrow1 = createMockEscrow();
      const escrow2 = createMockEscrow();

      saveOfflineEscrow(escrow1);
      saveOfflineEscrow(escrow2);

      const allEscrows = getOfflineEscrows();
      expect(allEscrows).toHaveLength(2);
    });
  });

  describe('getUnsyncedEscrows', () => {
    it('should return only unsynced escrows', () => {
      const escrow1 = createMockEscrow();
      const escrow2 = createMockEscrow();

      const saved1 = saveOfflineEscrow(escrow1);
      const saved2 = saveOfflineEscrow(escrow2);

      // Mark one as synced
      markEscrowAsSynced(saved1.offline_id);

      const unsynced = getUnsyncedEscrows();
      expect(unsynced).toHaveLength(1);
      expect(unsynced[0].offline_id).toBe(saved2.offline_id);
    });

    it('should return empty array when all escrows are synced', () => {
      const escrow = createMockEscrow();
      const saved = saveOfflineEscrow(escrow);
      markEscrowAsSynced(saved.offline_id);

      const unsynced = getUnsyncedEscrows();
      expect(unsynced).toEqual([]);
    });
  });

  describe('markEscrowAsSynced', () => {
    it('should mark an escrow as synced', () => {
      const escrow = createMockEscrow();
      const saved = saveOfflineEscrow(escrow);

      expect(saved.synced).toBe(false);

      markEscrowAsSynced(saved.offline_id);

      const allEscrows = getOfflineEscrows();
      const syncedEscrow = allEscrows.find(e => e.offline_id === saved.offline_id);
      expect(syncedEscrow?.synced).toBe(true);
    });

    it('should not affect other escrows', () => {
      const escrow1 = createMockEscrow();
      const escrow2 = createMockEscrow();

      const saved1 = saveOfflineEscrow(escrow1);
      const saved2 = saveOfflineEscrow(escrow2);

      markEscrowAsSynced(saved1.offline_id);

      const allEscrows = getOfflineEscrows();
      const escrow2Updated = allEscrows.find(e => e.offline_id === saved2.offline_id);
      expect(escrow2Updated?.synced).toBe(false);
    });
  });

  describe('clearSyncedEscrows', () => {
    it('should remove synced escrows from storage', () => {
      const escrow1 = createMockEscrow();
      const escrow2 = createMockEscrow();

      const saved1 = saveOfflineEscrow(escrow1);
      const saved2 = saveOfflineEscrow(escrow2);

      markEscrowAsSynced(saved1.offline_id);
      clearSyncedEscrows();

      const remaining = getOfflineEscrows();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].offline_id).toBe(saved2.offline_id);
    });

    it('should keep unsynced escrows', () => {
      const escrow = createMockEscrow();
      saveOfflineEscrow(escrow);

      clearSyncedEscrows();

      const remaining = getOfflineEscrows();
      expect(remaining).toHaveLength(1);
    });
  });

  describe('getUnsyncedCount', () => {
    it('should return correct count of unsynced escrows', () => {
      expect(getUnsyncedCount()).toBe(0);

      const escrow1 = createMockEscrow();
      const escrow2 = createMockEscrow();
      const escrow3 = createMockEscrow();

      const saved1 = saveOfflineEscrow(escrow1);
      saveOfflineEscrow(escrow2);
      saveOfflineEscrow(escrow3);

      expect(getUnsyncedCount()).toBe(3);

      markEscrowAsSynced(saved1.offline_id);
      expect(getUnsyncedCount()).toBe(2);
    });
  });

  describe('clearAllOfflineEscrows', () => {
    it('should remove all escrows from storage', () => {
      const escrow1 = createMockEscrow();
      const escrow2 = createMockEscrow();

      saveOfflineEscrow(escrow1);
      saveOfflineEscrow(escrow2);

      expect(getOfflineEscrows()).toHaveLength(2);

      clearAllOfflineEscrows();

      expect(getOfflineEscrows()).toEqual([]);
    });
  });
});
