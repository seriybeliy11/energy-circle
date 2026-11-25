'use client';

// Глобальное состояние демо-версии: весь прогресс одного игрока живёт в сейве
// (localStorage, zustand persist), вся игровая логика — в локальном движке
// (lib/rewards/engine). Никаких серверов, playerId и сетевых запросов.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AdminResponse,
  ApiErrorCode,
  AppState,
  PrizeState,
  SpinResponse,
} from '@/lib/rewards/types';
import {
  buildState,
  cloneSave,
  createInitialSave,
  grantPendingChests,
  JACKPOT_THRESHOLD,
  openChest as engineOpenChest,
  spinWheel as engineSpinWheel,
  submitCode as engineSubmitCode,
  applyAdminAction,
  applyDemoAction,
  type PlayerSave,
} from '@/lib/rewards/engine';
import { initTelegram } from '@/utils/telegram';

export type View = 'scan' | 'quests' | 'wheel' | 'prizes' | 'chest';

export interface ScanSuccessInfo {
  flavorName: string;
  lineName: string;
  spinsGained: number;
  newChestIds: string[];
  progressedQuestIds: string[];
}

export const ERROR_TEXT: Record<ApiErrorCode, string> = {
  BAD_REQUEST: 'Что-то не так с запросом. Попробуй ещё раз',
  INVALID_CODE: 'Это не похоже на код Честного знака. Проверь код на крышке банки',
  ALREADY_USED: 'Этот код уже участвует в акции. Отсканируй другую банку',
  CODE_RETIRED: 'Код выведен из оборота. Отсканируй другую банку',
  NO_SPINS: 'Спинов нет — отсканируй банку, чтобы крутить',
  ALREADY_OPENED: 'Этот лутбокс уже открыт',
  NOT_FOUND: 'Не удалось найти запись. Обнови приложение',
  SERVER_ERROR: 'Что-то пошло не так. Попробуй ещё раз',
};

export type DemoAction = 'reset' | 'grant_chests' | 'grant_spins' | 'fill_jackpot';

interface RewardsStore {
  /** Весь прогресс игрока — persist'ится в localStorage. */
  save: PlayerSave;
  /** Производное состояние для экранов. */
  state: AppState | null;
  hydrated: boolean;
  view: View;
  activeChestId: string | null;
  claimPrizeId: string | null;
  /** id призов, которые игрок уже видел в инвентаре (для метки NEW). */
  seenPrizeIds: string[];
  adminOpen: boolean;
  scanSuccess: ScanSuccessInfo | null;
  scanError: string | null;
  scanBusy: boolean;
  spinBusy: boolean;

  init: () => Promise<void>;
  submitCode: (code: string) => Promise<boolean>;
  openChest: (chestId: string) => Promise<PrizeState | null>;
  spinWheel: () => Promise<SpinResponse | null>;
  demoAction: (action: DemoAction) => Promise<boolean>;
  admin: (action: string, extra?: Record<string, unknown>) => Promise<AdminResponse | null>;
  go: (view: View) => void;
  openChestView: (chestId: string) => void;
  openClaim: (prizeId: string) => void;
  markPrizesSeen: (ids: string[]) => void;
  setClaimPrize: (prizeId: string | null) => void;
  setAdminOpen: (open: boolean) => void;
  clearScanFeedback: () => void;
}

/** Приводит любой восстановленный сейв к валидной форме (страховка от битого кэша). */
function normalizeSave(raw: unknown): PlayerSave {
  const base = createInitialSave();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<PlayerSave>;
  const num = (v: unknown, fallback = 0) =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return {
    version: 2,
    createdAt: typeof s.createdAt === 'string' ? s.createdAt : base.createdAt,
    scans: Array.isArray(s.scans) ? s.scans : [],
    chests: Array.isArray(s.chests) ? s.chests : [],
    prizes: Array.isArray(s.prizes) ? s.prizes : [],
    spins: Math.max(0, num(s.spins)),
    goldenSpins: Math.max(0, num(s.goldenSpins)),
    jackpotFill: Math.min(JACKPOT_THRESHOLD, Math.max(0, num(s.jackpotFill))),
    missStreak: Math.max(0, num(s.missStreak)),
    tickets: s.tickets && typeof s.tickets === 'object' && !Array.isArray(s.tickets) ? s.tickets : {},
    quests: Array.isArray(s.quests) && s.quests.length > 0 ? s.quests : base.quests,
    raffles: Array.isArray(s.raffles) && s.raffles.length > 0 ? s.raffles : base.raffles,
  };
}

