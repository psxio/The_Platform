import SafeApiKit from "@safe-global/api-kit";

const CHAIN_TX_SERVICE_URLS: Record<number, string> = {
  1: "https://safe-transaction-mainnet.safe.global",
  10: "https://safe-transaction-optimism.safe.global",
  56: "https://safe-transaction-bsc.safe.global",
  100: "https://safe-transaction-gnosis-chain.safe.global",
  137: "https://safe-transaction-polygon.safe.global",
  8453: "https://safe-transaction-base.safe.global",
  42161: "https://safe-transaction-arbitrum.safe.global",
  43114: "https://safe-transaction-avalanche.safe.global",
  11155111: "https://safe-transaction-sepolia.safe.global",
};

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  56: "BNB Smart Chain",
  100: "Gnosis",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum One",
  43114: "Avalanche",
  11155111: "Sepolia",
};

export function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
}

export function getSupportedChainIds(): number[] {
  return Object.keys(CHAIN_TX_SERVICE_URLS).map(Number);
}

function getApiKit(chainId: number): SafeApiKit {
  const txServiceUrl = CHAIN_TX_SERVICE_URLS[chainId];
  if (!txServiceUrl) {
    throw new Error(`Chain ${chainId} is not supported`);
  }
  return new SafeApiKit({
    chainId: BigInt(chainId),
  });
}

export interface SafeWalletInfo {
  address: string;
  chainId: number;
  owners: string[];
  threshold: number;
  nonce: number;
  version?: string;
  modules?: string[];
  fallbackHandler?: string;
}

export interface SafeBalance {
  tokenAddress: string | null;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimals: number;
  balance: string;
  fiatBalance?: string;
  fiatConversion?: string;
}

export interface SafePendingTx {
  safeTxHash: string;
  to: string;
  value: string;
  data: string | null;
  operation: number;
  nonce: number;
  confirmationsRequired: number;
  confirmations: Array<{
    owner: string;
    signature: string;
    signatureType: string;
    submissionDate: string;
  }>;
  submissionDate: string;
  executionDate: string | null;
  isExecuted: boolean;
  proposer?: string;
  dataDecoded?: any;
}

export async function getSafeInfo(address: string, chainId: number): Promise<SafeWalletInfo> {
  const apiKit = getApiKit(chainId);
  
  try {
    const safeInfo = await apiKit.getSafeInfo(address);
    
    return {
      address: safeInfo.address,
      chainId,
      owners: safeInfo.owners,
      threshold: safeInfo.threshold,
      nonce: Number(safeInfo.nonce),
      version: safeInfo.version,
      modules: safeInfo.modules,
      fallbackHandler: safeInfo.fallbackHandler,
    };
  } catch (error: any) {
    console.error(`Failed to fetch Safe info for ${address} on chain ${chainId}:`, error.message);
    throw new Error(`Failed to fetch Safe wallet info: ${error.message}`);
  }
}

export async function getSafeBalances(address: string, chainId: number): Promise<SafeBalance[]> {
  // Use the Safe Transaction Service REST API directly for balances
  const txServiceUrl = CHAIN_TX_SERVICE_URLS[chainId];
  if (!txServiceUrl) {
    throw new Error(`Chain ${chainId} is not supported`);
  }
  
  try {
    const response = await fetch(`${txServiceUrl}/api/v1/safes/${address}/balances/?trusted=true&exclude_spam=true`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const balances: any[] = await response.json();
    
    return balances.map((balance: any) => ({
      tokenAddress: balance.tokenAddress || null,
      tokenSymbol: balance.token?.symbol || getNativeTokenSymbol(chainId),
      tokenName: balance.token?.name || getNativeTokenName(chainId),
      tokenDecimals: balance.token?.decimals || 18,
      balance: balance.balance,
      fiatBalance: balance.fiatBalance,
      fiatConversion: balance.fiatConversion,
    }));
  } catch (error: any) {
    console.error(`Failed to fetch balances for ${address} on chain ${chainId}:`, error.message);
    return [];
  }
}

function getNativeTokenSymbol(chainId: number): string {
  const symbols: Record<number, string> = {
    1: "ETH", 10: "ETH", 56: "BNB", 100: "xDAI", 137: "MATIC",
    8453: "ETH", 42161: "ETH", 43114: "AVAX", 11155111: "ETH",
  };
  return symbols[chainId] || "ETH";
}

function getNativeTokenName(chainId: number): string {
  const names: Record<number, string> = {
    1: "Ether", 10: "Ether", 56: "BNB", 100: "xDAI", 137: "Polygon",
    8453: "Ether", 42161: "Ether", 43114: "Avalanche", 11155111: "Sepolia ETH",
  };
  return names[chainId] || "Ether";
}

export async function getPendingTransactions(address: string, chainId: number): Promise<SafePendingTx[]> {
  const apiKit = getApiKit(chainId);
  
  try {
    const response = await apiKit.getPendingTransactions(address);
    
    return response.results.map((tx: any) => ({
      safeTxHash: tx.safeTxHash,
      to: tx.to,
      value: tx.value,
      data: tx.data,
      operation: tx.operation,
      nonce: tx.nonce,
      confirmationsRequired: tx.confirmationsRequired,
      confirmations: (tx.confirmations || []).map((conf: any) => ({
        owner: conf.owner,
        signature: conf.signature,
        signatureType: conf.signatureType,
        submissionDate: conf.submissionDate,
      })),
      submissionDate: tx.submissionDate,
      executionDate: tx.executionDate,
      isExecuted: tx.isExecuted,
      proposer: tx.proposer,
      dataDecoded: tx.dataDecoded,
    }));
  } catch (error: any) {
    console.error(`Failed to fetch pending transactions for ${address} on chain ${chainId}:`, error.message);
    return [];
  }
}

export async function getTransactionHistory(
  address: string, 
  chainId: number,
  limit: number = 20
): Promise<SafePendingTx[]> {
  const apiKit = getApiKit(chainId);
  
  try {
    const response = await apiKit.getMultisigTransactions(address);
    
    return response.results.slice(0, limit).map((tx: any) => ({
      safeTxHash: tx.safeTxHash,
      to: tx.to,
      value: tx.value,
      data: tx.data,
      operation: tx.operation,
      nonce: tx.nonce,
      confirmationsRequired: tx.confirmationsRequired,
      confirmations: (tx.confirmations || []).map((conf: any) => ({
        owner: conf.owner,
        signature: conf.signature,
        signatureType: conf.signatureType,
        submissionDate: conf.submissionDate,
      })),
      submissionDate: tx.submissionDate,
      executionDate: tx.executionDate,
      isExecuted: tx.isExecuted,
      proposer: tx.proposer,
      dataDecoded: tx.dataDecoded,
    }));
  } catch (error: any) {
    console.error(`Failed to fetch transaction history for ${address} on chain ${chainId}:`, error.message);
    return [];
  }
}

export async function validateSafeAddress(address: string, chainId: number): Promise<boolean> {
  try {
    const info = await getSafeInfo(address, chainId);
    return !!info.address;
  } catch {
    return false;
  }
}

export function formatEthValue(weiValue: string, decimals: number = 18): string {
  const value = BigInt(weiValue);
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  const significantFractional = fractionalStr.slice(0, 6).replace(/0+$/, "");
  
  if (significantFractional) {
    return `${integerPart}.${significantFractional}`;
  }
  return integerPart.toString();
}

export function formatUsdValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
