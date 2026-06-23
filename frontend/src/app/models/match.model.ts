export interface QuarterScore {
  quarterNumber: number;
  homeScore: number;
  awayScore: number;
}

export interface SetScore {
  setNumber: number;
  homeScore: number;
  awayScore: number;
}

export interface Goal {
  scorerName: string;
  teamName: string;
  isHomeTeamGoal: boolean;
  minute: number;
}

export interface Match {
  id: number;
  leagueId: number;
  roundNumber: number;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamLogoUrl: string;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamLogoUrl: string;
  scheduledAt: string; // ISO 8601 datetime string
  result?: string | null; // e.g. "2:1", present only on played matches
  stage?: string | null;
  isPlayoff?: boolean | null;
  playoffRoundLabel?: string | null;
  homeSeed?: number | null;
  awaySeed?: number | null;
  goals?: Goal[] | null;
  quarters?: QuarterScore[] | null;
  sets?: SetScore[] | null;
}

export type PlayoffStage = 'PlayoffSemifinal' | 'PlayoffThirdPlace' | 'PlayoffFinal';

export interface PlayoffGroup {
  stage: PlayoffStage;
  label: string;
  matches: Match[];
}

const PLAYOFF_STAGE_ORDER: PlayoffStage[] = [
  'PlayoffSemifinal',
  'PlayoffThirdPlace',
  'PlayoffFinal',
];

const PLAYOFF_STAGE_LABELS: Record<PlayoffStage, string> = {
  PlayoffSemifinal: 'Полуфинале',
  PlayoffThirdPlace: 'Меч за треће место',
  PlayoffFinal: 'Финале',
};

export function isPlayoffMatch(match: Match): boolean {
  return match.isPlayoff === true || match.stage?.startsWith('Playoff') === true;
}

export function splitRegularAndPlayoff(matches: Match[]): {
  regularSeasonMatches: Match[];
  playoffMatches: Match[];
} {
  return (matches ?? []).reduce(
    (acc, match) => {
      if (isPlayoffMatch(match)) {
        acc.playoffMatches.push(match);
      } else {
        acc.regularSeasonMatches.push(match);
      }

      return acc;
    },
    {
      regularSeasonMatches: [] as Match[],
      playoffMatches: [] as Match[],
    },
  );
}

export function groupPlayoffMatches(matches: Match[]): PlayoffGroup[] {
  const grouped = new Map<PlayoffStage, Match[]>();

  for (const match of sortPlayoffMatches(matches)) {
    const stage = getPlayoffStage(match);
    if (!stage) {
      continue;
    }

    grouped.set(stage, [...(grouped.get(stage) ?? []), match]);
  }

  return PLAYOFF_STAGE_ORDER.flatMap((stage) => {
    const stageMatches = grouped.get(stage) ?? [];
    return stageMatches.length > 0
      ? [{ stage, label: PLAYOFF_STAGE_LABELS[stage], matches: stageMatches }]
      : [];
  });
}

export function sortPlayoffMatches(matches: Match[]): Match[] {
  return [...(matches ?? [])].sort((a, b) => {
    const stageDiff = getPlayoffStageIndex(a) - getPlayoffStageIndex(b);
    if (stageDiff !== 0) {
      return stageDiff;
    }

    const seedDiff = getSeedSortValue(a) - getSeedSortValue(b);
    if (seedDiff !== 0) {
      return seedDiff;
    }

    return getDateSortValue(a) - getDateSortValue(b);
  });
}

function getPlayoffStage(match: Match): PlayoffStage | null {
  return PLAYOFF_STAGE_ORDER.includes(match.stage as PlayoffStage)
    ? (match.stage as PlayoffStage)
    : null;
}

function getPlayoffStageIndex(match: Match): number {
  const stage = getPlayoffStage(match);
  return stage ? PLAYOFF_STAGE_ORDER.indexOf(stage) : PLAYOFF_STAGE_ORDER.length;
}

function getSeedSortValue(match: Match): number {
  return match.homeSeed ?? Number.MAX_SAFE_INTEGER;
}

function getDateSortValue(match: Match): number {
  const time = new Date(match.scheduledAt).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}
