import type { Phasen } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface PhasenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Phasen | null;
  onEdit: (record: Phasen) => void;
}

export function PhasenViewDialog({ open, onClose, record, onEdit }: PhasenViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Phasen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Phasennummer (1–10)</Label>
            <p className="text-sm">{record.fields.phasen_nr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Phasenname</Label>
            <p className="text-sm">{record.fields.phasen_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ziel der Phase</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.phasen_ziel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Meilenstein-Kriterien (Phase bestanden, wenn …)</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.meilenstein_kriterien ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">K.O.-Kriterien (Wann stoppen oder neu denken?)</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.ko_kriterien ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status der Phase</Label>
            <Badge variant="secondary">{record.fields.phase_status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ampel</Label>
            <Badge variant="secondary">{record.fields.phase_ampel?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen zur Phase</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.phase_notiz ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}