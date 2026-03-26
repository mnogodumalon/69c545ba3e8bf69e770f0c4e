import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichMeilensteine, enrichAufgaben, enrichRoadmapCockpit } from '@/lib/enrich';
import type { EnrichedMeilensteine, EnrichedAufgaben } from '@/types/enriched';
import type { Phasen, Gruenderprofil, Aufgaben, Meilensteine } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MeilensteineDialog } from '@/components/dialogs/MeilensteineDialog';
import { AufgabenDialog } from '@/components/dialogs/AufgabenDialog';
import { PhasenDialog } from '@/components/dialogs/PhasenDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import {
  IconAlertCircle,
  IconPlus,
  IconPencil,
  IconTrash,
  IconFlag,
  IconListCheck,
  IconTarget,
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleDotted,
  IconCircleX,
  IconChevronDown,
  IconChevronRight,
  IconUser,
  IconBuilding,
  IconCalendar,
  IconTrendingUp,
  IconClockHour4,
  IconRocket,
  IconUserPlus,
  IconClipboardCheck,
} from '@tabler/icons-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function ampelColor(key?: string): string {
  if (key === 'grün' || key === 'grün-auf kurs') return 'text-green-600 bg-green-50';
  if (key === 'gelb' || key === 'gelb-verzögerung') return 'text-yellow-600 bg-yellow-50';
  if (key === 'rot' || key === 'rot-kritisch') return 'text-red-600 bg-red-50';
  return 'text-muted-foreground bg-muted';
}

function statusIcon(key?: string) {
  if (key === 'erreicht' || key === 'erledigt' || key === 'abgeschlossen') return <IconCircleCheck size={15} className="text-green-600 shrink-0" />;
  if (key === 'in_arbeit') return <IconCircleDotted size={15} className="text-blue-500 shrink-0" />;
  if (key === 'nicht_erreicht') return <IconCircleX size={15} className="text-red-500 shrink-0" />;
  return <IconCircleDotted size={15} className="text-muted-foreground shrink-0" />;
}

function prioritaetBadge(key?: string) {
  if (key === 'hoch') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Hoch</span>;
  if (key === 'mittel') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Mittel</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">Niedrig</span>;
}

// ── main component ────────────────────────────────────────────────────────────

