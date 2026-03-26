import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichMeilensteine, enrichAufgaben } from '@/lib/enrich';
import type { EnrichedMeilensteine, EnrichedAufgaben } from '@/types/enriched';
import type { Phasen, Gruenderprofil } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AufgabenDialog } from '@/components/dialogs/AufgabenDialog';
import { MeilensteineDialog } from '@/components/dialogs/MeilensteineDialog';
import { PhasenDialog } from '@/components/dialogs/PhasenDialog';
import { GruenderprofilDialog } from '@/components/dialogs/GruenderprofilDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconPlus, IconPencil, IconTrash, IconChevronDown, IconChevronRight,
  IconCircleCheck, IconCircleDashed, IconCircleHalf2, IconFlag, IconTarget,
  IconUsers, IconMapPin, IconSquareCheck, IconListCheck, IconAlertTriangle,
  IconArrowRight, IconUser, IconRocket, IconBuildingStore, IconClipboardCheck,
} from '@tabler/icons-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── helpers ────────────────────────────────────────────────────────────────

function phaseStatusIcon(status: string | undefined) {
  if (status === 'abgeschlossen') return <IconCircleCheck size={18} className="text-green-500 shrink-0" />;
  if (status === 'in_arbeit') return <IconCircleHalf2 size={18} className="text-amber-500 shrink-0" />;
  return <IconCircleDashed size={18} className="text-muted-foreground shrink-0" />;
}

function ampelColor(key: string | undefined) {
  if (key === 'gruen') return 'bg-green-500';
  if (key === 'gelb') return 'bg-amber-400';
  if (key === 'rot') return 'bg-red-500';
  return 'bg-muted';
}

function msStatusBadge(key: string | undefined) {
  if (key === 'erreicht') return <Badge className="bg-green-100 text-green-800 border-green-200">Erreicht</Badge>;
  if (key === 'in_arbeit') return <Badge className="bg-amber-100 text-amber-800 border-amber-200">In Arbeit</Badge>;
  if (key === 'nicht_erreicht') return <Badge className="bg-red-100 text-red-800 border-red-200">Nicht erreicht</Badge>;
  return <Badge variant="outline">Offen</Badge>;
}

function aufgabeStatusBadge(key: string | undefined) {
  if (key === 'erledigt') return <Badge className="bg-green-100 text-green-800 border-green-200">Erledigt</Badge>;
  if (key === 'in_arbeit') return <Badge className="bg-amber-100 text-amber-800 border-amber-200">In Arbeit</Badge>;
  if (key === 'zurueckgestellt') return <Badge className="bg-slate-100 text-slate-600 border-slate-200">Zurückgestellt</Badge>;
  return <Badge variant="outline">Offen</Badge>;
}

function prioritaetDot(key: string | undefined) {
  if (key === 'hoch') return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 inline-block" />;
  if (key === 'mittel') return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0 inline-block" />;
}

// ─── main component ──────────────────────────────────────────────────────────

