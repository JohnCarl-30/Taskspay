import {
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Address,
  nativeToScVal,
  scValToNative,
  Transaction,
  xdr,
} from "@stellar/stellar-sdk";
import { SorobanRpc } from "@stellar/stellar-sdk";

const RPC_URL =
  import.meta.env.VITE_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || "YOUR_CONTRACT_ID";
const NETWORK_PASSPHRASE = Networks.TESTNET;

// Native XLM token contract address on Soroban testnet
// This is the Stellar Asset Contract (SAC) address for native XLM on testnet
// Source: Documented in contract/src/lib.rs initialize() function
const XLM_TOKEN_ADDRESS = import.meta.env.VITE_XLM_TOKEN_ADDRESS || 
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2QDGDG6";

const server = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

export const getXLMBalance = async (publicKey: string): Promise<string> => {
  try {
    const account = await server.getAccount(publicKey);
    const data = account as unknown as {
      balances: Array<{ asset_type: string; balance: string }>;
    };
    const xlmBalance = data.balances.find(
      (b) => b.asset_type === "native"
    );
    return xlmBalance ? parseFloat(xlmBalance.balance).toFixed(2) : "0.00";
  } catch {
    return "0.00";
  }
};

export const fundWithFriendbot = async (
  publicKey: string
): Promise<unknown> => {
  const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
  if (!res.ok) throw new Error("Friendbot funding failed");
  return await res.json();
};

const buildContractCall = async (
  sourcePublicKey: string,
  method: string,
  args: xdr.ScVal[]
): Promise<Transaction> => {
  const account = await server.getAccount(sourcePublicKey);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  return SorobanRpc.assembleTransaction(tx, simResult).build();
};

type SignTransaction = (xdr: string) => Promise<string>;

interface SendTransactionResponse {
  hash: string;
  status: string;
}

export const createEscrow = async (
  sourcePublicKey: string,
  freelancerAddress: string,
  amountXLM: string,
  totalMilestones: number,
  signTransaction: SignTransaction
): Promise<SendTransactionResponse & { onChainId: number }> => {
  const amountStroops = BigInt(
    Math.round(parseFloat(amountXLM) * 10_000_000)
  );

  const args = [
    new Address(sourcePublicKey).toScVal(),
    new Address(freelancerAddress).toScVal(),
    nativeToScVal(amountStroops, { type: "i128" }),
    nativeToScVal(totalMilestones, { type: "u32" }),
  ];

  // Inline simulation so we can capture the returned on-chain escrow ID
  const account = await server.getAccount(sourcePublicKey);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("create_escrow", ...args))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const onChainId = simResult.result?.retval
    ? Number(scValToNative(simResult.result.retval))
    : 0;

  const assembledTx = SorobanRpc.assembleTransaction(tx, simResult).build();
  const signedXdr = await signTransaction(assembledTx.toXDR());

  const submitted = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  );

  return { hash: submitted.hash, status: submitted.status, onChainId };
};

export const releaseFunds = async (
  sourcePublicKey: string,
  escrowId: number,
  signTransaction: SignTransaction
): Promise<SendTransactionResponse> => {
  const args = [
    nativeToScVal(BigInt(escrowId), { type: "u64" }),
    new Address(sourcePublicKey).toScVal(),
  ];

  const builtTx = await buildContractCall(
    sourcePublicKey,
    "release_funds",
    args
  );
  const signedXdr = await signTransaction(builtTx.toXDR());

  return await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  );
};

export const refundEscrow = async (
  sourcePublicKey: string,
  escrowId: number,
  signTransaction: SignTransaction
): Promise<SendTransactionResponse> => {
  const args = [
    nativeToScVal(BigInt(escrowId), { type: "u64" }),
    new Address(sourcePublicKey).toScVal(),
  ];

  const builtTx = await buildContractCall(sourcePublicKey, "refund", args);
  const signedXdr = await signTransaction(builtTx.toXDR());

  return await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  );
};

export const getEscrow = async (
  escrowId: number
): Promise<unknown> => {
  const contract = new Contract(CONTRACT_ID);
  const account = {
    accountId: () =>
      "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    sequenceNumber: () => "0",
    incrementSequenceNumber: () => {},
  };

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "get_escrow",
        nativeToScVal(BigInt(escrowId), { type: "u64" })
      )
    )
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Read failed: ${simResult.error}`);
  }

  return scValToNative(simResult.result!.retval);
};

export const isContractInitialized = async (): Promise<boolean> => {
  const contract = new Contract(CONTRACT_ID);
  const account = {
    accountId: () =>
      "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    sequenceNumber: () => "0",
    incrementSequenceNumber: () => {},
  };

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("is_initialized"))
    .setTimeout(30)
    .build();

  try {
    const simResult = await server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simResult)) {
      console.warn("Contract initialization check failed:", simResult.error);
      return false;
    }

    const result = scValToNative(simResult.result!.retval) as boolean;
    console.log("Contract initialized:", result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Failed to check contract initialization:", message);
    return false;
  }
};

export const EXPLORER_URL = (contractId: string): string =>
  `https://stellar.expert/explorer/testnet/contract/${contractId}`;

export const TX_EXPLORER_URL = (hash: string): string =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;

/**
 * Initialize the contract with the XLM token address
 * This must be called once before any escrows can transfer funds
 * XLM_TOKEN_ADDRESS is read from VITE_XLM_TOKEN_ADDRESS environment variable
 */
export const initializeContract = async (
  sourcePublicKey: string,
  signTransaction: SignTransaction
): Promise<SendTransactionResponse> => {
  try {
    // Create Address object from the XLM token contract ID
    // This properly encodes the contract address for Soroban
    console.log("Initializing contract...");
    console.log("XLM token address:", XLM_TOKEN_ADDRESS);
    console.log("Contract ID:", CONTRACT_ID);
    
    // Validate that the XLM token address starts with 'C' (contract address)
    if (!XLM_TOKEN_ADDRESS.startsWith('C')) {
      throw new Error(
        `Invalid XLM token address format. Expected string starting with 'C', got: ${XLM_TOKEN_ADDRESS}`
      );
    }
    
    const tokenAddress = Address.fromString(XLM_TOKEN_ADDRESS);
    const args = [tokenAddress.toScVal()];

    const builtTx = await buildContractCall(
      sourcePublicKey,
      "initialize",
      args
    );
    const signedXdr = await signTransaction(builtTx.toXDR());

    const result = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
    );
    
    console.log("Contract initialized successfully:", result.hash);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Initialize contract error:", message);
    console.error("XLM Token Address:", XLM_TOKEN_ADDRESS);
    
    if (message.includes("invalid encoded string")) {
      throw new Error(
        `Invalid XLM token address: ${XLM_TOKEN_ADDRESS}\n\n` +
        `Make sure VITE_XLM_TOKEN_ADDRESS in .env is a valid Soroban contract address (56 chars, starts with 'C')`
      );
    }
    throw error;
  }
};