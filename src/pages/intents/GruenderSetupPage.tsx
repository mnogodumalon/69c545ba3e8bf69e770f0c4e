import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Gruenderprofil, Finanzplan } from '@/types/app';
import type { EnrichedBusinessplan, EnrichedFinanzplan } from '@/types/enriched';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { enrichBusinessplan, enrichFinanzplan } from '@/lib/enrich';
import { formatCurrency } from '@/lib/formatters';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { useDashboardData } from '@/hooks/useDashboardData';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { GruenderprofilDialog } from '@/components/dialogs/GruenderprofilDialog';
import { PhasenDialog } from '@/components/dialogs/PhasenDialog';
import { BusinessplanDialog } from '@/components/dialogs/BusinessplanDialog';
import { FinanzplanDialog } from '@/components/dialogs/FinanzplanDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  IconUser,
  IconArrowRight,
  IconArrowLeft,
  IconPlus,
  IconCheck,
  IconFlag,
  IconFileText,
  IconCoin,
  IconBuildingStore,
  IconTrendingUp,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { id: 'gruender', label: 'Grunderprofil' },
  { id: 'phasen', label: 'Phasen' },
  { id: 'businessplan', label: 'Businessplan' },
  { id: 'finanzplan', label: 'Finanzplan' },
];

const STATUS_COLOR_MAP: Record<string, string> = {
  offen: 'bg-amber-100 text-amber-700',
  in_arbeit: 'bg-blue-100 text-blue-700',
  abgeschlossen: 'bg-green-100 text-green-700',
  einzelunternehmen: 'bg-slate-100 text-slate-600',
  gbr: 'bg-slate-100 text-slate-600',
  ug: 'bg-purple-100 text-purple-700',
  gmbh: 'bg-indigo-100 text-indigo-700',
  ag: 'bg-indigo-100 text-indigo-700',
  freiberufler: 'bg-teal-100 text-teal-700',
};

