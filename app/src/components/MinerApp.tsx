import { useCallback, useEffect, useMemo, useState } from 'react';
import type { JsonRpcSigner } from 'ethers';
import { Contract } from 'ethers';
import { useAccount, usePublicClient } from 'wagmi';

import { Header } from './Header';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { GOLD_ABI, GOLD_ADDRESS, MINER_ABI, MINER_ADDRESS } from '../config/contracts';
import '../styles/MinerApp.css';

type StakeInfo = {
  staker: string;
  stakedAt: bigint;
  lastClaim: bigint;
};

type TokenDetails = {
  tokenId: bigint;
  power?: number;
  pendingDays?: bigint;
  stakedInfo?: StakeInfo;
};

type HandleMap = Record<string, `0x${string}`>;

const ZERO_HANDLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

function normalizeError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'object' && error && 'shortMessage' in error) {
    return String((error as { shortMessage: string }).shortMessage);
  }
  return 'Unexpected error occurred';
}

function formatTimestamp(value?: bigint) {
  if (!value || value === 0n) {
    return '—';
  }
  const date = new Date(Number(value) * 1000);
  return date.toLocaleString();
}

function formatPending(days?: bigint) {
  if (!days || days === 0n) {
    return '0 days';
  }
  return `${days.toString()} day${days === 1n ? '' : 's'}`;
}

