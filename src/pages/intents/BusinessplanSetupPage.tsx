import { useState, useEffect, useCallback } from 'react';
import type { Gruenderprofil, Businessplan, Finanzplan, Phasen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formatCurrency } from '@/lib/formatters';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { BudgetTracker } from '@/components/BudgetTracker';
import { BusinessplanDialog } from '@/components/dialogs/BusinessplanDialog';
import { FinanzplanDialog } from '@/components/dialogs/FinanzplanDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  IconUser,
  IconFileText,
  IconCheck,
  IconMinus,
  IconPencil,
  IconDownload,
  IconAlertTriangle,
  IconCircleCheck,
  IconChevronDown,
  IconChevronRight,
} from '@tabler/icons-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const WIZARD_STEPS = [
  { label: 'Gründer' },
  { label: 'Businessplan' },
  { label: 'Prüfen' },
  { label: 'Finanzplan' },
  { label: 'Analyse' },
];

const BP_SECTIONS: { key: keyof Businessplan['fields']; label: string }[] = [
  { key: 'executive_summary', label: 'Executive Summary' },
  { key: 'unternehmenskonzept', label: 'Unternehmenskonzept' },
  { key: 'marktanalyse', label: 'Marktanalyse' },
  { key: 'wettbewerbsanalyse', label: 'Wettbewerbsanalyse' },
  { key: 'marketingstrategie', label: 'Marketingstrategie' },
  { key: 'betriebsplan', label: 'Betriebsplan' },
  { key: 'team', label: 'Team' },
  { key: 'swot_analyse', label: 'SWOT-Analyse' },
];

function getUrlParams(): { gruenderId: string | null; step: number | null } {
  const hash = window.location.hash;
  const qIdx = hash.indexOf('?');
  if (qIdx === -1) return { gruenderId: null, step: null };
  const params = new URLSearchParams(hash.slice(qIdx + 1));
  const gruenderId = params.get('gruenderId');
  const stepRaw = parseInt(params.get('step') ?? '', 10);
  const step = isNaN(stepRaw) ? null : stepRaw;
  return { gruenderId, step };
}

