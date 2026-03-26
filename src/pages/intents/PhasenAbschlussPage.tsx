import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { GruenderprofilDialog } from '@/components/dialogs/GruenderprofilDialog';
import { ReviewPunkteDialog } from '@/components/dialogs/ReviewPunkteDialog';
import { RoadmapCockpitDialog } from '@/components/dialogs/RoadmapCockpitDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import type { Gruenderprofil, Phasen, Meilensteine, ReviewPunkte, RoadmapCockpit } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconCheck,
  IconX,
  IconFlag,
  IconAlertTriangle,
  IconClipboardCheck,
  IconArrowRight,
  IconArrowLeft,
  IconPlus,
  IconCircleCheck,
  IconUser,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Gründer & Phase' },
  { label: 'Phase wählen' },
  { label: 'Bewerten & Review' },
  { label: 'Abschluss' },
];

function ampelDot(key: string | undefined) {
  if (!key) return null;
  const colorMap: Record<string, string> = {
    gruen: 'bg-green-500',
    gelb: 'bg-amber-400',
    rot: 'bg-red-500',
  };
  const cls = colorMap[key] ?? 'bg-gray-300';
  return <span className={`inline-block w-2 h-2 rounded-full ${cls} shrink-0`} />;
}

function reviewBadgeVariant(key: string | undefined): string {
  if (key === 'go') return 'bg-green-100 text-green-700';
  if (key === 'nachbessern') return 'bg-amber-100 text-amber-700';
  if (key === 'stop') return 'bg-red-100 text-red-700';
  return 'bg-muted text-muted-foreground';
}

function msBadgeClass(key: string | undefined): string {
  if (key === 'erreicht') return 'bg-green-100 text-green-700';
  if (key === 'nicht_erreicht') return 'bg-red-100 text-red-700';
  if (key === 'in_arbeit') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-600';
}

