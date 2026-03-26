import type { VorlagenTools, Phasen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';

interface VorlagenToolsViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: VorlagenTools | null;
  onEdit: (record: VorlagenTools) => void;
  phasenList: Phasen[];
}

export function VorlagenToolsViewDialog({ open, onClose, record, onEdit, phasenList }: VorlagenToolsViewDialogProps) {
  function getPhasenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return phasenList.find(r => r.record_id === id)?.fields.phasen_name ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vorlagen & Tools anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Phase</Label>
            <p className="text-sm">{getPhasenDisplayName(record.fields.phase_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name der Vorlage / des Tools</Label>
            <p className="text-sm">{record.fields.vorlage_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Typ</Label>
            <Badge variant="secondary">{record.fields.tool_typ?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zweck der Vorlage</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.vorlage_zweck ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kerninhalte (Stichpunkte)</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.kerninhalte ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorlage hochladen (optional)</Label>
            {record.fields.vorlage_datei ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.vorlage_datei} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Link zur Vorlage / zum Tool</Label>
            <p className="text-sm">{record.fields.vorlage_link ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hinweise zur Nutzung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.vorlage_notiz ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}