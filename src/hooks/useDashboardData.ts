import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Aufgaben, VorlagenTools, Meilensteine, Phasen, Gruenderprofil, RoadmapCockpit, ReviewPunkte, Businessplan, Finanzplan } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [aufgaben, setAufgaben] = useState<Aufgaben[]>([]);
  const [vorlagenTools, setVorlagenTools] = useState<VorlagenTools[]>([]);
  const [meilensteine, setMeilensteine] = useState<Meilensteine[]>([]);
  const [phasen, setPhasen] = useState<Phasen[]>([]);
  const [gruenderprofil, setGruenderprofil] = useState<Gruenderprofil[]>([]);
  const [roadmapCockpit, setRoadmapCockpit] = useState<RoadmapCockpit[]>([]);
  const [reviewPunkte, setReviewPunkte] = useState<ReviewPunkte[]>([]);
  const [businessplan, setBusinessplan] = useState<Businessplan[]>([]);
  const [finanzplan, setFinanzplan] = useState<Finanzplan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [aufgabenData, vorlagenToolsData, meilensteineData, phasenData, gruenderprofilData, roadmapCockpitData, reviewPunkteData, businessplanData, finanzplanData] = await Promise.all([
        LivingAppsService.getAufgaben(),
        LivingAppsService.getVorlagenTools(),
        LivingAppsService.getMeilensteine(),
        LivingAppsService.getPhasen(),
        LivingAppsService.getGruenderprofil(),
        LivingAppsService.getRoadmapCockpit(),
        LivingAppsService.getReviewPunkte(),
        LivingAppsService.getBusinessplan(),
        LivingAppsService.getFinanzplan(),
      ]);
      setAufgaben(aufgabenData);
      setVorlagenTools(vorlagenToolsData);
      setMeilensteine(meilensteineData);
      setPhasen(phasenData);
      setGruenderprofil(gruenderprofilData);
      setRoadmapCockpit(roadmapCockpitData);
      setReviewPunkte(reviewPunkteData);
      setBusinessplan(businessplanData);
      setFinanzplan(finanzplanData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [aufgabenData, vorlagenToolsData, meilensteineData, phasenData, gruenderprofilData, roadmapCockpitData, reviewPunkteData, businessplanData, finanzplanData] = await Promise.all([
          LivingAppsService.getAufgaben(),
          LivingAppsService.getVorlagenTools(),
          LivingAppsService.getMeilensteine(),
          LivingAppsService.getPhasen(),
          LivingAppsService.getGruenderprofil(),
          LivingAppsService.getRoadmapCockpit(),
          LivingAppsService.getReviewPunkte(),
          LivingAppsService.getBusinessplan(),
          LivingAppsService.getFinanzplan(),
        ]);
        setAufgaben(aufgabenData);
        setVorlagenTools(vorlagenToolsData);
        setMeilensteine(meilensteineData);
        setPhasen(phasenData);
        setGruenderprofil(gruenderprofilData);
        setRoadmapCockpit(roadmapCockpitData);
        setReviewPunkte(reviewPunkteData);
        setBusinessplan(businessplanData);
        setFinanzplan(finanzplanData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const meilensteineMap = useMemo(() => {
    const m = new Map<string, Meilensteine>();
    meilensteine.forEach(r => m.set(r.record_id, r));
    return m;
  }, [meilensteine]);

  const phasenMap = useMemo(() => {
    const m = new Map<string, Phasen>();
    phasen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [phasen]);

  const gruenderprofilMap = useMemo(() => {
    const m = new Map<string, Gruenderprofil>();
    gruenderprofil.forEach(r => m.set(r.record_id, r));
    return m;
  }, [gruenderprofil]);

  const businessplanMap = useMemo(() => {
    const m = new Map<string, Businessplan>();
    businessplan.forEach(r => m.set(r.record_id, r));
    return m;
  }, [businessplan]);

  return { aufgaben, setAufgaben, vorlagenTools, setVorlagenTools, meilensteine, setMeilensteine, phasen, setPhasen, gruenderprofil, setGruenderprofil, roadmapCockpit, setRoadmapCockpit, reviewPunkte, setReviewPunkte, businessplan, setBusinessplan, finanzplan, setFinanzplan, loading, error, fetchAll, meilensteineMap, phasenMap, gruenderprofilMap, businessplanMap };
}