export default function PhasenAbschlussPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { gruenderprofil, phasen, meilensteine, reviewPunkte, roadmapCockpit, loading, error, fetchAll } =
    useDashboardData();

  // Step state (1-indexed)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    return s >= 1 && s <= 4 ? s : 1;
  });

  // Selections
  const [selectedGruenderId, setSelectedGruenderId] = useState<string | null>(
    () => searchParams.get('gruenderId') ?? null
  );
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(
    () => searchParams.get('phaseId') ?? null
  );

  // Dialog open states
  const [gruenderDialogOpen, setGruenderDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [cockpitDialogOpen, setCockpitDialogOpen] = useState(false);

  // Phase close state
  const [phaseClosing, setPhaseClosing] = useState(false);
  const [phaseClosed, setPhaseClosed] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  // Milestone update loading map
  const [msUpdating, setMsUpdating] = useState<Record<string, boolean>>({});

  // Local copy of milestones for optimistic updates
  const [localMilestones, setLocalMilestones] = useState<Meilensteine[]>([]);

  // Sync localMilestones from useDashboardData
  useEffect(() => {
    setLocalMilestones(meilensteine);
  }, [meilensteine]);

  // Sync URL params when selections/step change
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentStep > 1) params.set('step', String(currentStep));
    if (selectedGruenderId) params.set('gruenderId', selectedGruenderId);
    if (selectedPhaseId) params.set('phaseId', selectedPhaseId);
    setSearchParams(params, { replace: true });
  }, [currentStep, selectedGruenderId, selectedPhaseId, setSearchParams]);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  // Derived: selected founder record
  const selectedGruender: Gruenderprofil | undefined = useMemo(
    () => gruenderprofil.find(g => g.record_id === selectedGruenderId),
    [gruenderprofil, selectedGruenderId]
  );

  // Derived: selected phase record
  const selectedPhase: Phasen | undefined = useMemo(
    () => phasen.find(p => p.record_id === selectedPhaseId),
    [phasen, selectedPhaseId]
  );

  // Derived: phases not yet abgeschlossen
  const openPhasen: Phasen[] = useMemo(
    () =>
      phasen
        .filter(p => {
          const status = p.fields.phase_status?.key;
          return status !== 'abgeschlossen';
        })
        .sort((a, b) => (a.fields.phasen_nr ?? 0) - (b.fields.phasen_nr ?? 0)),
    [phasen]
  );

  // Derived: milestones for selected phase
  const phaseMilestones: Meilensteine[] = useMemo(() => {
    if (!selectedPhaseId) return [];
    const phaseUrl = createRecordUrl(APP_IDS.PHASEN, selectedPhaseId);
    return localMilestones.filter(m => m.fields.phase_ref === phaseUrl);
  }, [localMilestones, selectedPhaseId]);

  // Derived: review punkte for this phase+founder
  const phaseReviews: ReviewPunkte[] = useMemo(() => {
    if (!selectedPhaseId || !selectedGruenderId) return [];
    const phaseUrl = createRecordUrl(APP_IDS.PHASEN, selectedPhaseId);
    const gruenderUrl = createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruenderId);
    return reviewPunkte.filter(
      r => r.fields.phase_ref === phaseUrl && r.fields.gruender_ref === gruenderUrl
    );
  }, [reviewPunkte, selectedPhaseId, selectedGruenderId]);

  const latestReview: ReviewPunkte | undefined = phaseReviews[phaseReviews.length - 1];

  // Derived: cockpit entries for this phase
  const phaseCockpitEntries: RoadmapCockpit[] = useMemo(() => {
    if (!selectedPhaseId) return [];
    const phaseUrl = createRecordUrl(APP_IDS.PHASEN, selectedPhaseId);
    return roadmapCockpit
      .filter(c => c.fields.phase_ref === phaseUrl)
      .sort((a, b) => (a.fields.sitzungsdatum ?? '').localeCompare(b.fields.sitzungsdatum ?? ''));
  }, [roadmapCockpit, selectedPhaseId]);

  const latestCockpit: RoadmapCockpit | undefined =
    phaseCockpitEntries[phaseCockpitEntries.length - 1];

  // Milestone status counts
  const msBewerted = phaseMilestones.filter(m => m.fields.ms_status?.key !== 'offen').length;
  const msTotal = phaseMilestones.length;
  const hasKoFailed = phaseMilestones.some(
    m => m.fields.ko_kriterium_ja && m.fields.ms_status?.key === 'nicht_erreicht'
  );
  const msReached = phaseMilestones.filter(m => m.fields.ms_status?.key === 'erreicht').length;

  // Handlers
  const handleGruenderSelect = useCallback(
    (id: string) => {
      setSelectedGruenderId(id);
      setCurrentStep(2);
    },
    []
  );

  const handlePhaseSelect = useCallback(
    (id: string) => {
      setSelectedPhaseId(id);
      setCurrentStep(3);
    },
    []
  );

  const handleMsStatusUpdate = useCallback(
    async (msId: string, newStatus: string) => {
      setMsUpdating(prev => ({ ...prev, [msId]: true }));
      try {
        await LivingAppsService.updateMeilensteineEntry(msId, { ms_status: newStatus });
        // Optimistic local update
        setLocalMilestones(prev =>
          prev.map(m =>
            m.record_id === msId
              ? {
                  ...m,
                  fields: {
                    ...m.fields,
                    ms_status: { key: newStatus, label: newStatus },
                  },
                }
              : m
          )
        );
        await fetchAll();
      } catch {
        // ignore
      } finally {
        setMsUpdating(prev => ({ ...prev, [msId]: false }));
      }
    },
    [fetchAll]
  );

  const handlePhaseClose = useCallback(async () => {
    if (!selectedPhaseId) return;
    setPhaseClosing(true);
    setCloseError(null);
    try {
      await LivingAppsService.updatePhasenEntry(selectedPhaseId, {
        phase_status: 'abgeschlossen',
        phase_ampel: 'gruen',
      });
      setPhaseClosed(true);
      await fetchAll();
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : 'Fehler beim Abschliessen');
    } finally {
      setPhaseClosing(false);
    }
  }, [selectedPhaseId, fetchAll]);

  // Gruenderprofil dialog default values for URL pre-fill
  const reviewDefaultValues: ReviewPunkte['fields'] | undefined = useMemo(() => {
    if (!selectedGruenderId || !selectedPhaseId) return undefined;
    return {
      gruender_ref: createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruenderId),
      phase_ref: createRecordUrl(APP_IDS.PHASEN, selectedPhaseId),
      review_datum: new Date().toISOString().slice(0, 10),
    };
  }, [selectedGruenderId, selectedPhaseId]);

  const cockpitDefaultValues: RoadmapCockpit['fields'] | undefined = useMemo(() => {
    if (!selectedGruenderId || !selectedPhaseId) return undefined;
    return {
      gruender_ref: createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruenderId),
      phase_ref: createRecordUrl(APP_IDS.PHASEN, selectedPhaseId),
      sitzungsdatum: new Date().toISOString().slice(0, 10),
    };
  }, [selectedGruenderId, selectedPhaseId]);

  // ---- Step 1: Gründer wählen ----
  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Gründer auswählen</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Wählen Sie den Gründer, dessen Phase Sie abschliessen möchten.
        </p>
      </div>
      <EntitySelectStep
        items={gruenderprofil.map(g => ({
          id: g.record_id,
          title: [g.fields.vorname, g.fields.nachname].filter(Boolean).join(' ') || '(Kein Name)',
          subtitle: g.fields.projektname ?? g.fields.branche?.label,
          icon: <IconUser size={18} className="text-primary" />,
        }))}
        onSelect={handleGruenderSelect}
        searchPlaceholder="Gründer suchen..."
        emptyText="Noch kein Gründerprofil vorhanden."
        emptyIcon={<IconUser size={32} />}
        createLabel="Neues Gründerprofil anlegen"
        onCreateNew={() => setGruenderDialogOpen(true)}
        createDialog={
          <GruenderprofilDialog
            open={gruenderDialogOpen}
            onClose={() => setGruenderDialogOpen(false)}
            onSubmit={async fields => {
              await LivingAppsService.createGruenderprofilEntry(fields);
              await fetchAll();
            }}
            enablePhotoScan={AI_PHOTO_SCAN['Gruenderprofil']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Gruenderprofil']}
          />
        }
      />
    </div>
  );

  // ---- Step 2: Phase für Abschluss wählen ----
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Phase für Abschluss wählen</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Wählen Sie die Phase, die Sie abschliessen und reviewen möchten.
          </p>
        </div>
        {selectedGruender && (
          <div className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-1.5">
            Gründer:{' '}
            <span className="font-medium text-foreground">
              {[selectedGruender.fields.vorname, selectedGruender.fields.nachname]
                .filter(Boolean)
                .join(' ')}
            </span>
          </div>
        )}
      </div>
      <EntitySelectStep
        items={openPhasen.map(p => ({
          id: p.record_id,
          title: p.fields.phasen_name ?? `Phase ${p.fields.phasen_nr}`,
          subtitle: `Phase ${p.fields.phasen_nr ?? '–'}`,
          status: p.fields.phase_status
            ? { key: p.fields.phase_status.key, label: p.fields.phase_status.label }
            : undefined,
          icon: ampelDot(p.fields.phase_ampel?.key),
        }))}
        onSelect={handlePhaseSelect}
        searchPlaceholder="Phase suchen..."
        emptyText="Keine offenen Phasen vorhanden."
        emptyIcon={<IconFlag size={32} />}
      />
      <div className="pt-2">
        <Button variant="outline" onClick={() => setCurrentStep(1)}>
          <IconArrowLeft size={15} className="mr-1.5" />
          Zurück
        </Button>
      </div>
    </div>
  );

  // ---- Step 3: Meilensteine & Review ----
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Meilensteine bewerten & Review dokumentieren</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Bewerten Sie alle Meilensteine und erstellen Sie einen Review-Eintrag.
          </p>
        </div>
        {selectedPhase && (
          <div className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-1.5">
            Phase:{' '}
            <span className="font-medium text-foreground">
              {selectedPhase.fields.phasen_name}
            </span>
          </div>
        )}
      </div>

      {/* Sub-section A: Meilensteine */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <IconClipboardCheck size={16} className="text-primary" />
            <span className="font-medium text-sm">Meilensteine bewerten</span>
          </div>
          <span className="text-xs text-muted-foreground bg-background rounded-full px-2.5 py-1 border">
            {msBewerted} / {msTotal} bewertet
          </span>
        </div>

        {hasKoFailed && (
          <div className="mx-4 mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            <IconAlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              Achtung: Ein oder mehrere KO-Kriterium-Meilensteine wurden als &quot;Nicht
              erreicht&quot; bewertet.
            </span>
          </div>
        )}

        {phaseMilestones.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Keine Meilensteine für diese Phase vorhanden.
          </div>
        ) : (
          <div className="divide-y">
            {phaseMilestones.map(ms => {
              const statusKey = ms.fields.ms_status?.key;
              const isUpdating = msUpdating[ms.record_id];
              return (
                <div key={ms.record_id} className="px-4 py-3 flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {ms.fields.meilenstein_titel ?? '(Kein Titel)'}
                      </span>
                      {ms.fields.ko_kriterium_ja && (
                        <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-md shrink-0">
                          KO
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${msBadgeClass(
                          statusKey
                        )}`}
                      >
                        {ms.fields.ms_status?.label ?? 'Offen'}
                      </span>
                    </div>
                    {ms.fields.zieltermin && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Zieltermin: {ms.fields.zieltermin.slice(0, 10)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <Button
                      size="sm"
                      variant={statusKey === 'erreicht' ? 'default' : 'outline'}
                      className={statusKey === 'erreicht' ? 'bg-green-600 hover:bg-green-700' : ''}
                      disabled={isUpdating}
                      onClick={() => handleMsStatusUpdate(ms.record_id, 'erreicht')}
                    >
                      <IconCheck size={13} stroke={2.5} className="mr-1" />
                      Erreicht
                    </Button>
                    <Button
                      size="sm"
                      variant={statusKey === 'in_arbeit' ? 'default' : 'outline'}
                      className={
                        statusKey === 'in_arbeit' ? 'bg-amber-500 hover:bg-amber-600' : ''
                      }
                      disabled={isUpdating}
                      onClick={() => handleMsStatusUpdate(ms.record_id, 'in_arbeit')}
                    >
                      In Arbeit
                    </Button>
                    <Button
                      size="sm"
                      variant={statusKey === 'nicht_erreicht' ? 'default' : 'outline'}
                      className={
                        statusKey === 'nicht_erreicht' ? 'bg-red-600 hover:bg-red-700' : ''
                      }
                      disabled={isUpdating}
                      onClick={() => handleMsStatusUpdate(ms.record_id, 'nicht_erreicht')}
                    >
                      <IconX size={13} stroke={2.5} className="mr-1" />
                      Nicht erreicht
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sub-section B: Review-Punkte */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <IconClipboardCheck size={16} className="text-primary" />
          <span className="font-medium text-sm">Review-Punkte erfassen</span>
        </div>
        <div className="p-4 space-y-3">
          {latestReview ? (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border">
              <IconCircleCheck size={18} className="text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Review-Eintrag vorhanden</p>
                {latestReview.fields.review_datum && (
                  <p className="text-xs text-muted-foreground">
                    Datum: {latestReview.fields.review_datum.slice(0, 10)}
                  </p>
                )}
                {latestReview.fields.review_entscheidung && (
                  <span
                    className={`inline-block mt-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${reviewBadgeVariant(
                      latestReview.fields.review_entscheidung.key
                    )}`}
                  >
                    {latestReview.fields.review_entscheidung.label}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Noch kein Review-Eintrag für diese Phase erstellt.
            </p>
          )}
          <Button
            variant="outline"
            onClick={() => setReviewDialogOpen(true)}
            className="gap-1.5"
          >
            <IconPlus size={15} />
            Review-Punkte Eintrag erstellen
          </Button>
          <ReviewPunkteDialog
            open={reviewDialogOpen}
            onClose={() => setReviewDialogOpen(false)}
            onSubmit={async fields => {
              await LivingAppsService.createReviewPunkteEntry(fields);
              await fetchAll();
            }}
            defaultValues={reviewDefaultValues}
            gruenderprofilList={gruenderprofil}
            phasenList={phasen}
            enablePhotoScan={AI_PHOTO_SCAN['ReviewPunkte']}
            enablePhotoLocation={AI_PHOTO_LOCATION['ReviewPunkte']}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
        <Button variant="outline" onClick={() => setCurrentStep(2)}>
          <IconArrowLeft size={15} className="mr-1.5" />
          Zurück
        </Button>
        <Button onClick={() => setCurrentStep(4)}>
          Weiter zu Cockpit-Eintrag
          <IconArrowRight size={15} className="ml-1.5" />
        </Button>
      </div>
    </div>
  );

  // ---- Step 4: Cockpit-Eintrag & Phase abschliessen ----
  const renderStep4 = () => {
    if (phaseClosed) {
      return (
        <div className="space-y-6">
          <div className="rounded-2xl bg-green-50 border border-green-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                <IconCircleCheck size={22} className="text-white" stroke={2} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-green-900">Phase abgeschlossen</h2>
                <p className="text-sm text-green-700">
                  {selectedPhase?.fields.phasen_name ?? 'Phase'} wurde erfolgreich abgeschlossen.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-green-200 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{msReached}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  von {msTotal} Meilensteinen erreicht
                </p>
              </div>
              <div className="bg-white rounded-xl border border-green-200 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">
                  {selectedPhase?.fields.phasen_nr ?? '–'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Phase Nr.</p>
              </div>
              {latestReview?.fields.review_entscheidung && (
                <div className="bg-white rounded-xl border border-green-200 p-3 text-center flex flex-col items-center justify-center">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${reviewBadgeVariant(
                      latestReview.fields.review_entscheidung.key
                    )}`}
                  >
                    {latestReview.fields.review_entscheidung.label}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">Review-Entscheidung</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href="#/"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-green-800 hover:underline"
              >
                <IconArrowLeft size={14} />
                Zurück zum Dashboard
              </a>
              <a
                href="#/intents/phasen-setup"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-green-800 hover:underline"
              >
                Neue Phase aufsetzen
                <IconArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold">Cockpit-Eintrag & Phase abschliessen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Legen Sie eine Sitzung im Roadmap-Cockpit an und schliessen Sie die Phase ab.
            </p>
          </div>
          {selectedPhase && (
            <div className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-1.5">
              Phase:{' '}
              <span className="font-medium text-foreground">
                {selectedPhase.fields.phasen_name}
              </span>
            </div>
          )}
        </div>

        {/* Part A: Cockpit Sitzung */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
            <IconClipboardCheck size={16} className="text-primary" />
            <span className="font-medium text-sm">Roadmap-Cockpit Sitzung anlegen</span>
          </div>
          <div className="p-4 space-y-3">
            {latestCockpit ? (
              <div className="p-3 rounded-xl border bg-muted/40 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Letzte Sitzung{' '}
                  {latestCockpit.fields.sitzungsdatum
                    ? `vom ${latestCockpit.fields.sitzungsdatum.slice(0, 10)}`
                    : ''}
                </p>
                {latestCockpit.fields.sitzungs_zusammenfassung && (
                  <div>
                    <p className="text-xs text-muted-foreground">Zusammenfassung</p>
                    <p className="text-sm mt-0.5 line-clamp-2">
                      {latestCockpit.fields.sitzungs_zusammenfassung}
                    </p>
                  </div>
                )}
                {latestCockpit.fields.naechste_schritte && (
                  <div>
                    <p className="text-xs text-muted-foreground">Nächste Schritte</p>
                    <p className="text-sm mt-0.5 line-clamp-2">
                      {latestCockpit.fields.naechste_schritte}
                    </p>
                  </div>
                )}
                {latestCockpit.fields.naechste_sitzung && (
                  <p className="text-xs text-muted-foreground">
                    Nächste Sitzung:{' '}
                    <span className="font-medium text-foreground">
                      {latestCockpit.fields.naechste_sitzung.slice(0, 10)}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Noch kein Cockpit-Eintrag für diese Phase vorhanden.
              </p>
            )}
            <Button
              variant="outline"
              onClick={() => setCockpitDialogOpen(true)}
              className="gap-1.5"
            >
              <IconPlus size={15} />
              Neue Sitzung anlegen
            </Button>
            <RoadmapCockpitDialog
              open={cockpitDialogOpen}
              onClose={() => setCockpitDialogOpen(false)}
              onSubmit={async fields => {
                await LivingAppsService.createRoadmapCockpitEntry(fields);
                await fetchAll();
              }}
              defaultValues={cockpitDefaultValues}
              gruenderprofilList={gruenderprofil}
              phasenList={phasen}
              meilensteineList={meilensteine}
              enablePhotoScan={AI_PHOTO_SCAN['RoadmapCockpit']}
              enablePhotoLocation={AI_PHOTO_LOCATION['RoadmapCockpit']}
            />
          </div>
        </div>

        {/* Part B: Phase abschliessen */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
            <IconCircleCheck size={16} className="text-primary" />
            <span className="font-medium text-sm">Phase abschliessen</span>
          </div>
          <div className="p-4 space-y-3">
            {hasKoFailed && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                <IconAlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Achtung: Es gibt nicht erreichte KO-Kriterium-Meilensteine. Trotzdem fortfahren?
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {selectedPhase?.fields.phasen_name ?? 'Phase'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {msReached} von {msTotal} Meilensteinen erreicht
                  {latestReview?.fields.review_entscheidung
                    ? ` · Review: ${latestReview.fields.review_entscheidung.label}`
                    : ''}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {selectedPhase?.fields.phase_status?.label ?? 'Offen'}
              </Badge>
            </div>
            {closeError && (
              <p className="text-sm text-red-600">{closeError}</p>
            )}
            <Button
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
              disabled={phaseClosing}
              onClick={handlePhaseClose}
            >
              {phaseClosing ? (
                'Phase wird abgeschlossen...'
              ) : (
                <>
                  <IconCircleCheck size={18} stroke={2} />
                  Phase abschliessen
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="pt-2">
          <Button variant="outline" onClick={() => setCurrentStep(3)}>
            <IconArrowLeft size={15} className="mr-1.5" />
            Zurück
          </Button>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  // Context bar shown above step content when founder+phase are selected
  const contextBar =
    selectedGruender && selectedPhase ? (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2 mb-4 flex-wrap">
        <span>
          Gründer:{' '}
          <span className="font-medium text-foreground">
            {[selectedGruender.fields.vorname, selectedGruender.fields.nachname]
              .filter(Boolean)
              .join(' ')}
          </span>
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span>
          Phase:{' '}
          <span className="font-medium text-foreground">
            {selectedPhase.fields.phasen_name}
          </span>
        </span>
        {selectedPhase.fields.phase_ampel && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-1">
              {ampelDot(selectedPhase.fields.phase_ampel.key)}
              {selectedPhase.fields.phase_ampel.label}
            </span>
          </>
        )}
      </div>
    ) : null;

  return (
    <IntentWizardShell
      title="Phasen-Abschluss"
      subtitle="Meilensteine bewerten, Review dokumentieren und Phase formal abschliessen."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {currentStep > 1 && contextBar}
      {renderCurrentStep()}
    </IntentWizardShell>
  );
}