export default function DashboardOverview() {
  const {
    meilensteine, aufgaben, gruenderprofil, phasen, roadmapCockpit,
    gruenderprofilMap, phasenMap, meilensteineMap,
    loading, error, fetchAll,
  } = useDashboardData();

  // ── state ──────────────────────────────────────────────────────────────────
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  const [msDialogOpen, setMsDialogOpen] = useState(false);
  const [msEdit, setMsEdit] = useState<EnrichedMeilensteine | null>(null);
  const [msDeleteTarget, setMsDeleteTarget] = useState<EnrichedMeilensteine | null>(null);

  const [aufgabeDialogOpen, setAufgabeDialogOpen] = useState(false);
  const [aufgabeEdit, setAufgabeEdit] = useState<EnrichedAufgaben | null>(null);
  const [aufgabeDeleteTarget, setAufgabeDeleteTarget] = useState<EnrichedAufgaben | null>(null);
  const [aufgabeDefaultMilestoneId, setAufgabeDefaultMilestoneId] = useState<string | undefined>(undefined);
  const [aufgabeDefaultPhaseId, setAufgabeDefaultPhaseId] = useState<string | undefined>(undefined);

  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const [phaseEdit, setPhaseEdit] = useState<Phasen | null>(null);

  // ── enrichment ─────────────────────────────────────────────────────────────
  const enrichedMeilensteine = enrichMeilensteine(meilensteine, { gruenderprofilMap, phasenMap });
  const enrichedAufgaben = enrichAufgaben(aufgaben, { gruenderprofilMap, phasenMap, meilensteineMap });
  const enrichedRoadmapCockpit = enrichRoadmapCockpit(roadmapCockpit, { gruenderprofilMap, phasenMap, meilensteineMap });

  // ── derived data ───────────────────────────────────────────────────────────
  const sortedPhasen = useMemo(
    () => [...phasen].sort((a, b) => (a.fields.phasen_nr ?? 0) - (b.fields.phasen_nr ?? 0)),
    [phasen]
  );

  const activePhaseFallback = useMemo(() => {
    const inArbeit = sortedPhasen.find(p => p.fields.phase_status?.key === 'in_arbeit');
    return inArbeit ?? sortedPhasen.find(p => p.fields.phase_status?.key === 'offen') ?? sortedPhasen[0] ?? null;
  }, [sortedPhasen]);

  const activePhaseId = selectedPhaseId ?? activePhaseFallback?.record_id ?? null;
  const activePhase = phasen.find(p => p.record_id === activePhaseId) ?? null;

  const msForPhase = useMemo(
    () => enrichedMeilensteine.filter(m => {
      if (!activePhaseId) return true;
      const phaseIdFromMs = m.fields.phase_ref ? m.fields.phase_ref.split('/').pop() : null;
      return phaseIdFromMs === activePhaseId;
    }),
    [enrichedMeilensteine, activePhaseId]
  );

  const aufgabenForPhase = useMemo(
    () => enrichedAufgaben.filter(a => {
      if (!activePhaseId) return true;
      const phaseIdFromA = a.fields.phase_ref ? a.fields.phase_ref.split('/').pop() : null;
      return phaseIdFromA === activePhaseId;
    }),
    [enrichedAufgaben, activePhaseId]
  );

  const primaryFounder: Gruenderprofil | null = gruenderprofil[0] ?? null;

  const totalTasks = enrichedAufgaben.length;
  const doneTasks = enrichedAufgaben.filter(a => a.fields.aufgabe_status?.key === 'erledigt').length;
  const openMs = enrichedMeilensteine.filter(m => m.fields.ms_status?.key === 'offen' || m.fields.ms_status?.key === 'in_arbeit').length;
  const latestCockpit = enrichedRoadmapCockpit.sort((a, b) =>
    (b.fields.sitzungsdatum ?? '').localeCompare(a.fields.sitzungsdatum ?? '')
  )[0] ?? null;

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleMsSubmit = async (fields: Meilensteine['fields']) => {
    if (msEdit) {
      await LivingAppsService.updateMeilensteineEntry(msEdit.record_id, fields);
    } else {
      await LivingAppsService.createMeilensteineEntry(fields);
    }
    fetchAll();
  };

  const handleMsDelete = async () => {
    if (!msDeleteTarget) return;
    await LivingAppsService.deleteMeilensteineEntry(msDeleteTarget.record_id);
    setMsDeleteTarget(null);
    fetchAll();
  };

  const handleAufgabeSubmit = async (fields: Aufgaben['fields']) => {
    if (aufgabeEdit) {
      await LivingAppsService.updateAufgabenEntry(aufgabeEdit.record_id, fields);
    } else {
      await LivingAppsService.createAufgabenEntry(fields);
    }
    fetchAll();
  };

  const handleAufgabeDelete = async () => {
    if (!aufgabeDeleteTarget) return;
    await LivingAppsService.deleteAufgabenEntry(aufgabeDeleteTarget.record_id);
    setAufgabeDeleteTarget(null);
    fetchAll();
  };

  const handlePhaseSubmit = async (fields: Phasen['fields']) => {
    if (phaseEdit) {
      await LivingAppsService.updatePhasenEntry(phaseEdit.record_id, fields);
    } else {
      await LivingAppsService.createPhasenEntry(fields);
    }
    fetchAll();
  };

  const toggleMilestone = (id: string) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openNewAufgabe = (milestoneId?: string, phaseId?: string) => {
    setAufgabeEdit(null);
    setAufgabeDefaultMilestoneId(milestoneId);
    setAufgabeDefaultPhaseId(phaseId);
    setAufgabeDialogOpen(true);
  };

  const openNewMs = () => {
    setMsEdit(null);
    setMsDialogOpen(true);
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Workflows */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <IconRocket size={18} className="text-primary shrink-0" />
          <h2 className="text-sm font-semibold text-foreground">Workflows</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="#/intents/gruender-setup" className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 overflow-hidden border-l-4 border-l-primary">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconUserPlus size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">Gründer Setup</p>
              <p className="text-xs text-muted-foreground line-clamp-2">Neues Gründerprofil anlegen, Phasen definieren, Businessplan und Finanzplan erstellen.</p>
            </div>
            <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
          </a>
          <a href="#/intents/phase-review" className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 overflow-hidden border-l-4 border-l-primary">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconClipboardCheck size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">Phasen-Review</p>
              <p className="text-xs text-muted-foreground line-clamp-2">Meilensteine prüfen, Review durchführen, Cockpit-Eintrag erstellen und Phase abschließen.</p>
            </div>
            <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
          </a>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Phasen"
          value={`${sortedPhasen.filter(p => p.fields.phase_status?.key === 'abgeschlossen').length}/${sortedPhasen.length}`}
          description="abgeschlossen"
          icon={<IconFlag size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Meilensteine"
          value={String(openMs)}
          description="offen / in Arbeit"
          icon={<IconTarget size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Aufgaben"
          value={`${doneTasks}/${totalTasks}`}
          description="erledigt"
          icon={<IconListCheck size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Ampel"
          value={latestCockpit?.fields.phase_ampel_aktuell?.label ?? '–'}
          description="aktueller Status"
          icon={<IconTrendingUp size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Founder + latest cockpit summary */}
      {(primaryFounder || latestCockpit) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {primaryFounder && (
            <div className="rounded-2xl border bg-card p-4 space-y-2 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <IconUser size={16} className="text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-foreground truncate">
                  {primaryFounder.fields.vorname} {primaryFounder.fields.nachname}
                </span>
              </div>
              {primaryFounder.fields.projektname && (
                <div className="flex items-center gap-2">
                  <IconBuilding size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">{primaryFounder.fields.projektname}</span>
                </div>
              )}
              {primaryFounder.fields.branche && (
                <Badge variant="secondary" className="text-xs">{primaryFounder.fields.branche.label}</Badge>
              )}
              {primaryFounder.fields.gruendungsdatum_geplant && (
                <div className="flex items-center gap-2">
                  <IconCalendar size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Gründung geplant: {formatDate(primaryFounder.fields.gruendungsdatum_geplant)}</span>
                </div>
              )}
              {primaryFounder.fields.geschaeftsidee_kurz && (
                <p className="text-xs text-muted-foreground line-clamp-2">{primaryFounder.fields.geschaeftsidee_kurz}</p>
              )}
            </div>
          )}
          {latestCockpit && (
            <div className="rounded-2xl border bg-card p-4 space-y-2 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <IconClockHour4 size={16} className="text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-foreground">Letzte Sitzung</span>
                {latestCockpit.fields.sitzungsdatum && (
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">{formatDate(latestCockpit.fields.sitzungsdatum)}</span>
                )}
              </div>
              {latestCockpit.fields.phase_ampel_aktuell && (
                <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${ampelColor(latestCockpit.fields.phase_ampel_aktuell.key)}`}>
                  {latestCockpit.fields.phase_ampel_aktuell.label}
                </span>
              )}
              {latestCockpit.fields.sitzungs_zusammenfassung && (
                <p className="text-xs text-muted-foreground line-clamp-3">{latestCockpit.fields.sitzungs_zusammenfassung}</p>
              )}
              {latestCockpit.fields.naechste_schritte && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-0.5">Nächste Schritte:</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{latestCockpit.fields.naechste_schritte}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Phase selector */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-foreground">Roadmap-Phasen</h2>
          <Button size="sm" variant="outline" onClick={() => { setPhaseEdit(null); setPhaseDialogOpen(true); }}>
            <IconPlus size={14} className="shrink-0 mr-1" />
            <span className="hidden sm:inline">Phase</span>
          </Button>
        </div>
        {sortedPhasen.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <IconFlag size={32} stroke={1.5} />
            <p className="text-sm">Noch keine Phasen angelegt.</p>
          </div>
        ) : (
          <div className="flex gap-0 overflow-x-auto">
            {sortedPhasen.map((phase, idx) => {
              const isActive = phase.record_id === activePhaseId;
              const msCount = enrichedMeilensteine.filter(m => m.fields.phase_ref?.split('/').pop() === phase.record_id).length;
              const msDone = enrichedMeilensteine.filter(m =>
                m.fields.phase_ref?.split('/').pop() === phase.record_id &&
                m.fields.ms_status?.key === 'erreicht'
              ).length;
              return (
                <button
                  key={phase.record_id}
                  onClick={() => setSelectedPhaseId(isActive ? null : phase.record_id)}
                  className={`flex-1 min-w-[100px] text-left px-3 py-3 border-r last:border-r-0 transition-colors ${isActive ? 'bg-primary/5 border-b-2 border-b-primary' : 'hover:bg-muted/50'}`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs text-muted-foreground font-mono shrink-0">{idx + 1}</span>
                    {phase.fields.phase_ampel && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${phase.fields.phase_ampel.key === 'grün' ? 'bg-green-500' : phase.fields.phase_ampel.key === 'gelb' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">{phase.fields.phasen_name ?? `Phase ${idx + 1}`}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{msDone}/{msCount} MS</p>
                  {phase.fields.phase_status && (
                    <span className={`inline-block text-[9px] mt-1 px-1.5 py-0.5 rounded-full font-medium ${phase.fields.phase_status.key === 'abgeschlossen' ? 'bg-green-100 text-green-700' : phase.fields.phase_status.key === 'in_arbeit' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      {phase.fields.phase_status.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Active phase detail */}
      {activePhase && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Phase info sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border bg-card p-4 overflow-hidden">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-foreground truncate">{activePhase.fields.phasen_name}</h3>
                <Button size="icon" variant="ghost" className="shrink-0 h-7 w-7" onClick={() => { setPhaseEdit(activePhase); setPhaseDialogOpen(true); }}>
                  <IconPencil size={13} />
                </Button>
              </div>
              {activePhase.fields.phase_status && (
                <Badge variant="outline" className="text-xs mb-2">{activePhase.fields.phase_status.label}</Badge>
              )}
              {activePhase.fields.phasen_ziel && (
                <p className="text-xs text-muted-foreground line-clamp-4">{activePhase.fields.phasen_ziel}</p>
              )}
              {activePhase.fields.meilenstein_kriterien && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-foreground mb-0.5">Meilenstein-Kriterien:</p>
                  <p className="text-xs text-muted-foreground line-clamp-3">{activePhase.fields.meilenstein_kriterien}</p>
                </div>
              )}
            </div>

            {/* Tasks without milestone */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b">
                <span className="text-xs font-semibold text-foreground">Aufgaben (Phase)</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openNewAufgabe(undefined, activePhase.record_id)}>
                  <IconPlus size={13} />
                </Button>
              </div>
              {aufgabenForPhase.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">Keine Aufgaben für diese Phase.</div>
              ) : (
                <div className="divide-y max-h-64 overflow-y-auto">
                  {aufgabenForPhase.map(a => (
                    <div key={a.record_id} className="flex items-start gap-2 px-3 py-2">
                      {statusIcon(a.fields.aufgabe_status?.key)}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${a.fields.aufgabe_status?.key === 'erledigt' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {a.fields.aufgabe_titel ?? '(Aufgabe)'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {prioritaetBadge(a.fields.prioritaet?.key)}
                          {a.fields.zieltermin_aufgabe && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <IconCalendar size={10} />
                              {formatDate(a.fields.zieltermin_aufgabe)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => { setAufgabeEdit(a); setAufgabeDialogOpen(true); }}>
                          <IconPencil size={11} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => setAufgabeDeleteTarget(a)}>
                          <IconTrash size={11} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Milestones with tasks */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Meilensteine</h3>
              <Button size="sm" variant="outline" onClick={openNewMs}>
                <IconPlus size={14} className="shrink-0 mr-1" />
                <span className="hidden sm:inline">Meilenstein</span>
              </Button>
            </div>
            {msForPhase.length === 0 ? (
              <div className="rounded-2xl border bg-card flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <IconTarget size={32} stroke={1.5} />
                <p className="text-sm">Keine Meilensteine für diese Phase.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {msForPhase.map(ms => {
                  const isExpanded = expandedMilestones.has(ms.record_id);
                  const msAufgaben = enrichedAufgaben.filter(a =>
                    a.fields.meilenstein_ref?.split('/').pop() === ms.record_id
                  );
                  const doneCount = msAufgaben.filter(a => a.fields.aufgabe_status?.key === 'erledigt').length;

                  return (
                    <div key={ms.record_id} className="rounded-xl border bg-card overflow-hidden">
                      {/* Milestone header */}
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        {statusIcon(ms.fields.ms_status?.key)}
                        <button
                          className="flex-1 min-w-0 text-left flex items-center gap-2"
                          onClick={() => toggleMilestone(ms.record_id)}
                        >
                          <span className="text-sm font-medium text-foreground truncate">
                            {ms.fields.meilenstein_titel ?? '(Meilenstein)'}
                          </span>
                          {ms.fields.ko_kriterium_ja && (
                            <IconAlertTriangle size={13} className="text-orange-500 shrink-0" title="KO-Kriterium" />
                          )}
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          {ms.fields.ms_ampel && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ampelColor(ms.fields.ms_ampel.key)}`}>
                              {ms.fields.ms_ampel.label}
                            </span>
                          )}
                          {ms.fields.zieltermin && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <IconCalendar size={10} />
                              {formatDate(ms.fields.zieltermin)}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">{doneCount}/{msAufgaben.length}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setMsEdit(ms); setMsDialogOpen(true); }}>
                            <IconPencil size={12} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setMsDeleteTarget(ms)}>
                            <IconTrash size={12} />
                          </Button>
                          <button onClick={() => toggleMilestone(ms.record_id)} className="p-0.5 text-muted-foreground hover:text-foreground">
                            {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded: tasks under milestone */}
                      {isExpanded && (
                        <div className="border-t bg-muted/30">
                          {ms.fields.meilenstein_beschreibung && (
                            <p className="text-xs text-muted-foreground px-4 pt-2 pb-1 line-clamp-2">{ms.fields.meilenstein_beschreibung}</p>
                          )}
                          {msAufgaben.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-muted-foreground italic">Keine Aufgaben</div>
                          ) : (
                            <div className="divide-y">
                              {msAufgaben.map(a => (
                                <div key={a.record_id} className="flex items-start gap-2 px-4 py-2">
                                  {statusIcon(a.fields.aufgabe_status?.key)}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs truncate ${a.fields.aufgabe_status?.key === 'erledigt' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                      {a.fields.aufgabe_titel ?? '(Aufgabe)'}
                                    </p>
                                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                      {prioritaetBadge(a.fields.prioritaet?.key)}
                                      {a.fields.zieltermin_aufgabe && (
                                        <span className="text-[10px] text-muted-foreground">{formatDate(a.fields.zieltermin_aufgabe)}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => { setAufgabeEdit(a); setAufgabeDialogOpen(true); }}>
                                      <IconPencil size={11} />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => setAufgabeDeleteTarget(a)}>
                                      <IconTrash size={11} />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="px-4 pb-2 pt-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => openNewAufgabe(ms.record_id, activePhase.record_id)}>
                              <IconPlus size={12} className="mr-1 shrink-0" />
                              Aufgabe hinzufügen
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress bar per phase */}
      {sortedPhasen.length > 0 && (
        <div className="rounded-2xl border bg-card p-4 overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground mb-3">Fortschritt je Phase</h3>
          <div className="space-y-2">
            {sortedPhasen.map((phase, idx) => {
              const pAufgaben = enrichedAufgaben.filter(a => a.fields.phase_ref?.split('/').pop() === phase.record_id);
              const pDone = pAufgaben.filter(a => a.fields.aufgabe_status?.key === 'erledigt').length;
              const pct = pAufgaben.length > 0 ? Math.round((pDone / pAufgaben.length) * 100) : 0;
              const pMs = enrichedMeilensteine.filter(m => m.fields.phase_ref?.split('/').pop() === phase.record_id);
              const pMsDone = pMs.filter(m => m.fields.ms_status?.key === 'erreicht').length;
              return (
                <div key={phase.record_id} className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-muted-foreground w-4 shrink-0 font-mono">{idx + 1}</span>
                  <span className="text-xs text-foreground truncate w-28 shrink-0">{phase.fields.phasen_name ?? `Phase ${idx + 1}`}</span>
                  <div className="flex-1 bg-muted rounded-full h-2 min-w-0 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 w-10 text-right">{pct}%</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">
                    {pMsDone}/{pMs.length} MS · {pDone}/{pAufgaben.length} A
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <MeilensteineDialog
        open={msDialogOpen}
        onClose={() => { setMsDialogOpen(false); setMsEdit(null); }}
        onSubmit={handleMsSubmit}
        defaultValues={msEdit ? {
          ...msEdit.fields,
          phase_ref: msEdit.fields.phase_ref,
          gruender_ref: msEdit.fields.gruender_ref,
        } : activePhaseId ? {
          phase_ref: createRecordUrl(APP_IDS.PHASEN, activePhaseId),
        } : undefined}
        gruenderprofilList={gruenderprofil}
        phasenList={phasen}
        enablePhotoScan={AI_PHOTO_SCAN['Meilensteine']}
      />

      <AufgabenDialog
        open={aufgabeDialogOpen}
        onClose={() => { setAufgabeDialogOpen(false); setAufgabeEdit(null); }}
        onSubmit={handleAufgabeSubmit}
        defaultValues={aufgabeEdit ? {
          ...aufgabeEdit.fields,
        } : {
          ...(aufgabeDefaultPhaseId ? { phase_ref: createRecordUrl(APP_IDS.PHASEN, aufgabeDefaultPhaseId) } : {}),
          ...(aufgabeDefaultMilestoneId ? { meilenstein_ref: createRecordUrl(APP_IDS.MEILENSTEINE, aufgabeDefaultMilestoneId) } : {}),
        }}
        gruenderprofilList={gruenderprofil}
        phasenList={phasen}
        meilensteineList={meilensteine}
        enablePhotoScan={AI_PHOTO_SCAN['Aufgaben']}
      />

      <PhasenDialog
        open={phaseDialogOpen}
        onClose={() => { setPhaseDialogOpen(false); setPhaseEdit(null); }}
        onSubmit={handlePhaseSubmit}
        defaultValues={phaseEdit?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Phasen']}
      />

      <ConfirmDialog
        open={!!msDeleteTarget}
        title="Meilenstein löschen"
        description={`„${msDeleteTarget?.fields.meilenstein_titel}" wirklich löschen?`}
        onConfirm={handleMsDelete}
        onClose={() => setMsDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!aufgabeDeleteTarget}
        title="Aufgabe löschen"
        description={`„${aufgabeDeleteTarget?.fields.aufgabe_titel}" wirklich löschen?`}
        onConfirm={handleAufgabeDelete}
        onClose={() => setAufgabeDeleteTarget(null)}
      />
    </div>
  );
}

// ── skeleton / error ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-14 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}

