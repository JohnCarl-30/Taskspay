interface Freighter {
  isAllowed: () => Promise<boolean>;
  setAllowed: () => Promise<void>;
  getPublicKey: () => Promise<string>;
  getNetwork: () => Promise<string>;
  signTransaction: (
    xdr: string,
    opts: { network: string; networkPassphrase: string }
  ) => Promise<string>;
}

declare global {
  interface Window {
    freighter?: Freighter;
  }
}

export {};