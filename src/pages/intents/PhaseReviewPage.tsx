import { useState, useEffect } from 'react';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { PhasenDialog } from '@/components/dialogs/PhasenDialog';
import { MeilensteineDialog } from '@/components/dialogs/MeilensteineDialog';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Gruenderprofil, Phasen, Meilensteine } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  IconUser,
  IconFlag,
  IconClipboardCheck,
  IconChartBar,
  IconCalendar,
  IconPlus,
  IconPencil,
  IconCheck,
  IconArrowRight,
  IconCircleDot,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Gründer' },
  { label: 'Phase' },
  { label: 'Status & Meilensteine' },
  { label: 'Review' },
  { label: 'Protokoll' },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getAmpelColor(key: string | undefined): string {
  if (key === 'gruen') return 'bg-green-100 text-green-700 border-green-200';
  if (key === 'gelb') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (key === 'rot') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

function getAmpelDot(key: string | undefined): string {
  if (key === 'gruen') return 'bg-green-500';
  if (key === 'gelb') return 'bg-yellow-400';
  if (key === 'rot') return 'bg-red-500';
  return 'bg-gray-400';
}

function getEntscheidungBanner(key: string): { bg: string; text: string; label: string } {
  if (key === 'go') return { bg: 'bg-green-50 border-green-200', text: 'text-green-800', label: 'Go – Weiter zur nächsten Phase' };
  if (key === 'nachbessern') return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', label: 'Nachbessern – Aktuelle Phase überarbeiten' };
  if (key === 'stop') return { bg: 'bg-red-50 border-red-200', text: 'text-red-800', label: 'Stop – Gründungsvorhaben pausieren oder beenden' };
  return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-800', label: key };
}

export default function PhaseReviewPage() {
  const { gruenderprofil, phasen, meilensteine, loading, error, fetchAll } = useDashboardData();

  // URL deep-link params
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);

  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedGruender, setSelectedGruender] = useState<Gruenderprofil | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phasen | null>(null);

  // Step 3 state
  const [phaseStatus, setPhaseStatus] = useState('');
  const [phaseAmpel, setPhaseAmpel] = useState('');
  const [phaseNotiz, setPhaseNotiz] = useState('');
  const [updatingPhase, setUpdatingPhase] = useState(false);
  const [phaseUpdated, setPhaseUpdated] = useState(false);

  // Step 3 dialog state
  const [phasenDialogOpen, setPhasenDialogOpen] = useState(false);
  const [msDialogOpen, setMsDialogOpen] = useState(false);
  const [editingMs, setEditingMs] = useState<Meilensteine | null>(null);

  // Step 4 state
  const [reviewDatum, setReviewDatum] = useState(todayIso());
  const [reviewEntscheidung, setReviewEntscheidung] = useState('');
  const [entscheidungsfragenAntworten, setEntscheidungsfragenAntworten] = useState('');
  const [selectedWarnsignale, setSelectedWarnsignale] = useState<string[]>([]);
  const [beraterEmpfehlung, setBeraterEmpfehlung] = useState('');
  const [reviewNotiz, setReviewNotiz] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Step 5 state
  const [protokollieren, setProtokollieren] = useState(false);
  const [sitzungsdatum, setSitzungsdatum] = useState(todayIso());
  const [cockpitAmpel, setCockpitAmpel] = useState('');
  const [sitzungsZusammenfassung, setSitzungsZusammenfassung] = useState('');
  const [naechsteSchritte, setNaechsteSchritte] = useState('');
  const [naechsteSitzung, setNaechsteSitzung] = useState('');
  const [cockpitNotiz, setCockpitNotiz] = useState('');
  const [submittingCockpit, setSubmittingCockpit] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [cockpitLogged, setCockpitLogged] = useState(false);

  // URL deep-link initialization
  useEffect(() => {
    if (initializedFromUrl) return;
    const hashSearch = window.location.hash.split('?')[1] ?? '';
    const params = new URLSearchParams(hashSearch);
    const gruenderId = params.get('gruenderId');
    const urlStep = parseInt(params.get('step') ?? '', 10);

    if (gruenderId && !loading) {
      const found = gruenderprofil.find(g => g.record_id === gruenderId);
      if (found) {
        setSelectedGruender(found);
        if (urlStep >= 2 && urlStep <= 5) {
          setStep(urlStep);
        } else {
          setStep(2);
        }
      }
      setInitializedFromUrl(true);
    } else if (!loading) {
      if (urlStep >= 1 && urlStep <= 5) {
        setStep(urlStep);
      }
      setInitializedFromUrl(true);
    }
  }, [loading, gruenderprofil, initializedFromUrl]);

  // Sync selected phase data into step 3 form when phase changes
  useEffect(() => {
    if (selectedPhase) {
      const statusKey = typeof selectedPhase.fields.phase_status === 'object' && selectedPhase.fields.phase_status
        ? selectedPhase.fields.phase_status.key
        : '';
      const ampelKey = typeof selectedPhase.fields.phase_ampel === 'object' && selectedPhase.fields.phase_ampel
        ? selectedPhase.fields.phase_ampel.key
        : '';
      setPhaseStatus(statusKey);
      setPhaseAmpel(ampelKey);
      setPhaseNotiz(selectedPhase.fields.phase_notiz ?? '');
      setPhaseUpdated(false);
    }
  }, [selectedPhase]);

  // Milestones filtered for selected phase
  const phaseMeilensteine = selectedPhase
    ? meilensteine.filter(m => {
        const ref = m.fields.phase_ref;
        if (!ref) return false;
        return extractRecordId(ref) === selectedPhase.record_id;
      })
    : [];

  const msErreicht = phaseMeilensteine.filter(m => {
    const statusKey = typeof m.fields.ms_status === 'object' && m.fields.ms_status
      ? m.fields.ms_status.key
      : '';
    return statusKey === 'erreicht';
  }).length;

  // Handlers

  function handleSelectGruender(id: string) {
    const found = gruenderprofil.find(g => g.record_id === id);
    if (found) {
      setSelectedGruender(found);
      setStep(2);
    }
  }

  function handleSelectPhase(id: string) {
    const found = phasen.find(p => p.record_id === id);
    if (found) {
      setSelectedPhase(found);
      setStep(3);
    }
  }

  async function handleUpdatePhase() {
    if (!selectedPhase) return;
    setUpdatingPhase(true);
    try {
      await LivingAppsService.updatePhasenEntry(selectedPhase.record_id, {
        phase_status: phaseStatus || undefined,
        phase_ampel: phaseAmpel || undefined,
        phase_notiz: phaseNotiz || undefined,
      });
      await fetchAll();
      setPhaseUpdated(true);
    } finally {
      setUpdatingPhase(false);
    }
  }

  async function handleSubmitReview() {
    if (!selectedGruender || !selectedPhase) return;
    setSubmittingReview(true);
    try {
      await LivingAppsService.createReviewPunkteEntry({
        gruender_ref: createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruender.record_id),
        phase_ref: createRecordUrl(APP_IDS.PHASEN, selectedPhase.record_id),
        review_datum: reviewDatum,
        review_entscheidung: reviewEntscheidung || undefined,
        entscheidungsfragen_antworten: entscheidungsfragenAntworten || undefined,
        warnsignale: selectedWarnsignale.length > 0 ? selectedWarnsignale : undefined,
        berater_empfehlung: beraterEmpfehlung || undefined,
        review_notiz: reviewNotiz || undefined,
      });
      await fetchAll();
      setStep(5);
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleFinish() {
    if (protokollieren && selectedGruender && selectedPhase) {
      setSubmittingCockpit(true);
      try {
        await LivingAppsService.createRoadmapCockpitEntry({
          gruender_ref: createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruender.record_id),
          phase_ref: createRecordUrl(APP_IDS.PHASEN, selectedPhase.record_id),
          sitzungsdatum: sitzungsdatum,
          phase_ampel_aktuell: cockpitAmpel || undefined,
          sitzungs_zusammenfassung: sitzungsZusammenfassung || undefined,
          naechste_schritte: naechsteSchritte || undefined,
          naechste_sitzung: naechsteSitzung || undefined,
          cockpit_notiz: cockpitNotiz || undefined,
        });
        await fetchAll();
        setCockpitLogged(true);
      } finally {
        setSubmittingCockpit(false);
      }
    }
    setCompleted(true);
  }

  function toggleWarnsignal(key: string) {
    setSelectedWarnsignale(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  // Lookup options
  const warnsignaleOptions = LOOKUP_OPTIONS['review_punkte']?.['warnsignale'] ?? [];
  const reviewEntscheidungOptions = LOOKUP_OPTIONS['review_punkte']?.['review_entscheidung'] ?? [];
  const cockpitAmpelOptions = LOOKUP_OPTIONS['roadmap_cockpit']?.['phase_ampel_aktuell'] ?? [];

  // Derived display values
  const gruenderName = selectedGruender
    ? `${selectedGruender.fields.vorname ?? ''} ${selectedGruender.fields.nachname ?? ''}`.trim()
    : '';
  const phaseName = selectedPhase
    ? `${selectedPhase.fields.phasen_nr ? selectedPhase.fields.phasen_nr + '. ' : ''}${selectedPhase.fields.phasen_name ?? ''}`
    : '';

  const phaseStatusLabel = LOOKUP_OPTIONS['phasen']?.['phase_status']?.find(o => o.key === phaseStatus)?.label ?? phaseStatus;
  const phaseAmpelLabel = LOOKUP_OPTIONS['phasen']?.['phase_ampel']?.find(o => o.key === phaseAmpel)?.label ?? phaseAmpel;

  const reviewEntscheidungLabel = reviewEntscheidungOptions.find(o => o.key === reviewEntscheidung)?.label ?? reviewEntscheidung;

  return (
    <IntentWizardShell
      title="Phasen-Review & Fortschritt"
      subtitle="Gründer auswählen, Phase prüfen, Review-Entscheidung erfassen und Sitzung protokollieren"
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* STEP 1: Gründer auswählen */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <IconUser size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Gründer auswählen</h2>
              <p className="text-sm text-muted-foreground">Welcher Gründer soll reviewed werden?</p>
            </div>
          </div>
          <EntitySelectStep
            items={gruenderprofil.map(g => ({
              id: g.record_id,
              title: `${g.fields.vorname ?? ''} ${g.fields.nachname ?? ''}`.trim() || g.record_id,
              subtitle: g.fields.projektname,
              status: g.fields.rechtsform_geplant
                ? { key: g.fields.rechtsform_geplant.key, label: g.fields.rechtsform_geplant.label }
                : undefined,
              icon: <IconUser size={16} className="text-primary" />,
            }))}
            onSelect={handleSelectGruender}
            searchPlaceholder="Gründer suchen..."
            emptyText="Kein Gründerprofil gefunden."
          />
        </div>
      )}

      {/* STEP 2: Phase auswählen */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <IconFlag size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Phase auswählen</h2>
              <p className="text-sm text-muted-foreground">
                Gründer: <span className="font-medium text-foreground">{gruenderName}</span>
              </p>
            </div>
          </div>
          <EntitySelectStep
            items={phasen
              .sort((a, b) => (a.fields.phasen_nr ?? 99) - (b.fields.phasen_nr ?? 99))
              .map(p => ({
                id: p.record_id,
                title: `${p.fields.phasen_nr ? p.fields.phasen_nr + '. ' : ''}${p.fields.phasen_name ?? p.record_id}`,
                subtitle: p.fields.phasen_ziel,
                status: p.fields.phase_status
                  ? { key: p.fields.phase_status.key, label: p.fields.phase_status.label }
                  : undefined,
                icon: <IconFlag size={16} className="text-primary" />,
              }))}
            onSelect={handleSelectPhase}
            searchPlaceholder="Phase suchen..."
            emptyText="Keine Phasen gefunden."
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
                enablePhotoLocation={AI_PHOTO_LOCATION['Phasen']}
              />
            }
          />
          <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1.5">
            Zurück zu Gründer
          </Button>
        </div>
      )}

      {/* STEP 3: Phase-Status aktualisieren & Meilensteine */}
      {step === 3 && selectedPhase && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <IconChartBar size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Status & Meilensteine</h2>
              <p className="text-sm text-muted-foreground">
                Phase: <span className="font-medium text-foreground">{phaseName}</span>
              </p>
            </div>
          </div>

          {/* Phase details card */}
          <div className="rounded-xl border bg-card p-4 space-y-3 overflow-hidden">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{phaseName}</p>
                {selectedPhase.fields.phasen_ziel && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{selectedPhase.fields.phasen_ziel}</p>
                )}
              </div>
              <div className="flex gap-2 items-center shrink-0 flex-wrap">
                {phaseStatus && (
                  <StatusBadge statusKey={phaseStatus} label={phaseStatusLabel} />
                )}
                {phaseAmpel && (
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${getAmpelColor(phaseAmpel)}`}>
                    <span className={`w-2 h-2 rounded-full ${getAmpelDot(phaseAmpel)}`} />
                    {phaseAmpelLabel}
                  </span>
                )}
              </div>
            </div>
            {selectedPhase.fields.meilenstein_kriterien && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Meilenstein-Kriterien</p>
                <p className="text-xs text-foreground">{selectedPhase.fields.meilenstein_kriterien}</p>
              </div>
            )}
            {selectedPhase.fields.ko_kriterien && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">K.O.-Kriterien</p>
                <p className="text-xs text-foreground">{selectedPhase.fields.ko_kriterien}</p>
              </div>
            )}
          </div>

          {/* Milestone progress */}
          {phaseMeilensteine.length > 0 && (
            <div className="rounded-xl border bg-card p-4 space-y-3 overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Meilensteine</p>
                <span className="text-xs text-muted-foreground">{msErreicht} / {phaseMeilensteine.length} erreicht</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: phaseMeilensteine.length > 0 ? `${Math.round((msErreicht / phaseMeilensteine.length) * 100)}%` : '0%' }}
                />
              </div>
              <div className="space-y-2">
                {phaseMeilensteine.map(ms => {
                  const msStatusKey = typeof ms.fields.ms_status === 'object' && ms.fields.ms_status
                    ? ms.fields.ms_status.key
                    : '';
                  const msStatusLabel = typeof ms.fields.ms_status === 'object' && ms.fields.ms_status
                    ? ms.fields.ms_status.label
                    : msStatusKey;
                  const msAmpelKey = typeof ms.fields.ms_ampel === 'object' && ms.fields.ms_ampel
                    ? ms.fields.ms_ampel.key
                    : '';
                  return (
                    <div key={ms.record_id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 overflow-hidden">
                      {msAmpelKey && (
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getAmpelDot(msAmpelKey)}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ms.fields.meilenstein_titel ?? 'Meilenstein'}</p>
                        {msStatusKey && (
                          <StatusBadge statusKey={msStatusKey} label={msStatusLabel} className="mt-1" />
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditingMs(ms); setMsDialogOpen(true); }}
                        className="shrink-0 gap-1"
                      >
                        <IconPencil size={13} stroke={2} />
                        Bearbeiten
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New milestone button */}
          <Button
            variant="outline"
            onClick={() => { setEditingMs(null); setMsDialogOpen(true); }}
            className="gap-1.5 w-full sm:w-auto"
          >
            <IconPlus size={15} />
            Neuer Meilenstein
          </Button>

          <MeilensteineDialog
            open={msDialogOpen}
            onClose={() => { setMsDialogOpen(false); setEditingMs(null); }}
            onSubmit={async (fields) => {
              if (editingMs) {
                await LivingAppsService.updateMeilensteineEntry(editingMs.record_id, fields);
              } else {
                await LivingAppsService.createMeilensteineEntry({
                  ...fields,
                  phase_ref: createRecordUrl(APP_IDS.PHASEN, selectedPhase.record_id),
                  gruender_ref: selectedGruender
                    ? createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruender.record_id)
                    : undefined,
                });
              }
              await fetchAll();
            }}
            defaultValues={editingMs
              ? editingMs.fields
              : {
                  phase_ref: createRecordUrl(APP_IDS.PHASEN, selectedPhase.record_id),
                  gruender_ref: selectedGruender
                    ? createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruender.record_id)
                    : undefined,
                }
            }
            gruenderprofilList={gruenderprofil}
            phasenList={phasen}
            enablePhotoScan={AI_PHOTO_SCAN['Meilensteine']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Meilensteine']}
          />

          {/* Update phase status form */}
          <div className="rounded-xl border bg-card p-4 space-y-4 overflow-hidden">
            <p className="text-sm font-semibold">Phase-Status aktualisieren</p>

            <div className="space-y-2">
              <Label className="text-sm">Phase-Status</Label>
              <RadioGroup value={phaseStatus} onValueChange={setPhaseStatus} className="flex flex-wrap gap-3">
                {LOOKUP_OPTIONS['phasen']?.['phase_status']?.map(opt => (
                  <div key={opt.key} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.key} id={`phase_status_${opt.key}`} />
                    <Label htmlFor={`phase_status_${opt.key}`} className="font-normal cursor-pointer">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Ampel</Label>
              <RadioGroup value={phaseAmpel} onValueChange={setPhaseAmpel} className="flex flex-wrap gap-3">
                {[
                  { key: 'gruen', label: 'Grün' },
                  { key: 'gelb', label: 'Gelb' },
                  { key: 'rot', label: 'Rot' },
                ].map(opt => (
                  <div key={opt.key} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.key} id={`phase_ampel_${opt.key}`} />
                    <Label htmlFor={`phase_ampel_${opt.key}`} className="font-normal cursor-pointer flex items-center gap-1.5">
                      <span className={`w-3 h-3 rounded-full ${getAmpelDot(opt.key)}`} />
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phase_notiz" className="text-sm">Notiz zur Phase</Label>
              <Textarea
                id="phase_notiz"
                value={phaseNotiz}
                onChange={e => setPhaseNotiz(e.target.value)}
                rows={3}
                placeholder="Optionale Notiz zur aktuellen Phase..."
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={handleUpdatePhase}
                disabled={updatingPhase}
                className="gap-1.5"
              >
                {updatingPhase ? 'Aktualisieren...' : 'Aktualisieren'}
                {phaseUpdated && <IconCheck size={15} stroke={2.5} />}
              </Button>
              {phaseUpdated && (
                <span className="text-sm text-green-600 font-medium">Phase aktualisiert</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
              Zurück
            </Button>
            <Button onClick={() => setStep(4)} className="gap-1.5">
              Weiter zu Review
              <IconArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Review-Entscheidung erfassen */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <IconClipboardCheck size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Review-Entscheidung erfassen</h2>
              <p className="text-sm text-muted-foreground">
                {gruenderName} — {phaseName}
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border bg-card p-4 overflow-hidden">

            <div className="space-y-2">
              <Label htmlFor="review_datum" className="text-sm">Review-Datum</Label>
              <Input
                id="review_datum"
                type="date"
                value={reviewDatum}
                onChange={e => setReviewDatum(e.target.value)}
                className="max-w-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Entscheidung</Label>
              <RadioGroup value={reviewEntscheidung} onValueChange={setReviewEntscheidung} className="space-y-2">
                {reviewEntscheidungOptions.map(opt => (
                  <div key={opt.key} className="flex items-start gap-2">
                    <RadioGroupItem value={opt.key} id={`entsch_${opt.key}`} className="mt-0.5" />
                    <Label htmlFor={`entsch_${opt.key}`} className="font-normal cursor-pointer leading-snug">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Colored decision banner */}
            {reviewEntscheidung && (
              <div className={`rounded-lg border p-3 ${getEntscheidungBanner(reviewEntscheidung).bg}`}>
                <p className={`text-sm font-semibold ${getEntscheidungBanner(reviewEntscheidung).text}`}>
                  {getEntscheidungBanner(reviewEntscheidung).label}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="entscheidungsfragen" className="text-sm">Antworten zu Entscheidungsfragen</Label>
              <Textarea
                id="entscheidungsfragen"
                value={entscheidungsfragenAntworten}
                onChange={e => setEntscheidungsfragenAntworten(e.target.value)}
                rows={4}
                placeholder="Zusammenfassung der Prüfungsfragen und Antworten..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Warnsignale</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {warnsignaleOptions.map(opt => (
                  <div key={opt.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`warn_${opt.key}`}
                      checked={selectedWarnsignale.includes(opt.key)}
                      onCheckedChange={() => toggleWarnsignal(opt.key)}
                    />
                    <Label htmlFor={`warn_${opt.key}`} className="font-normal text-sm cursor-pointer leading-snug">{opt.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="berater_empfehlung" className="text-sm">Berater-Empfehlung</Label>
              <Textarea
                id="berater_empfehlung"
                value={beraterEmpfehlung}
                onChange={e => setBeraterEmpfehlung(e.target.value)}
                rows={3}
                placeholder="Empfehlung des Beraters für den nächsten Schritt..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review_notiz" className="text-sm">Notizen zum Review</Label>
              <Textarea
                id="review_notiz"
                value={reviewNotiz}
                onChange={e => setReviewNotiz(e.target.value)}
                rows={3}
                placeholder="Weitere Notizen..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
              Zurück
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={submittingReview || !reviewEntscheidung}
              className="gap-1.5"
            >
              {submittingReview ? 'Speichern...' : 'Review speichern & weiter'}
              <IconArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Cockpit-Sitzung protokollieren */}
      {step === 5 && !completed && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <IconCalendar size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Cockpit-Sitzung protokollieren</h2>
              <p className="text-sm text-muted-foreground">Optional: Sitzungsprotokoll für das Roadmap-Cockpit</p>
            </div>
          </div>

          {/* Summary card */}
          <div className="rounded-xl border bg-card p-4 space-y-3 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zusammenfassung</p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <IconUser size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium">{gruenderName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <IconFlag size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium">{phaseName}</span>
              </div>
            </div>
            {reviewEntscheidung && (
              <div className={`rounded-lg border p-2.5 ${getEntscheidungBanner(reviewEntscheidung).bg}`}>
                <p className={`text-sm font-semibold ${getEntscheidungBanner(reviewEntscheidung).text}`}>
                  Review: {reviewEntscheidungLabel}
                </p>
              </div>
            )}
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
            <Checkbox
              id="protokollieren"
              checked={protokollieren}
              onCheckedChange={v => setProtokollieren(!!v)}
            />
            <Label htmlFor="protokollieren" className="font-medium cursor-pointer">
              Sitzung im Roadmap-Cockpit protokollieren
            </Label>
          </div>

          {protokollieren && (
            <div className="space-y-4 rounded-xl border bg-card p-4 overflow-hidden">
              <div className="space-y-2">
                <Label htmlFor="sitzungsdatum" className="text-sm">Sitzungsdatum</Label>
                <Input
                  id="sitzungsdatum"
                  type="date"
                  value={sitzungsdatum}
                  onChange={e => setSitzungsdatum(e.target.value)}
                  className="max-w-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Aktuelle Phase-Ampel</Label>
                <RadioGroup value={cockpitAmpel} onValueChange={setCockpitAmpel} className="flex flex-wrap gap-3">
                  {cockpitAmpelOptions.map(opt => (
                    <div key={opt.key} className="flex items-center gap-2">
                      <RadioGroupItem value={opt.key} id={`campel_${opt.key}`} />
                      <Label htmlFor={`campel_${opt.key}`} className="font-normal cursor-pointer flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded-full ${getAmpelDot(opt.key)}`} />
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sitzungs_zusammenfassung" className="text-sm">Sitzungs-Zusammenfassung</Label>
                <Textarea
                  id="sitzungs_zusammenfassung"
                  value={sitzungsZusammenfassung}
                  onChange={e => setSitzungsZusammenfassung(e.target.value)}
                  rows={4}
                  placeholder="Was wurde in der Sitzung besprochen?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="naechste_schritte" className="text-sm">Nächste Schritte</Label>
                <Textarea
                  id="naechste_schritte"
                  value={naechsteSchritte}
                  onChange={e => setNaechsteSchritte(e.target.value)}
                  rows={3}
                  placeholder="Was sind die vereinbarten nächsten Schritte?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="naechste_sitzung" className="text-sm">Datum nächste Sitzung</Label>
                <Input
                  id="naechste_sitzung"
                  type="date"
                  value={naechsteSitzung}
                  onChange={e => setNaechsteSitzung(e.target.value)}
                  className="max-w-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cockpit_notiz" className="text-sm">Cockpit-Notiz</Label>
                <Textarea
                  id="cockpit_notiz"
                  value={cockpitNotiz}
                  onChange={e => setCockpitNotiz(e.target.value)}
                  rows={3}
                  placeholder="Weitere Notizen zur Sitzung..."
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setStep(4)}>
              Zurück
            </Button>
            <Button
              onClick={handleFinish}
              disabled={submittingCockpit}
              className="gap-1.5"
            >
              {submittingCockpit ? 'Speichern...' : protokollieren ? 'Sitzung speichern & abschließen' : 'Abschließen'}
              <IconCheck size={15} stroke={2.5} />
            </Button>
          </div>
        </div>
      )}

      {/* COMPLETED */}
      {step === 5 && completed && (
        <div className="space-y-5">
          <div className="rounded-2xl border bg-card p-6 space-y-4 text-center overflow-hidden">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <IconCheck size={28} stroke={2.5} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Review abgeschlossen</h2>
              <p className="text-sm text-muted-foreground mt-1">Alle Schritte wurden erfolgreich gespeichert.</p>
            </div>

            <div className="space-y-3 text-left">
              <div className="rounded-xl border p-3 space-y-1.5 overflow-hidden">
                <div className="flex items-center gap-2">
                  <IconUser size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{gruenderName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconFlag size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-sm">{phaseName}</span>
                  {phaseStatus && (
                    <StatusBadge statusKey={phaseStatus} label={phaseStatusLabel} />
                  )}
                </div>
              </div>

              {reviewEntscheidung && (
                <div className={`rounded-xl border p-3 ${getEntscheidungBanner(reviewEntscheidung).bg}`}>
                  <div className="flex items-center gap-2">
                    <IconCircleDot size={14} className={getEntscheidungBanner(reviewEntscheidung).text} />
                    <p className={`text-sm font-semibold ${getEntscheidungBanner(reviewEntscheidung).text}`}>
                      {reviewEntscheidungLabel}
                    </p>
                  </div>
                </div>
              )}

              <div className={`rounded-xl border p-3 flex items-center gap-2 ${cockpitLogged ? 'bg-green-50 border-green-200' : 'bg-muted/30'}`}>
                {cockpitLogged
                  ? <IconCheck size={14} className="text-green-600 shrink-0" />
                  : <IconCalendar size={14} className="text-muted-foreground shrink-0" />
                }
                <span className="text-sm">
                  {cockpitLogged ? 'Cockpit-Sitzung protokolliert' : 'Keine Sitzung protokolliert'}
                </span>
              </div>
            </div>

            <a href="#/" className="inline-flex items-center justify-center gap-1.5 mt-2 text-sm font-medium text-primary hover:underline">
              Zurück zur Übersicht
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
