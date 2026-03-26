import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Gruenderprofil, Phasen, Meilensteine, Aufgaben } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { GruenderprofilDialog } from '@/components/dialogs/GruenderprofilDialog';
import { PhasenDialog } from '@/components/dialogs/PhasenDialog';
import { MeilensteineDialog } from '@/components/dialogs/MeilensteineDialog';
import { AufgabenDialog } from '@/components/dialogs/AufgabenDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import {
  IconPlus,
  IconTrash,
  IconArrowRight,
  IconArrowLeft,
  IconCheck,
  IconFlag,
  IconTarget,
  IconUser,
  IconChevronDown,
  IconChevronRight,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Gründer wählen' },
  { label: 'Phase wählen' },
  { label: 'Meilensteine' },
  { label: 'Aufgaben & Abschluss' },
];

const MS_STATUS_COLORS: Record<string, string> = {
  offen: 'bg-amber-100 text-amber-700',
  in_arbeit: 'bg-blue-100 text-blue-700',
  erreicht: 'bg-green-100 text-green-700',
  nicht_erreicht: 'bg-red-100 text-red-700',
};

const AUFGABE_STATUS_COLORS: Record<string, string> = {
  offen: 'bg-amber-100 text-amber-700',
  in_arbeit: 'bg-blue-100 text-blue-700',
  erledigt: 'bg-green-100 text-green-700',
  zurueckgestellt: 'bg-slate-100 text-slate-600',
};

const PRIORITAET_COLORS: Record<string, string> = {
  hoch: 'bg-red-500',
  mittel: 'bg-yellow-500',
  niedrig: 'bg-green-500',
};