export default function GruenderSetupPage() {
  const [searchParams] = useSearchParams();
  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    if (s >= 1 && s <= 4) return s;
    return 1;
  })();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [done, setDone] = useState(false);

  // Step 1 state
  const [selectedFounderId, setSelectedFounderId] = useState<string | null>(null);
  const [gruenderDialogOpen, setGruenderDialogOpen] = useState(false);

  // Step 2 state
  const [phasenDialogOpen, setPhasenDialogOpen] = useState(false);

  // Step 3 state
  const [selectedBusinessplanId, setSelectedBusinessplanId] = useState<string | null>(null);
  const [bpDialogOpen, setBpDialogOpen] = useState(false);

  // Step 4 state
  const [selectedFinanzplanId, setSelectedFinanzplanId] = useState<string | null>(null);
  const [fpDialogOpen, setFpDialogOpen] = useState(false);

  const {
    gruenderprofil,
    phasen,
    businessplan,
    finanzplan,
    loading,
    error,
    fetchAll,
    gruenderprofilMap,
    phasenMap,
    businessplanMap,
  } = useDashboardData();

  // Enrich businessplan and finanzplan
  const enrichedBusinessplan: EnrichedBusinessplan[] = useMemo(
    () => enrichBusinessplan(businessplan, { gruenderprofilMap, phasenMap }),
    [businessplan, gruenderprofilMap, phasenMap]
  );

  const enrichedFinanzplan: EnrichedFinanzplan[] = useMemo(
    () => enrichFinanzplan(finanzplan, { gruenderprofilMap, businessplanMap }),
    [finanzplan, gruenderprofilMap, businessplanMap]
  );

  // Derived: selected founder record
  const selectedFounder: Gruenderprofil | undefined = useMemo(
    () => (selectedFounderId ? gruenderprofilMap.get(selectedFounderId) : undefined),
    [selectedFounderId, gruenderprofilMap]
  );

  // Derived: businessplans linked to the selected founder
  const founderBusinessplans: EnrichedBusinessplan[] = useMemo(() => {
    if (!selectedFounderId) return enrichedBusinessplan;
    return enrichedBusinessplan.filter(bp => {
      const id = extractRecordId(bp.fields.gruender_ref);
      return id === selectedFounderId;
    });
  }, [enrichedBusinessplan, selectedFounderId]);

  // Derived: finanzplans linked to selected founder
  const founderFinanzplans: EnrichedFinanzplan[] = useMemo(() => {
    if (!selectedFounderId) return enrichedFinanzplan;
    return enrichedFinanzplan.filter(fp => {
      const id = extractRecordId(fp.fields.gruender_ref);
      return id === selectedFounderId;
    });
  }, [enrichedFinanzplan, selectedFounderId]);

  // Derived: selected finanzplan record
  const selectedFinanzplan: Finanzplan | undefined = useMemo(() => {
    if (!selectedFinanzplanId) return undefined;
    return finanzplan.find(fp => fp.record_id === selectedFinanzplanId);
  }, [selectedFinanzplanId, finanzplan]);

  // Derived: selected businessplan record
  const selectedBusinessplan: EnrichedBusinessplan | undefined = useMemo(() => {
    if (!selectedBusinessplanId) return undefined;
    return enrichedBusinessplan.find(bp => bp.record_id === selectedBusinessplanId);
  }, [selectedBusinessplanId, enrichedBusinessplan]);

  // Handler: step navigation with URL sync
  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  const goNext = () => handleStepChange(currentStep + 1);
  const goBack = () => handleStepChange(currentStep - 1);

  // Handler: founder selected
  const handleFounderSelect = (id: string) => {
    setSelectedFounderId(id);
    setSelectedBusinessplanId(null);
    setSelectedFinanzplanId(null);
  };

  // Handler: businessplan selected
  const handleBusinessplanSelect = (id: string) => {
    setSelectedBusinessplanId(id);
  };

  // Handler: finanzplan selected
  const handleFinanzplanSelect = (id: string) => {
    setSelectedFinanzplanId(id);
  };

  const handleComplete = () => {
    setDone(true);
  };

  // Build founder URL helper
  const founderUrl = selectedFounderId
    ? createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedFounderId)
    : undefined;

  // Build businessplan URL helper
  const businessplanUrl = selectedBusinessplanId
    ? createRecordUrl(APP_IDS.BUSINESSPLAN, selectedBusinessplanId)
    : undefined;

  if (done) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-4">
        <a href="#/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <IconArrowLeft size={14} />
          Zurück zum Dashboard
        </a>
        <div className="flex flex-col items-center justify-center py-16 gap-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <IconCheck size={32} className="text-green-600" stroke={2.5} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Startup-Roadmap angelegt!</h2>
            {selectedFounder && (
              <p className="text-muted-foreground">
                {selectedFounder.fields.vorname} {selectedFounder.fields.nachname} –{' '}
                {selectedFounder.fields.projektname}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl">
            <Card className="overflow-hidden">
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-2">
                  <IconFlag size={16} className="text-blue-600" />
                </div>
                <p className="text-sm font-medium">{phasen.length} Phasen</p>
                <p className="text-xs text-muted-foreground">angelegt</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-2">
                  <IconFileText size={16} className="text-purple-600" />
                </div>
                <p className="text-sm font-medium truncate">
                  {selectedBusinessplan?.fields.bp_titel ?? 'Businessplan'}
                </p>
                <p className="text-xs text-muted-foreground">erstellt</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-2">
                  <IconCoin size={16} className="text-green-600" />
                </div>
                <p className="text-sm font-medium">
                  {selectedFinanzplan
                    ? formatCurrency(selectedFinanzplan.fields.startkapital)
                    : 'Finanzplan'}
                </p>
                <p className="text-xs text-muted-foreground">Startkapital</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setDone(false); handleStepChange(1); setSelectedFounderId(null); }}>
              Neuen Gründer anlegen
            </Button>
            <Button asChild>
              <a href="#/">Zum Dashboard</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <IntentWizardShell
        title="Startup-Roadmap einrichten"
        subtitle="Legen Sie in 4 Schritten das vollstandige Profil eines neuen Grunders an."
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        loading={loading}
        error={error}
        onRetry={fetchAll}
      >
        {/* STEP 1: Gründerprofil */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Grunderprofil auswahlen</h2>
              <p className="text-sm text-muted-foreground">
                Wahlen Sie einen bestehenden Grunder aus oder legen Sie ein neues Profil an.
              </p>
            </div>

            <EntitySelectStep
              items={gruenderprofil.map(g => ({
                id: g.record_id,
                title: [g.fields.vorname, g.fields.nachname].filter(Boolean).join(' ')
                  + (g.fields.projektname ? ` – ${g.fields.projektname}` : ''),
                subtitle: g.fields.branche?.label,
                status: g.fields.rechtsform_geplant
                  ? { key: g.fields.rechtsform_geplant.key, label: g.fields.rechtsform_geplant.label }
                  : undefined,
                icon: <IconUser size={18} className="text-primary" />,
              }))}
              onSelect={handleFounderSelect}
              searchPlaceholder="Grunder suchen..."
              emptyIcon={<IconUser size={32} />}
              emptyText="Noch kein Grunderprofil vorhanden."
              createLabel="Neues Grunderprofil"
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

            {selectedFounder && (
              <Card className="overflow-hidden border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <IconUser size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">
                        {selectedFounder.fields.vorname} {selectedFounder.fields.nachname}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {selectedFounder.fields.projektname}
                      </p>
                      {selectedFounder.fields.branche && (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-muted mt-1">
                          {selectedFounder.fields.branche.label}
                        </span>
                      )}
                    </div>
                    {selectedFounder.fields.rechtsform_geplant && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR_MAP[selectedFounder.fields.rechtsform_geplant.key] ?? 'bg-muted text-muted-foreground'}`}>
                        {selectedFounder.fields.rechtsform_geplant.label}
                      </span>
                    )}
                  </div>
                  {selectedFounder.fields.geschaeftsidee_kurz && (
                    <p className="text-sm text-muted-foreground line-clamp-2 pl-13">
                      {selectedFounder.fields.geschaeftsidee_kurz}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={goNext}
                disabled={!selectedFounderId}
                className="gap-2"
              >
                Weiter
                <IconArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Phasen */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Phasen der Roadmap</h2>
              <p className="text-sm text-muted-foreground">
                Definieren Sie die Phasen des Grundungsvorhabens. Sie konnen mehrere Phasen anlegen.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {phasen.length} {phasen.length === 1 ? 'Phase' : 'Phasen'} angelegt
              </span>
              <Button
                variant="outline"
                onClick={() => setPhasenDialogOpen(true)}
                className="gap-2"
              >
                <IconPlus size={16} />
                Phase hinzufugen
              </Button>
            </div>

            <PhasenDialog
              open={phasenDialogOpen}
              onClose={() => setPhasenDialogOpen(false)}
              onSubmit={async (fields) => {
                await LivingAppsService.createPhasenEntry(fields);
                await fetchAll();
              }}
              enablePhotoScan={AI_PHOTO_SCAN['Phasen']}
            />

            {phasen.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-xl">
                <div className="mb-3 flex justify-center opacity-40">
                  <IconFlag size={32} />
                </div>
                <p className="text-sm">Noch keine Phasen vorhanden.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPhasenDialogOpen(true)}
                  className="mt-3 gap-1.5"
                >
                  <IconPlus size={14} />
                  Erste Phase anlegen
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {[...phasen]
                  .sort((a, b) => (a.fields.phasen_nr ?? 0) - (b.fields.phasen_nr ?? 0))
                  .map(phase => (
                    <div
                      key={phase.record_id}
                      className="flex items-center gap-3 p-4 rounded-xl border bg-card overflow-hidden"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                        {phase.fields.phasen_nr ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {phase.fields.phasen_name ?? 'Unbenannte Phase'}
                        </p>
                        {phase.fields.phasen_ziel && (
                          <p className="text-xs text-muted-foreground truncate">
                            {phase.fields.phasen_ziel}
                          </p>
                        )}
                      </div>
                      {phase.fields.phase_status && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR_MAP[phase.fields.phase_status.key] ?? 'bg-muted text-muted-foreground'}`}>
                          {phase.fields.phase_status.label}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={goBack} className="gap-2">
                <IconArrowLeft size={16} />
                Zuruck
              </Button>
              <Button onClick={goNext} className="gap-2">
                Weiter
                <IconArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Businessplan */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Businessplan anlegen</h2>
              <p className="text-sm text-muted-foreground">
                Wahlen Sie einen bestehenden Businessplan aus oder legen Sie einen neuen an.
              </p>
            </div>

            <EntitySelectStep
              items={founderBusinessplans.map(bp => ({
                id: bp.record_id,
                title: bp.fields.bp_titel ?? 'Unbenannter Businessplan',
                subtitle: bp.phase_refName || bp.gruender_refName,
                icon: <IconFileText size={18} className="text-primary" />,
              }))}
              onSelect={handleBusinessplanSelect}
              searchPlaceholder="Businessplan suchen..."
              emptyIcon={<IconFileText size={32} />}
              emptyText="Noch kein Businessplan vorhanden."
              createLabel="Neuen Businessplan"
              onCreateNew={() => setBpDialogOpen(true)}
              createDialog={
                <BusinessplanDialog
                  open={bpDialogOpen}
                  onClose={() => setBpDialogOpen(false)}
                  onSubmit={async (fields) => {
                    await LivingAppsService.createBusinessplanEntry(fields);
                    await fetchAll();
                  }}
                  defaultValues={founderUrl ? { gruender_ref: founderUrl } : undefined}
                  gruenderprofilList={gruenderprofil}
                  phasenList={phasen}
                  enablePhotoScan={AI_PHOTO_SCAN['Businessplan']}
                />
              }
            />

            {selectedBusinessplan && (
              <Card className="overflow-hidden border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <IconFileText size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">
                        {selectedBusinessplan.fields.bp_titel ?? 'Businessplan'}
                      </p>
                      {selectedBusinessplan.phase_refName && (
                        <p className="text-sm text-muted-foreground">
                          Phase: {selectedBusinessplan.phase_refName}
                        </p>
                      )}
                      {selectedBusinessplan.fields.executive_summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {selectedBusinessplan.fields.executive_summary}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={goBack} className="gap-2">
                <IconArrowLeft size={16} />
                Zuruck
              </Button>
              <Button
                onClick={goNext}
                disabled={!selectedBusinessplanId}
                className="gap-2"
              >
                Weiter
                <IconArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Finanzplan */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Finanzplan anlegen</h2>
              <p className="text-sm text-muted-foreground">
                Hinterlegen Sie die finanziellen Eckdaten fur das Grundungsvorhaben.
              </p>
            </div>

            <EntitySelectStep
              items={founderFinanzplans.map(fp => ({
                id: fp.record_id,
                title: fp.businessplan_refName || fp.gruender_refName || 'Finanzplan',
                subtitle: fp.fields.startkapital != null
                  ? `Startkapital: ${formatCurrency(fp.fields.startkapital)}`
                  : undefined,
                icon: <IconCoin size={18} className="text-primary" />,
              }))}
              onSelect={handleFinanzplanSelect}
              searchPlaceholder="Finanzplan suchen..."
              emptyIcon={<IconCoin size={32} />}
              emptyText="Noch kein Finanzplan vorhanden."
              createLabel="Neuen Finanzplan"
              onCreateNew={() => setFpDialogOpen(true)}
              createDialog={
                <FinanzplanDialog
                  open={fpDialogOpen}
                  onClose={() => setFpDialogOpen(false)}
                  onSubmit={async (fields) => {
                    await LivingAppsService.createFinanzplanEntry(fields);
                    await fetchAll();
                  }}
                  defaultValues={{
                    ...(founderUrl ? { gruender_ref: founderUrl } : {}),
                    ...(businessplanUrl ? { businessplan_ref: businessplanUrl } : {}),
                  }}
                  gruenderprofilList={gruenderprofil}
                  businessplanList={businessplan}
                  enablePhotoScan={AI_PHOTO_SCAN['Finanzplan']}
                />
              }
            />

            {/* Live Financial Summary */}
            {selectedFinanzplan && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <IconTrendingUp size={18} className="text-primary" />
                    Finanzielle Ubersicht
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Capital Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <IconBuildingStore size={12} />
                        Startkapital
                      </p>
                      <p className="font-semibold text-lg">
                        {formatCurrency(selectedFinanzplan.fields.startkapital)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-green-50 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Eigenkapital</p>
                      <p className="font-semibold text-lg text-green-700">
                        {formatCurrency(selectedFinanzplan.fields.eigenkapital)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-orange-50 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Fremdkapital</p>
                      <p className="font-semibold text-lg text-orange-700">
                        {formatCurrency(selectedFinanzplan.fields.fremdkapital)}
                      </p>
                    </div>
                  </div>

                  {/* Revenue Forecast */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Umsatzprognose
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Jahr 1', value: selectedFinanzplan.fields.umsatz_jahr1 },
                        { label: 'Jahr 2', value: selectedFinanzplan.fields.umsatz_jahr2 },
                        { label: 'Jahr 3', value: selectedFinanzplan.fields.umsatz_jahr3 },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg border p-3 text-center">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-semibold text-sm mt-0.5">{formatCurrency(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Break Even */}
                  {selectedFinanzplan.fields.break_even != null && (
                    <div className="rounded-lg border bg-blue-50 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Break-Even-Punkt</p>
                      <p className="font-semibold text-blue-700">
                        {formatCurrency(selectedFinanzplan.fields.break_even)}
                      </p>
                      {selectedFinanzplan.fields.break_even_beschreibung && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {selectedFinanzplan.fields.break_even_beschreibung}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={goBack} className="gap-2">
                <IconArrowLeft size={16} />
                Zuruck
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!selectedFinanzplanId}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <IconCheck size={16} />
                Abschliessen
              </Button>
            </div>
          </div>
        )}
      </IntentWizardShell>
    </div>
  );
}
