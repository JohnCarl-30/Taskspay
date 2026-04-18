import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmationDialog from './ConfirmationDialog';
import type { DeliveryVerification } from '../supabase';

describe('ConfirmationDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    milestoneName: 'Test Milestone',
    amount: 100,
    verification: null,
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  it('renders with milestone name and amount', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    
    expect(screen.getByText('Test Milestone')).toBeInTheDocument();
    expect(screen.getByText('100.00 XLM')).toBeInTheDocument();
  });

  it('shows warning when no verification exists', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    
    expect(screen.getByText('No verification available')).toBeInTheDocument();
  });

  it('shows approve message when verification recommends approve', () => {
    const verification: DeliveryVerification = {
      id: '1',
      submission_id: 'test',
      score: 85,
      recommendation: 'approve',
      feedback: 'Good work',
      gaps: [],
      raw_response: {},
      created_at: new Date().toISOString(),
    };

    render(<ConfirmationDialog {...defaultProps} verification={verification} />);
    
    expect(screen.getByText('Verification approved')).toBeInTheDocument();
    expect(screen.getByText(/Score: 85\/100/)).toBeInTheDocument();
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

    render(<ConfirmationDialog {...defaultProps} verification={verification} />);
    
    expect(screen.getByText('Verification recommends rejection')).toBeInTheDocument();
    expect(screen.getByText(/Score: 40\/100/)).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmationDialog {...defaultProps} />);
    
    const confirmButton = screen.getByText(/Confirm Release/);
    await user.click(confirmButton);
    
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmationDialog {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('has proper ARIA attributes for dialog', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
  });

  it('has minimum 44x44px touch targets for buttons', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    
    const confirmButton = screen.getByText(/Confirm Release/);
    const cancelButton = screen.getByText('Cancel');
    
    expect(confirmButton).toHaveStyle({ minHeight: '44px' });
    expect(cancelButton).toHaveStyle({ minHeight: '44px' });
  });

  it('has descriptive aria-labels on buttons', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    
    const confirmButton = screen.getByRole('button', { name: /Confirm release of 100.00 XLM for Test Milestone/i });
    const cancelButton = screen.getByRole('button', { name: /Cancel payment release/i });
    
    expect(confirmButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
  });

  it('has keyboard focus states on buttons', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    
    const confirmButton = screen.getByText(/Confirm Release/);
    const cancelButton = screen.getByText('Cancel');
    
    // Check that focus ring classes are present
    expect(confirmButton).toHaveClass('focus:outline-none');
    expect(confirmButton).toHaveClass('focus:ring-2');
    expect(cancelButton).toHaveClass('focus:outline-none');
    expect(cancelButton).toHaveClass('focus:ring-2');
  });

  it('focuses confirm button on mount', async () => {
    render(<ConfirmationDialog {...defaultProps} />);
    
    const confirmButton = screen.getByText(/Confirm Release/);
    
    // Wait for useEffect to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // The confirm button should be focused after mount
    expect(confirmButton).toHaveFocus();
  });
});
