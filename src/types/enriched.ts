import type { Aufgaben, Businessplan, Finanzplan, Meilensteine, ReviewPunkte, RoadmapCockpit, VorlagenTools } from './app';

export type EnrichedAufgaben = Aufgaben & {
  gruender_refName: string;
  phase_refName: string;
  meilenstein_refName: string;
};

export type EnrichedVorlagenTools = VorlagenTools & {
  phase_refName: string;
};

export type EnrichedMeilensteine = Meilensteine & {
  gruender_refName: string;
  phase_refName: string;
};

export type EnrichedRoadmapCockpit = RoadmapCockpit & {
  gruender_refName: string;
  phase_refName: string;
  meilensteine_refsName: string;
};

export type EnrichedReviewPunkte = ReviewPunkte & {
  gruender_refName: string;
  phase_refName: string;
};

export type EnrichedBusinessplan = Businessplan & {
  gruender_refName: string;
  phase_refName: string;
};

export type EnrichedFinanzplan = Finanzplan & {
  gruender_refName: string;
  businessplan_refName: string;
};
