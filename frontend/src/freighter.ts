import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  getNetwork,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";

export const isFreighterInstalled = async (): Promise<boolean> => {
  try {
    const { isConnected: connected } = await isConnected();
    return connected;
  } catch {
    return false;
  }
};

export const connectWallet = async (): Promise<{
  publicKey: string;
  network: string;
}> => {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw new Error(
      "Freighter wallet not found. Please install the Freighter browser extension."
    );
  }

  const { isAllowed: allowed } = await isAllowed();
  if (!allowed) {
    await requestAccess();
  }

  const { address: publicKey } = await getAddress();
  const { network } = await getNetwork();

  return { publicKey, network };
};

export const getPublicKey = async (): Promise<string | null> => {
  try {
    const installed = await isFreighterInstalled();
    if (!installed) return null;
    const { isAllowed: allowed } = await isAllowed();
    if (!allowed) return null;
    const { address } = await getAddress();
    return address || null;
  } catch {
    return null;
  }
};

export const signTransaction = async (xdr: string): Promise<string> => {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw new Error("Freighter not installed");
  }
  const { signedTxXdr, error } = await freighterSignTransaction(xdr, {
    networkPassphrase: "Test SDF Network ; September 2015",
  });
  if (error) throw new Error(error);
  return signedTxXdr;
};
