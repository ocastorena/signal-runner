import type { AbilityId } from './types'

export const GAME_BALANCE = {
  fixedStepSeconds: 1 / 60,
  maxFrameSeconds: 0.125,
  maxIntegrity: 100,
  firewallDamagePerSecond: 18,
  pursuerDamagePerSecond: 10,
  encryptDamageMultiplier: 0.35,
  burstSpeedMultiplier: 1.8,
  latencySpeedMultiplier: 0.58,
  burstDetectionMultiplier: 1.45,
  decoyDetectionMultiplier: 0.35,
  detectionDecayPerSecond: 0.2,
  detectionGainPerSecond: 0.7,
  pursuerThreshold: 0.65,
  congestionGlobalGrowthPerSecond: 0.035,
  congestionTravelGrowthPerSecond: 0.28,
  congestionDecayPerSecond: 0.09,
  congestionTravelSlowdown: 0.25,
  congestionCostWeight: 0.75,
  firewallCostPenalty: 1.8,
  latencyCostPenalty: 1.25,
  pinCostMultiplier: 0.62,
  baseCompletionScore: 1000,
  baseTimeScoreBudget: 2200,
  tokenScore: 240,
  noDamageBonus: 350,
  noRerouteBonus: 450,
  speedrunBonus: 350,
  eventBufferSize: 48,
} as const

export const ABILITY_DEFS: Record<
  AbilityId,
  {
    label: string
    duration: number
    cooldown: number
    description: string
  }
> = {
  encrypt: {
    label: 'Encrypt',
    duration: 4,
    cooldown: 14,
    description: 'Reduce incoming damage and pass firewalls safely.',
  },
  decoy: {
    label: 'Decoy',
    duration: 5,
    cooldown: 16,
    description: 'Divert scanner focus and reduce detection gain.',
  },
  burst: {
    label: 'Burst',
    duration: 2.2,
    cooldown: 10,
    description: 'Move faster with higher detection risk.',
  },
}

export const ABILITY_KEYS: Record<AbilityId, string> = {
  encrypt: 'Q',
  decoy: 'W',
  burst: 'E',
}