export default function PhasenSetupPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Wizard step state (1-indexed)
  const initialStep = parseInt(searchParams.get('step') ?? '1', 10);
  const [currentStep, setCurrentStep] = useState(
    initialStep >= 1 && initialStep <= 4 ? initialStep : 1
  );

  // Selection state
  const [selectedGruenderId, setSelectedGruenderId] = useState<string | null>(
    searchParams.get('gruenderId')
  );
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(
    searchParams.get('phaseId')
  );

  // Data state
  const [gruenderprofil, setGruenderprofil] = useState<Gruenderprofil[]>([]);
  const [phasen, setPhasen] = useState<Phasen[]>([]);
  const [meilensteine, setMeilensteine] = useState<Meilensteine[]>([]);
  const [aufgaben, setAufgaben] = useState<Aufgaben[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Dialog open state
  const [gruenderDialogOpen, setGruenderDialogOpen] = useState(false);
  const [phasenDialogOpen, setPhasenDialogOpen] = useState(false);
  const [meilensteinDialogOpen, setMeilensteinDialogOpen] = useState(false);
  const [aufgabeDialogOpen, setAufgabeDialogOpen] = useState(false);
  const [aufgabeForMeilensteinId, setAufgabeForMeilensteinId] = useState<string | null>(null);

  // Step 4 expanded milestones
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  // Completion state
  const [completed, setCompleted] = useState(false);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const [g, p, m, a] = await Promise.all([
        LivingAppsService.getGruenderprofil(),
        LivingAppsService.getPhasen(),
        LivingAppsService.getMeilensteine(),
        LivingAppsService.getAufgaben(),
      ]);
      setGruenderprofil(g);
      setPhasen(p);
      setMeilensteine(m);
      setAufgaben(a);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Sync URL params when step/selection changes
  useEffect(() => {
    const params: Record<string, string> = { step: String(currentStep) };
    if (selectedGruenderId) params.gruenderId = selectedGruenderId;
    if (selectedPhaseId) params.phaseId = selectedPhaseId;
    setSearchParams(params, { replace: true });
  }, [currentStep, selectedGruenderId, selectedPhaseId, setSearchParams]);

  // Derived data
  const selectedGruender = useMemo(
    () => gruenderprofil.find(g => g.record_id === selectedGruenderId) ?? null,
    [gruenderprofil, selectedGruenderId]
  );

  const selectedPhase = useMemo(
    () => phasen.find(p => p.record_id === selectedPhaseId) ?? null,
    [phasen, selectedPhaseId]
  );

  const phaseUrl = selectedPhaseId
    ? createRecordUrl(APP_IDS.PHASEN, selectedPhaseId)
    : null;

  const phaseMilestones = useMemo(
    () =>
      meilensteine.filter(
        m => m.fields.phase_ref && extractRecordId(m.fields.phase_ref) === selectedPhaseId
      ),
    [meilensteine, selectedPhaseId]
  );

  const phaseAufgaben = useMemo(
    () =>
      aufgaben.filter(
        a => a.fields.phase_ref && extractRecordId(a.fields.phase_ref) === selectedPhaseId
      ),
    [aufgaben, selectedPhaseId]
  );

  const totalAufgabenCount = phaseAufgaben.length;

  const aufgabenByPriority = useMemo(() => {
    return {
      hoch: phaseAufgaben.filter(a => {
        const p = a.fields.prioritaet;
        return (typeof p === 'string' ? p : p?.key) === 'hoch';
      }).length,
      mittel: phaseAufgaben.filter(a => {
        const p = a.fields.prioritaet;
        return (typeof p === 'string' ? p : p?.key) === 'mittel';
      }).length,
      niedrig: phaseAufgaben.filter(a => {
        const p = a.fields.prioritaet;
        return (typeof p === 'string' ? p : p?.key) === 'niedrig';
      }).length,
    };
  }, [phaseAufgaben]);

  // Sorted phasen by phasen_nr
  const sortedPhasen = useMemo(
    () => [...phasen].sort((a, b) => (a.fields.phasen_nr ?? 0) - (b.fields.phasen_nr ?? 0)),
    [phasen]
  );

  // Helpers
  function getAufgabenForMilestone(milesteinId: string): Aufgaben[] {
    return phaseAufgaben.filter(
      a => a.fields.meilenstein_ref && extractRecordId(a.fields.meilenstein_ref) === milesteinId
    );
  }

  function getAufgabenWithoutMilestone(): Aufgaben[] {
    return phaseAufgaben.filter(a => !a.fields.meilenstein_ref);
  }

  function toggleMilestone(id: string) {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function getMsStatusLabel(ms: Meilensteine): string {
    const s = ms.fields.ms_status;
    if (!s) return 'Offen';
    return typeof s === 'string' ? s : s.label;
  }

  function getMsStatusKey(ms: Meilensteine): string {
    const s = ms.fields.ms_status;
    if (!s) return 'offen';
    return typeof s === 'string' ? s : s.key;
  }

  function getAufgabeStatusKey(a: Aufgaben): string {
    const s = a.fields.aufgabe_status;
    if (!s) return 'offen';
    return typeof s === 'string' ? s : s.key;
  }

  function getAufgabeStatusLabel(a: Aufgaben): string {
    const s = a.fields.aufgabe_status;
    if (!s) return 'Offen';
    return typeof s === 'string' ? s : s.label;
  }

  function getAufgabePrioritaetKey(a: Aufgaben): string | null {
    const p = a.fields.prioritaet;
    if (!p) return null;
    return typeof p === 'string' ? p : p.key;
  }

  function getPhaseStatusKey(p: Phasen): string {
    const s = p.fields.phase_status;
    if (!s) return 'offen';
    return typeof s === 'string' ? s : s.key;
  }

  function getPhaseStatusLabel(p: Phasen): string {
    const s = p.fields.phase_status;
    if (!s) return 'Offen';
    return typeof s === 'string' ? s : s.label;
  }

  // Milestone defaultValues for the dialog
  const milestoneDefaultValues = useMemo(() => {
    if (!selectedGruenderId || !selectedPhaseId) return undefined;
    return {
      gruender_ref: createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruenderId),
      phase_ref: createRecordUrl(APP_IDS.PHASEN, selectedPhaseId),
    };
  }, [selectedGruenderId, selectedPhaseId]);

  // Aufgabe defaultValues — when opening for a specific milestone
  const aufgabeDefaultValues = useMemo(() => {
    if (!selectedGruenderId || !selectedPhaseId) return undefined;
    const base: Aufgaben['fields'] = {
      gruender_ref: createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruenderId),
      phase_ref: createRecordUrl(APP_IDS.PHASEN, selectedPhaseId),
    };
    if (aufgabeForMeilensteinId) {
      base.meilenstein_ref = createRecordUrl(APP_IDS.MEILENSTEINE, aufgabeForMeilensteinId);
    }
    return base;
  }, [selectedGruenderId, selectedPhaseId, aufgabeForMeilensteinId]);

  // Step navigation
  function handleStepChange(step: number) {
    setCurrentStep(step);
  }

  function handleGruenderSelect(id: string) {
    setSelectedGruenderId(id);
    setCurrentStep(2);
  }

  function handlePhaseSelect(id: string) {
    setSelectedPhaseId(id);
    setCurrentStep(3);
  }

  // ---- Render steps ----

  function renderStep1() {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-4 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconUser size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Gründer auswählen</h2>
              <p className="text-xs text-muted-foreground">Wählen Sie den Gründer, dem diese Phase zugeordnet wird</p>
            </div>
          </div>
          <EntitySelectStep
            items={gruenderprofil.map(g => ({
              id: g.record_id,
              title: [g.fields.vorname, g.fields.nachname].filter(Boolean).join(' ') || g.record_id,
              subtitle: g.fields.projektname ?? (
                typeof g.fields.branche === 'object' && g.fields.branche !== null
                  ? g.fields.branche.label
                  : g.fields.branche ?? undefined
              ),
              icon: <IconUser size={16} className="text-primary" />,
            }))}
            onSelect={handleGruenderSelect}
            searchPlaceholder="Gründer suchen..."
            emptyText="Noch keine Gründerprofile vorhanden."
            createLabel="Neuen Gründer anlegen"
            onCreateNew={() => setGruenderDialogOpen(true)}
            createDialog={
              <GruenderprofilDialog
                open={gruenderDialogOpen}
                onClose={() => setGruenderDialogOpen(false)}
                onSubmit={async (fields) => {
                  const result = await LivingAppsService.createGruenderprofilEntry(fields);
                  await fetchAll();
                  // Auto-select newly created record
                  if (result && typeof result === 'object' && 'id' in result) {
                    handleGruenderSelect(result.id as string);
                  }
                }}
                enablePhotoScan={AI_PHOTO_SCAN['Gruenderprofil']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Gruenderprofil']}
              />
            }
          />
        </div>
      </div>
    );
  }

  function renderStep2() {
    const gruenderName = selectedGruender
      ? [selectedGruender.fields.vorname, selectedGruender.fields.nachname].filter(Boolean).join(' ')
      : 'Unbekannt';

    return (
      <div className="space-y-4">
        {/* Context banner */}
        <div className="rounded-xl border bg-muted/40 px-4 py-3 flex items-center gap-2 text-sm">
          <IconUser size={14} className="text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Gründer:</span>
          <span className="font-medium">{gruenderName}</span>
          <button
            onClick={() => setCurrentStep(1)}
            className="ml-auto text-xs text-primary underline-offset-2 hover:underline"
          >
            Ändern
          </button>
        </div>

        <div className="rounded-2xl border bg-card p-4 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconFlag size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Phase auswählen</h2>
              <p className="text-xs text-muted-foreground">Welche Phase soll befüllt werden?</p>
            </div>
          </div>
          <EntitySelectStep
            items={sortedPhasen.map(p => ({
              id: p.record_id,
              title: p.fields.phasen_name ?? `Phase ${p.fields.phasen_nr ?? '?'}`,
              subtitle: `Phase ${p.fields.phasen_nr ?? '?'}`,
              status: p.fields.phase_status
                ? {
                    key: getPhaseStatusKey(p),
                    label: getPhaseStatusLabel(p),
                  }
                : undefined,
            }))}
            onSelect={handlePhaseSelect}
            searchPlaceholder="Phase suchen..."
            emptyText="Noch keine Phasen vorhanden."
            createLabel="Neue Phase anlegen"
            onCreateNew={() => setPhasenDialogOpen(true)}
            createDialog={
              <PhasenDialog
                open={phasenDialogOpen}
                onClose={() => setPhasenDialogOpen(false)}
                onSubmit={async (fields) => {
                  const result = await LivingAppsService.createPhasenEntry(fields);
                  await fetchAll();
                  if (result && typeof result === 'object' && 'id' in result) {
                    handlePhaseSelect(result.id as string);
                  }
                }}
                enablePhotoScan={AI_PHOTO_SCAN['Phasen']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Phasen']}
              />
            }
          />
        </div>

        <div className="flex justify-start">
          <Button variant="outline" onClick={() => setCurrentStep(1)}>
            <IconArrowLeft size={16} stroke={2} className="mr-2" />
            Zurück
          </Button>
        </div>
      </div>
    );
  }

  function renderStep3() {
    const gruenderName = selectedGruender
      ? [selectedGruender.fields.vorname, selectedGruender.fields.nachname].filter(Boolean).join(' ')
      : 'Unbekannt';
    const phaseName = selectedPhase?.fields.phasen_name ?? `Phase ${selectedPhase?.fields.phasen_nr ?? '?'}`;

    return (
      <div className="space-y-4">
        {/* Context banner */}
        <div className="rounded-xl border bg-muted/40 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <IconUser size={13} className="shrink-0" />
            <span className="font-medium text-foreground">{gruenderName}</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <IconFlag size={13} className="shrink-0" />
            <span className="font-medium text-foreground">{phaseName}</span>
          </span>
        </div>

        <div className="rounded-2xl border bg-card p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconTarget size={16} className="text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">Meilensteine</h2>
                <p className="text-xs text-muted-foreground">Legen Sie die Meilensteine für diese Phase an</p>
              </div>
            </div>
            <Button
              onClick={() => setMeilensteinDialogOpen(true)}
              size="sm"
              className="gap-1.5 shrink-0"
            >
              <IconPlus size={15} stroke={2} />
              Meilenstein hinzufügen
            </Button>
          </div>

          {/* Milestone list */}
          {phaseMilestones.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <IconTarget size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Noch keine Meilensteine angelegt.</p>
              <p className="text-xs mt-1">Klicken Sie auf "Meilenstein hinzufügen", um zu starten.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {phaseMilestones.map(ms => (
                <div
                  key={ms.record_id}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30 overflow-hidden"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {ms.fields.meilenstein_titel ?? 'Unbenannter Meilenstein'}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                          MS_STATUS_COLORS[getMsStatusKey(ms)] ?? 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {getMsStatusLabel(ms)}
                      </span>
                    </div>
                    {ms.fields.zieltermin && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Zieltermin: {ms.fields.zieltermin}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      await LivingAppsService.deleteMeilensteineEntry(ms.record_id);
                      await fetchAll();
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    title="Meilenstein löschen"
                  >
                    <IconTrash size={15} stroke={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Counter */}
          <div className="mt-4 pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{phaseMilestones.length}</span>{' '}
              {phaseMilestones.length === 1 ? 'Meilenstein angelegt' : 'Meilensteine angelegt'}
            </p>
          </div>
        </div>

        {/* Dialog */}
        <MeilensteineDialog
          open={meilensteinDialogOpen}
          onClose={() => setMeilensteinDialogOpen(false)}
          onSubmit={async (fields) => {
            await LivingAppsService.createMeilensteineEntry(fields);
            await fetchAll();
          }}
          defaultValues={milestoneDefaultValues}
          gruenderprofilList={gruenderprofil}
          phasenList={phasen}
          enablePhotoScan={AI_PHOTO_SCAN['Meilensteine']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Meilensteine']}
        />

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={() => setCurrentStep(2)}>
            <IconArrowLeft size={16} stroke={2} className="mr-2" />
            Zurück
          </Button>
          <Button onClick={() => setCurrentStep(4)}>
            Weiter zu Aufgaben
            <IconArrowRight size={16} stroke={2} className="ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  function renderStep4() {
    const gruenderName = selectedGruender
      ? [selectedGruender.fields.vorname, selectedGruender.fields.nachname].filter(Boolean).join(' ')
      : 'Unbekannt';
    const phaseName = selectedPhase?.fields.phasen_name ?? `Phase ${selectedPhase?.fields.phasen_nr ?? '?'}`;
    const aufgabenOhneMeilenstein = getAufgabenWithoutMilestone();

    if (completed) {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 overflow-hidden text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <IconCheck size={26} className="text-green-600" stroke={2.5} />
            </div>
            <h2 className="text-xl font-bold mb-1">Phase-Setup abgeschlossen!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Die Phase wurde erfolgreich mit Meilensteinen und Aufgaben befüllt.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Phase</p>
                <p className="font-semibold text-sm truncate">{phaseName}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Meilensteine</p>
                <p className="font-semibold text-2xl">{phaseMilestones.length}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Aufgaben</p>
                <p className="font-semibold text-2xl">{totalAufgabenCount}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="#/">
                <Button variant="outline" className="w-full sm:w-auto">
                  Zum Dashboard
                </Button>
              </a>
              <Button
                onClick={() => {
                  setCompleted(false);
                  setCurrentStep(1);
                  setSelectedGruenderId(null);
                  setSelectedPhaseId(null);
                }}
                className="w-full sm:w-auto"
              >
                <IconPlus size={16} stroke={2} className="mr-2" />
                Neue Phase einrichten
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Context banner */}
        <div className="rounded-xl border bg-muted/40 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <IconUser size={13} className="shrink-0" />
            <span className="font-medium text-foreground">{gruenderName}</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <IconFlag size={13} className="shrink-0" />
            <span className="font-medium text-foreground">{phaseName}</span>
          </span>
        </div>

        {/* Live stats */}
        <div className="rounded-2xl border bg-card p-4 overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Aufgaben gesamt</p>
              <p className="text-2xl font-bold">{totalAufgabenCount}</p>
            </div>
            <div className="flex items-center gap-3">
              {(['hoch', 'mittel', 'niedrig'] as const).map(prio => (
                <div key={prio} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${PRIORITAET_COLORS[prio]}`} />
                  <span className="text-xs text-muted-foreground capitalize">{prio}</span>
                  <span className="text-xs font-semibold text-foreground">{aufgabenByPriority[prio]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Milestones with tasks */}
        <div className="space-y-3">
          {phaseMilestones.length === 0 && (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground text-center">
              Keine Meilensteine gefunden. Gehen Sie zu Schritt 3, um Meilensteine anzulegen.
            </div>
          )}

          {phaseMilestones.map(ms => {
            const msAufgaben = getAufgabenForMilestone(ms.record_id);
            const isExpanded = expandedMilestones.has(ms.record_id);

            return (
              <div key={ms.record_id} className="rounded-2xl border bg-card overflow-hidden">
                {/* Milestone header */}
                <button
                  onClick={() => toggleMilestone(ms.record_id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconTarget size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">
                        {ms.fields.meilenstein_titel ?? 'Unbenannter Meilenstein'}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                          MS_STATUS_COLORS[getMsStatusKey(ms)] ?? 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {getMsStatusLabel(ms)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {msAufgaben.length} {msAufgaben.length === 1 ? 'Aufgabe' : 'Aufgaben'}
                    </p>
                  </div>
                  {isExpanded ? (
                    <IconChevronDown size={16} className="text-muted-foreground shrink-0" />
                  ) : (
                    <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
                  )}
                </button>

                {/* Tasks under milestone */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 p-4 space-y-3">
                    {msAufgaben.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        Noch keine Aufgaben für diesen Meilenstein.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {msAufgaben.map(aufgabe => {
                          const prioKey = getAufgabePrioritaetKey(aufgabe);
                          return (
                            <div
                              key={aufgabe.record_id}
                              className="flex items-center gap-3 p-3 rounded-xl border bg-card overflow-hidden"
                            >
                              {prioKey && (
                                <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITAET_COLORS[prioKey] ?? 'bg-muted'}`} />
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium truncate block">
                                  {aufgabe.fields.aufgabe_titel ?? 'Unbenannte Aufgabe'}
                                </span>
                                {aufgabe.fields.zieltermin_aufgabe && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {aufgabe.fields.zieltermin_aufgabe}
                                  </p>
                                )}
                              </div>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                                  AUFGABE_STATUS_COLORS[getAufgabeStatusKey(aufgabe)] ?? 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {getAufgabeStatusLabel(aufgabe)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() => {
                        setAufgabeForMeilensteinId(ms.record_id);
                        setAufgabeDialogOpen(true);
                      }}
                    >
                      <IconPlus size={14} stroke={2} />
                      Aufgabe hinzufügen
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Tasks without milestone */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <IconFlag size={14} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Aufgaben ohne Meilenstein</p>
                  <p className="text-xs text-muted-foreground">{aufgabenOhneMeilenstein.length} Aufgaben</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => {
                  setAufgabeForMeilensteinId(null);
                  setAufgabeDialogOpen(true);
                }}
              >
                <IconPlus size={14} stroke={2} />
                Aufgabe hinzufügen
              </Button>
            </div>
            {aufgabenOhneMeilenstein.length > 0 && (
              <div className="border-t bg-muted/20 p-4 space-y-2">
                {aufgabenOhneMeilenstein.map(aufgabe => {
                  const prioKey = getAufgabePrioritaetKey(aufgabe);
                  return (
                    <div
                      key={aufgabe.record_id}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-card overflow-hidden"
                    >
                      {prioKey && (
                        <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITAET_COLORS[prioKey] ?? 'bg-muted'}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {aufgabe.fields.aufgabe_titel ?? 'Unbenannte Aufgabe'}
                        </span>
                        {aufgabe.fields.zieltermin_aufgabe && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {aufgabe.fields.zieltermin_aufgabe}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                          AUFGABE_STATUS_COLORS[getAufgabeStatusKey(aufgabe)] ?? 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {getAufgabeStatusLabel(aufgabe)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Aufgaben dialog */}
        <AufgabenDialog
          open={aufgabeDialogOpen}
          onClose={() => {
            setAufgabeDialogOpen(false);
            setAufgabeForMeilensteinId(null);
          }}
          onSubmit={async (fields) => {
            await LivingAppsService.createAufgabenEntry(fields);
            await fetchAll();
          }}
          defaultValues={aufgabeDefaultValues}
          gruenderprofilList={gruenderprofil}
          phasenList={phasen}
          meilensteineList={phaseMilestones}
          enablePhotoScan={AI_PHOTO_SCAN['Aufgaben']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Aufgaben']}
        />

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={() => setCurrentStep(3)}>
            <IconArrowLeft size={16} stroke={2} className="mr-2" />
            Zurück
          </Button>
          <Button
            onClick={() => setCompleted(true)}
            className="gap-2"
          >
            <IconCheck size={16} stroke={2.5} />
            Phase-Setup abschließen
          </Button>
        </div>
      </div>
    );
  }

  const selectedGruenderForBadge = selectedGruender
    ? [selectedGruender.fields.vorname, selectedGruender.fields.nachname].filter(Boolean).join(' ')
    : null;

  const subtitleParts: string[] = [];
  if (selectedGruenderForBadge) subtitleParts.push(selectedGruenderForBadge);
  if (selectedPhase?.fields.phasen_name) subtitleParts.push(selectedPhase.fields.phasen_name);

  return (
    <IntentWizardShell
      title="Phasen-Setup"
      subtitle={subtitleParts.length > 0 ? subtitleParts.join(' · ') : 'Meilensteine und Aufgaben für eine Phase einrichten'}
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
    </IntentWizardShell>
  );
}
