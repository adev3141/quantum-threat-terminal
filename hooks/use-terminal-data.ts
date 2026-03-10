'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getFirebaseConfigError, getFirestoreInstance } from '@/lib/firebase/client';
import type {
  CompanyDoc,
  GlobalMetriqFrontierDoc,
  GlobalMetricsDoc,
  GlobalRiskSignalsDoc,
  MarketSnapshotDoc,
  NewsFeedDoc,
  TerminalDataState,
} from '@/lib/types/firestore';

function computeLoadingState(state: TerminalDataState) {
  return (
    state.companyLoading ||
    state.marketLoading ||
    state.newsLoading ||
    state.globalMetriqFrontierLoading ||
    state.globalMetricsLoading ||
    state.globalRiskSignalsLoading
  );
}

function mergeTerminalState(current: TerminalDataState, patch: Partial<TerminalDataState>): TerminalDataState {
  const nextState = {
    ...current,
    ...patch,
  };

  return {
    ...nextState,
    loading: computeLoadingState(nextState),
  };
}

const INITIAL_STATE: TerminalDataState = {
  companies: [],
  marketSnapshots: [],
  newsFeed: [],
  globalMetriqFrontier: null,
  globalMetrics: null,
  globalRiskSignals: null,
  loading: true,
  companyLoading: true,
  marketLoading: true,
  newsLoading: true,
  globalMetriqFrontierLoading: true,
  globalMetricsLoading: true,
  globalRiskSignalsLoading: true,
  configError: null,
  marketError: null,
  companyError: null,
  newsError: null,
  globalMetriqFrontierError: null,
  globalMetricsError: null,
  globalRiskSignalsError: null,
};

function mapDocs<T>(snapshot: QuerySnapshot<DocumentData>): T[] {
  return snapshot.docs.map((snapshotDoc) => snapshotDoc.data() as T);
}

export function useTerminalData() {
  const [state, setState] = useState<TerminalDataState>({
    ...INITIAL_STATE,
    configError: getFirebaseConfigError(),
  });

  useEffect(() => {
    const configError = getFirebaseConfigError();
    if (configError) {
      setState((current) => mergeTerminalState(current, {
        configError,
        companyLoading: false,
        marketLoading: false,
        newsLoading: false,
        globalMetriqFrontierLoading: false,
        globalMetricsLoading: false,
        globalRiskSignalsLoading: false,
        loading: false,
      }));
      return;
    }

    const db = getFirestoreInstance();
    if (!db) {
      setState((current) => mergeTerminalState(current, {
        configError: 'Firebase app failed to initialize.',
        companyLoading: false,
        marketLoading: false,
        newsLoading: false,
        globalMetriqFrontierLoading: false,
        globalMetricsLoading: false,
        globalRiskSignalsLoading: false,
        loading: false,
      }));
      return;
    }

    const unsubscribers = [
      onSnapshot(
        query(collection(db, 'companies'), where('isActive', '==', true), orderBy('displayOrder', 'asc'), limit(50)),
        (snapshot) => {
          setState((current) => mergeTerminalState(current, {
            companies: mapDocs<CompanyDoc>(snapshot),
            companyError: null,
            companyLoading: false,
          }));
        },
        (error) => {
          setState((current) => mergeTerminalState(current, {
            companyError: error.message,
            companyLoading: false,
          }));
        },
      ),
      onSnapshot(
        query(collection(db, 'market_snapshots')),
        (snapshot) => {
          setState((current) => mergeTerminalState(current, {
            marketSnapshots: mapDocs<MarketSnapshotDoc>(snapshot),
            marketError: null,
            marketLoading: false,
          }));
        },
        (error) => {
          setState((current) => mergeTerminalState(current, {
            marketError: error.message,
            marketLoading: false,
          }));
        },
      ),
      onSnapshot(
        query(collection(db, 'news_feed'), orderBy('publishedAt', 'desc'), limit(30)),
        (snapshot) => {
          setState((current) => mergeTerminalState(current, {
            newsFeed: mapDocs<NewsFeedDoc>(snapshot),
            newsError: null,
            newsLoading: false,
          }));
        },
        (error) => {
          setState((current) => mergeTerminalState(current, {
            newsError: error.message,
            newsLoading: false,
          }));
        },
      ),
      onSnapshot(
        doc(db, 'global', 'metriq_frontier'),
        (snapshot) => {
          setState((current) => mergeTerminalState(current, {
            globalMetriqFrontier: snapshot.exists() ? (snapshot.data() as GlobalMetriqFrontierDoc) : null,
            globalMetriqFrontierError: null,
            globalMetriqFrontierLoading: false,
          }));
        },
        (error) => {
          setState((current) => mergeTerminalState(current, {
            globalMetriqFrontierError: error.message,
            globalMetriqFrontierLoading: false,
          }));
        },
      ),
      onSnapshot(
        doc(db, 'global', 'metrics'),
        (snapshot) => {
          setState((current) => mergeTerminalState(current, {
            globalMetrics: snapshot.exists() ? (snapshot.data() as GlobalMetricsDoc) : null,
            globalMetricsError: null,
            globalMetricsLoading: false,
          }));
        },
        (error) => {
          setState((current) => mergeTerminalState(current, {
            globalMetricsError: error.message,
            globalMetricsLoading: false,
          }));
        },
      ),
      onSnapshot(
        doc(db, 'global', 'risk_signals'),
        (snapshot) => {
          setState((current) => mergeTerminalState(current, {
            globalRiskSignals: snapshot.exists() ? (snapshot.data() as GlobalRiskSignalsDoc) : null,
            globalRiskSignalsError: null,
            globalRiskSignalsLoading: false,
          }));
        },
        (error) => {
          setState((current) => mergeTerminalState(current, {
            globalRiskSignalsError: error.message,
            globalRiskSignalsLoading: false,
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
