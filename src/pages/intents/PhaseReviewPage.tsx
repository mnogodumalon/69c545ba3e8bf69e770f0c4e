import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Gruenderprofil, Phasen, Meilensteine, Aufgaben, ReviewPunkte, RoadmapCockpit } from '@/types/app';
import type { EnrichedMeilensteine, EnrichedAufgaben, EnrichedReviewPunkte, EnrichedRoadmapCockpit } from '@/types/enriched';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { enrichMeilensteine, enrichAufgaben, enrichReviewPunkte, enrichRoadmapCockpit } from '@/lib/enrich';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { GruenderprofilDialog } from '@/components/dialogs/GruenderprofilDialog';
import { PhasenDialog } from '@/components/dialogs/PhasenDialog';
import { MeilensteineDialog } from '@/components/dialogs/MeilensteineDialog';
import { AufgabenDialog } from '@/components/dialogs/AufgabenDialog';
import { ReviewPunkteDialog } from '@/components/dialogs/ReviewPunkteDialog';
import { RoadmapCockpitDialog } from '@/components/dialogs/RoadmapCockpitDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  IconUser,
  IconTarget,
  IconClipboardList,
  IconStar,
  IconRocket,
  IconPlus,
  IconPencil,
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconCircleCheck,
  IconAlertTriangle,
  IconX,
  IconFlag,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { id: 'gruender', label: 'Gruender' },
  { id: 'phase', label: 'Phase' },
  { id: 'meilensteine', label: 'Meilensteine' },
  { id: 'review', label: 'Review' },
  { id: 'cockpit', label: 'Cockpit' },
];

function ampelColor(key: string | undefined) {
  if (key === 'gruen') return 'bg-green-100 text-green-700';
  if (key === 'gelb') return 'bg-yellow-100 text-yellow-700';
  if (key === 'rot') return 'bg-red-100 text-red-700';
  return 'bg-muted text-muted-foreground';
}

function statusColor(key: string | undefined) {
  if (key === 'erreicht') return 'bg-green-100 text-green-700';
  if (key === 'in_arbeit') return 'bg-blue-100 text-blue-700';
  if (key === 'offen') return 'bg-amber-100 text-amber-700';
  if (key === 'nicht_erreicht') return 'bg-red-100 text-red-700';
  if (key === 'abgeschlossen') return 'bg-slate-100 text-slate-600';
  return 'bg-muted text-muted-foreground';
}

function aufgabeStatusColor(key: string | undefined) {
  if (key === 'erledigt') return 'bg-green-100 text-green-700';
  if (key === 'in_arbeit') return 'bg-blue-100 text-blue-700';
  if (key === 'offen') return 'bg-amber-100 text-amber-700';
  if (key === 'zurueckgestellt') return 'bg-slate-100 text-slate-600';
  return 'bg-muted text-muted-foreground';
}

function prioritaetColor(key: string | undefined) {
  if (key === 'hoch') return 'bg-red-100 text-red-700';
  if (key === 'mittel') return 'bg-yellow-100 text-yellow-700';
  if (key === 'niedrig') return 'bg-blue-100 text-blue-700';
  return 'bg-muted text-muted-foreground';
}

function entscheidungColor(key: string | undefined) {
  if (key === 'go') return 'bg-green-100 text-green-700 border-green-200';
  if (key === 'nachbessern') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (key === 'stop') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-muted text-muted-foreground';
}

function getLookupKey(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'object' && 'key' in (val as object)) return (val as { key: string }).key;
  if (typeof val === 'string') return val;
  return undefined;
}

function getLookupLabel(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'object' && 'label' in (val as object)) return (val as { label: string }).label;
  if (typeof val === 'string') return val;
  return '';
}

