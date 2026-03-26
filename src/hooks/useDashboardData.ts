import { useState, useEffect, useMemo, useCallback } from 'react';
import type { VorlagenTools, Businessplan, Finanzplan, Meilensteine, Aufgaben, Gruenderprofil, Phasen, ReviewPunkte, RoadmapCockpit } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [vorlagenTools, setVorlagenTools] = useState<VorlagenTools[]>([]);
  const [businessplan, setBusinessplan] = useState<Businessplan[]>([]);
  const [finanzplan, setFinanzplan] = useState<Finanzplan[]>([]);
  const [meilensteine, setMeilensteine] = useState<Meilensteine[]>([]);
  const [aufgaben, setAufgaben] = useState<Aufgaben[]>([]);
  const [gruenderprofil, setGruenderprofil] = useState<Gruenderprofil[]>([]);
  const [phasen, setPhasen] = useState<Phasen[]>([]);
  const [reviewPunkte, setReviewPunkte] = useState<ReviewPunkte[]>([]);
  const [roadmapCockpit, setRoadmapCockpit] = useState<RoadmapCockpit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [vorlagenToolsData, businessplanData, finanzplanData, meilensteineData, aufgabenData, gruenderprofilData, phasenData, reviewPunkteData, roadmapCockpitData] = await Promise.all([
        LivingAppsService.getVorlagenTools(),
        LivingAppsService.getBusinessplan(),
        LivingAppsService.getFinanzplan(),
        LivingAppsService.getMeilensteine(),
        LivingAppsService.getAufgaben(),
        LivingAppsService.getGruenderprofil(),
        LivingAppsService.getPhasen(),
        LivingAppsService.getReviewPunkte(),
        LivingAppsService.getRoadmapCockpit(),
      ]);
      setVorlagenTools(vorlagenToolsData);
      setBusinessplan(businessplanData);
      setFinanzplan(finanzplanData);
      setMeilensteine(meilensteineData);
      setAufgaben(aufgabenData);
      setGruenderprofil(gruenderprofilData);
      setPhasen(phasenData);
      setReviewPunkte(reviewPunkteData);
      setRoadmapCockpit(roadmapCockpitData);
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
        const [vorlagenToolsData, businessplanData, finanzplanData, meilensteineData, aufgabenData, gruenderprofilData, phasenData, reviewPunkteData, roadmapCockpitData] = await Promise.all([
          LivingAppsService.getVorlagenTools(),
          LivingAppsService.getBusinessplan(),
          LivingAppsService.getFinanzplan(),
          LivingAppsService.getMeilensteine(),
          LivingAppsService.getAufgaben(),
          LivingAppsService.getGruenderprofil(),
          LivingAppsService.getPhasen(),
          LivingAppsService.getReviewPunkte(),
          LivingAppsService.getRoadmapCockpit(),
        ]);
        setVorlagenTools(vorlagenToolsData);
        setBusinessplan(businessplanData);
        setFinanzplan(finanzplanData);
        setMeilensteine(meilensteineData);
        setAufgaben(aufgabenData);
        setGruenderprofil(gruenderprofilData);
        setPhasen(phasenData);
        setReviewPunkte(reviewPunkteData);
        setRoadmapCockpit(roadmapCockpitData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const businessplanMap = useMemo(() => {
    const m = new Map<string, Businessplan>();
    businessplan.forEach(r => m.set(r.record_id, r));
    return m;
  }, [businessplan]);

  const meilensteineMap = useMemo(() => {
    const m = new Map<string, Meilensteine>();
    meilensteine.forEach(r => m.set(r.record_id, r));
    return m;
  }, [meilensteine]);

  const gruenderprofilMap = useMemo(() => {
    const m = new Map<string, Gruenderprofil>();
    gruenderprofil.forEach(r => m.set(r.record_id, r));
    return m;
  }, [gruenderprofil]);

  const phasenMap = useMemo(() => {
    const m = new Map<string, Phasen>();
    phasen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [phasen]);

  return { vorlagenTools, setVorlagenTools, businessplan, setBusinessplan, finanzplan, setFinanzplan, meilensteine, setMeilensteine, aufgaben, setAufgaben, gruenderprofil, setGruenderprofil, phasen, setPhasen, reviewPunkte, setReviewPunkte, roadmapCockpit, setRoadmapCockpit, loading, error, fetchAll, businessplanMap, meilensteineMap, gruenderprofilMap, phasenMap };
}