export default function BusinessplanSetupPage() {
  // --- All state hooks first (before any early returns) ---
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const { step } = getUrlParams();
    return step && step >= 1 && step <= 5 ? step : 1;
  });

  const [gruenderprofil, setGruenderprofil] = useState<Gruenderprofil[]>([]);
  const [businessplanList, setBusinessplanList] = useState<Businessplan[]>([]);
  const [finanzplanList, setFinanzplanList] = useState<Finanzplan[]>([]);
  const [phasenList, setPhasenList] = useState<Phasen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [selectedGruenderId, setSelectedGruenderId] = useState<string | null>(() => {
    const { gruenderId } = getUrlParams();
    return gruenderId;
  });
  const [selectedBpId, setSelectedBpId] = useState<string | null>(null);
  const [selectedFpId, setSelectedFpId] = useState<string | null>(null);

  const [bpDialogOpen, setBpDialogOpen] = useState(false);
  const [bpEditDialogOpen, setBpEditDialogOpen] = useState(false);
  const [fpDialogOpen, setFpDialogOpen] = useState(false);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [gData, bpData, fpData, pData] = await Promise.all([
        LivingAppsService.getGruenderprofil(),
        LivingAppsService.getBusinessplan(),
        LivingAppsService.getFinanzplan(),
        LivingAppsService.getPhasen(),
      ]);
      setGruenderprofil(gData);
      setBusinessplanList(bpData);
      setFinanzplanList(fpData);
      setPhasenList(pData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Derived data
  const selectedGruender = gruenderprofil.find(g => g.record_id === selectedGruenderId) ?? null;
  const filteredBp = businessplanList.filter(
    bp => selectedGruenderId && extractRecordId(bp.fields.gruender_ref) === selectedGruenderId
  );
  const selectedBp = filteredBp.find(bp => bp.record_id === selectedBpId) ?? null;
  const filteredFp = finanzplanList.filter(
    fp => selectedGruenderId && extractRecordId(fp.fields.gruender_ref) === selectedGruenderId
  );
  const selectedFp = filteredFp.find(fp => fp.record_id === selectedFpId) ?? null;

  // Business plan completeness
  const filledSections = selectedBp
    ? BP_SECTIONS.filter(s => {
        const val = selectedBp.fields[s.key];
        return val !== undefined && val !== null && String(val).trim() !== '';
      })
    : [];
  const completeness = BP_SECTIONS.length > 0 ? (filledSections.length / BP_SECTIONS.length) * 100 : 0;

  // Finanzplan numbers
  const startkapital = selectedFp?.fields.startkapital ?? 0;
  const eigenkapital = selectedFp?.fields.eigenkapital ?? 0;
  const fremdkapital = selectedFp?.fields.fremdkapital ?? 0;
  const totalFinancing = eigenkapital + fremdkapital;
  const fundingGap = startkapital - totalFinancing;

  function handleStepChange(step: number) {
    setCurrentStep(step);
  }

  function handleSelectGruender(id: string) {
    setSelectedGruenderId(id);
    setSelectedBpId(null);
    setSelectedFpId(null);
    setCurrentStep(2);
  }

  function handleSelectBp(id: string) {
    setSelectedBpId(id);
    setCurrentStep(3);
  }

  function handleSelectFp(id: string) {
    setSelectedFpId(id);
    setCurrentStep(5);
  }

  function toggleSection(key: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <IntentWizardShell
      title="Businessplan & Finanzplan erstellen"
      subtitle="Erstelle oder vervollstandige Businessplan und Finanzplan fur einen Gruender"
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Gründer auswählen */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Gründer auswählen</h2>
            <p className="text-sm text-muted-foreground">Wähle den Gründer aus, für den der Businessplan erstellt werden soll.</p>
          </div>
          <EntitySelectStep
            items={gruenderprofil.map(g => ({
              id: g.record_id,
              title: [g.fields.vorname, g.fields.nachname].filter(Boolean).join(' ') || g.record_id,
              subtitle: g.fields.projektname ?? g.fields.geschaeftsidee_kurz,
              status: g.fields.branche
                ? { key: g.fields.branche.key, label: g.fields.branche.label }
                : undefined,
              icon: <IconUser size={18} className="text-primary/70" />,
            }))}
            onSelect={handleSelectGruender}
            searchPlaceholder="Gründer suchen..."
            emptyText="Keine Gründer gefunden."
            emptyIcon={<IconUser size={32} />}
          />
        </div>
      )}

      {/* Step 2: Businessplan auswählen oder erstellen */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold mb-1">Businessplan auswählen</h2>
              <p className="text-sm text-muted-foreground">
                Wähle einen bestehenden Businessplan für{' '}
                <span className="font-medium text-foreground">
                  {[selectedGruender?.fields.vorname, selectedGruender?.fields.nachname].filter(Boolean).join(' ')}
                </span>{' '}
                aus oder erstelle einen neuen.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="shrink-0 text-muted-foreground">
              Zurück
            </Button>
          </div>

          <EntitySelectStep
            items={filteredBp.map(bp => {
              const phaseId = extractRecordId(bp.fields.phase_ref);
              const phase = phaseId ? phasenList.find(p => p.record_id === phaseId) : undefined;
              const summary = bp.fields.executive_summary;
              return {
                id: bp.record_id,
                title: bp.fields.bp_titel ?? 'Businessplan',
                subtitle: summary ? (summary.length > 80 ? summary.slice(0, 80) + '…' : summary) : undefined,
                status: phase ? { key: 'aktiv', label: phase.fields.phasen_name ?? 'Phase' } : undefined,
                icon: <IconFileText size={18} className="text-primary/70" />,
              };
            })}
            onSelect={handleSelectBp}
            searchPlaceholder="Businessplan suchen..."
            emptyText="Noch kein Businessplan für diesen Gründer."
            emptyIcon={<IconFileText size={32} />}
            createLabel="Neuen Businessplan erstellen"
            onCreateNew={() => setBpDialogOpen(true)}
            createDialog={
              <BusinessplanDialog
                open={bpDialogOpen}
                onClose={() => setBpDialogOpen(false)}
                onSubmit={async (fields) => {
                  await LivingAppsService.createBusinessplanEntry({
                    ...fields,
                    gruender_ref: createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruenderId!),
                  });
                  await fetchAll();
                }}
                defaultValues={
                  selectedGruenderId
                    ? { gruender_ref: createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruenderId) }
                    : undefined
                }
                gruenderprofilList={gruenderprofil}
                phasenList={phasenList}
                enablePhotoScan={AI_PHOTO_SCAN['Businessplan']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Businessplan']}
              />
            }
          />

          {/* Auto-select newly created BP */}
          {filteredBp.length > 0 && !selectedBpId && (
            <p className="text-xs text-muted-foreground text-center">
              {filteredBp.length} Businessplan{filteredBp.length !== 1 ? 'e' : ''} gefunden — wähle einen aus oder erstelle einen neuen.
            </p>
          )}
        </div>
      )}

      {/* Step 3: Businessplan-Inhalte prüfen */}
      {currentStep === 3 && selectedBp && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold mb-1">{selectedBp.fields.bp_titel ?? 'Businessplan'}</h2>
              <p className="text-sm text-muted-foreground">Prüfe die Vollständigkeit der Businessplan-Abschnitte.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)} className="text-muted-foreground">
                Zurück
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBpEditDialogOpen(true)}
              >
                <IconPencil size={14} className="mr-1.5" />
                Bearbeiten
              </Button>
            </div>
          </div>

          {/* Vollständigkeit progress bar */}
          <Card className="p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Vollständigkeit</span>
              <span className="text-sm font-semibold text-primary">{filledSections.length} / {BP_SECTIONS.length}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {Math.round(completeness)}% der Abschnitte ausgefüllt
            </p>
          </Card>

          {/* Section cards */}
          <div className="space-y-2">
            {BP_SECTIONS.map(section => {
              const val = selectedBp.fields[section.key];
              const filled = val !== undefined && val !== null && String(val).trim() !== '';
              const expanded = expandedSections.has(section.key);
              return (
                <div
                  key={section.key}
                  className="rounded-xl border bg-card overflow-hidden"
                >
                  <button
                    className="w-full flex items-center gap-3 p-3 text-left"
                    onClick={() => filled && toggleSection(section.key)}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${filled ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      {filled
                        ? <IconCheck size={13} stroke={2.5} />
                        : <IconMinus size={13} stroke={2} />
                      }
                    </div>
                    <span className={`flex-1 text-sm font-medium ${filled ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {section.label}
                    </span>
                    {filled && (
                      expanded
                        ? <IconChevronDown size={15} className="text-muted-foreground shrink-0" />
                        : <IconChevronRight size={15} className="text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {filled && expanded && (
                    <div className="px-4 pb-3 pt-0">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">{String(val)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Download link */}
          {selectedBp.fields.bp_datei && (
            <a
              href={selectedBp.fields.bp_datei}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <IconDownload size={15} />
              Businessplan herunterladen
            </a>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={() => setCurrentStep(4)}>
              Weiter zum Finanzplan
              <IconChevronRight size={16} className="ml-1.5" />
            </Button>
          </div>

          {/* Edit dialog */}
          <BusinessplanDialog
            open={bpEditDialogOpen}
            onClose={() => setBpEditDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.updateBusinessplanEntry(selectedBp.record_id, fields);
              await fetchAll();
            }}
            defaultValues={selectedBp.fields}
            gruenderprofilList={gruenderprofil}
            phasenList={phasenList}
            enablePhotoScan={AI_PHOTO_SCAN['Businessplan']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Businessplan']}
          />
        </div>
      )}

      {/* Step 4: Finanzplan auswählen oder erstellen */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold mb-1">Finanzplan auswählen</h2>
              <p className="text-sm text-muted-foreground">
                Wähle einen bestehenden Finanzplan aus oder erstelle einen neuen.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)} className="shrink-0 text-muted-foreground">
              Zurück
            </Button>
          </div>

          <EntitySelectStep
            items={filteredFp.map(fp => {
              const sk = fp.fields.startkapital ?? 0;
              const ek = fp.fields.eigenkapital ?? 0;
              const fk = fp.fields.fremdkapital ?? 0;
              const hasBreakEven = fp.fields.break_even !== undefined && fp.fields.break_even !== null;
              return {
                id: fp.record_id,
                title: 'Finanzplan',
                subtitle: `Startkapital: ${formatCurrency(sk)} · EK: ${formatCurrency(ek)} · FK: ${formatCurrency(fk)}`,
                status: hasBreakEven
                  ? { key: 'aktiv', label: 'Break-Even definiert' }
                  : { key: 'offen', label: 'Kein Break-Even' },
              };
            })}
            onSelect={handleSelectFp}
            searchPlaceholder="Finanzplan suchen..."
            emptyText="Noch kein Finanzplan für diesen Gründer."
            emptyIcon={<IconFileText size={32} />}
            createLabel="Neuen Finanzplan erstellen"
            onCreateNew={() => setFpDialogOpen(true)}
            createDialog={
              <FinanzplanDialog
                open={fpDialogOpen}
                onClose={() => setFpDialogOpen(false)}
                onSubmit={async (fields) => {
                  await LivingAppsService.createFinanzplanEntry({
                    ...fields,
                    gruender_ref: createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruenderId!),
                    businessplan_ref: selectedBpId
                      ? createRecordUrl(APP_IDS.BUSINESSPLAN, selectedBpId)
                      : fields.businessplan_ref,
                  });
                  await fetchAll();
                }}
                defaultValues={
                  selectedGruenderId
                    ? {
                        gruender_ref: createRecordUrl(APP_IDS.GRUENDERPROFIL, selectedGruenderId),
                        businessplan_ref: selectedBpId
                          ? createRecordUrl(APP_IDS.BUSINESSPLAN, selectedBpId)
                          : undefined,
                      }
                    : undefined
                }
                gruenderprofilList={gruenderprofil}
                businessplanList={filteredBp}
                enablePhotoScan={AI_PHOTO_SCAN['Finanzplan']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Finanzplan']}
              />
            }
          />

          {/* Mini budget tracker preview if a FP is available */}
          {filteredFp.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Vorschau — erster Finanzplan</p>
              {(() => {
                const fp = filteredFp[0];
                const sk = fp.fields.startkapital ?? 0;
                const ek = fp.fields.eigenkapital ?? 0;
                const fk = fp.fields.fremdkapital ?? 0;
                return (
                  <BudgetTracker
                    budget={sk}
                    booked={ek + fk}
                    label="Kapitaldeckung"
                  />
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Step 5: Finanzplan-Überblick & Funding-Gap */}
      {currentStep === 5 && selectedFp && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold mb-1">Finanzplan-Analyse</h2>
              <p className="text-sm text-muted-foreground">Überblick über Finanzierung, Umsatz und Funding-Gap.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep(4)} className="shrink-0 text-muted-foreground">
              Zurück
            </Button>
          </div>

          {/* Funding Gap Banner */}
          {fundingGap > 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800">
              <IconAlertTriangle size={20} className="shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-sm">Finanzierungslücke: {formatCurrency(fundingGap)} fehlen</p>
                <p className="text-xs mt-0.5 text-red-700">Eigenkapital + Fremdkapital decken den Startkapitalbedarf nicht vollständig.</p>
              </div>
            </div>
          ) : startkapital > 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 bg-green-50 text-green-800">
              <IconCircleCheck size={20} className="shrink-0 text-green-600" />
              <div>
                <p className="font-semibold text-sm">Finanzierung gedeckt</p>
                <p className="text-xs mt-0.5 text-green-700">Der Startkapitalbedarf ist durch Eigen- und Fremdkapital vollständig gedeckt.</p>
              </div>
            </div>
          ) : null}

          {/* Kapitalstruktur */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Kapitalstruktur</h3>
            <BudgetTracker
              budget={startkapital}
              booked={totalFinancing}
              label="Startkapitalbedarf"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-3 overflow-hidden">
                <p className="text-xs text-muted-foreground mb-1">Eigenkapital</p>
                <p className="text-base font-semibold truncate">{formatCurrency(eigenkapital)}</p>
              </Card>
              <Card className="p-3 overflow-hidden">
                <p className="text-xs text-muted-foreground mb-1">Fremdkapital</p>
                <p className="text-base font-semibold truncate">{formatCurrency(fremdkapital)}</p>
              </Card>
              <Card className="p-3 overflow-hidden">
                <p className="text-xs text-muted-foreground mb-1">Startkapitalbedarf</p>
                <p className="text-base font-semibold truncate">{formatCurrency(startkapital)}</p>
              </Card>
            </div>
          </div>

          {/* Umsatzplanung 3 Jahre */}
          {(selectedFp.fields.umsatz_jahr1 ?? selectedFp.fields.umsatz_jahr2 ?? selectedFp.fields.umsatz_jahr3) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Umsatzplanung 3 Jahre</h3>
              <Card className="p-4 overflow-hidden">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={[
                      { name: 'Jahr 1', umsatz: selectedFp.fields.umsatz_jahr1 ?? 0 },
                      { name: 'Jahr 2', umsatz: selectedFp.fields.umsatz_jahr2 ?? 0 },
                      { name: 'Jahr 3', umsatz: selectedFp.fields.umsatz_jahr3 ?? 0 },
                    ]}
                  >
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Umsatz']}
                    />
                    <Bar dataKey="umsatz" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* Kosten & Kennzahlen */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Kosten & Kennzahlen</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedFp.fields.kosten_fix !== undefined && (
                <Card className="p-3 overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Fixkosten / Monat</p>
                  <p className="text-base font-semibold">{formatCurrency(selectedFp.fields.kosten_fix)}</p>
                </Card>
              )}
              {selectedFp.fields.kosten_var !== undefined && (
                <Card className="p-3 overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Variable Kosten / Monat</p>
                  <p className="text-base font-semibold">{formatCurrency(selectedFp.fields.kosten_var)}</p>
                </Card>
              )}
              {selectedFp.fields.break_even !== undefined && (
                <Card className="p-3 overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Break-Even-Umsatz</p>
                  <p className="text-base font-semibold">{formatCurrency(selectedFp.fields.break_even)}</p>
                </Card>
              )}
              {selectedFp.fields.rentabilitaet !== undefined && (
                <Card className="p-3 overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Rentabilität Jahr 1</p>
                  <p className="text-base font-semibold">{formatCurrency(selectedFp.fields.rentabilitaet)}</p>
                </Card>
              )}
              {selectedFp.fields.liquiditaet_start !== undefined && (
                <Card className="p-3 overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Startliquidität</p>
                  <p className="text-base font-semibold">{formatCurrency(selectedFp.fields.liquiditaet_start)}</p>
                </Card>
              )}
            </div>
          </div>

          {/* Completion summary */}
          <Card className="p-4 space-y-3 overflow-hidden">
            <h3 className="text-sm font-semibold">Zusammenfassung</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <IconCheck size={15} className="text-green-600 shrink-0" />
                <span className="text-muted-foreground">Gründer:</span>
                <span className="font-medium truncate min-w-0">
                  {[selectedGruender?.fields.vorname, selectedGruender?.fields.nachname].filter(Boolean).join(' ') || '—'}
                </span>
              </div>
              {selectedGruender?.fields.projektname && (
                <div className="flex items-center gap-2">
                  <IconCheck size={15} className="text-green-600 shrink-0" />
                  <span className="text-muted-foreground">Projekt:</span>
                  <span className="font-medium truncate min-w-0">{selectedGruender.fields.projektname}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <IconCheck size={15} className="text-green-600 shrink-0" />
                <span className="text-muted-foreground">Businessplan:</span>
                <span className="font-medium truncate min-w-0">
                  {selectedBp?.fields.bp_titel ?? 'Nicht ausgewählt'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <IconCheck size={15} className="text-green-600 shrink-0" />
                <span className="text-muted-foreground">Vollständigkeit:</span>
                <span className="font-medium">{Math.round(completeness)}% ({filledSections.length}/{BP_SECTIONS.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCheck size={15} className="text-green-600 shrink-0" />
                <span className="text-muted-foreground">Startkapital:</span>
                <span className="font-medium">{formatCurrency(startkapital)}</span>
              </div>
              <div className="flex items-center gap-2">
                {fundingGap > 0
                  ? <IconAlertTriangle size={15} className="text-red-500 shrink-0" />
                  : <IconCheck size={15} className="text-green-600 shrink-0" />
                }
                <span className="text-muted-foreground">Finanzierung:</span>
                <span className={`font-medium ${fundingGap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {fundingGap > 0 ? `Lücke: ${formatCurrency(fundingGap)}` : 'Gedeckt'}
                </span>
              </div>
            </div>
          </Card>

          <div className="flex justify-between pt-2">
            <a
              href="#/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Zurück zur Übersicht
            </a>
            <Button
              variant="outline"
              onClick={() => {
                setCurrentStep(1);
                setSelectedGruenderId(null);
                setSelectedBpId(null);
                setSelectedFpId(null);
              }}
            >
              Neuen Plan erstellen
            </Button>
          </div>
        </div>
      )}

      {/* Fallback: step 3 or 5 without a selection */}
      {currentStep === 3 && !selectedBp && (
        <div className="text-center py-12 text-muted-foreground space-y-3">
          <p className="text-sm">Kein Businessplan ausgewählt.</p>
          <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
            Zurück zu Schritt 2
          </Button>
        </div>
      )}

      {currentStep === 5 && !selectedFp && (
        <div className="text-center py-12 text-muted-foreground space-y-3">
          <p className="text-sm">Kein Finanzplan ausgewählt.</p>
          <Button variant="outline" size="sm" onClick={() => setCurrentStep(4)}>
            Zurück zu Schritt 4
          </Button>
        </div>
      )}
    </IntentWizardShell>
  );
}
