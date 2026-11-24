/**
 * HQD MIAMI CHASE - HEIST LOOTBOX
 * Глобальный стейт: звезды розыска, инвентарь лута, история кодов ЧЗ,
 * бусты удачи и конфиг скрытой админ-панели. Прогресс персистится в
 * localStorage; транзиентные поля (экран, тосты) не сохраняются.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ClaimResult,
  ForcedDropId,
  InventoryItem,
  PartnerBrandId,
  PrizeCategory,
  PrizeItem,
} from '@/api/types';
import { FREE_CASE_PRIZE_ID, getPrizeById } from '@/api/mockData';

export type Screen = 'HUB' | 'SCAN' | 'SPIN';

export interface LastScanInfo {
  code: string;
  gtin: string;
  isSamokatBatch: boolean;
  at: number;
}

export interface AdminConfig {
  partner: PartnerBrandId;
  partnerCustomName: string;
  forcedDrop: ForcedDropId | null;
  demoScripted: boolean;
}

export interface ToastData {
  id: number;
  text: string;
  kind: 'info' | 'success' | 'error';
}

interface RegisterScanArgs {
  code: string;
  gtin: string;
  isSamokatBatch: boolean;
}

interface HeistState {
  /* --- персистируемый прогресс --- */
  stars: number;
  scansCount: number;
  usedCodes: string[];
  inventory: InventoryItem[];
  boostMultiplier: number;
  boostDeadline: number | null;
  safeType: PrizeCategory;
  admin: AdminConfig;
  freeCaseClaimed: boolean;

  /* --- транзиентное --- */
  screen: Screen;
  lastScan: LastScanInfo | null;
  toast: ToastData | null;

  /* --- actions --- */
  setScreen: (screen: Screen) => void;
  registerScan: (info: RegisterScanArgs) => void;
  completeSpin: (prize: PrizeItem) => string;
  markClaimed: (uid: string, claim: ClaimResult) => void;
  setSafeType: (safeType: PrizeCategory) => void;
  setAdminPartner: (partner: PartnerBrandId, customName?: string) => void;
  setForcedDrop: (drop: ForcedDropId | null) => void;
  toggleDemoScripted: () => void;
  resetProgress: () => void;
  claimFreeCase: () => boolean;
  checkBoostExpiry: () => void;
  showToast: (text: string, kind?: ToastData['kind']) => void;
  clearToast: () => void;
}

const INITIAL_PERSISTED = {
  stars: 0,
  scansCount: 0,
  usedCodes: [] as string[],
  inventory: [] as InventoryItem[],
  boostMultiplier: 1.5,
  boostDeadline: null as number | null,
  safeType: 'GAMING' as PrizeCategory,
  admin: {
    partner: 'case-battle' as PartnerBrandId,
    partnerCustomName: '',
    forcedDrop: null as ForcedDropId | null,
    demoScripted: true,
  },
  freeCaseClaimed: false,
};

const TRANSIENT = {
  screen: 'HUB' as Screen,
  lastScan: null as LastScanInfo | null,
  toast: null as ToastData | null,
};

const BOOST_FOMO_MS = 24 * 60 * 60 * 1000;

function makeUid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // фолбэк ниже
  }
  return `uid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useHeistStore = create<HeistState>()(
  persist(
    (set, get) => ({
      ...INITIAL_PERSISTED,
      ...TRANSIENT,

      setScreen: (screen) => set({ screen }),

      registerScan: ({ code, gtin, isSamokatBatch }) =>
        set((state) => ({
          stars: Math.min(5, state.stars + 1),
          scansCount: state.scansCount + 1,
          usedCodes: [...state.usedCodes, code],
          lastScan: { code, gtin, isSamokatBatch, at: Date.now() },
          screen: 'SPIN',
        })),

      completeSpin: (prize) => {
        const uid = makeUid();
        const item: InventoryItem = {
          uid,
          prizeId: prize.id,
          title: prize.title,
          valueRub: prize.valueRub,
          rarity: prize.rarity,
          category: prize.category,
          image: prize.image,
          partnerName: prize.partnerName,
          deliveryType: prize.deliveryType,
          wonAt: Date.now(),
          claimStatus: 'UNCLAIMED',
        };
        set((state) => ({
          inventory: [item, ...state.inventory],
          boostMultiplier: 2.5,
          boostDeadline: Date.now() + BOOST_FOMO_MS,
          admin: { ...state.admin, forcedDrop: null },
        }));
        return uid;
      },

      markClaimed: (uid, claim) =>
        set((state) => ({
          inventory: state.inventory.map((item) =>
            item.uid === uid ? { ...item, claim, claimStatus: 'CLAIMED' as const } : item
          ),
        })),

      setSafeType: (safeType) => set({ safeType }),

      setAdminPartner: (partner, customName) =>
        set((state) => ({
          admin: {
            ...state.admin,
            partner,
            partnerCustomName: customName ?? state.admin.partnerCustomName,
          },
        })),

      setForcedDrop: (drop) =>
        set((state) => ({ admin: { ...state.admin, forcedDrop: drop } })),

      toggleDemoScripted: () =>
        set((state) => ({
          admin: { ...state.admin, demoScripted: !state.admin.demoScripted },
        })),

      resetProgress: () =>
        set((state) => ({
          ...INITIAL_PERSISTED,
          admin: state.admin,
          ...TRANSIENT,
        })),

      claimFreeCase: () => {
        const state = get();
        if (state.freeCaseClaimed) return false;
        const prize = getPrizeById(FREE_CASE_PRIZE_ID);
        if (!prize) return false;
        const item: InventoryItem = {
          uid: makeUid(),
          prizeId: prize.id,
          title: prize.title,
          valueRub: prize.valueRub,
          rarity: prize.rarity,
          category: prize.category,
          image: prize.image,
          partnerName: prize.partnerName,
          deliveryType: prize.deliveryType,
          wonAt: Date.now(),
          claimStatus: 'UNCLAIMED',
        };
        set({
          inventory: [item, ...state.inventory],
          freeCaseClaimed: true,
        });
        return true;
      },

      checkBoostExpiry: () => {
        const { boostDeadline, boostMultiplier } = get();
        if (boostDeadline && Date.now() > boostDeadline && boostMultiplier !== 1.5) {
          set({ boostMultiplier: 1.5, boostDeadline: null });
        }
      },

      showToast: (text, kind = 'info') =>
        set({ toast: { id: Date.now() + Math.floor(Math.random() * 1000), text, kind } }),

      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'hqd-heist-store-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        stars: state.stars,
        scansCount: state.scansCount,
        usedCodes: state.usedCodes,
        inventory: state.inventory,
        boostMultiplier: state.boostMultiplier,
        boostDeadline: state.boostDeadline,
        safeType: state.safeType,
        admin: state.admin,
        freeCaseClaimed: state.freeCaseClaimed,
      }),
    }
  )
);

/** Суммарный баланс выигранного лута в рублях. */
export function selectBalance(state: HeistState): number {
  return state.inventory.reduce((sum, item) => sum + item.valueRub, 0);
}
