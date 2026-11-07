export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

export interface RiskInput {
  /** Games started in parallel. */
  batchSize: number;
  /** Seconds each batch is held. */
  holdSecs: number;
  /** Games that are still going to be run. */
  totalGames: number;
  cooldownEnabled: boolean;
}

export interface RiskResult {
  /** 0..100 */
  score: number;
  level: RiskLevel;
  gamesPerMinute: number;
}

// Fastest possible setting: 20 parallel games held for 5 seconds.
const MAX_RATE = 240;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/**
 * Rough "how intense is this activity" score.
 *
 * This is a heuristic, NOT a measured ban probability: Discord does not publish
 * how it treats this kind of activity. It only grows with speed, parallelism and
 * the number of games still to run, so it moves whenever one of them changes.
 */
export function estimateRisk(input: RiskInput): RiskResult {
  const { batchSize, holdSecs, totalGames, cooldownEnabled } = input;

  if (batchSize <= 0 || holdSecs <= 0 || totalGames <= 0) {
    return { score: 0, level: 'low', gamesPerMinute: 0 };
  }

  const gamesPerMinute = (batchSize * 60) / holdSecs;
  const rate = clamp01(Math.log1p(gamesPerMinute) / Math.log1p(MAX_RATE));
  const parallel = clamp01((batchSize - 1) / 19);
  const volume = clamp01(Math.log10(1 + totalGames) / 4); // ~10 000 games = full weight
  const pacing = cooldownEnabled ? 0 : 1;

  const score = Math.round(100 * (0.45 * rate + 0.25 * volume + 0.2 * parallel + 0.1 * pacing));
  const level: RiskLevel =
    score < 25 ? 'low' : score < 50 ? 'medium' : score < 75 ? 'high' : 'extreme';

  return { score, level, gamesPerMinute };
}
