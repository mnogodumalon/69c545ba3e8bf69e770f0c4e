import type { RoadmapCockpit, Gruenderprofil, Phasen, Meilensteine } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface RoadmapCockpitViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: RoadmapCockpit | null;
  onEdit: (record: RoadmapCockpit) => void;
  gruenderprofilList: Gruenderprofil[];
  phasenList: Phasen[];
  meilensteineList: Meilensteine[];
}

export function RoadmapCockpitViewDialog({ open, onClose, record, onEdit, gruenderprofilList, phasenList, meilensteineList }: RoadmapCockpitViewDialogProps) {
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
          <DialogTitle>Roadmap-Cockpit anzeigen</DialogTitle>
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
            <Label className="text-xs text-muted-foreground">Sitzungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.sitzungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bearbeitete Phase</Label>
            <p className="text-sm">{getPhasenDisplayName(record.fields.phase_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Adressierte Meilensteine</Label>
            <p className="text-sm">{getMeilensteineDisplayName(record.fields.meilensteine_refs)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aktueller Phasenstatus (Ampel)</Label>
            <Badge variant="secondary">{record.fields.phase_ampel_aktuell?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sitzungszusammenfassung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.sitzungs_zusammenfassung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nächste Schritte</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.naechste_schritte ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nächster Sitzungstermin</Label>
            <p className="text-sm">{formatDate(record.fields.naechste_sitzung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Weitere Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.cockpit_notiz ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}