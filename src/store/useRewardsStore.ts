'use client';

// Глобальное состояние приложения: анонимный игрок, серверное состояние,
// навигация по экранам и результаты действий.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ApiErrorCode,
  AppState,
  PrizeState,
  ScanResponse,
  ScanResponse as ScanResp,
  StateResponse,
} from '@/lib/rewards/types';
import type { OpenChestResponse } from '@/lib/rewards/types';
import { initTelegram } from '@/utils/telegram';

export type View = 'home' | 'scan' | 'chest' | 'prizes';

export interface ScanSuccessInfo {
  flavorName: string;
  lineName: string;
  newChestIds: string[];
  progressedQuestIds: string[];
}

export const ERROR_TEXT: Record<ApiErrorCode, string> = {
  BAD_REQUEST: 'Что-то не так с запросом. Попробуй ещё раз',
  INVALID_CODE: 'Это не похоже на код Честного знака. Проверь код на дне банки',
  ALREADY_USED: 'Этот код уже участвует в акции. Отсканируй другую банку',
  ALREADY_OPENED: 'Этот сундук уже открыт',
  NOT_FOUND: 'Не удалось найти запись. Обнови приложение',
  SERVER_ERROR: 'Что-то пошло не так. Попробуй ещё раз',
};

interface RewardsStore {
  playerId: string | null;
  state: AppState | null;
  hydrated: boolean;
  view: View;
  activeChestId: string | null;
  claimPrizeId: string | null;
  adminOpen: boolean;
  scanSuccess: ScanSuccessInfo | null;
  scanError: string | null;
  scanBusy: boolean;

  init: () => Promise<void>;
  loadState: () => Promise<void>;
  submitCode: (code: string) => Promise<boolean>;
  openChest: (chestId: string) => Promise<PrizeState | null>;
  resetProgress: () => Promise<void>;
  grantDemoChests: () => Promise<void>;
  go: (view: View) => void;
  openChestView: (chestId: string) => void;
  openClaim: (prizeId: string) => void;
  setClaimPrize: (prizeId: string | null) => void;
  setAdminOpen: (open: boolean) => void;
  clearScanFeedback: () => void;
}

function freshPlayerId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export const useRewardsStore = create<RewardsStore>()(
  persist(
    (set, get) => ({
      playerId: null,
      state: null,
      hydrated: false,
      view: 'home',
      activeChestId: null,
      claimPrizeId: null,
      adminOpen: false,
      scanSuccess: null,
      scanError: null,
      scanBusy: false,

      init: async () => {
        initTelegram();
        let playerId = get().playerId;
        if (!playerId) {
          playerId = freshPlayerId();
          set({ playerId });
        }
        try {
          const res = await fetch(`/api/state?playerId=${encodeURIComponent(playerId)}`);
          const json = (await res.json()) as StateResponse;
          if (json.ok) set({ state: json.state });
        } catch {
          /* сеть недоступна — покажем пустую главную */
        } finally {
          set({ hydrated: true });
        }
      },

      loadState: async () => {
        const playerId = get().playerId;
        if (!playerId) return;
        try {
          const res = await fetch(`/api/state?playerId=${encodeURIComponent(playerId)}`);
          const json = (await res.json()) as StateResponse;
          if (json.ok) set({ state: json.state });
        } catch {
          /* игнорируем — покажем предыдущее состояние */
        }
      },

      submitCode: async (code) => {
        const playerId = get().playerId;
        if (!playerId || get().scanBusy) return false;

        set({ scanBusy: true, scanError: null, scanSuccess: null });
        try {
          const json = await postJson<ScanResp>('/api/scan', { playerId, code });
          if (!json.ok) {
            set({ scanError: ERROR_TEXT[json.error] ?? ERROR_TEXT.SERVER_ERROR });
            return false;
          }
          set({
            state: json.state,
            scanSuccess: {
              flavorName: json.flavorName,
              lineName: json.lineName,
              newChestIds: json.newChestIds,
              progressedQuestIds: json.progressedQuestIds,
            },
          });
          return true;
        } catch {
          set({ scanError: ERROR_TEXT.SERVER_ERROR });
          return false;
        } finally {
          set({ scanBusy: false });
        }
      },

      openChest: async (chestId) => {
        const playerId = get().playerId;
        if (!playerId) return null;
        try {
          const json = await postJson<OpenChestResponse>('/api/chests/open', {
            playerId,
            chestId,
          });
          if (!json.ok) return null;
          set({ state: json.state });
          return json.prize;
        } catch {
          return null;
        }
      },

      resetProgress: async () => {
        const playerId = get().playerId;
        if (!playerId) return;
        try {
          const json = await postJson<StateResponse>('/api/demo', {
            playerId,
            action: 'reset',
          });
          if (json.ok) {
            set({ state: json.state, view: 'home', activeChestId: null, claimPrizeId: null });
          }
        } catch {
          /* ignore */
        }
      },

      grantDemoChests: async () => {
        const playerId = get().playerId;
        if (!playerId) return;
        try {
          const json = await postJson<StateResponse>('/api/demo', {
            playerId,
            action: 'grant_chests',
          });
          if (json.ok) set({ state: json.state });
        } catch {
          /* ignore */
        }
      },

      go: (view) => set({ view, scanSuccess: null, scanError: null }),
      openChestView: (chestId) => set({ view: 'chest', activeChestId: chestId }),
      openClaim: (prizeId) => set({ claimPrizeId: prizeId }),
      setClaimPrize: (prizeId) => set({ claimPrizeId: prizeId }),
      setAdminOpen: (open) => set({ adminOpen: open }),
      clearScanFeedback: () => set({ scanSuccess: null, scanError: null }),
    }),
    {
      name: 'hqd-club-player',
      partialize: (s) => ({ playerId: s.playerId }) as RewardsStore,
    },
  ),
);

export type { ScanResponse };
