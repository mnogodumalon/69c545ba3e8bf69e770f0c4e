import type { EnrichedAufgaben, EnrichedBusinessplan, EnrichedFinanzplan, EnrichedMeilensteine, EnrichedReviewPunkte, EnrichedRoadmapCockpit, EnrichedVorlagenTools } from '@/types/enriched';
import type { Aufgaben, Businessplan, Finanzplan, Gruenderprofil, Meilensteine, Phasen, ReviewPunkte, RoadmapCockpit, VorlagenTools } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface AufgabenMaps {
  gruenderprofilMap: Map<string, Gruenderprofil>;
  phasenMap: Map<string, Phasen>;
  meilensteineMap: Map<string, Meilensteine>;
}

export function enrichAufgaben(
  aufgaben: Aufgaben[],
  maps: AufgabenMaps
): EnrichedAufgaben[] {
  return aufgaben.map(r => ({
    ...r,
    gruender_refName: resolveDisplay(r.fields.gruender_ref, maps.gruenderprofilMap, 'vorname', 'nachname'),
    phase_refName: resolveDisplay(r.fields.phase_ref, maps.phasenMap, 'phasen_name'),
    meilenstein_refName: resolveDisplay(r.fields.meilenstein_ref, maps.meilensteineMap, 'meilenstein_titel'),
  }));
}

interface VorlagenToolsMaps {
  phasenMap: Map<string, Phasen>;
}

export function enrichVorlagenTools(
  vorlagenTools: VorlagenTools[],
  maps: VorlagenToolsMaps
): EnrichedVorlagenTools[] {
  return vorlagenTools.map(r => ({
    ...r,
    phase_refName: resolveDisplay(r.fields.phase_ref, maps.phasenMap, 'phasen_name'),
  }));
}

interface MeilensteineMaps {
  gruenderprofilMap: Map<string, Gruenderprofil>;
  phasenMap: Map<string, Phasen>;
}

export function enrichMeilensteine(
  meilensteine: Meilensteine[],
  maps: MeilensteineMaps
): EnrichedMeilensteine[] {
  return meilensteine.map(r => ({
    ...r,
    gruender_refName: resolveDisplay(r.fields.gruender_ref, maps.gruenderprofilMap, 'vorname', 'nachname'),
    phase_refName: resolveDisplay(r.fields.phase_ref, maps.phasenMap, 'phasen_name'),
  }));
}

interface RoadmapCockpitMaps {
  gruenderprofilMap: Map<string, Gruenderprofil>;
  phasenMap: Map<string, Phasen>;
  meilensteineMap: Map<string, Meilensteine>;
}

export function enrichRoadmapCockpit(
  roadmapCockpit: RoadmapCockpit[],
  maps: RoadmapCockpitMaps
): EnrichedRoadmapCockpit[] {
  return roadmapCockpit.map(r => ({
    ...r,
    gruender_refName: resolveDisplay(r.fields.gruender_ref, maps.gruenderprofilMap, 'vorname', 'nachname'),
    phase_refName: resolveDisplay(r.fields.phase_ref, maps.phasenMap, 'phasen_name'),
    meilensteine_refsName: resolveDisplay(r.fields.meilensteine_refs, maps.meilensteineMap, 'meilenstein_titel'),
  }));
}

interface ReviewPunkteMaps {
  gruenderprofilMap: Map<string, Gruenderprofil>;
  phasenMap: Map<string, Phasen>;
}

export function enrichReviewPunkte(
  reviewPunkte: ReviewPunkte[],
  maps: ReviewPunkteMaps
): EnrichedReviewPunkte[] {
  return reviewPunkte.map(r => ({
    ...r,
    gruender_refName: resolveDisplay(r.fields.gruender_ref, maps.gruenderprofilMap, 'vorname', 'nachname'),
    phase_refName: resolveDisplay(r.fields.phase_ref, maps.phasenMap, 'phasen_name'),
  }));
}

interface BusinessplanMaps {
  gruenderprofilMap: Map<string, Gruenderprofil>;
  phasenMap: Map<string, Phasen>;
}

export function enrichBusinessplan(
  businessplan: Businessplan[],
  maps: BusinessplanMaps
): EnrichedBusinessplan[] {
  return businessplan.map(r => ({
    ...r,
    gruender_refName: resolveDisplay(r.fields.gruender_ref, maps.gruenderprofilMap, 'vorname', 'nachname'),
    phase_refName: resolveDisplay(r.fields.phase_ref, maps.phasenMap, 'phasen_name'),
  }));
}

interface FinanzplanMaps {
  gruenderprofilMap: Map<string, Gruenderprofil>;
  businessplanMap: Map<string, Businessplan>;
}

export function enrichFinanzplan(
  finanzplan: Finanzplan[],
  maps: FinanzplanMaps
): EnrichedFinanzplan[] {
  return finanzplan.map(r => ({
    ...r,
    gruender_refName: resolveDisplay(r.fields.gruender_ref, maps.gruenderprofilMap, 'vorname', 'nachname'),
    businessplan_refName: resolveDisplay(r.fields.businessplan_ref, maps.businessplanMap, 'bp_titel'),
  }));
}