export default function PhaseReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Wizard state
  const initialStep = parseInt(searchParams.get('step') ?? '1', 10);
  const [currentStep, setCurrentStep] = useState<number>(
    initialStep >= 1 && initialStep <= 5 ? initialStep : 1
  );
  const [selectedGruenderId, setSelectedGruenderId] = useState<string | null>(
    searchParams.get('gruenderId') ?? null
  );
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(
    searchParams.get('phaseId') ?? null
  );

  // Data state
  const [gruenderprofil, setGruenderprofil] = useState<Gruenderprofil[]>([]);
  const [phasen, setPhasen] = useState<Phasen[]>([]);
  const [meilensteine, setMeilensteine] = useState<Meilensteine[]>([]);
  const [aufgaben, setAufgaben] = useState<Aufgaben[]>([]);
  const [reviewPunkte, setReviewPunkte] = useState<ReviewPunkte[]>([]);
  const [roadmapCockpit, setRoadmapCockpit] = useState<RoadmapCockpit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Dialog states
  const [gruenderDialogOpen, setGruenderDialogOpen] = useState(false);
  const [phasenDialogOpen, setPhasenDialogOpen] = useState(false);
  const [meilensteineDialogOpen, setMeilensteineDialogOpen] = useState(false);
  const [meilensteineEditRecord, setMeilensteineEditRecord] = useState<EnrichedMeilensteine | null>(null);
  const [aufgabenDialogOpen, setAufgabenDialogOpen] = useState(false);
  const [aufgabenEditRecord, setAufgabenEditRecord] = useState<EnrichedAufgaben | null>(null);
  const [aufgabenDefaultMeilensteinId, setAufgabenDefaultMeilensteinId] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewEditRecord, setReviewEditRecord] = useState<EnrichedReviewPunkte | null>(null);
  const [cockpitDialogOpen, setCockpitDialogOpen] = useState(false);

  // Step 3 — expanded milestones
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  // Step 5 — phase closed
  const [phaseClosed, setPhaseClosed] = useState(false);
  const [closingPhase, setClosingPhase] = useState(false);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [gData, pData, mData, aData, rData, cData] = await Promise.all([
        LivingAppsService.getGruenderprofil(),
        LivingAppsService.getPhasen(),
        LivingAppsService.getMeilensteine(),
        LivingAppsService.getAufgaben(),
        LivingAppsService.getReviewPunkte(),
        LivingAppsService.getRoadmapCockpit(),
      ]);
      setGruenderprofil(gData);
      setPhasen(pData);
      setMeilensteine(mData);
      setAufgaben(aData);
      setReviewPunkte(rData);
      setRoadmapCockpit(cData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Build lookup maps
  const gruenderprofilMap = useMemo(
    () => new Map(gruenderprofil.map(g => [g.record_id, g])),
    [gruenderprofil]
  );
  const phasenMap = useMemo(
    () => new Map(phasen.map(p => [p.record_id, p])),
    [phasen]
  );
  const meilensteineMap = useMemo(
    () => new Map(meilensteine.map(m => [m.record_id, m])),
    [meilensteine]
  );

  // Enriched data
  const enrichedMeilensteine = useMemo(
    () => enrichMeilensteine(meilensteine, { gruenderprofilMap, phasenMap }),
    [meilensteine, gruenderprofilMap, phasenMap]
  );
  const enrichedAufgaben = useMemo(
    () => enrichAufgaben(aufgaben, { gruenderprofilMap, phasenMap, meilensteineMap }),
    [aufgaben, gruenderprofilMap, phasenMap, meilensteineMap]
  );
  const enrichedReviewPunkte = useMemo(
    () => enrichReviewPunkte(reviewPunkte, { gruenderprofilMap, phasenMap }),
    [reviewPunkte, gruenderprofilMap, phasenMap]
  );
  const enrichedRoadmapCockpit = useMemo(
    () => enrichRoadmapCockpit(roadmapCockpit, { gruenderprofilMap, phasenMap, meilensteineMap }),
    [roadmapCockpit, gruenderprofilMap, phasenMap, meilensteineMap]
  );

  // Selected records
  const selectedGruender = selectedGruenderId ? gruenderprofilMap.get(selectedGruenderId) ?? null : null;
  const selectedPhase = selectedPhaseId ? phasenMap.get(selectedPhaseId) ?? null : null;

  // Filter meilensteine by selected phase
  const phaseMeilensteine = useMemo(() => {
    if (!selectedPhaseId) return [] as EnrichedMeilensteine[];
    return enrichedMeilensteine.filter(m => {
      const refId = extractRecordId(m.fields.phase_ref);
      return refId === selectedPhaseId;
    });
  }, [enrichedMeilensteine, selectedPhaseId]);

  // Filter aufgaben by selected phase
  const phaseAufgaben = useMemo(() => {
    if (!selectedPhaseId) return [] as EnrichedAufgaben[];
    return enrichedAufgaben.filter(a => {
      const refId = extractRecordId(a.fields.phase_ref);
      return refId === selectedPhaseId;
    });
  }, [enrichedAufgaben, selectedPhaseId]);

  // Review for current phase/gruender
  const phaseReview = useMemo(() => {
    if (!selectedPhaseId || !selectedGruenderId) return null;
    return enrichedReviewPunkte.find(r => {
      const phaseId = extractRecordId(r.fields.phase_ref);
      const gruenderId = extractRecordId(r.fields.gruender_ref);
      return phaseId === selectedPhaseId && gruenderId === selectedGruenderId;
    }) ?? null;
  }, [enrichedReviewPunkte, selectedPhaseId, selectedGruenderId]);

  // Cockpit entries for current phase
  const phaseCockpitEntries = useMemo(() => {
    if (!selectedPhaseId) return [] as EnrichedRoadmapCockpit[];
    return enrichedRoadmapCockpit.filter(c => {
      const phaseId = extractRecordId(c.fields.phase_ref);
      return phaseId === selectedPhaseId;
    });
  }, [enrichedRoadmapCockpit, selectedPhaseId]);

  // Summary stats for step 3
  const msReachedCount = phaseMeilensteine.filter(
    m => getLookupKey(m.fields.ms_status) === 'erreicht'
  ).length;
  const aufgabenErledigtCount = phaseAufgaben.filter(
    a => getLookupKey(a.fields.aufgabe_status) === 'erledigt'
  ).length;

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (currentStep > 1) params.set('step', String(currentStep));
    else params.delete('step');
    if (selectedGruenderId) params.set('gruenderId', selectedGruenderId);
    else params.delete('gruenderId');
    if (selectedPhaseId) params.set('phaseId', selectedPhaseId);
    else params.delete('phaseId');
    setSearchParams(params, { replace: true });
  }, [currentStep, selectedGruenderId, selectedPhaseId, searchParams, setSearchParams]);

  const goToStep = (step: number) => setCurrentStep(step);

  const gruenderName = selectedGruender
    ? `${selectedGruender.fields.vorname ?? ''} ${selectedGruender.fields.nachname ?? ''}`.trim()
    : '';

  // ---- Step 1: Gruender auswaehlen ----
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <IconUser size={16} className="text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Gruender auswaehlen</h2>
          <p className="text-xs text-muted-foreground">Waehlen Sie das Gruenderprofil aus, das Sie reviewen moechten.</p>
        </div>
      </div>

      <EntitySelectStep
        items={gruenderprofil.map(g => ({
          id: g.record_id,
          title: `${g.fields.vorname ?? ''} ${g.fields.nachname ?? ''}${g.fields.projektname ? ' – ' + g.fields.projektname : ''}`.trim(),
          subtitle: getLookupLabel(g.fields.branche) || undefined,
          icon: <IconUser size={16} className="text-primary" />,
        }))}
        onSelect={(id) => setSelectedGruenderId(id)}
        searchPlaceholder="Gruender suchen..."
        emptyText="Keine Gruenderprofile gefunden."
        emptyIcon={<IconUser size={32} />}
        createLabel="Neues Gruenderprofil"
        onCreateNew={() => setGruenderDialogOpen(true)}
        createDialog={
          <GruenderprofilDialog
            open={gruenderDialogOpen}
            onClose={() => setGruenderDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createGruenderprofilEntry(fields);
              await fetchAll();
            }}
            enablePhotoScan={AI_PHOTO_SCAN['Gruenderprofil']}
          />
        }
      />

      {selectedGruender && (
        <Card className="border-primary/20 bg-primary/5 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconUser size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{gruenderName}</p>
                {selectedGruender.fields.projektname && (
                  <p className="text-sm text-muted-foreground truncate">{selectedGruender.fields.projektname}</p>
                )}
                {selectedGruender.fields.branche && (
                  <p className="text-xs text-muted-foreground">{getLookupLabel(selectedGruender.fields.branche)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end pt-2">
        <Button
          onClick={() => goToStep(2)}
          disabled={!selectedGruenderId}
        >
          Weiter
        </Button>
      </div>
    </div>
  );

  // ---- Step 2: Phase auswaehlen ----
  const renderStep2 = () => {
    const sortedPhasen = [...phasen].sort((a, b) => (a.fields.phasen_nr ?? 0) - (b.fields.phasen_nr ?? 0));
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconTarget size={16} className="text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Phase auswaehlen</h2>
            <p className="text-xs text-muted-foreground">
              Gruender: <span className="font-medium text-foreground">{gruenderName}</span>
            </p>
          </div>
        </div>

        <EntitySelectStep
          items={sortedPhasen.map(p => ({
            id: p.record_id,
            title: p.fields.phasen_name ?? `Phase ${p.fields.phasen_nr ?? ''}`,
            subtitle: p.fields.phasen_ziel || undefined,
            status: p.fields.phase_status
              ? { key: getLookupKey(p.fields.phase_status) ?? '', label: getLookupLabel(p.fields.phase_status) }
              : undefined,
            icon: <IconTarget size={16} className="text-primary" />,
          }))}
          onSelect={(id) => setSelectedPhaseId(id)}
          searchPlaceholder="Phase suchen..."
          emptyText="Keine Phasen gefunden."
          emptyIcon={<IconTarget size={32} />}
          createLabel="Neue Phase"
          onCreateNew={() => setPhasenDialogOpen(true)}
          createDialog={
            <PhasenDialog
              open={phasenDialogOpen}
              onClose={() => setPhasenDialogOpen(false)}
              onSubmit={async (fields) => {
                await LivingAppsService.createPhasenEntry(fields);
                await fetchAll();
              }}
              enablePhotoScan={AI_PHOTO_SCAN['Phasen']}
            />
          }
        />

        {selectedPhase && (
          <Card className="border-primary/20 bg-primary/5 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <IconTarget size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground truncate">
                      {selectedPhase.fields.phasen_name}
                    </p>
                    {selectedPhase.fields.phase_ampel && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ampelColor(getLookupKey(selectedPhase.fields.phase_ampel))}`}>
                        {getLookupLabel(selectedPhase.fields.phase_ampel)}
                      </span>
                    )}
                    {selectedPhase.fields.phase_status && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusColor(getLookupKey(selectedPhase.fields.phase_status))}`}>
                        {getLookupLabel(selectedPhase.fields.phase_status)}
                      </span>
                    )}
                  </div>
                  {selectedPhase.fields.phasen_ziel && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{selectedPhase.fields.phasen_ziel}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => goToStep(1)}>Zurueck</Button>
          <Button onClick={() => goToStep(3)} disabled={!selectedPhaseId}>Weiter</Button>
        </div>
      </div>
    );
  };

  // ---- Step 3: Meilensteine & Aufgaben ----
  const renderStep3 = () => {
    const toggleExpand = (id: string) => {
      setExpandedMilestones(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconClipboardList size={16} className="text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Meilensteine &amp; Aufgaben pruefen</h2>
            <p className="text-xs text-muted-foreground">
              {gruenderName} &bull; {selectedPhase?.fields.phasen_name}
            </p>
          </div>
        </div>

        {/* Summary bar */}
        <div className="flex gap-4 p-3 rounded-xl bg-muted/50 border text-sm flex-wrap">
          <span className="text-muted-foreground">
            Meilensteine:{' '}
            <span className="font-semibold text-foreground">{msReachedCount}/{phaseMeilensteine.length} erreicht</span>
          </span>
          <span className="text-muted-foreground">
            Aufgaben:{' '}
            <span className="font-semibold text-foreground">{aufgabenErledigtCount}/{phaseAufgaben.length} erledigt</span>
          </span>
        </div>

        {/* New Milestone button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMeilensteineEditRecord(null);
              setMeilensteineDialogOpen(true);
            }}
            className="gap-1.5"
          >
            <IconPlus size={14} />
            Neuer Meilenstein
          </Button>
        </div>

        {/* Meilensteine list */}
        {phaseMeilensteine.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-xl">
            <IconClipboardList size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Keine Meilensteine fuer diese Phase.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {phaseMeilensteine.map(ms => {
              const msAufgaben = phaseAufgaben.filter(a => {
                const msId = extractRecordId(a.fields.meilenstein_ref);
                return msId === ms.record_id;
              });
              const isExpanded = expandedMilestones.has(ms.record_id);
              return (
                <Card key={ms.record_id} className="overflow-hidden">
                  <CardHeader className="p-4 pb-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-sm font-semibold truncate">
                            {ms.fields.meilenstein_titel ?? 'Ohne Titel'}
                          </CardTitle>
                          {ms.fields.ms_status && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusColor(getLookupKey(ms.fields.ms_status))}`}>
                              {getLookupLabel(ms.fields.ms_status)}
                            </span>
                          )}
                          {ms.fields.ms_ampel && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ampelColor(getLookupKey(ms.fields.ms_ampel))}`}>
                              {getLookupLabel(ms.fields.ms_ampel)}
                            </span>
                          )}
                        </div>
                        {ms.fields.zieltermin && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Zieltermin: {formatDate(ms.fields.zieltermin)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMeilensteineEditRecord(ms);
                            setMeilensteineDialogOpen(true);
                          }}
                          className="h-7 w-7 p-0"
                          title="Meilenstein bearbeiten"
                        >
                          <IconPencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(ms.record_id)}
                          className="h-7 w-7 p-0"
                          title={isExpanded ? 'Aufgaben ausblenden' : 'Aufgaben anzeigen'}
                        >
                          {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="p-4 pt-3">
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Aufgaben ({msAufgaben.length})
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAufgabenEditRecord(null);
                              setAufgabenDefaultMeilensteinId(ms.record_id);
                              setAufgabenDialogOpen(true);
                            }}
                            className="h-6 text-xs gap-1 px-2"
                          >
                            <IconPlus size={11} />
                            Neue Aufgabe
                          </Button>
                        </div>

                        {msAufgaben.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Keine Aufgaben fuer diesen Meilenstein.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {msAufgaben.map(a => (
                              <div
                                key={a.record_id}
                                className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 overflow-hidden"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-medium truncate">
                                      {a.fields.aufgabe_titel ?? 'Ohne Titel'}
                                    </span>
                                    {a.fields.aufgabe_status && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${aufgabeStatusColor(getLookupKey(a.fields.aufgabe_status))}`}>
                                        {getLookupLabel(a.fields.aufgabe_status)}
                                      </span>
                                    )}
                                    {a.fields.prioritaet && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${prioritaetColor(getLookupKey(a.fields.prioritaet))}`}>
                                        {getLookupLabel(a.fields.prioritaet)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setAufgabenEditRecord(a);
                                    setAufgabenDefaultMeilensteinId(null);
                                    setAufgabenDialogOpen(true);
                                  }}
                                  className="h-6 w-6 p-0 shrink-0"
                                  title="Aufgabe bearbeiten"
                                >
                                  <IconPencil size={11} />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialogs */}
        <MeilensteineDialog
          open={meilensteineDialogOpen}
          onClose={() => { setMeilensteineDialogOpen(false); setMeilensteineEditRecord(null); }}
          onSubmit={async (fields) => {
            if (meilensteineEditRecord) {
              await LivingAppsService.updateMeilensteineEntry(meilensteineEditRecord.record_id, fields);
            } else {
              await LivingAppsService.createMeilensteineEntry(fields);
            }
            await fetchAll();
          }}
          defaultValues={
            meilensteineEditRecord
              ? meilensteineEditRecord.fields
              : selectedPhaseId && selectedGruenderId
                ? {
                    phase_ref: createRecordUrl(APP_IDS.PHASEN, selectedPhaseId),
                    gruender_ref: createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruenderId),
                  }
                : undefined
          }
          gruenderprofilList={gruenderprofil}
          phasenList={phasen}
          enablePhotoScan={AI_PHOTO_SCAN['Meilensteine']}
        />

        <AufgabenDialog
          open={aufgabenDialogOpen}
          onClose={() => { setAufgabenDialogOpen(false); setAufgabenEditRecord(null); setAufgabenDefaultMeilensteinId(null); }}
          onSubmit={async (fields) => {
            if (aufgabenEditRecord) {
              await LivingAppsService.updateAufgabenEntry(aufgabenEditRecord.record_id, fields);
            } else {
              await LivingAppsService.createAufgabenEntry(fields);
            }
            await fetchAll();
          }}
          defaultValues={
            aufgabenEditRecord
              ? aufgabenEditRecord.fields
              : selectedPhaseId && selectedGruenderId
                ? {
                    phase_ref: createRecordUrl(APP_IDS.PHASEN, selectedPhaseId),
                    gruender_ref: createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruenderId),
                    ...(aufgabenDefaultMeilensteinId
                      ? { meilenstein_ref: createRecordUrl(APP_IDS.MEILENSTEINE, aufgabenDefaultMeilensteinId) }
                      : {}),
                  }
                : undefined
          }
          gruenderprofilList={gruenderprofil}
          phasenList={phasen}
          meilensteineList={meilensteine}
          enablePhotoScan={AI_PHOTO_SCAN['Aufgaben']}
        />

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => goToStep(2)}>Zurueck</Button>
          <Button onClick={() => goToStep(4)}>Weiter</Button>
        </div>
      </div>
    );
  };

  // ---- Step 4: Review durchfuehren ----
  const renderStep4 = () => {
    const entscheidungKey = phaseReview ? getLookupKey(phaseReview.fields.review_entscheidung) : undefined;
    const entscheidungLabel = phaseReview ? getLookupLabel(phaseReview.fields.review_entscheidung) : '';

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconStar size={16} className="text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Review durchfuehren</h2>
            <p className="text-xs text-muted-foreground">
              {gruenderName} &bull; {selectedPhase?.fields.phasen_name}
            </p>
          </div>
        </div>

        {phaseReview ? (
          <Card className="overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm font-semibold">Bestehendes Review</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReviewEditRecord(phaseReview);
                    setReviewDialogOpen(true);
                  }}
                  className="gap-1.5 h-7 text-xs"
                >
                  <IconPencil size={12} />
                  Bearbeiten
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
              {phaseReview.fields.review_datum && (
                <p className="text-xs text-muted-foreground">
                  Datum: <span className="font-medium text-foreground">{formatDate(phaseReview.fields.review_datum)}</span>
                </p>
              )}
              {phaseReview.fields.warnsignale && Array.isArray(phaseReview.fields.warnsignale) && phaseReview.fields.warnsignale.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Warnsignale:</p>
                  <div className="flex flex-wrap gap-1">
                    {(phaseReview.fields.warnsignale as Array<{ key: string; label: string }>).map((w, i) => (
                      <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100">
                        {w.label ?? w.key}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {phaseReview.fields.berater_empfehlung && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Berater-Empfehlung:</p>
                  <p className="text-sm text-foreground line-clamp-3">{phaseReview.fields.berater_empfehlung}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-dashed">
            <CardContent className="p-6 text-center">
              <IconStar size={32} className="mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground mb-4">Noch kein Review fuer diese Phase vorhanden.</p>
              <Button
                onClick={() => {
                  setReviewEditRecord(null);
                  setReviewDialogOpen(true);
                }}
                className="gap-1.5"
              >
                <IconPlus size={15} />
                Review erstellen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Entscheidung prominent display */}
        {phaseReview && entscheidungKey && (
          <div className={`p-4 rounded-xl border-2 ${entscheidungColor(entscheidungKey)}`}>
            <div className="flex items-center gap-3">
              {entscheidungKey === 'go' && <IconCircleCheck size={24} />}
              {entscheidungKey === 'nachbessern' && <IconAlertTriangle size={24} />}
              {entscheidungKey === 'stop' && <IconX size={24} />}
              <div>
                <p className="font-semibold">Review-Entscheidung</p>
                <p className="text-sm">{entscheidungLabel}</p>
              </div>
            </div>
          </div>
        )}

        {/* Review dialog */}
        <ReviewPunkteDialog
          open={reviewDialogOpen}
          onClose={() => { setReviewDialogOpen(false); setReviewEditRecord(null); }}
          onSubmit={async (fields) => {
            if (reviewEditRecord) {
              await LivingAppsService.updateReviewPunkteEntry(reviewEditRecord.record_id, fields);
            } else {
              await LivingAppsService.createReviewPunkteEntry(fields);
            }
            await fetchAll();
          }}
          defaultValues={
            reviewEditRecord
              ? reviewEditRecord.fields
              : selectedPhaseId && selectedGruenderId
                ? {
                    phase_ref: createRecordUrl(APP_IDS.PHASEN, selectedPhaseId),
                    gruender_ref: createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruenderId),
                  }
                : undefined
          }
          gruenderprofilList={gruenderprofil}
          phasenList={phasen}
          enablePhotoScan={AI_PHOTO_SCAN['ReviewPunkte']}
        />

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => goToStep(3)}>Zurueck</Button>
          <Button onClick={() => goToStep(5)}>Weiter</Button>
        </div>
      </div>
    );
  };

  // ---- Step 5: Cockpit-Eintrag ----
  const renderStep5 = () => {
    const reviewDone = phaseReview !== null;
    const cockpitDone = phaseCockpitEntries.length > 0;

    const handleClosePhase = async () => {
      if (!selectedPhaseId) return;
      setClosingPhase(true);
      try {
        await LivingAppsService.updatePhasenEntry(selectedPhaseId, { phase_status: 'abgeschlossen' });
        await fetchAll();
        setPhaseClosed(true);
      } finally {
        setClosingPhase(false);
      }
    };

    const phaseAlreadyClosed = getLookupKey(selectedPhase?.fields.phase_status) === 'abgeschlossen';

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconRocket size={16} className="text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Cockpit-Eintrag erstellen</h2>
            <p className="text-xs text-muted-foreground">
              {gruenderName} &bull; {selectedPhase?.fields.phasen_name}
            </p>
          </div>
        </div>

        {/* Create cockpit entry */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-medium text-sm">Sitzungseintrag</p>
                <p className="text-xs text-muted-foreground">Cockpit-Eintrag fuer diese Review-Sitzung</p>
              </div>
              <Button
                onClick={() => setCockpitDialogOpen(true)}
                className="gap-1.5 shrink-0"
              >
                <IconPlus size={15} />
                Sitzungseintrag erstellen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing cockpit entries */}
        {phaseCockpitEntries.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Bisherige Eintraege ({phaseCockpitEntries.length})
            </h3>
            {phaseCockpitEntries.map(entry => (
              <Card key={entry.record_id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.fields.sitzungsdatum && (
                          <span className="text-sm font-medium">{formatDate(entry.fields.sitzungsdatum)}</span>
                        )}
                        {entry.fields.phase_ampel_aktuell && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ampelColor(getLookupKey(entry.fields.phase_ampel_aktuell))}`}>
                            {getLookupLabel(entry.fields.phase_ampel_aktuell)}
                          </span>
                        )}
                      </div>
                      {entry.fields.naechste_schritte && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {entry.fields.naechste_schritte}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Completion checklist */}
        <Card className="overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">Review-Checkliste</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {[
              { label: `${phaseMeilensteine.length} Meilensteine geprueft`, done: phaseMeilensteine.length > 0 },
              { label: `${phaseAufgaben.length} Aufgaben geprueft`, done: phaseAufgaben.length > 0 },
              { label: 'Review durchgefuehrt', done: reviewDone },
              { label: 'Cockpit-Eintrag erstellt', done: cockpitDone },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                  {item.done ? <IconCheck size={11} stroke={3} /> : <span className="text-xs">{i + 1}</span>}
                </div>
                <span className={`text-sm ${item.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Close phase */}
        {(phaseClosed || phaseAlreadyClosed) ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700">
            <IconCircleCheck size={20} />
            <div>
              <p className="font-semibold text-sm">Phase abgeschlossen</p>
              <p className="text-xs">Der Status der Phase wurde auf "Abgeschlossen" gesetzt.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl border bg-card flex-wrap">
            <div>
              <p className="font-medium text-sm flex items-center gap-1.5">
                <IconFlag size={15} className="text-muted-foreground" />
                Phase abschliessen
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Setzt den Status der Phase auf "Abgeschlossen".
              </p>
            </div>
            <Button
              variant="default"
              onClick={handleClosePhase}
              disabled={closingPhase}
              className="shrink-0 gap-1.5"
            >
              {closingPhase ? (
                <>Wird gesetzt...</>
              ) : (
                <>
                  <IconCheck size={15} />
                  Phase abschliessen
                </>
              )}
            </Button>
          </div>
        )}

        {/* Cockpit dialog */}
        <RoadmapCockpitDialog
          open={cockpitDialogOpen}
          onClose={() => setCockpitDialogOpen(false)}
          onSubmit={async (fields) => {
            await LivingAppsService.createRoadmapCockpitEntry(fields);
            await fetchAll();
          }}
          defaultValues={
            selectedPhaseId && selectedGruenderId
              ? {
                  phase_ref: createRecordUrl(APP_IDS.PHASEN, selectedPhaseId),
                  gruender_ref: createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruenderId),
                }
              : undefined
          }
          gruenderprofilList={gruenderprofil}
          phasenList={phasen}
          meilensteineList={meilensteine}
          enablePhotoScan={AI_PHOTO_SCAN['RoadmapCockpit']}
        />

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => goToStep(4)}>Zurueck</Button>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <IntentWizardShell
      title="Phasen-Review"
      subtitle="Fuehren Sie einen strukturierten Phasen-Review mit Meilensteinen, Aufgaben und Entscheidung durch."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={goToStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {renderCurrentStep()}
    </IntentWizardShell>
  );
}
