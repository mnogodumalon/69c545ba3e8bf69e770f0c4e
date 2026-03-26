import type { ReviewPunkte, Gruenderprofil, Phasen } from '@/types/app';
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

interface ReviewPunkteViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: ReviewPunkte | null;
  onEdit: (record: ReviewPunkte) => void;
  gruenderprofilList: Gruenderprofil[];
  phasenList: Phasen[];
}

export function ReviewPunkteViewDialog({ open, onClose, record, onEdit, gruenderprofilList, phasenList }: ReviewPunkteViewDialogProps) {
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

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review-Punkte anzeigen</DialogTitle>
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
            <Label className="text-xs text-muted-foreground">Phase (Review nach Phase …)</Label>
            <p className="text-sm">{getPhasenDisplayName(record.fields.phase_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Review-Datum</Label>
            <p className="text-sm">{formatDate(record.fields.review_datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Entscheidung</Label>
            <Badge variant="secondary">{record.fields.review_entscheidung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Antworten auf die Entscheidungsfragen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.entscheidungsfragen_antworten ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beobachtete Warnsignale</Label>
            <p className="text-sm">{Array.isArray(record.fields.warnsignale) ? record.fields.warnsignale.map((v: any) => v?.label ?? v).join(', ') : '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Empfehlung des Beraters / der Beraterin</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.berater_empfehlung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Weitere Notizen zum Review</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.review_notiz ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}