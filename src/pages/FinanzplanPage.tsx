import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Finanzplan, Gruenderprofil, Businessplan } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconFileText } from '@tabler/icons-react';
import { FinanzplanDialog } from '@/components/dialogs/FinanzplanDialog';
import { FinanzplanViewDialog } from '@/components/dialogs/FinanzplanViewDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

export default function FinanzplanPage() {
  const [records, setRecords] = useState<Finanzplan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Finanzplan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Finanzplan | null>(null);
  const [viewingRecord, setViewingRecord] = useState<Finanzplan | null>(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [gruenderprofilList, setGruenderprofilList] = useState<Gruenderprofil[]>([]);
  const [businessplanList, setBusinessplanList] = useState<Businessplan[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, gruenderprofilData, businessplanData] = await Promise.all([
        LivingAppsService.getFinanzplan(),
        LivingAppsService.getGruenderprofil(),
        LivingAppsService.getBusinessplan(),
      ]);
      setRecords(mainData);
      setGruenderprofilList(gruenderprofilData);
      setBusinessplanList(businessplanData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: Finanzplan['fields']) {
    await LivingAppsService.createFinanzplanEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: Finanzplan['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateFinanzplanEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteFinanzplanEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

  function getGruenderprofilDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return gruenderprofilList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  function getBusinessplanDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return businessplanList.find(r => r.record_id === id)?.fields.bp_titel ?? '—';
  }

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(r.fields).some(v => {
      if (v == null) return false;
      if (Array.isArray(v)) return v.some(item => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
      if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
      return String(v).toLowerCase().includes(s);
    });
  });

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageShell
      title="Finanzplan"
      subtitle={`${records.length} Finanzplan im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0 rounded-full shadow-sm">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Finanzplan suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-[27px] bg-card shadow-lg overflow-hidden">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gruender_ref')}>
                <span className="inline-flex items-center gap-1">
                  Gründer
                  {sortKey === 'gruender_ref' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('businessplan_ref')}>
                <span className="inline-flex items-center gap-1">
                  Businessplan
                  {sortKey === 'businessplan_ref' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('startkapital')}>
                <span className="inline-flex items-center gap-1">
                  Startkapitalbedarf (EUR)
                  {sortKey === 'startkapital' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('eigenkapital')}>
                <span className="inline-flex items-center gap-1">
                  Eigenkapital (EUR)
                  {sortKey === 'eigenkapital' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('fremdkapital')}>
                <span className="inline-flex items-center gap-1">
                  Fremdkapital (EUR)
                  {sortKey === 'fremdkapital' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kapitalverwendung')}>
                <span className="inline-flex items-center gap-1">
                  Verwendung des Kapitals
                  {sortKey === 'kapitalverwendung' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('umsatz_jahr1')}>
                <span className="inline-flex items-center gap-1">
                  Umsatzplanung Jahr 1 (EUR)
                  {sortKey === 'umsatz_jahr1' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('umsatz_jahr2')}>
                <span className="inline-flex items-center gap-1">
                  Umsatzplanung Jahr 2 (EUR)
                  {sortKey === 'umsatz_jahr2' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('umsatz_jahr3')}>
                <span className="inline-flex items-center gap-1">
                  Umsatzplanung Jahr 3 (EUR)
                  {sortKey === 'umsatz_jahr3' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kosten_fix')}>
                <span className="inline-flex items-center gap-1">
                  Fixkosten pro Monat (EUR)
                  {sortKey === 'kosten_fix' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kosten_var')}>
                <span className="inline-flex items-center gap-1">
                  Variable Kosten pro Monat (EUR)
                  {sortKey === 'kosten_var' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kostenbeschreibung')}>
                <span className="inline-flex items-center gap-1">
                  Kostenbeschreibung
                  {sortKey === 'kostenbeschreibung' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('liquiditaet_start')}>
                <span className="inline-flex items-center gap-1">
                  Startliquidität (EUR)
                  {sortKey === 'liquiditaet_start' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('liquiditaetsplanung')}>
                <span className="inline-flex items-center gap-1">
                  Liquiditätsplanung
                  {sortKey === 'liquiditaetsplanung' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('break_even')}>
                <span className="inline-flex items-center gap-1">
                  Break-Even-Umsatz (EUR)
                  {sortKey === 'break_even' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('break_even_beschreibung')}>
                <span className="inline-flex items-center gap-1">
                  Break-Even-Beschreibung
                  {sortKey === 'break_even_beschreibung' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rentabilitaet')}>
                <span className="inline-flex items-center gap-1">
                  Rentabilitätsvorschau Jahr 1 (EUR)
                  {sortKey === 'rentabilitaet' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('fp_datei')}>
                <span className="inline-flex items-center gap-1">
                  Finanzplan hochladen (optional)
                  {sortKey === 'fp_datei' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewingRecord(record); }}>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getGruenderprofilDisplayName(record.fields.gruender_ref)}</span></TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getBusinessplanDisplayName(record.fields.businessplan_ref)}</span></TableCell>
                <TableCell>{record.fields.startkapital ?? '—'}</TableCell>
                <TableCell>{record.fields.eigenkapital ?? '—'}</TableCell>
                <TableCell>{record.fields.fremdkapital ?? '—'}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.kapitalverwendung ?? '—'}</span></TableCell>
                <TableCell>{record.fields.umsatz_jahr1 ?? '—'}</TableCell>
                <TableCell>{record.fields.umsatz_jahr2 ?? '—'}</TableCell>
                <TableCell>{record.fields.umsatz_jahr3 ?? '—'}</TableCell>
                <TableCell>{record.fields.kosten_fix ?? '—'}</TableCell>
                <TableCell>{record.fields.kosten_var ?? '—'}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.kostenbeschreibung ?? '—'}</span></TableCell>
                <TableCell>{record.fields.liquiditaet_start ?? '—'}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.liquiditaetsplanung ?? '—'}</span></TableCell>
                <TableCell>{record.fields.break_even ?? '—'}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.break_even_beschreibung ?? '—'}</span></TableCell>
                <TableCell>{record.fields.rentabilitaet ?? '—'}</TableCell>
                <TableCell>{record.fields.fp_datei ? <div className="relative h-8 w-8 rounded bg-muted overflow-hidden"><div className="absolute inset-0 flex items-center justify-center"><IconFileText size={14} className="text-muted-foreground" /></div><img src={record.fields.fp_datei} alt="" className="relative h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /></div> : '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingRecord(record)}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(record)}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={19} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Finanzplan. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FinanzplanDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        gruenderprofilList={gruenderprofilList}
        businessplanList={businessplanList}
        enablePhotoScan={AI_PHOTO_SCAN['Finanzplan']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Finanzplan']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Finanzplan löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />

      <FinanzplanViewDialog
        open={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
        onEdit={(r) => { setViewingRecord(null); setEditingRecord(r); }}
        gruenderprofilList={gruenderprofilList}
        businessplanList={businessplanList}
      />
    </PageShell>
  );
}