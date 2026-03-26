import type { Gruenderprofil } from '@/types/app';
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

interface GruenderprofilViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Gruenderprofil | null;
  onEdit: (record: Gruenderprofil) => void;
}

export function GruenderprofilViewDialog({ open, onClose, record, onEdit }: GruenderprofilViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gründerprofil anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname</Label>
            <p className="text-sm">{record.fields.vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname</Label>
            <p className="text-sm">{record.fields.nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-Mail-Adresse</Label>
            <p className="text-sm">{record.fields.email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Telefonnummer</Label>
            <p className="text-sm">{record.fields.telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Projektname / Arbeitstitel</Label>
            <p className="text-sm">{record.fields.projektname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Branche</Label>
            <Badge variant="secondary">{record.fields.branche?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kurzbeschreibung der Geschäftsidee</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.geschaeftsidee_kurz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zielgruppe (grob)</Label>
            <p className="text-sm">{record.fields.zielgruppe ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geplantes Gründungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.gruendungsdatum_geplant)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Angestrebte Rechtsform</Label>
            <Badge variant="secondary">{record.fields.rechtsform_geplant?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname Berater/in</Label>
            <p className="text-sm">{record.fields.berater_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname Berater/in</Label>
            <p className="text-sm">{record.fields.berater_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beratungsbeginn</Label>
            <p className="text-sm">{formatDate(record.fields.beratungsbeginn)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Allgemeine Notizen zum Gründer</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen_allgemein ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}