export function MinerApp() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [hasMinted, setHasMinted] = useState(false);
  const [walletTokens, setWalletTokens] = useState<TokenDetails[]>([]);
  const [stakedTokens, setStakedTokens] = useState<TokenDetails[]>([]);
  const [goldBalance, setGoldBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionWarning, setDecryptionWarning] = useState<string | null>(null);

  const totalPower = useMemo(() => {
    const walletPower = walletTokens.reduce<number>((acc, token) => acc + (token.power ?? 0), 0);
    const stakedPower = stakedTokens.reduce<number>((acc, token) => acc + (token.power ?? 0), 0);
    return walletPower + stakedPower;
  }, [walletTokens, stakedTokens]);

  const decryptHandles = useCallback(
    async (handles: `0x${string}`[], contractAddress: string, signer: JsonRpcSigner) => {
      if (!instance || !address || handles.length === 0) {
        return {} as Record<string, number>;
      }

      const uniqueHandles = Array.from(new Set(handles));
      const handlePairs = uniqueHandles.map(handle => ({ handle, contractAddress }));

      const keypair = instance.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [contractAddress];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimestamp,
        durationDays
      );

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      const result = await instance.userDecrypt(
        handlePairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimestamp,
        durationDays
      );

      const values: Record<string, number> = {};
      uniqueHandles.forEach(handle => {
        const value = result[handle];
        if (value !== undefined) {
          values[handle] = Number(value);
        }
      });

      return values;
    },
    [instance, address]
  );

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!isConnected || !address || !publicClient) {
        setHasMinted(false);
        setWalletTokens([]);
        setStakedTokens([]);
        setGoldBalance(null);
        setFetchError(null);
        return;
      }

      setLoading(true);
      setFetchError(null);
      setDecryptionWarning(null);

      try {
        const user = address as `0x${string}`;

        const [hasMintedValue, walletIds, stakedIds, goldHandle] = await Promise.all([
          publicClient.readContract({
            address: MINER_ADDRESS,
            abi: MINER_ABI,
            functionName: 'hasMinted',
            args: [user],
          }) as Promise<boolean>,
          publicClient.readContract({
            address: MINER_ADDRESS,
            abi: MINER_ABI,
            functionName: 'walletTokens',
            args: [user],
          }) as Promise<bigint[]>,
          publicClient.readContract({
            address: MINER_ADDRESS,
            abi: MINER_ABI,
            functionName: 'stakedTokens',
            args: [user],
          }) as Promise<bigint[]>,
          publicClient.readContract({
            address: GOLD_ADDRESS,
            abi: GOLD_ABI,
            functionName: 'confidentialBalanceOf',
            args: [user],
          }) as Promise<`0x${string}`>,
        ]);

        if (cancelled) {
          return;
        }

        setHasMinted(Boolean(hasMintedValue));

        const allTokenIds = [...walletIds, ...stakedIds];
        const handleMap: HandleMap = {};
        let powerHandleList: `0x${string}`[] = [];

        if (allTokenIds.length > 0) {
          powerHandleList = await Promise.all(
            allTokenIds.map(tokenId =>
              publicClient.readContract({
                address: MINER_ADDRESS,
                abi: MINER_ABI,
                functionName: 'getMinerPower',
                args: [tokenId],
              }) as Promise<`0x${string}`>
            )
          );

          if (cancelled) {
            return;
          }

          allTokenIds.forEach((tokenId, index) => {
            handleMap[tokenId.toString()] = powerHandleList[index];
          });
        }

        let stakeInfoList: StakeInfo[] = [];
        let pendingDaysList: bigint[] = [];

        if (stakedIds.length > 0) {
          const rawInfo = (await Promise.all(
            stakedIds.map(tokenId =>
              publicClient.readContract({
                address: MINER_ADDRESS,
                abi: MINER_ABI,
                functionName: 'getStakeInfo',
                args: [tokenId],
              })
            )
          )) as unknown as [string, bigint, bigint][];

          const pendingDaysRaw = (await Promise.all(
            stakedIds.map(tokenId =>
              publicClient.readContract({
                address: MINER_ADDRESS,
                abi: MINER_ABI,
                functionName: 'pendingClaimableDays',
                args: [tokenId],
              })
            )
          )) as unknown as bigint[];

          if (cancelled) {
            return;
          }

          stakeInfoList = rawInfo.map(([staker, stakedAt, lastClaim]) => ({
            staker,
            stakedAt,
            lastClaim,
          }));

          pendingDaysList = pendingDaysRaw.slice();
        }

        let powerValues: Record<string, number> = {};
        let resolvedGoldBalance: number | null = 0;

        if (goldHandle === ZERO_HANDLE) {
          resolvedGoldBalance = 0;
        } else {
          resolvedGoldBalance = null;
        }

        if (powerHandleList.length > 0 || goldHandle !== ZERO_HANDLE) {
          const signer = signerPromise ? await signerPromise : undefined;
          if (!instance || !signer) {
            setDecryptionWarning('Connect your wallet and allow the Zama relayer to decrypt miner data.');
          } else {
            setDecryptionWarning(null);
            setIsDecrypting(true);
            try {
              if (powerHandleList.length > 0) {
                powerValues = await decryptHandles(powerHandleList, MINER_ADDRESS, signer);
              }
              if (goldHandle !== ZERO_HANDLE) {
                const goldValues = await decryptHandles([goldHandle], GOLD_ADDRESS, signer);
                resolvedGoldBalance = goldValues[goldHandle] ?? 0;
              }
            } finally {
              setIsDecrypting(false);
            }
          }
        }

        if (cancelled) {
          return;
        }

        const walletDetails: TokenDetails[] = walletIds.map(tokenId => ({
          tokenId,
          power: powerValues[handleMap[tokenId.toString()]],
        }));

        const stakedDetails: TokenDetails[] = stakedIds.map((tokenId, index) => ({
          tokenId,
          power: powerValues[handleMap[tokenId.toString()]],
          pendingDays: pendingDaysList[index],
          stakedInfo: stakeInfoList[index],
        }));

        setWalletTokens(walletDetails);
        setStakedTokens(stakedDetails);
        setGoldBalance(resolvedGoldBalance);
      } catch (error) {
        if (!cancelled) {
          setFetchError(normalizeError(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected, publicClient, signerPromise, instance, decryptHandles, refreshNonce]);

  const getMinerContract = useCallback(async () => {
    if (!signerPromise) {
      throw new Error('Connect your wallet to continue.');
    }
    const signer = await signerPromise;
    if (!signer) {
      throw new Error('Unable to access wallet signer.');
    }
    return new Contract(MINER_ADDRESS, MINER_ABI, signer);
  }, [signerPromise]);

  const handleMint = useCallback(async () => {
    try {
      setPendingAction('mint');
      setTxStatus('Minting Miner...');
      const minerContract = await getMinerContract();
      const tx = await minerContract.mintMiner();
      await tx.wait();
      setTxStatus('Miner minted successfully.');
      setRefreshNonce(value => value + 1);
    } catch (error) {
      setFetchError(normalizeError(error));
    } finally {
      setPendingAction(null);
      setTxStatus(null);
    }
  }, [getMinerContract]);

  const handleStake = useCallback(
    async (tokenId: bigint) => {
      try {
        setPendingAction(`stake-${tokenId.toString()}`);
        setTxStatus(`Staking Miner #${tokenId.toString()}...`);
        const minerContract = await getMinerContract();
        const tx = await minerContract.stake(tokenId);
        await tx.wait();
        setTxStatus('Stake confirmed.');
        setRefreshNonce(value => value + 1);
      } catch (error) {
        setFetchError(normalizeError(error));
      } finally {
        setPendingAction(null);
        setTxStatus(null);
      }
    },
    [getMinerContract]
  );

  const handleClaim = useCallback(
    async (tokenId: bigint) => {
      try {
        setPendingAction(`claim-${tokenId.toString()}`);
        setTxStatus(`Claiming GOLD for Miner #${tokenId.toString()}...`);
        const minerContract = await getMinerContract();
        const tx = await minerContract.claim(tokenId);
        await tx.wait();
        setTxStatus('Rewards claimed.');
        setRefreshNonce(value => value + 1);
      } catch (error) {
        setFetchError(normalizeError(error));
      } finally {
        setPendingAction(null);
        setTxStatus(null);
      }
    },
    [getMinerContract]
  );

  const handleUnstake = useCallback(
    async (tokenId: bigint) => {
      try {
        setPendingAction(`unstake-${tokenId.toString()}`);
        setTxStatus(`Unstaking Miner #${tokenId.toString()}...`);
        const minerContract = await getMinerContract();
        const tx = await minerContract.unstake(tokenId);
        await tx.wait();
        setTxStatus('Miner returned to wallet.');
        setRefreshNonce(value => value + 1);
      } catch (error) {
        setFetchError(normalizeError(error));
      } finally {
        setPendingAction(null);
        setTxStatus(null);
      }
    },
    [getMinerContract]
  );

  const refreshData = useCallback(() => {
    setRefreshNonce(value => value + 1);
  }, []);

  const isBusy = loading || isDecrypting || zamaLoading;

  return (
    <div className="miner-app">
      <Header />
      <main className="miner-main">
        {fetchError && <div className="alert alert-error">{fetchError}</div>}
        {zamaError && <div className="alert alert-error">{zamaError}</div>}
        {decryptionWarning && <div className="alert alert-warning">{decryptionWarning}</div>}
        {txStatus && <div className="alert alert-info">{txStatus}</div>}
        {isBusy && <div className="alert alert-info">Loading on-chain data...</div>}

        <section className="summary-section">
          <h2 className="section-title">Dashboard</h2>
          <div className="status-grid">
            <div className="status-card">
              <span className="status-label">GOLD Balance</span>
              <span className="status-value">{goldBalance !== null ? goldBalance : 'Decrypt to view'}</span>
            </div>
            <div className="status-card">
              <span className="status-label">Wallet Miners</span>
              <span className="status-value">{walletTokens.length}</span>
            </div>
            <div className="status-card">
              <span className="status-label">Staked Miners</span>
              <span className="status-value">{stakedTokens.length}</span>
            </div>
            <div className="status-card">
              <span className="status-label">Total Power</span>
              <span className="status-value">{totalPower}</span>
            </div>
          </div>
          <button className="secondary-button refresh-button" onClick={refreshData} disabled={isBusy}>
            Refresh Metrics
          </button>
        </section>

        <section className="action-section">
          <div className="action-card">
            <h2 className="section-title">Mint Your Miner</h2>
            <p className="action-text">
              Each address can mint a single Miner NFT for free. Every Miner receives a confidential power score
              generated with Zama FHE. Stake it to start earning GOLD every day.
            </p>
            <button
              className="primary-button"
              onClick={handleMint}
              disabled={!isConnected || hasMinted || pendingAction === 'mint' || isBusy}
            >
              {pendingAction === 'mint' ? 'Minting...' : hasMinted ? 'Miner Minted' : 'Mint Miner'}
            </button>
          </div>
        </section>

        <section className="list-section">
          <h2 className="section-title">Miners in Wallet</h2>
          {walletTokens.length === 0 ? (
            <div className="empty-state">No miners in your wallet yet.</div>
          ) : (
            <div className="token-grid">
              {walletTokens.map(token => (
                <div className="token-card" key={token.tokenId.toString()}>
                  <div className="token-header">
                    <span className="token-id">Miner #{token.tokenId.toString()}</span>
                    <span className="token-power">{token.power !== undefined ? `${token.power} POWER` : 'Decrypt to view power'}</span>
                  </div>
                  <div className="token-actions">
                    <button
                      className="secondary-button"
                      onClick={() => handleStake(token.tokenId)}
                      disabled={pendingAction === `stake-${token.tokenId.toString()}` || isBusy}
                    >
                      {pendingAction === `stake-${token.tokenId.toString()}` ? 'Staking...' : 'Stake Miner'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="list-section">
          <h2 className="section-title">Staked Miners</h2>
          {stakedTokens.length === 0 ? (
            <div className="empty-state">No miners are staked. Stake a miner to start earning GOLD.</div>
          ) : (
            <div className="token-grid">
              {stakedTokens.map(token => {
                const pendingKey = `claim-${token.tokenId.toString()}`;
                const unstakeKey = `unstake-${token.tokenId.toString()}`;
                const pendingDays = token.pendingDays ?? 0n;
                return (
                  <div className="token-card" key={token.tokenId.toString()}>
                    <div className="token-header">
                      <span className="token-id">Miner #{token.tokenId.toString()}</span>
                      <span className="token-power">{token.power !== undefined ? `${token.power} POWER` : 'Decrypt to view power'}</span>
                    </div>
                    <div className="token-info">
                      <div className="info-row">
                        <span className="info-label">Pending Reward</span>
                        <span className="info-value">{formatPending(pendingDays)}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Last Claim</span>
                        <span className="info-value">{formatTimestamp(token.stakedInfo?.lastClaim)}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Staked Since</span>
                        <span className="info-value">{formatTimestamp(token.stakedInfo?.stakedAt)}</span>
                      </div>
                    </div>
                    <div className="token-actions">
                      <button
                        className="primary-button"
                        onClick={() => handleClaim(token.tokenId)}
                        disabled={pendingDays === 0n || pendingAction === pendingKey || isBusy}
                      >
                        {pendingAction === pendingKey ? 'Claiming...' : 'Claim GOLD'}
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => handleUnstake(token.tokenId)}
                        disabled={pendingAction === unstakeKey || isBusy}
                      >
                        {pendingAction === unstakeKey ? 'Unstaking...' : 'Unstake Miner'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
