import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReleaseFundsButton from './ReleaseFundsButton';
import type { DeliveryVerification } from '../supabase';

// Mock the dependencies
vi.mock('../supabase', () => ({
  updateEscrowPaymentReleases: vi.fn(),
}));

vi.mock('../stellar', () => ({
  releaseFunds: vi.fn(),
  TX_EXPLORER_URL: vi.fn((hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`),
}));

vi.mock('../freighter', () => ({
  signTransaction: vi.fn(),
}));

describe('ReleaseFundsButton', () => {
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  const defaultProps = {
    escrowId: 'test-escrow-id',
    onChainEscrowId: 123,
    milestoneIndex: 0,
    milestoneName: 'Test Milestone',
    milestoneAmount: 100,
    clientAddress: 'GTEST123',
    verification: null,
    onSuccess: mockOnSuccess,
    onError: mockOnError,
  };

  it('renders with milestone name and amount', () => {
    render(<ReleaseFundsButton {...defaultProps} />);
    
    expect(screen.getByText('Test Milestone')).toBeInTheDocument();
    expect(screen.getByText('100.00 XLM')).toBeInTheDocument();
  });

  it('renders Release Funds button', () => {
    render(<ReleaseFundsButton {...defaultProps} />);
    
    expect(screen.getByText('Release Funds')).toBeInTheDocument();
  });

  it('shows warning when no verification exists', () => {
    render(<ReleaseFundsButton {...defaultProps} />);
    
    expect(screen.getByText('No verification available')).toBeInTheDocument();
  });

  it('shows warning when verification recommends reject', () => {
    const verification: DeliveryVerification = {
      id: '1',
      submission_id: 'test',
      score: 40,
      recommendation: 'reject',
      feedback: 'Needs improvement',
      gaps: [],
      raw_response: {},
      created_at: new Date().toISOString(),
    };

    render(<ReleaseFundsButton {...defaultProps} verification={verification} />);
    
    expect(screen.getByText('Verification recommends rejection')).toBeInTheDocument();
  });

  it('shows caution when verification recommends request_changes', () => {
    const verification: DeliveryVerification = {
      id: '1',
      submission_id: 'test',
      score: 65,
      recommendation: 'request_changes',
      feedback: 'Some improvements needed',
      gaps: [],
      raw_response: {},
      created_at: new Date().toISOString(),
    };

    render(<ReleaseFundsButton {...defaultProps} verification={verification} />);
    
    expect(screen.getByText('Verification suggests changes')).toBeInTheDocument();
  });

  it('opens confirmation dialog when button is clicked', async () => {
    const user = userEvent.setup();
    render(<ReleaseFundsButton {...defaultProps} />);
    
    const releaseButton = screen.getByText('Release Funds');
    await user.click(releaseButton);
    
    // Check if confirmation dialog appears
    expect(screen.getByText('Confirm Payment Release')).toBeInTheDocument();
  });

  it('shows error when wallet is not connected', async () => {
    const user = userEvent.setup();
    render(<ReleaseFundsButton {...defaultProps} clientAddress="" />);
    
    const releaseButton = screen.getByText('Release Funds');
    await user.click(releaseButton);
    
    // Should show error message
    expect(screen.getByText('Please connect your Freighter wallet')).toBeInTheDocument();
  });

  it('has proper aria-label for accessibility', () => {
    render(<ReleaseFundsButton {...defaultProps} />);
    
    const releaseButton = screen.getByRole('button', { name: /Release 100.00 XLM payment for Test Milestone/i });
    expect(releaseButton).toBeInTheDocument();
  });

  it('has minimum 44x44px touch target', () => {
    render(<ReleaseFundsButton {...defaultProps} />);
    
    const releaseButton = screen.getByRole('button', { name: /Release 100.00 XLM payment for Test Milestone/i });
    
    // Check minimum height and width are set via inline styles
    const styles = window.getComputedStyle(releaseButton);
    expect(styles.minHeight).toBe('44px');
    expect(styles.minWidth).toBe('44px');
  });

  it('sets aria-busy during transaction processing', async () => {
    const user = userEvent.setup();
    const { releaseFunds } = await import('../stellar');
    
    // Mock releaseFunds to return a promise that never resolves (simulating processing)
    vi.mocked(releaseFunds).mockImplementation(() => new Promise(() => {}));
    
    render(<ReleaseFundsButton {...defaultProps} />);
    
    const releaseButton = screen.getByRole('button', { name: /Release 100.00 XLM payment for Test Milestone/i });
    
    // Initially aria-busy should be false
    expect(releaseButton).toHaveAttribute('aria-busy', 'false');
    
    // Click button and confirm
    await user.click(releaseButton);
    const confirmButton = screen.getByText(/Confirm Release/i);
    await user.click(confirmButton);
    
    // After confirming, aria-busy should be true during processing
    const processingButton = screen.getByRole('button', { name: /Release 100.00 XLM payment for Test Milestone/i });
    expect(processingButton).toHaveAttribute('aria-busy', 'true');
  });

  it('has keyboard focus states', () => {
    render(<ReleaseFundsButton {...defaultProps} />);
    
    const releaseButton = screen.getByRole('button', { name: /Release 100.00 XLM payment for Test Milestone/i });
    
    // Check that focus ring classes are present on the button element
    expect(releaseButton).toHaveClass('focus:outline-none');
    expect(releaseButton).toHaveClass('focus:ring-2');
    expect(releaseButton).toHaveClass('focus:ring-[var(--accent)]');
  });
});
