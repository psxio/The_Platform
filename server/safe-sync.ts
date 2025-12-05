import { storage } from "./storage";
import type { DaoSafeWallet, InsertDaoSafeTxHistory, SafeTxStatus, SafeTxType } from "@shared/schema";

// Safe Transaction Service endpoints by chain
const SAFE_TX_SERVICE_URLS: Record<number, string> = {
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

// Block explorer URLs by chain for transaction links
export const BLOCK_EXPLORER_URLS: Record<number, string> = {
  1: "https://etherscan.io",
  10: "https://optimistic.etherscan.io",
  56: "https://bscscan.com",
  100: "https://gnosisscan.io",
  137: "https://polygonscan.com",
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
  43114: "https://snowtrace.io",
  11155111: "https://sepolia.etherscan.io",
};

// Safe API response types
interface SafeConfirmation {
  owner: string;
  submissionDate: string;
  transactionHash: string | null;
  signature: string;
  signatureType: string;
}

interface SafeMultisigTransaction {
  safe: string;
  to: string;
  value: string;
  data: string | null;
  operation: number;
  gasToken: string;
  safeTxGas: number;
  baseGas: number;
  gasPrice: string;
  refundReceiver: string;
  nonce: number;
  executionDate: string | null;
  submissionDate: string;
  modified: string;
  blockNumber: number | null;
  transactionHash: string | null;
  safeTxHash: string;
  proposer: string;
  executor: string | null;
  isExecuted: boolean;
  isSuccessful: boolean | null;
  ethGasPrice: string | null;
  maxFeePerGas: string | null;
  maxPriorityFeePerGas: string | null;
  gasUsed: number | null;
  fee: string | null;
  origin: string | null;
  dataDecoded: {
    method: string;
    parameters: { name: string; type: string; value: string }[];
  } | null;
  confirmationsRequired: number;
  confirmations: SafeConfirmation[];
  trusted: boolean;
  signatures: string | null;
}

interface SafeMultisigTransactionsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SafeMultisigTransaction[];
}

interface SafeInfo {
  address: string;
  nonce: number;
  threshold: number;
  owners: string[];
  masterCopy: string;
  modules: string[];
  fallbackHandler: string;
  guard: string;
  version: string;
}

// Get the Safe Transaction Service URL for a chain
function getSafeServiceUrl(chainId: number): string | null {
  return SAFE_TX_SERVICE_URLS[chainId] || null;
}

// Determine transaction type from data
function determineTxType(tx: SafeMultisigTransaction): SafeTxType {
  if (!tx.data || tx.data === "0x") {
    return "transfer";
  }
  if (tx.dataDecoded?.method === "changeThreshold" || 
      tx.dataDecoded?.method === "addOwnerWithThreshold" ||
      tx.dataDecoded?.method === "removeOwner" ||
      tx.dataDecoded?.method === "swapOwner") {
    return "settings_change";
  }
  if (tx.dataDecoded?.method === "rejectTransaction") {
    return "rejection";
  }
  return "contract_interaction";
}

// Determine transaction status
function determineTxStatus(tx: SafeMultisigTransaction): SafeTxStatus {
  if (tx.isExecuted) {
    return tx.isSuccessful ? "executed" : "failed";
  }
  if (tx.confirmations.length >= tx.confirmationsRequired) {
    return "awaiting_execution";
  }
  return "awaiting_confirmations";
}

// Format value for display
function formatValue(value: string, decimals: number = 18): string {
  const wei = BigInt(value);
  if (wei === BigInt(0)) return "0";
  
  const divisor = BigInt(10 ** decimals);
  const whole = wei / divisor;
  const remainder = wei % divisor;
  
  if (remainder === BigInt(0)) {
    return whole.toString();
  }
  
  // Get decimal part (up to 6 decimal places)
  const decimalStr = remainder.toString().padStart(decimals, "0").slice(0, 6).replace(/0+$/, "");
  return decimalStr ? `${whole}.${decimalStr}` : whole.toString();
}

// Fetch Safe info (owners, threshold, etc.)
export async function fetchSafeInfo(address: string, chainId: number): Promise<SafeInfo | null> {
  const baseUrl = getSafeServiceUrl(chainId);
  if (!baseUrl) {
    console.log(`No Safe Transaction Service URL for chain ${chainId}`);
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/safes/${address}/`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error(`Failed to fetch Safe info: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Safe info:", error);
    return null;
  }
}

