import type { Aufgaben, Gruenderprofil, Phasen, Meilensteine } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface AufgabenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Aufgaben | null;
  onEdit: (record: Aufgaben) => void;
  gruenderprofilList: Gruenderprofil[];
  phasenList: Phasen[];
  meilensteineList: Meilensteine[];
}

export function AufgabenViewDialog({ open, onClose, record, onEdit, gruenderprofilList, phasenList, meilensteineList }: AufgabenViewDialogProps) {
  function getGruenderprofilDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return gruenderprofilList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  function getPhasenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return phasenList.find(r => r.record_id === id)?.fields.phasen_name ?? '—';
  }

  function getMeilensteineDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return meilensteineList.find(r => r.record_id === id)?.fields.meilenstein_titel ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aufgaben anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gründer</Label>
            <p className="text-sm">{getGruenderprofilDisplayName(record.fields.gruender_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Phase</Label>
            <p className="text-sm">{getPhasenDisplayName(record.fields.phase_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Meilenstein (optional)</Label>
            <p className="text-sm">{getMeilensteineDisplayName(record.fields.meilenstein_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aufgabentitel</Label>
            <p className="text-sm">{record.fields.aufgabe_titel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung / Vorgehen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.aufgabe_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aufwand</Label>
            <Badge variant="secondary">{record.fields.aufwand?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Priorität</Label>
            <Badge variant="secondary">{record.fields.prioritaet?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Benötigte Vorlage / Tool</Label>
            <p className="text-sm">{record.fields.vorlage_tool ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.aufgabe_status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zieltermin</Label>
            <p className="text-sm">{formatDate(record.fields.zieltermin_aufgabe)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verantwortlich</Label>
            <p className="text-sm">{record.fields.verantwortlich_aufgabe ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen / Ergebnisse</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.ergebnis_notiz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dokument hochladen (optional)</Label>
            {record.fields.aufgabe_dokument ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.aufgabe_dokument} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}