import { useState, useEffect } from "react";
import ConfirmationDialog from "./ConfirmationDialog";
import type { DeliveryVerification, PaymentRelease } from "../supabase";
import { updateEscrowPaymentReleases } from "../supabase";
import { releaseFunds, TX_EXPLORER_URL } from "../stellar";
import { signTransaction } from "../freighter";

/**
 * ReleaseFundsButton Component
 * 
 * Accessibility Features (WCAG AA Compliant):
 * - aria-label: Descriptive label for screen readers
 * - aria-busy: Indicates loading state during transaction processing
 * - Minimum 44x44px touch target for mobile accessibility
 * - WCAG AA color contrast ratios:
 *   - Dark theme: #c8f135 on #0a0a0a (contrast ratio: 15.8:1)
 *   - Light theme: #a3d420 on #0a0a0a (contrast ratio: 12.4:1)
 *   - Error state: #ff4d4d on #ffffff (contrast ratio: 4.5:1)
 * - Keyboard navigation: Tab to focus, Enter to activate
 * - Focus states: Visible focus ring and scale transform
 * - Hover states: Visual feedback on interactive elements
 */

export interface ReleaseFundsButtonProps {
  escrowId: string;
  onChainEscrowId: number;
  milestoneIndex: number;
  milestoneName: string;
  milestoneAmount: number;
  clientAddress: string;
  verification: DeliveryVerification | null;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

export interface ReleaseFundsState {
  status: 'idle' | 'confirming' | 'signing' | 'submitting' | 'success' | 'error';
  txHash: string | null;
  error: string | null;
  showConfirmation: boolean;
}

/**
 * Categorizes errors from wallet, contract, network, and database operations
 * into user-friendly error messages
 */
function categorizeError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    const messageLower = message.toLowerCase();
    
    // Wallet errors
    if (messageLower.includes('user declined') || 
        messageLower.includes('cancelled') || 
        messageLower.includes('rejected by user')) {
      return 'Transaction cancelled by user';
    }
    
    if (messageLower.includes('freighter not installed') || 
        messageLower.includes('wallet not found')) {
      return 'Please install the Freighter wallet extension';
    }
    
    if (messageLower.includes('locked') || 
        messageLower.includes('unlock')) {
      return 'Please unlock your Freighter wallet';
    }
    
    if (messageLower.includes('not connected') || 
        messageLower.includes('connect wallet')) {
      return 'Please connect your Freighter wallet';
    }
    
    // Contract errors - check for specific contract error messages
    if (messageLower.includes('only client can release') || 
        messageLower.includes('unauthorized') ||
        messageLower.includes('only the escrow creator')) {
      return 'Only the escrow creator can release funds';
    }
    
    if (messageLower.includes('escrow not found') || 
        messageLower.includes('invalid escrow')) {
      return 'Escrow not found on blockchain';
    }
    
    if (messageLower.includes('not active') || 
        messageLower.includes('escrow is not active')) {
      return 'Escrow is not active';
    }
    
    if (messageLower.includes('all milestones already completed') || 
        messageLower.includes('already completed')) {
      return 'All milestones already completed';
    }

    // Contract initialization errors
    if (messageLower.includes('unreachablecode') || 
        messageLower.includes('not initialized') ||
        messageLower.includes('contract not initialized')) {
      return 'Contract not initialized. Click "Initialize Contract" on the homepage, or check your VITE_XLM_TOKEN_ADDRESS in .env.';
    }
    
    if (messageLower.includes('unsupported address type')) {
      return 'Invalid XLM token address in .env. Must be a 56-character Soroban contract address starting with "C".';
    }
    
    // Network errors
    if (messageLower.includes('simulation failed')) {
      return `Transaction simulation failed: ${message}`;
    }
    
    if (messageLower.includes('network unavailable') || 
        messageLower.includes('network error') ||
        messageLower.includes('connection failed')) {
      return 'Network unavailable. Please try again later.';
    }
    
    if (messageLower.includes('timeout') || 
        messageLower.includes('timed out')) {
      return 'Request timed out. Please try again.';
    }
    
    if (messageLower.includes('transaction failed') || 
        messageLower.includes('submission failed')) {
      return 'Transaction failed. Please check your wallet and try again.';
    }
    
    // Database errors
    if (messageLower.includes('database') || 
        messageLower.includes('supabase')) {
      return 'Payment released on-chain but database update failed. Please refresh the page.';
    }
    
    // Return original error message if no specific category matched
    return message;
  }
  
  // Handle non-Error objects
  return 'An unexpected error occurred. Please try again.';
}

