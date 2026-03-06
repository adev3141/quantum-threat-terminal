'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { getFirestoreInstance, getFirebaseConfigError } from '@/lib/firebase/client';
import type {
  CompanyDoc,
  MarketSnapshotDoc,
  NewsFeedDoc,
  TerminalDataState,
} from '@/lib/types/firestore';

const INITIAL_STATE: TerminalDataState = {
  companies: [],
  marketSnapshots: [],
  newsFeed: [],
  loading: true,
  configError: null,
  marketError: null,
  companyError: null,
  newsError: null,
};

function mapDocs<T>(snapshot: QuerySnapshot<DocumentData>): T[] {
  return snapshot.docs.map((doc) => doc.data() as T);
}

export function useTerminalData() {
  const [state, setState] = useState<TerminalDataState>({
    ...INITIAL_STATE,
    configError: getFirebaseConfigError(),
  });

  useEffect(() => {
    const configError = getFirebaseConfigError();
    if (configError) {
      setState((current) => ({
        ...current,
        configError,
        loading: false,
      }));
      return;
    }

    const db = getFirestoreInstance();
    if (!db) {
      setState((current) => ({
        ...current,
        configError: 'Firebase app failed to initialize.',
        loading: false,
      }));
      return;
    }

    const unsubscribers = [
      onSnapshot(
        query(collection(db, 'companies'), where('isActive', '==', true), orderBy('displayOrder', 'asc'), limit(50)),
        (snapshot) => {
          setState((current) => ({
            ...current,
            companies: mapDocs<CompanyDoc>(snapshot),
            companyError: null,
            loading: false,
          }));
        },
        (error) => {
          setState((current) => ({
            ...current,
            companyError: error.message,
            loading: false,
          }));
        },
      ),
      onSnapshot(
        query(collection(db, 'market_snapshots')),
        (snapshot) => {
          setState((current) => ({
            ...current,
            marketSnapshots: mapDocs<MarketSnapshotDoc>(snapshot),
            marketError: null,
            loading: false,
          }));
        },
        (error) => {
          setState((current) => ({
            ...current,
            marketError: error.message,
            loading: false,
          }));
        },
      ),
      onSnapshot(
        query(collection(db, 'news_feed'), orderBy('publishedAt', 'desc'), limit(10)),
        (snapshot) => {
          setState((current) => ({
            ...current,
            newsFeed: mapDocs<NewsFeedDoc>(snapshot),
            newsError: null,
            loading: false,
          }));
        },
        (error) => {
          setState((current) => ({
            ...current,
            newsError: error.message,
            loading: false,
          }));
        },
      ),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  return state;
}