export default function DashboardOverview() {
  const {
    gruenderprofil, phasen, meilensteine, aufgaben,
    gruenderprofilMap, phasenMap, meilensteineMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedMeilensteine = enrichMeilensteine(meilensteine, { gruenderprofilMap, phasenMap });
  const enrichedAufgaben = enrichAufgaben(aufgaben, { gruenderprofilMap, phasenMap, meilensteineMap });

  // — state (ALL hooks before early returns!) —
  const [selectedGruenderId, setSelectedGruenderId] = useState<string>('all');
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Record<string, 'ms' | 'aufg' | null>>({});

  // dialogs
  const [aufgabeDialog, setAufgabeDialog] = useState<{ open: boolean; edit?: EnrichedAufgaben; prePhaseId?: string }>({ open: false });
  const [msDialog, setMsDialog] = useState<{ open: boolean; edit?: EnrichedMeilensteine; prePhaseId?: string }>({ open: false });
  const [phaseDialog, setPhaseDialog] = useState<{ open: boolean; edit?: Phasen }>({ open: false });
  const [gruenderDialog, setGruenderDialog] = useState<{ open: boolean; edit?: Gruenderprofil }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'aufgabe' | 'meilenstein' | 'phase' | 'gruender'; id: string } | null>(null);

  // — derived data —
  const sortedPhasen = useMemo(() => [...phasen].sort((a, b) => (a.fields.phasen_nr ?? 0) - (b.fields.phasen_nr ?? 0)), [phasen]);

  const activeGruender: Gruenderprofil | undefined = useMemo(() => {
    if (selectedGruenderId === 'all') return gruenderprofil[0];
    return gruenderprofil.find(g => g.record_id === selectedGruenderId);
  }, [selectedGruenderId, gruenderprofil]);

  const filteredMeilensteine = useMemo(() => {
    if (!activeGruender) return enrichedMeilensteine;
    const url = createRecordUrl(APP_IDS.GRUENDERPROFIL, activeGruender.record_id);
    return enrichedMeilensteine.filter(m => m.fields.gruender_ref === url || !m.fields.gruender_ref);
  }, [enrichedMeilensteine, activeGruender]);

  const filteredAufgaben = useMemo(() => {
    if (!activeGruender) return enrichedAufgaben;
    const url = createRecordUrl(APP_IDS.GRUENDERPROFIL, activeGruender.record_id);
    return enrichedAufgaben.filter(a => a.fields.gruender_ref === url || !a.fields.gruender_ref);
  }, [enrichedAufgaben, activeGruender]);

  // KPIs
  const totalAufgaben = filteredAufgaben.length;
  const erledigtAufgaben = filteredAufgaben.filter(a => a.fields.aufgabe_status?.key === 'erledigt').length;
  const offenAufgaben = filteredAufgaben.filter(a => a.fields.aufgabe_status?.key === 'offen' || !a.fields.aufgabe_status).length;
  const msDone = filteredMeilensteine.filter(m => m.fields.ms_status?.key === 'erreicht').length;
  const phaseDone = sortedPhasen.filter(p => p.fields.phase_status?.key === 'abgeschlossen').length;
  const activePhase = sortedPhasen.find(p => p.fields.phase_status?.key === 'in_arbeit');

  // — handlers —
  function togglePhase(id: string) {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSection(phaseId: string, section: 'ms' | 'aufg') {
    setExpandedSections(prev => ({
      ...prev,
      [phaseId]: prev[phaseId] === section ? null : section,
    }));
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'aufgabe') await LivingAppsService.deleteAufgabenEntry(deleteTarget.id);
    if (deleteTarget.type === 'meilenstein') await LivingAppsService.deleteMeilensteineEntry(deleteTarget.id);
    if (deleteTarget.type === 'phase') await LivingAppsService.deletePhasenEntry(deleteTarget.id);
    if (deleteTarget.type === 'gruender') await LivingAppsService.deleteGruenderprofilEntry(deleteTarget.id);
    setDeleteTarget(null);
    fetchAll();
  }

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* ── Workflows ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <IconRocket size={18} className="text-primary shrink-0" stroke={1.5} />
          <h2 className="text-base font-semibold text-foreground">Workflows</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="#/intents/phasen-setup" className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 border-l-4 border-l-primary min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconBuildingStore size={18} className="text-primary" stroke={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">Phase aufsetzen</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">Gründer auswählen, Phase befüllen mit Meilensteinen und Aufgaben</p>
            </div>
            <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
          </a>
          <a href="#/intents/phasen-abschluss" className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 border-l-4 border-l-primary min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconClipboardCheck size={18} className="text-primary" stroke={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">Phase abschließen</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">Meilensteine bewerten, Review dokumentieren und Phase formal abschließen</p>
            </div>
            <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
          </a>
        </div>
      </div>

      {/* ── Header / Gründer Selector ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">
            Existenzgründungs-Roadmap
          </h1>
          {activePhase && (
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <IconArrowRight size={14} className="shrink-0" />
              Aktive Phase: <span className="font-medium text-foreground">{activePhase.fields.phasen_name}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {gruenderprofil.length > 0 && (
            <Select value={selectedGruenderId} onValueChange={setSelectedGruenderId}>
              <SelectTrigger className="w-48">
                <IconUser size={14} className="shrink-0 mr-1" />
                <SelectValue placeholder="Gründer wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Gründer</SelectItem>
                {gruenderprofil.map(g => (
                  <SelectItem key={g.record_id} value={g.record_id}>
                    {g.fields.vorname} {g.fields.nachname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" onClick={() => setGruenderDialog({ open: true })}>
            <IconPlus size={14} className="shrink-0 mr-1" />
            Gründer
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPhaseDialog({ open: true })}>
            <IconPlus size={14} className="shrink-0 mr-1" />
            Phase
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Phasen abgeschlossen"
          value={`${phaseDone} / ${sortedPhasen.length}`}
          description="Roadmap-Fortschritt"
          icon={<IconMapPin size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Meilensteine erreicht"
          value={`${msDone} / ${filteredMeilensteine.length}`}
          description="Gesamte Meilensteine"
          icon={<IconFlag size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Aufgaben erledigt"
          value={`${erledigtAufgaben} / ${totalAufgaben}`}
          description={`${offenAufgaben} noch offen`}
          icon={<IconSquareCheck size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gründer"
          value={String(gruenderprofil.length)}
          description={activeGruender ? `${activeGruender.fields.vorname} ${activeGruender.fields.nachname}` : 'Keine Zuordnung'}
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* ── Gründerprofil Card (if selected) ── */}
      {activeGruender && (
        <div className="rounded-2xl border bg-card p-5 flex flex-wrap gap-4 items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-lg truncate">
                {activeGruender.fields.vorname} {activeGruender.fields.nachname}
              </span>
              {activeGruender.fields.branche && (
                <Badge variant="outline" className="shrink-0">{activeGruender.fields.branche.label}</Badge>
              )}
            </div>
            {activeGruender.fields.projektname && (
              <p className="text-sm font-medium text-primary truncate">{activeGruender.fields.projektname}</p>
            )}
            {activeGruender.fields.geschaeftsidee_kurz && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{activeGruender.fields.geschaeftsidee_kurz}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {activeGruender.fields.rechtsform_geplant && (
                <span>{activeGruender.fields.rechtsform_geplant.label}</span>
              )}
              {activeGruender.fields.gruendungsdatum_geplant && (
                <span>Gründung: {formatDate(activeGruender.fields.gruendungsdatum_geplant)}</span>
              )}
              {activeGruender.fields.email && (
                <span>{activeGruender.fields.email}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setGruenderDialog({ open: true, edit: activeGruender })}>
              <IconPencil size={14} className="shrink-0" />
            </Button>
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget({ type: 'gruender', id: activeGruender.record_id })}>
              <IconTrash size={14} className="shrink-0" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Phase Pipeline ── */}
      <div className="space-y-3">
        {sortedPhasen.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
            <IconListCheck size={48} className="text-muted-foreground mx-auto mb-3" stroke={1.5} />
            <p className="text-muted-foreground font-medium">Noch keine Phasen angelegt</p>
            <Button size="sm" className="mt-4" onClick={() => setPhaseDialog({ open: true })}>
              <IconPlus size={14} className="mr-1" /> Erste Phase erstellen
            </Button>
          </div>
        ) : (
          sortedPhasen.map((phase, idx) => {
            const isExpanded = expandedPhases.has(phase.record_id);
            const activeSection = expandedSections[phase.record_id] ?? null;
            const phaseUrl = createRecordUrl(APP_IDS.PHASEN, phase.record_id);
            const phaseMilestones = filteredMeilensteine.filter(m => m.fields.phase_ref === phaseUrl);
            const phaseAufgaben = filteredAufgaben.filter(a => a.fields.phase_ref === phaseUrl);
            const msErreicht = phaseMilestones.filter(m => m.fields.ms_status?.key === 'erreicht').length;
            const aufgErledigt = phaseAufgaben.filter(a => a.fields.aufgabe_status?.key === 'erledigt').length;
            const statusKey = phase.fields.phase_status?.key;
            const ampelKey = phase.fields.phase_ampel?.key;

            return (
              <div key={phase.record_id} className={`rounded-2xl border bg-card overflow-hidden transition-all ${statusKey === 'abgeschlossen' ? 'opacity-75' : ''}`}>
                {/* Phase Header */}
                <div className="flex items-center gap-3 p-4 cursor-pointer select-none hover:bg-accent/30 transition-colors"
                  onClick={() => togglePhase(phase.record_id)}>
                  {/* Phase number */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${statusKey === 'abgeschlossen' ? 'bg-green-100 text-green-700' : statusKey === 'in_arbeit' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {phase.fields.phasen_nr ?? idx + 1}
                  </div>

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {phaseStatusIcon(statusKey)}
                      <span className={`font-semibold truncate ${statusKey === 'abgeschlossen' ? 'line-through text-muted-foreground' : ''}`}>
                        {phase.fields.phasen_name ?? `Phase ${idx + 1}`}
                      </span>
                      {ampelKey && (
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ampelColor(ampelKey)}`} title={`Ampel: ${ampelKey}`} />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <IconTarget size={11} className="shrink-0" />
                        {msErreicht}/{phaseMilestones.length} Meilensteine
                      </span>
                      <span className="flex items-center gap-1">
                        <IconSquareCheck size={11} className="shrink-0" />
                        {aufgErledigt}/{phaseAufgaben.length} Aufgaben
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                      onClick={() => setPhaseDialog({ open: true, edit: phase })}>
                      <IconPencil size={13} className="shrink-0" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget({ type: 'phase', id: phase.record_id })}>
                      <IconTrash size={13} className="shrink-0" />
                    </Button>
                    {isExpanded ? <IconChevronDown size={16} className="text-muted-foreground shrink-0" /> : <IconChevronRight size={16} className="text-muted-foreground shrink-0" />}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Phase details */}
                    {(phase.fields.phasen_ziel || phase.fields.meilenstein_kriterien) && (
                      <div className="px-4 py-3 bg-muted/30 grid sm:grid-cols-2 gap-3 text-sm">
                        {phase.fields.phasen_ziel && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-0.5">Ziel der Phase</p>
                            <p className="text-foreground line-clamp-3">{phase.fields.phasen_ziel}</p>
                          </div>
                        )}
                        {phase.fields.meilenstein_kriterien && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-0.5">Meilenstein-Kriterien</p>
                            <p className="text-foreground line-clamp-3">{phase.fields.meilenstein_kriterien}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Section tabs */}
                    <div className="flex border-b border-border">
                      <button
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${activeSection === 'ms' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'}`}
                        onClick={() => toggleSection(phase.record_id, 'ms')}
                      >
                        <IconFlag size={14} className="shrink-0" />
                        Meilensteine ({phaseMilestones.length})
                      </button>
                      <button
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${activeSection === 'aufg' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'}`}
                        onClick={() => toggleSection(phase.record_id, 'aufg')}
                      >
                        <IconSquareCheck size={14} className="shrink-0" />
                        Aufgaben ({phaseAufgaben.length})
                      </button>
                    </div>

                    {/* Meilensteine list */}
                    {activeSection === 'ms' && (
                      <div className="p-3 space-y-2">
                        {phaseMilestones.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Noch keine Meilensteine</p>
                        ) : (
                          phaseMilestones.map(ms => (
                            <div key={ms.record_id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm truncate">{ms.fields.meilenstein_titel ?? 'Unbenannt'}</span>
                                  {msStatusBadge(ms.fields.ms_status?.key)}
                                  {ms.fields.ms_ampel?.key && (
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${ampelColor(ms.fields.ms_ampel?.key)}`} />
                                  )}
                                </div>
                                {ms.fields.meilenstein_beschreibung && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ms.fields.meilenstein_beschreibung}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                                  {ms.fields.zieltermin && <span>Termin: {formatDate(ms.fields.zieltermin)}</span>}
                                  {ms.fields.verantwortlich && <span>@{ms.fields.verantwortlich}</span>}
                                  {ms.fields.ko_kriterium_ja && (
                                    <span className="flex items-center gap-0.5 text-red-600">
                                      <IconAlertTriangle size={10} className="shrink-0" /> K.O.-Kriterium
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                                  onClick={() => setMsDialog({ open: true, edit: ms, prePhaseId: phase.record_id })}>
                                  <IconPencil size={12} className="shrink-0" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget({ type: 'meilenstein', id: ms.record_id })}>
                                  <IconTrash size={12} className="shrink-0" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                        <Button size="sm" variant="outline" className="w-full mt-1"
                          onClick={() => setMsDialog({ open: true, prePhaseId: phase.record_id })}>
                          <IconPlus size={14} className="mr-1" /> Meilenstein hinzufügen
                        </Button>
                      </div>
                    )}

                    {/* Aufgaben list */}
                    {activeSection === 'aufg' && (
                      <div className="p-3 space-y-2">
                        {phaseAufgaben.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Noch keine Aufgaben</p>
                        ) : (
                          phaseAufgaben.map(aufg => (
                            <div key={aufg.record_id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {prioritaetDot(aufg.fields.prioritaet?.key)}
                                  <span className={`font-medium text-sm truncate ${aufg.fields.aufgabe_status?.key === 'erledigt' ? 'line-through text-muted-foreground' : ''}`}>
                                    {aufg.fields.aufgabe_titel ?? 'Unbenannt'}
                                  </span>
                                  {aufgabeStatusBadge(aufg.fields.aufgabe_status?.key)}
                                  {aufg.fields.aufwand?.key && (
                                    <Badge variant="outline" className="text-xs">{aufg.fields.aufwand.key.toUpperCase()}</Badge>
                                  )}
                                </div>
                                {aufg.fields.aufgabe_beschreibung && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{aufg.fields.aufgabe_beschreibung}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                                  {aufg.fields.zieltermin_aufgabe && <span>Termin: {formatDate(aufg.fields.zieltermin_aufgabe)}</span>}
                                  {aufg.fields.verantwortlich_aufgabe && <span>@{aufg.fields.verantwortlich_aufgabe}</span>}
                                  {aufg.meilenstein_refName && <span>→ {aufg.meilenstein_refName}</span>}
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                                  onClick={() => setAufgabeDialog({ open: true, edit: aufg, prePhaseId: phase.record_id })}>
                                  <IconPencil size={12} className="shrink-0" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget({ type: 'aufgabe', id: aufg.record_id })}>
                                  <IconTrash size={12} className="shrink-0" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                        <Button size="sm" variant="outline" className="w-full mt-1"
                          onClick={() => setAufgabeDialog({ open: true, prePhaseId: phase.record_id })}>
                          <IconPlus size={14} className="mr-1" /> Aufgabe hinzufügen
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Dialogs ── */}
      <AufgabenDialog
        open={aufgabeDialog.open}
        onClose={() => setAufgabeDialog({ open: false })}
        onSubmit={async (fields) => {
          if (aufgabeDialog.edit) {
            await LivingAppsService.updateAufgabenEntry(aufgabeDialog.edit.record_id, fields);
          } else {
            await LivingAppsService.createAufgabenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={aufgabeDialog.edit
          ? {
              ...aufgabeDialog.edit.fields,
              phase_ref: aufgabeDialog.edit.fields.phase_ref,
            }
          : aufgabeDialog.prePhaseId
            ? { phase_ref: createRecordUrl(APP_IDS.PHASEN, aufgabeDialog.prePhaseId) }
            : undefined
        }
        gruenderprofilList={gruenderprofil}
        phasenList={phasen}
        meilensteineList={meilensteine}
        enablePhotoScan={AI_PHOTO_SCAN['Aufgaben']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Aufgaben']}
      />

      <MeilensteineDialog
        open={msDialog.open}
        onClose={() => setMsDialog({ open: false })}
        onSubmit={async (fields) => {
          if (msDialog.edit) {
            await LivingAppsService.updateMeilensteineEntry(msDialog.edit.record_id, fields);
          } else {
            await LivingAppsService.createMeilensteineEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={msDialog.edit
          ? {
              ...msDialog.edit.fields,
              phase_ref: msDialog.edit.fields.phase_ref,
            }
          : msDialog.prePhaseId
            ? { phase_ref: createRecordUrl(APP_IDS.PHASEN, msDialog.prePhaseId) }
            : undefined
        }
        gruenderprofilList={gruenderprofil}
        phasenList={phasen}
        enablePhotoScan={AI_PHOTO_SCAN['Meilensteine']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Meilensteine']}
      />

      <PhasenDialog
        open={phaseDialog.open}
        onClose={() => setPhaseDialog({ open: false })}
        onSubmit={async (fields) => {
          if (phaseDialog.edit) {
            await LivingAppsService.updatePhasenEntry(phaseDialog.edit.record_id, fields);
          } else {
            await LivingAppsService.createPhasenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={phaseDialog.edit?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Phasen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Phasen']}
      />

      <GruenderprofilDialog
        open={gruenderDialog.open}
        onClose={() => setGruenderDialog({ open: false })}
        onSubmit={async (fields) => {
          if (gruenderDialog.edit) {
            await LivingAppsService.updateGruenderprofilEntry(gruenderDialog.edit.record_id, fields);
          } else {
            await LivingAppsService.createGruenderprofilEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={gruenderDialog.edit?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Gruenderprofil']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Gruenderprofil']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description="Möchtest du diesen Eintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
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