// Fetch transactions for a Safe wallet
export async function fetchSafeTransactions(
  address: string,
  chainId: number,
  limit: number = 50,
  offset: number = 0
): Promise<SafeMultisigTransactionsResponse | null> {
  const baseUrl = getSafeServiceUrl(chainId);
  if (!baseUrl) {
    console.log(`No Safe Transaction Service URL for chain ${chainId}`);
    return null;
  }

  try {
    const url = `${baseUrl}/api/v1/safes/${address}/multisig-transactions/?limit=${limit}&offset=${offset}&ordering=-submissionDate`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error(`Failed to fetch Safe transactions: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Safe transactions:", error);
    return null;
  }
}

// Sync transactions for a single wallet
export async function syncWalletTransactions(wallet: DaoSafeWallet): Promise<number> {
  console.log(`Syncing transactions for wallet ${wallet.label} (${wallet.address}) on chain ${wallet.chainId}`);
  
  // Fetch transactions from Safe API
  const txResponse = await fetchSafeTransactions(wallet.address, wallet.chainId);
  if (!txResponse) {
    return 0;
  }

  let syncedCount = 0;

  // Get signer mappings for user attribution
  const signers = await storage.getDaoSafeSigners(wallet.id);
  const signerMap = new Map(signers.map(s => [s.signerAddress.toLowerCase(), s]));

  for (const tx of txResponse.results) {
    try {
      // Build confirmations with user attribution
      const confirmations = tx.confirmations.map(conf => ({
        signer: conf.owner,
        signature: conf.signature,
        signatureType: conf.signatureType,
        submittedAt: conf.submissionDate,
        platformUserId: signerMap.get(conf.owner.toLowerCase())?.platformUserId || undefined,
      }));

      // Get proposer user ID
      const proposerSigner = signerMap.get(tx.proposer?.toLowerCase());
      
      // Get executor user ID  
      const executorSigner = tx.executor ? signerMap.get(tx.executor.toLowerCase()) : undefined;

      // Determine if this is a native token transfer
      const isNativeTransfer = !tx.data || tx.data === "0x";
      
      const txData: InsertDaoSafeTxHistory = {
        walletId: wallet.id,
        safeTxHash: tx.safeTxHash,
        txHash: tx.transactionHash || undefined,
        chainId: wallet.chainId,
        safeAddress: tx.safe,
        to: tx.to,
        value: tx.value,
        data: tx.data || undefined,
        dataDecoded: tx.dataDecoded ? JSON.stringify(tx.dataDecoded) : undefined,
        operation: tx.operation,
        nonce: tx.nonce,
        txType: determineTxType(tx),
        status: determineTxStatus(tx),
        confirmationsRequired: tx.confirmationsRequired,
        confirmationsCount: tx.confirmations.length,
        confirmations: confirmations,
        proposerAddress: tx.proposer || undefined,
        proposerUserId: proposerSigner?.platformUserId || undefined,
        executorAddress: tx.executor || undefined,
        executorUserId: executorSigner?.platformUserId || undefined,
        tokenSymbol: isNativeTransfer ? getNativeTokenSymbol(wallet.chainId) : undefined,
        tokenDecimals: isNativeTransfer ? 18 : undefined,
        formattedValue: isNativeTransfer ? `${formatValue(tx.value)} ${getNativeTokenSymbol(wallet.chainId)}` : undefined,
        submittedAt: new Date(tx.submissionDate),
        executedAt: tx.executionDate ? new Date(tx.executionDate) : undefined,
      };

      await storage.upsertDaoSafeTxHistory(txData);
      syncedCount++;
    } catch (error) {
      console.error(`Error syncing transaction ${tx.safeTxHash}:`, error);
    }
  }

  // Update wallet's lastSyncedAt
  await storage.updateDaoSafeWallet(wallet.id, { lastSyncedAt: new Date() });

  console.log(`Synced ${syncedCount} transactions for wallet ${wallet.label}`);
  return syncedCount;
}

// Get native token symbol for chain
function getNativeTokenSymbol(chainId: number): string {
  const symbols: Record<number, string> = {
    1: "ETH",
    10: "ETH",
    56: "BNB",
    100: "xDAI",
    137: "MATIC",
    8453: "ETH",
    42161: "ETH",
    43114: "AVAX",
    11155111: "SEP",
  };
  return symbols[chainId] || "ETH";
}

// Sync owners/signers for a wallet
export async function syncWalletSigners(wallet: DaoSafeWallet): Promise<void> {
  console.log(`Syncing signers for wallet ${wallet.label} (${wallet.address})`);
  
  const safeInfo = await fetchSafeInfo(wallet.address, wallet.chainId);
  if (!safeInfo) {
    return;
  }

  // Sync signers
  await storage.syncWalletSigners(wallet.id, safeInfo.owners);
  
  // Update wallet with threshold and owners
  await storage.updateDaoSafeWallet(wallet.id, {
    threshold: safeInfo.threshold,
    owners: JSON.stringify(safeInfo.owners),
    nonce: safeInfo.nonce,
    lastSyncedAt: new Date(),
  });

  console.log(`Synced ${safeInfo.owners.length} signers for wallet ${wallet.label}`);
}

// Sync all wallets (call this periodically or on demand)
export async function syncAllWallets(): Promise<{ synced: number; errors: number }> {
  const wallets = await storage.getDaoSafeWallets();
  let synced = 0;
  let errors = 0;

  for (const wallet of wallets) {
    try {
      // Sync signers first
      await syncWalletSigners(wallet);
      
      // Then sync transactions
      const txCount = await syncWalletTransactions(wallet);
      if (txCount > 0) synced++;
    } catch (error) {
      console.error(`Error syncing wallet ${wallet.label}:`, error);
      errors++;
    }
  }

  return { synced, errors };
}

// Get block explorer URL for a transaction
export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const baseUrl = BLOCK_EXPLORER_URLS[chainId] || "https://etherscan.io";
  return `${baseUrl}/tx/${txHash}`;
}

// Get block explorer URL for an address
export function getExplorerAddressUrl(chainId: number, address: string): string {
  const baseUrl = BLOCK_EXPLORER_URLS[chainId] || "https://etherscan.io";
  return `${baseUrl}/address/${address}`;
}
