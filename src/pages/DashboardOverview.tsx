import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichAufgaben, enrichMeilensteine } from '@/lib/enrich';
import type { EnrichedAufgaben, EnrichedMeilensteine } from '@/types/enriched';
import type { Phasen, Aufgaben, Meilensteine } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AufgabenDialog } from '@/components/dialogs/AufgabenDialog';
import { MeilensteineDialog } from '@/components/dialogs/MeilensteineDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconPlus, IconPencil, IconTrash,
  IconChevronDown, IconChevronRight, IconCircleCheck,
  IconCircleDashed, IconCircleHalf, IconFlag,
  IconUsers, IconTarget, IconListCheck, IconRocket,
  IconAlertTriangle, IconClock, IconClipboardCheck, IconChartBar,
} from '@tabler/icons-react';

// ---- helpers ----

function ampelColor(key?: string) {
  if (key === 'gruen') return 'bg-emerald-500';
  if (key === 'gelb') return 'bg-amber-400';
  if (key === 'rot') return 'bg-red-500';
  return 'bg-muted-foreground/30';
}

function statusBadge(key?: string, label?: string) {
  const map: Record<string, string> = {
    offen: 'bg-muted text-muted-foreground',
    in_arbeit: 'bg-blue-100 text-blue-700',
    erledigt: 'bg-emerald-100 text-emerald-700',
    zurueckgestellt: 'bg-orange-100 text-orange-700',
    abgeschlossen: 'bg-emerald-100 text-emerald-700',
    erreicht: 'bg-emerald-100 text-emerald-700',
    nicht_erreicht: 'bg-red-100 text-red-700',
  };
  const cls = map[key ?? ''] ?? 'bg-muted text-muted-foreground';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label ?? key}</span>;
}

function prioritaetDot(key?: string) {
  if (key === 'hoch') return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Hoch" />;
  if (key === 'mittel') return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Mittel" />;
  if (key === 'niedrig') return <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Niedrig" />;
  return <span className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />;
}

function phaseStatusIcon(key?: string) {
  if (key === 'abgeschlossen') return <IconCircleCheck size={18} className="text-emerald-500 shrink-0" />;
  if (key === 'in_arbeit') return <IconCircleHalf size={18} className="text-blue-500 shrink-0" />;
  return <IconCircleDashed size={18} className="text-muted-foreground shrink-0" />;
}

// ---- sub-components ----

function TaskRow({
  task,
  onEdit,
  onDelete,
}: {
  task: EnrichedAufgaben;
  onEdit: (t: EnrichedAufgaben) => void;
  onDelete: (t: EnrichedAufgaben) => void;
}) {
  return (
    <div className="flex items-start gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 group">
      {prioritaetDot(task.fields.prioritaet?.key)}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.fields.aufgabe_titel ?? '(Ohne Titel)'}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {statusBadge(task.fields.aufgabe_status?.key, task.fields.aufgabe_status?.label)}
          {task.fields.zieltermin_aufgabe && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconClock size={12} />
              {formatDate(task.fields.zieltermin_aufgabe)}
            </span>
          )}
          {task.fields.aufwand?.label && (
            <span className="text-xs text-muted-foreground">{task.fields.aufwand.label}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(task)}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Bearbeiten"
        >
          <IconPencil size={14} />
        </button>
        <button
          onClick={() => onDelete(task)}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          title="Löschen"
        >
          <IconTrash size={14} />
        </button>
      </div>
    </div>
  );
}

