import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EscrowPage from './EscrowPage';
import type { EscrowRecord } from '../supabase';

// Mock dependencies
vi.mock('../openai', () => ({
  generateMilestones: vi.fn(),
}));

vi.mock('../stellar', () => ({
  createEscrow: vi.fn(),
  EXPLORER_URL: vi.fn((contractId: string) => `https://stellar.expert/explorer/testnet/contract/${contractId}`),
}));

vi.mock('../freighter', () => ({
  signTransaction: vi.fn(),
}));

vi.mock('../supabase', () => ({
  insertEscrow: vi.fn(),
  updateEscrow: vi.fn(),
  authenticateWithWallet: vi.fn(),
}));

/**
 * Bug Condition Exploration Test Suite
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 * 
 * CRITICAL: These tests are EXPECTED TO FAIL on unfixed code.
 * Test failure confirms the bug exists (on_chain_id not saved to database).
 * 
 * DO NOT attempt to fix the test or the code when it fails.
 * Document the counterexamples and move to the next task.
 */
describe('EscrowPage - Bug Condition Exploration (Property 1)', () => {
  const mockWallet = {
    publicKey: 'GTEST123CLIENTADDRESS',
    network: 'TESTNET',
  };

  const mockUserId = 'test-user-id-123';
  const mockOnAddEscrow = vi.fn();
  const mockSetPage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variable
    import.meta.env.VITE_CONTRACT_ID = 'TEST_CONTRACT_ID';
  });

  /**
   * Test Case 1: Basic Escrow Creation with Valid onChainId
   * 
   * EXPECTED OUTCOME: Test FAILS on unfixed code
   * - Database record has on_chain_id = NULL when blockchain returns onChainId = 5
   * 
   * This test verifies that when createEscrow() returns a valid onChainId,
   * the database record should contain that value in the on_chain_id field.
   */
  it('should save on_chain_id to database when blockchain returns valid onChainId', async () => {
    const { createEscrow } = await import('../stellar');
    const { insertEscrow, updateEscrow } = await import('../supabase');
    const { generateMilestones } = await import('../openai');

    // Mock blockchain response with valid onChainId
    vi.mocked(createEscrow).mockResolvedValue({
      hash: 'abc123',
      status: 'PENDING',
      onChainId: 5,
    });

    // Mock AI milestone generation
    vi.mocked(generateMilestones).mockResolvedValue([
      { name: 'Milestone 1', description: 'First milestone', percentage: 100, xlm: 100 },
    ]);

    // Mock database insert
    const mockInsertedRecord: EscrowRecord = {
      id: 'escrow-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: mockUserId,
      wallet_address: mockWallet.publicKey,
      freelancer_address: 'GFREELANCER123',
      amount: 100,
      description: 'Test escrow',
      milestone_count: 1,
      milestones: [{ name: 'Milestone 1', description: 'First milestone', percentage: 100, xlm: 100 }],
      tx_hash: null,
      status: 'pending',
      verification_result: null,
      on_chain_id: null, // BUG: This should be 5, but unfixed code leaves it NULL
      payment_releases: null,
    };

    vi.mocked(insertEscrow).mockResolvedValue(mockInsertedRecord);

    // Mock database update
    const mockUpdatedRecord: EscrowRecord = {
      ...mockInsertedRecord,
      tx_hash: 'abc123',
      status: 'active',
      on_chain_id: null, // BUG: This should be 5, but unfixed code doesn't update it
    };

    vi.mocked(updateEscrow).mockResolvedValue(mockUpdatedRecord);

    // Render component
    const user = userEvent.setup();
    render(
      <EscrowPage
        wallet={mockWallet}
        userId={mockUserId}
        onAddEscrow={mockOnAddEscrow}
        setPage={mockSetPage}
      />
    );

    // Fill in form
    const addressInput = screen.getByPlaceholderText('G...ABCD');
    const amountInput = screen.getByPlaceholderText('0.00');
    const descriptionInput = screen.getByPlaceholderText(/e.g. Build a landing page/i);

    await user.type(addressInput, 'GFREELANCER123');
    await user.type(amountInput, '100');
    await user.type(descriptionInput, 'Test escrow');

    // Generate milestones
    const generateButton = screen.getByText(/Generate AI Milestone Breakdown/i);
    await user.click(generateButton);

    await waitFor(() => {
      expect(generateMilestones).toHaveBeenCalled();
    });

    // Initialize escrow
    const initButton = screen.getByText(/Initialize Escrow/i);
    await user.click(initButton);

    await waitFor(() => {
      expect(createEscrow).toHaveBeenCalled();
    });

    // CRITICAL ASSERTION: Verify on_chain_id was passed to insertEscrow or updateEscrow
    // This assertion WILL FAIL on unfixed code because the bug exists
    await waitFor(() => {
      const insertCalls = vi.mocked(insertEscrow).mock.calls;
      const updateCalls = vi.mocked(updateEscrow).mock.calls;

      // Check if on_chain_id was passed to insertEscrow
      const insertHasOnChainId = insertCalls.some(call => {
        const insertData = call[0];
        return insertData.on_chain_id === 5;
      });

      // Check if on_chain_id was passed to updateEscrow
      const updateHasOnChainId = updateCalls.some(call => {
        const updateData = call[1];
        return updateData.on_chain_id === 5;
      });

      // At least one of them should have received on_chain_id = 5
      expect(insertHasOnChainId || updateHasOnChainId).toBe(true);
    });
  });

  /**
   * Test Case 2: Multiple Escrow Creation with Different onChainId Values
   * 
   * EXPECTED OUTCOME: Test FAILS on unfixed code
   * - All database records have on_chain_id = NULL even when blockchain returns different IDs
   * 
   * This test verifies that multiple escrows can be created sequentially,
   * and each database record should contain the correct on_chain_id.
   */
  it('should save correct on_chain_id for multiple escrows with different IDs', async () => {
    const { createEscrow } = await import('../stellar');
    const { insertEscrow, updateEscrow } = await import('../supabase');
    const { generateMilestones } = await import('../openai');

    // Mock AI milestone generation
    vi.mocked(generateMilestones).mockResolvedValue([
      { name: 'Milestone 1', description: 'First milestone', percentage: 100, xlm: 50 },
    ]);

    // Test data for 3 escrows with different onChainId values
    const testCases = [
      { onChainId: 1, hash: 'hash1', amount: 50 },
      { onChainId: 2, hash: 'hash2', amount: 75 },
      { onChainId: 3, hash: 'hash3', amount: 100 },
    ];

    for (const testCase of testCases) {
      vi.clearAllMocks();

      // Mock blockchain response
      vi.mocked(createEscrow).mockResolvedValue({
        hash: testCase.hash,
        status: 'PENDING',
        onChainId: testCase.onChainId,
      });

      // Mock database insert
      const mockInsertedRecord: EscrowRecord = {
        id: `escrow-${testCase.onChainId}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: mockUserId,
        wallet_address: mockWallet.publicKey,
        freelancer_address: 'GFREELANCER123',
        amount: testCase.amount,
        description: `Test escrow ${testCase.onChainId}`,
        milestone_count: 1,
        milestones: [{ name: 'Milestone 1', description: 'First milestone', percentage: 100, xlm: testCase.amount }],
        tx_hash: null,
        status: 'pending',
        verification_result: null,
        on_chain_id: null, // BUG: Should be testCase.onChainId
        payment_releases: null,
      };

      vi.mocked(insertEscrow).mockResolvedValue(mockInsertedRecord);

      // Mock database update
      const mockUpdatedRecord: EscrowRecord = {
        ...mockInsertedRecord,
        tx_hash: testCase.hash,
        status: 'active',
        on_chain_id: null, // BUG: Should be testCase.onChainId
      };

      vi.mocked(updateEscrow).mockResolvedValue(mockUpdatedRecord);

      // Render component
      const user = userEvent.setup();
      const { unmount } = render(
        <EscrowPage
          wallet={mockWallet}
          userId={mockUserId}
          onAddEscrow={mockOnAddEscrow}
          setPage={mockSetPage}
        />
      );

      // Fill in form
      const addressInput = screen.getByPlaceholderText('G...ABCD');
      const amountInput = screen.getByPlaceholderText('0.00');
      const descriptionInput = screen.getByPlaceholderText(/e.g. Build a landing page/i);

      await user.type(addressInput, 'GFREELANCER123');
      await user.type(amountInput, testCase.amount.toString());
      await user.type(descriptionInput, `Test escrow ${testCase.onChainId}`);

      // Generate milestones
      const generateButton = screen.getByText(/Generate AI Milestone Breakdown/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(generateMilestones).toHaveBeenCalled();
      });

      // Initialize escrow
      const initButton = screen.getByText(/Initialize Escrow/i);
      await user.click(initButton);

      await waitFor(() => {
        expect(createEscrow).toHaveBeenCalled();
      });

      // CRITICAL ASSERTION: Verify on_chain_id was passed correctly
      // This assertion WILL FAIL on unfixed code
      await waitFor(() => {
        const insertCalls = vi.mocked(insertEscrow).mock.calls;
        const updateCalls = vi.mocked(updateEscrow).mock.calls;

        const insertHasCorrectId = insertCalls.some(call => {
          const insertData = call[0];
          return insertData.on_chain_id === testCase.onChainId;
        });

        const updateHasCorrectId = updateCalls.some(call => {
          const updateData = call[1];
          return updateData.on_chain_id === testCase.onChainId;
        });

        expect(insertHasCorrectId || updateHasCorrectId).toBe(true);
      });

      unmount();
    }
  });

  /**
   * Test Case 3: Escrow Creation with Authentication Flow
   * 
   * EXPECTED OUTCOME: Test FAILS on unfixed code
   * - Database record has on_chain_id = NULL even after authentication
   * 
   * This test verifies that when userId is initially null (triggering authentication),
   * the on_chain_id is still saved correctly after authentication completes.
   */
  it('should save on_chain_id after authentication when userId is initially null', async () => {
    const { createEscrow } = await import('../stellar');
    const { insertEscrow, updateEscrow, authenticateWithWallet } = await import('../supabase');
    const { generateMilestones } = await import('../openai');

    // Mock blockchain response
    vi.mocked(createEscrow).mockResolvedValue({
      hash: 'xyz789',
      status: 'PENDING',
      onChainId: 42,
    });

    // Mock authentication
    vi.mocked(authenticateWithWallet).mockResolvedValue({
      user: { id: 'authenticated-user-id' } as any,
      session: {} as any,
    });

    // Mock AI milestone generation
    vi.mocked(generateMilestones).mockResolvedValue([
      { name: 'Milestone 1', description: 'First milestone', percentage: 100, xlm: 200 },
    ]);

    // Mock database insert
    const mockInsertedRecord: EscrowRecord = {
      id: 'escrow-auth',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'authenticated-user-id',
      wallet_address: mockWallet.publicKey,
      freelancer_address: 'GFREELANCER456',
      amount: 200,
      description: 'Test escrow with auth',
      milestone_count: 1,
      milestones: [{ name: 'Milestone 1', description: 'First milestone', percentage: 100, xlm: 200 }],
      tx_hash: null,
      status: 'pending',
      verification_result: null,
      on_chain_id: null, // BUG: Should be 42
      payment_releases: null,
    };

    vi.mocked(insertEscrow).mockResolvedValue(mockInsertedRecord);

    // Mock database update
    const mockUpdatedRecord: EscrowRecord = {
      ...mockInsertedRecord,
      tx_hash: 'xyz789',
      status: 'active',
      on_chain_id: null, // BUG: Should be 42
    };

    vi.mocked(updateEscrow).mockResolvedValue(mockUpdatedRecord);

    // Render component with userId = null to trigger authentication
    const user = userEvent.setup();
    render(
      <EscrowPage
        wallet={mockWallet}
        userId={null}
        onAddEscrow={mockOnAddEscrow}
        setPage={mockSetPage}
      />
    );

    // Fill in form
    const addressInput = screen.getByPlaceholderText('G...ABCD');
    const amountInput = screen.getByPlaceholderText('0.00');
    const descriptionInput = screen.getByPlaceholderText(/e.g. Build a landing page/i);

    await user.type(addressInput, 'GFREELANCER456');
    await user.type(amountInput, '200');
    await user.type(descriptionInput, 'Test escrow with auth');

    // Generate milestones
    const generateButton = screen.getByText(/Generate AI Milestone Breakdown/i);
    await user.click(generateButton);

    await waitFor(() => {
      expect(generateMilestones).toHaveBeenCalled();
    });

    // Initialize escrow
    const initButton = screen.getByText(/Initialize Escrow/i);
    await user.click(initButton);

    await waitFor(() => {
      expect(createEscrow).toHaveBeenCalled();
      expect(authenticateWithWallet).toHaveBeenCalledWith(mockWallet.publicKey);
    });

    // CRITICAL ASSERTION: Verify on_chain_id was passed after authentication
    // This assertion WILL FAIL on unfixed code
    await waitFor(() => {
      const insertCalls = vi.mocked(insertEscrow).mock.calls;
      const updateCalls = vi.mocked(updateEscrow).mock.calls;

      const insertHasOnChainId = insertCalls.some(call => {
        const insertData = call[0];
        return insertData.on_chain_id === 42;
      });

      const updateHasOnChainId = updateCalls.some(call => {
        const updateData = call[1];
        return updateData.on_chain_id === 42;
      });

      expect(insertHasOnChainId || updateHasOnChainId).toBe(true);
    });
  });
});
