import React, { useState, useEffect } from 'react';
import { isAddress } from 'viem';
import { useAccount, WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { EnrichedUser, AddressControlRecordWithMeta, DidString, AtUriString } from "../../shared/common.ts";
import { aggregateWallets } from "../../shared/common.ts";
import { fetchAddressControlRecords } from "../../shared/fetch.ts";
import { checkLinkValidityMinimal, type AddressControlVerificationChecks } from "../../shared/verify.ts";
import { LocalstorageTtlCache } from "../../shared/LocalstorageTtlCache.ts";
import { PaymentModal } from "./PaymentModal.tsx";
import { AtprotoUserCard, UserCardVariant } from "../../shared/AtprotoUserCard.tsx";
import { config } from '../../shared/WalletConnector.tsx';
import { ProfileDetails } from "./ProfileDetails.tsx";
import { isCriticalValidationFailure } from "./ValidationChecks.tsx";
import './UserDetailCard.css';
import { LinkedWallet } from './LinkedWallet.tsx';

interface UserDetailCardProps {
  selectedUser: EnrichedUser;
  onClose?: () => void;
  triggerPayment?: DidString | null; // DID to trigger payment for
}

// Cache for validation results with 1 month TTL
const validationCache = new LocalstorageTtlCache<AddressControlVerificationChecks>(21 * 24 * 60 * 60 * 1000); // 3 weeks in ms

// Generate cache key for validation results
const getValidationCacheKey = (recordUri: AtUriString): `validation:${AtUriString}` => {
  return `validation:${recordUri}`;
};

// Inner component that uses wagmi hooks
const UserDetailCardInner: React.FC<UserDetailCardProps> = ({ selectedUser, onClose, triggerPayment }) => {
  const { isConnected } = useAccount();
  const [addressRecords, setAddressRecords] = useState<AddressControlRecordWithMeta[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Map<string, AddressControlVerificationChecks>>(new Map());
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    recipientAddress: `0x${string}`;
    chainId: number;
  }>({
    isOpen: false,
    recipientAddress: '0x0' as `0x${string}`,
    chainId: 1,
  });
  // Track selected chain per address record
  const [selectedChains, setSelectedChains] = useState<Record<string, number>>({});
  // Flag to show/hide validation checks
  const showValidationChecks = true;
  // Track if a request is in flight to prevent duplicates
  const requestInFlightRef = React.useRef(false);

  // Initialize default selected chain when addressRecords change
  useEffect(() => {
    const defaults: Record<string, number> = {};
    addressRecords.forEach(rec => {
      const siwe = (rec.value?.siwe || {}) as { chainId?: number; alsoOn?: number[] };
      const base = siwe.chainId || 1;
      const alsoOn: number[] = Array.isArray(siwe.alsoOn) ? siwe.alsoOn : [];
      const ids = Array.from(new Set([base, ...alsoOn]));
      defaults[rec.uri] = ids[0];
    });
    setSelectedChains(defaults);
  }, [addressRecords]);

  // Handle automatic payment modal trigger
  useEffect(() => {
    if (triggerPayment && triggerPayment === selectedUser.did) {
      //console.log(`auto-triggering payment modal for user: ${selectedUser.did}`);
      
      if (addressRecords.length === 0) {
        //console.warn('cannot trigger payment: user has no address records');
        return;
      }
      
      // Get the first address record
      const firstRecord = addressRecords[0];
      const address = firstRecord.value?.siwe?.address;
      const chainId = firstRecord.value?.siwe?.chainId || 1;
      
      if (address && isAddress(address)) {
        setPaymentModal({
          isOpen: true,
          recipientAddress: address as `0x${string}`,
          chainId: chainId,
        });
        //console.log(`payment modal opened for address: ${address} on chain ${chainId}`);
      } else {
        //console.warn('first address record is not valid for payment');
      }
    }
  }, [triggerPayment, selectedUser.did, addressRecords]);

  useEffect(() => {
    const loadAddressRecords = async () => {
      if (!selectedUser.pds) {
        setRecordsError('PDS not available for this user');
        return;
      }

      // Prevent multiple simultaneous calls
      if (requestInFlightRef.current) {
        return;
      }

      requestInFlightRef.current = true;
      setLoadingRecords(true);
      setRecordsError(null);
      
      try {
        const records = await fetchAddressControlRecords(selectedUser.did, selectedUser.pds);
        const deduplicatedRecords = aggregateWallets(records);
        setAddressRecords(deduplicatedRecords);

        const validationMap = new Map<string, AddressControlVerificationChecks>();
        for (const record of deduplicatedRecords) {
          try {
            // Check cache first
            const cacheKey = getValidationCacheKey(record.uri);
            let validationResults = validationCache.get(cacheKey);
            
            if (validationResults) {
              //console.log('using cached validation for record', record.uri);
            } else {
              // Not in cache, perform validation and cache the result
              //console.log('performing new validation for record', record.uri);
              validationResults = await checkLinkValidityMinimal(selectedUser.did, record.value);
              validationCache.set(cacheKey, validationResults);
            }
            
            //console.log('validation for record', record.uri, validationResults);
            validationMap.set(record.uri, validationResults);
          } catch (error) {
            console.error('failed to validate record:', record.uri, error);
            // set default failed validation
            validationMap.set(record.uri, {
              statementMatches: false,
              siweSignatureValid: false,
              merkleProofValid: null
            });
          }
        }
        setValidationResults(validationMap);
      } catch (error) {
        setRecordsError(`Failed to load address records: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('Error loading address records:', error);
      } finally {
        requestInFlightRef.current = false;
        setLoadingRecords(false);
      }
    };

    loadAddressRecords();
  }, [selectedUser.did, selectedUser.pds]);

  return (
    <div className="user-detail-card">
      <div className="card-header">
        <h3>Selected User</h3>
        {onClose && (
          <button type="button" className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
      </div>
      
      <div className="card-content">
        <div className="user-profile">
          <AtprotoUserCard
            name={selectedUser.displayName}
            handle={selectedUser.handle}
            did={selectedUser.did}
            avatar={selectedUser.avatar}
            variant={UserCardVariant.PROFILE}
            clickable={!!selectedUser.handle}
            showDid
          />
          <ProfileDetails user={selectedUser} />
        </div>

        <div className="address-records">
          <label>Linked Wallets</label>
          {loadingRecords ? (
            <div className="loading-records">loading addresses...</div>
          ) : recordsError ? (
            <div className="records-error">{recordsError}</div>
          ) : addressRecords.length === 0 ? (
            <div className="no-records">No Ethereum addresses found</div>
          ) : (
            <div className="records-list">
              {addressRecords
                .sort((a, b) => {
                  // Sort records so that valid ones come first and critical failures come last
                  const validationA = validationResults.get(a.uri);
                  const validationB = validationResults.get(b.uri);
                  const isCriticalFailureA = validationA && isCriticalValidationFailure(validationA);
                  const isCriticalFailureB = validationB && isCriticalValidationFailure(validationB);
                  
                  // If A is critical failure but B is not, B should come first
                  if (isCriticalFailureA && !isCriticalFailureB) return 1;
                  // If B is critical failure but A is not, A should come first
                  if (!isCriticalFailureA && isCriticalFailureB) return -1;
                  // If both are same validation status, maintain original order
                  return 0;
                })
                .map((record) => (
                  <LinkedWallet
                    key={record.uri}
                    record={record}
                    validationResults={validationResults}
                    selectedChains={selectedChains}
                    onChainChange={(recordUri, chainId) => setSelectedChains(prev => ({ ...prev, [recordUri]: chainId }))}
                    isConnected={isConnected}
                    onSendClick={(address, chainId) => {
                      setPaymentModal({
                        isOpen: true,
                        recipientAddress: address,
                        chainId: chainId,
                      });
                    }}
                    showValidationChecks={showValidationChecks}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
      
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
        recipientAddress={paymentModal.recipientAddress}
        recipientName={selectedUser.displayName || undefined}
        recipientHandle={selectedUser.handle || undefined}
        recipientDid={selectedUser.did || undefined}
        recipientAvatar={selectedUser.avatar || undefined}
        chainId={paymentModal.chainId}
      />
    </div>
  );
};

// Main component that provides Wagmi context
export const UserDetailCard: React.FC<UserDetailCardProps> = ({ selectedUser, onClose, triggerPayment }) => {
  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <UserDetailCardInner selectedUser={selectedUser} onClose={onClose} triggerPayment={triggerPayment} />
      </QueryClientProvider>
    </WagmiProvider>
  );
};
