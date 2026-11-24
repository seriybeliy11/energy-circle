'use client';

/**
 * Маппер иконок призов: ключ PrizeIconKey -> иконка lucide.
 * Единая точка рендера иконографии лутбокса.
 */

import { Banknote, Coins, Crosshair, Gamepad2, Gift, Hand, Package, Sword, type LucideIcon } from 'lucide-react';
import type { PrizeIconKey } from '@/api/types';

const ICON_MAP: Record<PrizeIconKey, LucideIcon> = {
  case: Package,
  steam: Gamepad2,
  skin: Crosshair,
  gloves: Hand,
  knife: Sword,
  cash: Banknote,
  coins: Coins,
  gift: Gift,
};

interface PrizeIconProps {
  iconKey: PrizeIconKey;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export default function PrizeIcon({ iconKey, size = 44, className, strokeWidth = 1.6 }: PrizeIconProps) {
  const Icon = ICON_MAP[iconKey] ?? Gift;
  return <Icon size={size} className={className} strokeWidth={strokeWidth} aria-hidden />;
}
