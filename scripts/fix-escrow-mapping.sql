-- Fix escrow database records to match blockchain state
-- Run this in Supabase SQL Editor

-- First, check which escrows have incorrect on_chain_id
SELECT id, on_chain_id, wallet_address, freelancer_address, amount, status
FROM escrows
WHERE on_chain_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- If you find the escrow that should map to on_chain_id = 1, update it:
-- UPDATE escrows 
-- SET on_chain_id = 1 
-- WHERE id = '<your-escrow-uuid-here>' 
--   AND wallet_address = 'GC523Q3IFGEMUVZHNOOGECLAUOUSZJ643IXC757Q2IKVSTOGCMDADHOY';

-- Verify the update
-- SELECT id, on_chain_id, wallet_address, freelancer_address, amount, status
-- FROM escrows
-- WHERE on_chain_id = 1;
