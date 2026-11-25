'use client';

// Глобальное состояние приложения: анонимный игрок, серверное состояние,
// навигация по вкладкам и результаты действий.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AdminResponse,
  ApiErrorCode,
  AppState,
  OpenChestResponse,
  PrizeState,
  ScanResponse,
  SpinResponse,
  StateResponse,
} from '@/lib/rewards/types';
import { initTelegram } from '@/utils/telegram';

export type View = 'scan' | 'quests' | 'chests' | 'wheel' | 'prizes' | 'chest';

export interface ScanSuccessInfo {
  flavorName: string;
  lineName: string;
  spinsGained: number;
  newChestIds: string[];
  progressedQuestIds: string[];
}

export const ERROR_TEXT: Record<ApiErrorCode, string> = {
  BAD_REQUEST: 'Что-то не так с запросом. Попробуй ещё раз',
  INVALID_CODE: 'Это не похоже на код Честного знака. Проверь код на дне банки',
  ALREADY_USED: 'Этот код уже участвует в акции. Отсканируй другую банку',
  CODE_RETIRED: 'Код выведен из оборота. Отсканируй другую банку',
  NO_SPINS: 'Спинов нет — отсканируй банку, чтобы крутить',
  ALREADY_OPENED: 'Этот сундук уже открыт',
  NOT_FOUND: 'Не удалось найти запись. Обнови приложение',
  SERVER_ERROR: 'Что-то пошло не так. Попробуй ещё раз',
};

export type DemoAction = 'reset' | 'grant_chests' | 'grant_spins' | 'fill_jackpot';

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
  spinBusy: boolean;

  init: () => Promise<void>;
  loadState: () => Promise<void>;
  submitCode: (code: string) => Promise<boolean>;
  openChest: (chestId: string) => Promise<PrizeState | null>;
  spinWheel: () => Promise<SpinResponse | null>;
  demoAction: (action: DemoAction) => Promise<boolean>;
  admin: (action: string, extra?: Record<string, unknown>) => Promise<AdminResponse | null>;
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
      view: 'scan',
      activeChestId: null,
      claimPrizeId: null,
      adminOpen: false,
      scanSuccess: null,
      scanError: null,
      scanBusy: false,
      spinBusy: false,

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
          /* сеть недоступна — покажем пустой экран */
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
          const json = await postJson<ScanResponse>('/api/scan', { playerId, code });
          if (!json.ok) {
            set({ scanError: ERROR_TEXT[json.error] ?? ERROR_TEXT.SERVER_ERROR });
            return false;
          }
          set({
            state: json.state,
            scanSuccess: {
              flavorName: json.flavorName,
              lineName: json.lineName,
              spinsGained: json.spinsGained,
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

      spinWheel: async () => {
        const playerId = get().playerId;
        if (!playerId || get().spinBusy) return null;
        set({ spinBusy: true });
        try {
          const json = await postJson<SpinResponse>('/api/wheel/spin', { playerId });
          if (json.ok) set({ state: json.state });
          return json;
        } catch {
          return null;
        } finally {
          set({ spinBusy: false });
        }
      },

      demoAction: async (action) => {
        const playerId = get().playerId;
        if (!playerId) return false;
        try {
          const json = await postJson<StateResponse>('/api/demo', { playerId, action });
          if (json.ok) {
            set({ state: json.state });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      admin: async (action, extra = {}) => {
        const playerId = get().playerId;
        if (!playerId) return null;
        try {
          const json = await postJson<AdminResponse>('/api/admin', { playerId, action, ...extra });
          if (json.ok) set({ state: json.state });
          return json;
        } catch {
          return null;
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
