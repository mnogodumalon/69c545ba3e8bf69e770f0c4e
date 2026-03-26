import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Gruenderprofil, Phasen, Meilensteine, Aufgaben, VorlagenTools, ReviewPunkte, RoadmapCockpit } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [gruenderprofil, setGruenderprofil] = useState<Gruenderprofil[]>([]);
  const [phasen, setPhasen] = useState<Phasen[]>([]);
  const [meilensteine, setMeilensteine] = useState<Meilensteine[]>([]);
  const [aufgaben, setAufgaben] = useState<Aufgaben[]>([]);
  const [vorlagenTools, setVorlagenTools] = useState<VorlagenTools[]>([]);
  const [reviewPunkte, setReviewPunkte] = useState<ReviewPunkte[]>([]);
  const [roadmapCockpit, setRoadmapCockpit] = useState<RoadmapCockpit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [gruenderprofilData, phasenData, meilensteineData, aufgabenData, vorlagenToolsData, reviewPunkteData, roadmapCockpitData] = await Promise.all([
        LivingAppsService.getGruenderprofil(),
        LivingAppsService.getPhasen(),
        LivingAppsService.getMeilensteine(),
        LivingAppsService.getAufgaben(),
        LivingAppsService.getVorlagenTools(),
        LivingAppsService.getReviewPunkte(),
        LivingAppsService.getRoadmapCockpit(),
      ]);
      setGruenderprofil(gruenderprofilData);
      setPhasen(phasenData);
      setMeilensteine(meilensteineData);
      setAufgaben(aufgabenData);
      setVorlagenTools(vorlagenToolsData);
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
        const [gruenderprofilData, phasenData, meilensteineData, aufgabenData, vorlagenToolsData, reviewPunkteData, roadmapCockpitData] = await Promise.all([
          LivingAppsService.getGruenderprofil(),
          LivingAppsService.getPhasen(),
          LivingAppsService.getMeilensteine(),
          LivingAppsService.getAufgaben(),
          LivingAppsService.getVorlagenTools(),
          LivingAppsService.getReviewPunkte(),
          LivingAppsService.getRoadmapCockpit(),
        ]);
        setGruenderprofil(gruenderprofilData);
        setPhasen(phasenData);
        setMeilensteine(meilensteineData);
        setAufgaben(aufgabenData);
        setVorlagenTools(vorlagenToolsData);
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

  const meilensteineMap = useMemo(() => {
    const m = new Map<string, Meilensteine>();
    meilensteine.forEach(r => m.set(r.record_id, r));
    return m;
  }, [meilensteine]);

  return { gruenderprofil, setGruenderprofil, phasen, setPhasen, meilensteine, setMeilensteine, aufgaben, setAufgaben, vorlagenTools, setVorlagenTools, reviewPunkte, setReviewPunkte, roadmapCockpit, setRoadmapCockpit, loading, error, fetchAll, gruenderprofilMap, phasenMap, meilensteineMap };
}