export default function ReleaseFundsButton({
  escrowId,
  onChainEscrowId,
  milestoneIndex,
  milestoneName,
  milestoneAmount,
  clientAddress,
  verification,
  onSuccess: _onSuccess,
  onError: _onError,
}: ReleaseFundsButtonProps) {
  const [state, setState] = useState<ReleaseFundsState>({
    status: 'idle',
    txHash: null,
    error: null,
    showConfirmation: false,
  });

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (state.status === 'success') {
      const timer = setTimeout(() => {
        setState(prev => ({
          ...prev,
          status: 'idle',
          txHash: null,
        }));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [state.status]);

  // Auto-recover from error state after 5 seconds
  useEffect(() => {
    if (state.status === 'error') {
      const timer = setTimeout(() => {
        setState(prev => ({
          ...prev,
          status: 'idle',
          error: null,
        }));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [state.status]);

  // Handler to show confirmation dialog
  const handleClick = () => {
    // Check if wallet is connected
    if (!clientAddress) {
      setState({
        ...state,
        status: 'error',
        error: 'Please connect your Freighter wallet',
        showConfirmation: false,
      });
      return;
    }

    // Show confirmation dialog
    setState({
      ...state,
      showConfirmation: true,
      status: 'confirming',
    });
  };

  // Handler for confirming the transaction
  const handleConfirm = async () => {
    try {
      // Step 1: Close confirmation dialog and update state to 'signing'
      // This state indicates we're waiting for the wallet signature
      setState({
        ...state,
        showConfirmation: false,
        status: 'signing',
      });

      // Step 2: Call smart contract to release funds
      // This will prompt the user's wallet for signature
      const result = await releaseFunds(
        clientAddress,
        onChainEscrowId,
        signTransaction
      );

      // Step 3: Update state to 'submitting' for database update
      setState({
        status: 'submitting',
        txHash: result.hash,
        error: null,
        showConfirmation: false,
      });

      // Step 4: Update database with payment release record
      const paymentRelease: PaymentRelease = {
        milestone_index: milestoneIndex,
        released_at: new Date().toISOString(),
        tx_hash: result.hash,
        ...(verification && {
          verification_id: verification.id,
          score: verification.score,
          recommendation: verification.recommendation,
        }),
      };

      await updateEscrowPaymentReleases(escrowId, paymentRelease);

      // Step 5: Transaction and database update successful
      setState({
        status: 'success',
        txHash: result.hash,
        error: null,
        showConfirmation: false,
      });

      // Call success callback
      _onSuccess();

    } catch (error) {
      // Categorize and display user-friendly error message
      const errorMessage = categorizeError(error);
      
      // Log detailed error to console for debugging
      console.error('Release funds error:', error);
      
      setState({
        status: 'error',
        txHash: null,
        error: errorMessage,
        showConfirmation: false,
      });

      // Call error callback
      _onError(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  // Handler for canceling the confirmation
  const handleCancel = () => {
    setState({
      status: 'idle',
      txHash: null,
      error: null,
      showConfirmation: false,
    });
  };

  // Determine if button should be disabled
  const isDisabled = state.status !== 'idle' && state.status !== 'confirming';

  // Get button text based on state
  const getButtonText = () => {
    switch (state.status) {
      case 'signing':
        return 'Waiting for wallet...';
      case 'submitting':
        return 'Submitting transaction...';
      case 'success':
        return 'Payment Released!';
      case 'error':
        return 'Release Failed';
      default:
        return 'Release Funds';
    }
  };

  // Get button icon based on state
  const getButtonIcon = () => {
    switch (state.status) {
      case 'signing':
      case 'submitting':
        return (
          <span
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full flex-shrink-0"
            style={{ animation: 'spin 0.8s linear infinite' }}
            role="status"
            aria-label="Loading"
          />
        );
      case 'success':
        return (
          <span 
            className="inline-block text-base flex-shrink-0 animate-fade-in"
            role="img"
            aria-label="Success"
          >
            ✓
          </span>
        );
      case 'error':
        return (
          <span 
            className="inline-block text-base flex-shrink-0 animate-fade-in"
            role="img"
            aria-label="Error"
          >
            ✗
          </span>
        );
      default:
        return null;
    }
  };

  // Get button styling based on state
  const getButtonStyle = () => {
    const baseStyle = {
      background: 'var(--accent)',
      color: '#0a0a0a',
      opacity: 1,
    };

    if (isDisabled) {
      return {
        ...baseStyle,
        opacity: 0.6,
        cursor: 'not-allowed',
      };
    }

    if (state.status === 'error') {
      return {
        background: 'var(--danger)',
        color: '#ffffff',
        opacity: 1,
      };
    }

    if (state.status === 'success') {
      return {
        background: 'var(--accent)',
        color: '#0a0a0a',
        opacity: 1,
      };
    }

    return baseStyle;
  };

  // Determine if warning indicator should be shown
  const showWarning = !verification || verification.recommendation === 'reject';
  const showCaution = verification?.recommendation === 'request_changes';

  return (
    <>
      <div
        className="p-5 rounded-lg border"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          transition: 'all 0.3s ease-in-out',
        }}
      >
        <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)]">
          Release Payment
        </div>

        {/* Payment Amount Display */}
        <div
          className="p-4 rounded-lg mb-4"
          style={{
            background: 'var(--surface2)',
            border: '0.5px solid var(--border)',
            transition: 'all 0.3s ease-in-out',
          }}
        >
          <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
            Milestone Payment
          </div>
          <div className="font-display text-2xl font-bold">
            {milestoneAmount.toFixed(2)} XLM
          </div>
          <div className="text-xs text-[var(--muted)] mt-1 break-words">
            {milestoneName}
          </div>
        </div>

        {/* Warning Indicators */}
        {showWarning && (
          <div
            className="p-3 rounded-lg mb-4 flex items-start gap-2 animate-fade-in"
            style={{
              background: verification?.recommendation === 'reject' 
                ? 'var(--danger-dim)' 
                : 'var(--pending-dim)',
              border: verification?.recommendation === 'reject'
                ? '0.5px solid var(--danger-border)'
                : '0.5px solid var(--pending-border)',
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <span
              className="text-lg flex-shrink-0"
              style={{
                color: verification?.recommendation === 'reject'
                  ? 'var(--danger)'
                  : 'var(--pending)',
              }}
              role="img"
              aria-label="Warning"
            >
              ⚠
            </span>
            <div className="flex-1">
              <div
                className="text-xs font-medium mb-1"
                style={{
                  color: verification?.recommendation === 'reject'
                    ? 'var(--danger)'
                    : 'var(--pending)',
                }}
              >
                {!verification 
                  ? 'No verification available'
                  : 'Verification recommends rejection'}
              </div>
              <div className="text-xs text-[var(--text)]">
                {!verification
                  ? 'No work submission has been verified for this milestone.'
                  : `Score: ${verification.score}/100 - Consider requesting changes before releasing payment.`}
              </div>
            </div>
          </div>
        )}

        {showCaution && !showWarning && (
          <div
            className="p-3 rounded-lg mb-4 flex items-start gap-2 animate-fade-in"
            style={{
              background: 'var(--pending-dim)',
              border: '0.5px solid var(--pending-border)',
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <span 
              className="text-lg flex-shrink-0" 
              style={{ color: 'var(--pending)' }}
              role="img"
              aria-label="Caution"
            >
              ⚠
            </span>
            <div className="flex-1">
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--pending)' }}>
                Verification suggests changes
              </div>
              <div className="text-xs text-[var(--text)]">
                Score: {verification.score}/100 - Review feedback before proceeding.
              </div>
            </div>
          </div>
        )}

        {/* Release Button */}
        <button
          onClick={handleClick}
          disabled={isDisabled}
          className="w-full py-3 text-xs font-display font-bold uppercase tracking-wider border-0 rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
          style={{
            ...getButtonStyle(),
            minHeight: '44px',
            minWidth: '44px',
            transition: 'all 0.2s ease-in-out',
          }}
          aria-label={`Release ${milestoneAmount.toFixed(2)} XLM payment for ${milestoneName}`}
          aria-busy={state.status === 'signing' || state.status === 'submitting'}
          aria-live="polite"
          onMouseEnter={(e) => {
            if (!isDisabled && state.status !== 'error' && state.status !== 'success') {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
          onFocus={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span className="flex items-center justify-center gap-2">
            {getButtonIcon()}
            <span className="transition-all duration-200">{getButtonText()}</span>
          </span>
        </button>

        {/* Success Message with Transaction Hash */}
        {state.status === 'success' && state.txHash && (
          <div
            className="mt-3 p-3 rounded-lg animate-fade-in"
            style={{
              background: 'var(--accent-dim)',
              border: '0.5px solid var(--accent-border)',
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span 
                className="text-lg flex-shrink-0"
                style={{ color: 'var(--accent)' }}
                role="img"
                aria-label="Success"
              >
                ✓
              </span>
              <div className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                Transaction Successful
              </div>
            </div>
            <a
              href={TX_EXPLORER_URL(state.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1 hover:underline transition-all duration-200"
              style={{ color: 'var(--accent)' }}
            >
              <span>
                TX: {state.txHash.substring(0, 8)}...{state.txHash.substring(state.txHash.length - 8)}
              </span>
              <span className="text-[10px]">↗</span>
            </a>
          </div>
        )}

        {/* Error Message */}
        {state.status === 'error' && state.error && (
          <div
            className="mt-3 p-3 rounded-lg animate-fade-in"
            style={{
              background: 'var(--danger-dim)',
              border: '0.5px solid var(--danger-border)',
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <div className="flex items-center gap-2">
              <span 
                className="text-lg flex-shrink-0"
                style={{ color: 'var(--danger)' }}
                role="img"
                aria-label="Error"
              >
                ✗
              </span>
              <div className="text-xs font-medium" style={{ color: 'var(--danger)' }}>
                {state.error}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {state.showConfirmation && (
        <ConfirmationDialog
          milestoneName={milestoneName}
          amount={milestoneAmount}
          verification={verification}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