function MilestoneRow({
  ms,
  onEdit,
  onDelete,
}: {
  ms: EnrichedMeilensteine;
  onEdit: (m: EnrichedMeilensteine) => void;
  onDelete: (m: EnrichedMeilensteine) => void;
}) {
  return (
    <div className="flex items-start gap-2 py-1.5 px-3 rounded-lg hover:bg-muted/50">
      <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${ampelColor(ms.fields.ms_ampel?.key)}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{ms.fields.meilenstein_titel ?? '(Ohne Titel)'}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {statusBadge(ms.fields.ms_status?.key, ms.fields.ms_status?.label)}
          {ms.fields.zieltermin && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconClock size={12} />
              {formatDate(ms.fields.zieltermin)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(ms)}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Bearbeiten"
        >
          <IconPencil size={14} />
        </button>
        <button
          onClick={() => onDelete(ms)}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          title="Löschen"
        >
          <IconTrash size={14} />
        </button>
      </div>
    </div>
  );
}

function PhaseCard({
  phase,
  index,
  tasks,
  milestones,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
}: {
  phase: Phasen;
  index: number;
  tasks: EnrichedAufgaben[];
  milestones: EnrichedMeilensteine[];
  onAddTask: (phaseId: string) => void;
  onEditTask: (t: EnrichedAufgaben) => void;
  onDeleteTask: (t: EnrichedAufgaben) => void;
  onAddMilestone: (phaseId: string) => void;
  onEditMilestone: (m: EnrichedMeilensteine) => void;
  onDeleteMilestone: (m: EnrichedMeilensteine) => void;
}) {
  const [expanded, setExpanded] = useState(
    phase.fields.phase_status?.key === 'in_arbeit' || index < 2
  );

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.fields.aufgabe_status?.key === 'erledigt').length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const statusKey = phase.fields.phase_status?.key;
  const ampelKey = phase.fields.phase_ampel?.key;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* Phase header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Phase number badge */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">{phase.fields.phasen_nr ?? index + 1}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {phaseStatusIcon(statusKey)}
            <span className="font-semibold text-base truncate">{phase.fields.phasen_name ?? 'Phase'}</span>
            {ampelKey && ampelKey !== 'gruen' && (
              <span className={`w-2.5 h-2.5 rounded-full ${ampelColor(ampelKey)} shrink-0`} />
            )}
          </div>
          {phase.fields.phasen_ziel && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{phase.fields.phasen_ziel}</p>
          )}
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Aufgaben</p>
            <p className="text-sm font-semibold">{doneTasks}/{totalTasks}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Meilensteine</p>
            <p className="text-sm font-semibold">{milestones.filter(m => m.fields.ms_status?.key === 'erreicht').length}/{milestones.length}</p>
          </div>
        </div>

        {expanded ? <IconChevronDown size={18} className="text-muted-foreground shrink-0" /> : <IconChevronRight size={18} className="text-muted-foreground shrink-0" />}
      </button>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="h-1 bg-muted mx-4 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <IconFlag size={13} />
                Meilensteine
              </h4>
              <button
                onClick={() => onAddMilestone(phase.record_id)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <IconPlus size={13} /> Neu
              </button>
            </div>
            {milestones.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-3">Noch keine Meilensteine</p>
            ) : (
              <div className="space-y-0.5">
                {milestones.map(ms => (
                  <MilestoneRow
                    key={ms.record_id}
                    ms={ms}
                    onEdit={onEditMilestone}
                    onDelete={onDeleteMilestone}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <IconListCheck size={13} />
                Aufgaben
              </h4>
              <button
                onClick={() => onAddTask(phase.record_id)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <IconPlus size={13} /> Neu
              </button>
            </div>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-3">Noch keine Aufgaben</p>
            ) : (
              <div className="space-y-0.5">
                {tasks.map(t => (
                  <TaskRow
                    key={t.record_id}
                    task={t}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- main dashboard ----

export default function DashboardOverview() {
  const {
    aufgaben, meilensteine, phasen, gruenderprofil,
    meilensteineMap, phasenMap, gruenderprofilMap,
    loading, error, fetchAll,
  } = useDashboardData();

  // Enrichment (keep all from skeleton)
  const enrichedAufgaben = useMemo(
    () => enrichAufgaben(aufgaben, { gruenderprofilMap, phasenMap, meilensteineMap }),
    [aufgaben, gruenderprofilMap, phasenMap, meilensteineMap]
  );
  const enrichedMeilensteine = useMemo(
    () => enrichMeilensteine(meilensteine, { gruenderprofilMap, phasenMap }),
    [meilensteine, gruenderprofilMap, phasenMap]
  );

  // UI State — ALL hooks before any early return
  const [aufgabenDialogOpen, setAufgabenDialogOpen] = useState(false);
  const [meilensteinDialogOpen, setMeilensteinDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<EnrichedAufgaben | null>(null);
  const [editMs, setEditMs] = useState<EnrichedMeilensteine | null>(null);
  const [deleteTask, setDeleteTask] = useState<EnrichedAufgaben | null>(null);
  const [deleteMs, setDeleteMs] = useState<EnrichedMeilensteine | null>(null);
  const [presetPhaseId, setPresetPhaseId] = useState<string | null>(null);

  // Derived stats (memoized)
  const stats = useMemo(() => {
    const totalAufgaben = aufgaben.length;
    const erledigtAufgaben = aufgaben.filter(a => a.fields.aufgabe_status?.key === 'erledigt').length;
    const offenHoch = aufgaben.filter(
      a => a.fields.prioritaet?.key === 'hoch' && a.fields.aufgabe_status?.key !== 'erledigt'
    ).length;
    const totalMs = meilensteine.length;
    const erreichtMs = meilensteine.filter(m => m.fields.ms_status?.key === 'erreicht').length;
    const aktivePhase = phasen.find(p => p.fields.phase_status?.key === 'in_arbeit');
    return { totalAufgaben, erledigtAufgaben, offenHoch, totalMs, erreichtMs, aktivePhase };
  }, [aufgaben, meilensteine, phasen, gruenderprofil]);

  // Sorted phases
  const sortedPhasen = useMemo(
    () => [...phasen].sort((a, b) => (a.fields.phasen_nr ?? 99) - (b.fields.phasen_nr ?? 99)),
    [phasen]
  );

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // ---- handlers ----

  function handleAddTask(phaseId: string) {
    setEditTask(null);
    setPresetPhaseId(phaseId);
    setAufgabenDialogOpen(true);
  }

  function handleEditTask(t: EnrichedAufgaben) {
    setEditTask(t);
    setPresetPhaseId(null);
    setAufgabenDialogOpen(true);
  }

  async function handleSubmitTask(fields: Aufgaben['fields']) {
    if (editTask) {
      await LivingAppsService.updateAufgabenEntry(editTask.record_id, fields);
    } else {
      await LivingAppsService.createAufgabenEntry(fields);
    }
    fetchAll();
  }

  async function handleDeleteTask() {
    if (!deleteTask) return;
    await LivingAppsService.deleteAufgabenEntry(deleteTask.record_id);
    setDeleteTask(null);
    fetchAll();
  }

  function handleAddMilestone(phaseId: string) {
    setEditMs(null);
    setPresetPhaseId(phaseId);
    setMeilensteinDialogOpen(true);
  }

  function handleEditMilestone(ms: EnrichedMeilensteine) {
    setEditMs(ms);
    setPresetPhaseId(null);
    setMeilensteinDialogOpen(true);
  }

  async function handleSubmitMilestone(fields: Meilensteine['fields']) {
    if (editMs) {
      await LivingAppsService.updateMeilensteineEntry(editMs.record_id, fields);
    } else {
      await LivingAppsService.createMeilensteineEntry(fields);
    }
    fetchAll();
  }

  async function handleDeleteMilestone() {
    if (!deleteMs) return;
    await LivingAppsService.deleteMeilensteineEntry(deleteMs.record_id);
    setDeleteMs(null);
    fetchAll();
  }

  // Build defaultValues for dialogs
  function taskDefaultValues(): Aufgaben['fields'] | undefined {
    if (editTask) return editTask.fields;
    if (presetPhaseId) {
      return {
        phase_ref: createRecordUrl(APP_IDS.PHASEN, presetPhaseId),
      };
    }
    return undefined;
  }

  function msDefaultValues(): Meilensteine['fields'] | undefined {
    if (editMs) return editMs.fields;
    if (presetPhaseId) {
      return {
        phase_ref: createRecordUrl(APP_IDS.PHASEN, presetPhaseId),
      };
    }
    return undefined;
  }

  // Aktive Gründer (first one for display)
  const firstGruender = gruenderprofil[0];

  return (
    <div className="space-y-6">
      {/* ── Workflow Navigation ── */}
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
          <IconRocket size={18} className="text-primary" />
          Workflows
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="#/intents/phase-review"
            className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconClipboardCheck size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Phasen-Review & Fortschritt</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">Phase aktualisieren · Meilensteine prüfen · Review erfassen · Sitzung protokollieren</p>
            </div>
            <IconChevronRight size={16} className="text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
          </a>
          <a
            href="#/intents/businessplan-setup"
            className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconChartBar size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Businessplan & Finanzplan</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">Businessplan erstellen · Finanzplan aufsetzen · Funding-Gap analysieren</p>
            </div>
            <IconChevronRight size={16} className="text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
          </a>
        </div>
      </div>

      {/* ── Hero header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {firstGruender?.fields.projektname ?? 'Meine Roadmap'}
          </h1>
          {firstGruender && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {firstGruender.fields.vorname} {firstGruender.fields.nachname}
              {firstGruender.fields.branche && ` · ${firstGruender.fields.branche.label}`}
              {firstGruender.fields.gruendungsdatum_geplant && ` · Geplant: ${formatDate(firstGruender.fields.gruendungsdatum_geplant)}`}
            </p>
          )}
        </div>
        {stats.aktivePhase && (
          <Badge variant="secondary" className="flex items-center gap-1.5 text-sm px-3 py-1 self-start">
            <IconCircleHalf size={14} className="text-blue-500" />
            Aktiv: {stats.aktivePhase.fields.phasen_name}
          </Badge>
        )}
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Aufgaben"
          value={`${stats.erledigtAufgaben}/${stats.totalAufgaben}`}
          description="Erledigt"
          icon={<IconListCheck size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Meilensteine"
          value={`${stats.erreichtMs}/${stats.totalMs}`}
          description="Erreicht"
          icon={<IconFlag size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Phasen"
          value={`${phasen.filter(p => p.fields.phase_status?.key === 'abgeschlossen').length}/${phasen.length}`}
          description="Abgeschlossen"
          icon={<IconTarget size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Hohe Priorität"
          value={String(stats.offenHoch)}
          description="Offene Aufgaben"
          icon={<IconAlertTriangle size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* ── Phasen-Roadmap ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <IconRocket size={20} className="text-primary" />
            Gründungs-Roadmap
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setEditTask(null); setPresetPhaseId(null); setAufgabenDialogOpen(true); }}
            >
              <IconPlus size={15} className="mr-1" />
              <span className="hidden sm:inline">Aufgabe</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setEditMs(null); setPresetPhaseId(null); setMeilensteinDialogOpen(true); }}
            >
              <IconPlus size={15} className="mr-1" />
              <span className="hidden sm:inline">Meilenstein</span>
            </Button>
          </div>
        </div>

        {sortedPhasen.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border rounded-2xl bg-muted/20">
            <IconRocket size={40} stroke={1.5} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Noch keine Phasen angelegt.</p>
            <Button size="sm" variant="outline" asChild>
              <a href="#/phasen">Phasen anlegen</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedPhasen.map((phase, idx) => {
              const phaseTasks = enrichedAufgaben.filter(t => {
                const phaseRef = t.fields.phase_ref;
                if (!phaseRef) return false;
                return phaseRef.endsWith(phase.record_id);
              });
              const phaseMilestones = enrichedMeilensteine.filter(ms => {
                const phaseRef = ms.fields.phase_ref;
                if (!phaseRef) return false;
                return phaseRef.endsWith(phase.record_id);
              });

              return (
                <PhaseCard
                  key={phase.record_id}
                  phase={phase}
                  index={idx}
                  tasks={phaseTasks}
                  milestones={phaseMilestones}
                  onAddTask={handleAddTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={setDeleteTask}
                  onAddMilestone={handleAddMilestone}
                  onEditMilestone={handleEditMilestone}
                  onDeleteMilestone={setDeleteMs}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Orphaned tasks (no phase) ── */}
      {enrichedAufgaben.filter(t => !t.fields.phase_ref).length > 0 && (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <IconListCheck size={16} className="text-muted-foreground" />
            <span className="font-semibold text-sm">Aufgaben ohne Phase</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {enrichedAufgaben.filter(t => !t.fields.phase_ref).length}
            </span>
          </div>
          <div className="px-4 py-2 space-y-0.5">
            {enrichedAufgaben.filter(t => !t.fields.phase_ref).map(t => (
              <TaskRow
                key={t.record_id}
                task={t}
                onEdit={handleEditTask}
                onDelete={setDeleteTask}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Gründer overview ── */}
      {gruenderprofil.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <IconUsers size={16} className="text-muted-foreground" />
            Gründerprofil
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gruenderprofil.map(g => (
              <div key={g.record_id} className="rounded-xl bg-muted/40 px-4 py-3">
                <p className="font-semibold text-sm">{g.fields.vorname} {g.fields.nachname}</p>
                {g.fields.projektname && <p className="text-xs text-primary font-medium mt-0.5 truncate">{g.fields.projektname}</p>}
                {g.fields.branche && <p className="text-xs text-muted-foreground mt-1">{g.fields.branche.label}</p>}
                {g.fields.rechtsform_geplant && (
                  <p className="text-xs text-muted-foreground">{g.fields.rechtsform_geplant.label}</p>
                )}
                {g.fields.berater_vorname && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Berater/in: {g.fields.berater_vorname} {g.fields.berater_nachname}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      <AufgabenDialog
        open={aufgabenDialogOpen}
        onClose={() => { setAufgabenDialogOpen(false); setEditTask(null); setPresetPhaseId(null); }}
        onSubmit={handleSubmitTask}
        defaultValues={taskDefaultValues()}
        gruenderprofilList={gruenderprofil}
        phasenList={phasen}
        meilensteineList={meilensteine}
        enablePhotoScan={AI_PHOTO_SCAN['Aufgaben']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Aufgaben']}
      />

      <MeilensteineDialog
        open={meilensteinDialogOpen}
        onClose={() => { setMeilensteinDialogOpen(false); setEditMs(null); setPresetPhaseId(null); }}
        onSubmit={handleSubmitMilestone}
        defaultValues={msDefaultValues()}
        gruenderprofilList={gruenderprofil}
        phasenList={phasen}
        enablePhotoScan={AI_PHOTO_SCAN['Meilensteine']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Meilensteine']}
      />

      <ConfirmDialog
        open={!!deleteTask}
        title="Aufgabe löschen"
        description={`„${deleteTask?.fields.aufgabe_titel ?? 'Diese Aufgabe'}" wirklich löschen?`}
        onConfirm={handleDeleteTask}
        onClose={() => setDeleteTask(null)}
      />

      <ConfirmDialog
        open={!!deleteMs}
        title="Meilenstein löschen"
        description={`„${deleteMs?.fields.meilenstein_titel ?? 'Dieser Meilenstein'}" wirklich löschen?`}
        onConfirm={handleDeleteMilestone}
        onClose={() => setDeleteMs(null)}
      />
    </div>
  );
}

// ---- skeleton / error ----

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
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