export const useRewardsStore = create<RewardsStore>()(
  persist(
    (set, get) => ({
        save: createInitialSave(),
        state: null,
        hydrated: false,
        view: 'scan',
        activeChestId: null,
        claimPrizeId: null,
        seenPrizeIds: [],
        adminOpen: false,
        scanSuccess: null,
        scanError: null,
        scanBusy: false,
        spinBusy: false,

        init: async () => {
          initTelegram();
          // ждём восстановления сейва из localStorage (обычно мгновенно)
          if (!useRewardsStore.persist.hasHydrated()) {
            await new Promise<void>((resolve) => {
              let done = false;
              const finish = () => {
                if (done) return;
                done = true;
                resolve();
              };
              const unsub = useRewardsStore.persist.onFinishHydration(() => {
                unsub();
                finish();
              });
              // страховка: hydration завершилась между проверкой и подпиской
              if (useRewardsStore.persist.hasHydrated()) finish();
            });
          }
          const draft = normalizeSave(useRewardsStore.getState().save);
          grantPendingChests(draft);
          set({ save: draft, state: buildState(draft), hydrated: true });
        },

        submitCode: async (code) => {
          if (get().scanBusy) return false;
          set({ scanBusy: true, scanError: null, scanSuccess: null });

          const draft = cloneSave(get().save);
          const res = engineSubmitCode(draft, code);
          if (!res.ok) {
            set({ scanBusy: false, scanError: ERROR_TEXT[res.error] ?? ERROR_TEXT.SERVER_ERROR });
            return false;
          }
          set({
            save: draft,
            state: buildState(draft),
            scanBusy: false,
            scanSuccess: {
              flavorName: res.flavorName,
              lineName: res.lineName,
              spinsGained: res.spinsGained,
              newChestIds: res.newChestIds,
              progressedQuestIds: res.progressedQuestIds,
            },
          });
          return true;
        },

        openChest: async (chestId) => {
          const draft = cloneSave(get().save);
          const res = engineOpenChest(draft, chestId);
          if (!res.ok) return null;
          set({ save: draft, state: buildState(draft) });
          return res.prize;
        },

        spinWheel: async () => {
          if (get().spinBusy) return null;
          set({ spinBusy: true });
          const draft = cloneSave(get().save);
          const res = engineSpinWheel(draft);
          if (!res.ok) {
            set({ spinBusy: false });
            return res;
          }
          set({ save: draft, state: buildState(draft), spinBusy: false });
          return res;
        },

        demoAction: async (action) => {
          const draft = cloneSave(get().save);
          const res = applyDemoAction(draft, action);
          if (!res.ok) return false;
          set({ save: draft, state: buildState(draft) });
          return true;
        },

        admin: async (action, extra = {}) => {
          const draft = cloneSave(get().save);
          const res = applyAdminAction(draft, action, extra);
          if (!res.ok) return res;
          set({ save: draft, state: buildState(draft) });
          return res;
        },

        go: (view) => set({ view, scanSuccess: null, scanError: null }),
        openChestView: (chestId) => set({ view: 'chest', activeChestId: chestId }),
        openClaim: (prizeId) => set({ claimPrizeId: prizeId }),
        markPrizesSeen: (ids) =>
          set((s) => ({
            seenPrizeIds: Array.from(new Set([...s.seenPrizeIds, ...ids])).slice(-300),
          })),
        setClaimPrize: (prizeId) => set({ claimPrizeId: prizeId }),
        setAdminOpen: (open) => set({ adminOpen: open }),
        clearScanFeedback: () => set({ scanSuccess: null, scanError: null }),
    }),
    {
      name: 'hqd-club-player',
      version: 2,
      partialize: (s) =>
        ({ save: s.save, seenPrizeIds: s.seenPrizeIds }) as unknown as RewardsStore,
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as { seenPrizeIds?: string[]; save?: unknown };
        // версия 1 хранила playerId + seenPrizeIds — прогресс начинаем с нуля
        const seen =
          version < 2 || !old.save
            ? old.seenPrizeIds ?? []
            : (old as { seenPrizeIds?: string[] }).seenPrizeIds ?? [];
        return {
          save: normalizeSave(version < 2 ? null : old.save),
          seenPrizeIds: seen,
        } as unknown as RewardsStore;
      },
    },
  ),
);
