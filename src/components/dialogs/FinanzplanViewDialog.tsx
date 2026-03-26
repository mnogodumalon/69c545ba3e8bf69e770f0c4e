import type { Finanzplan, Gruenderprofil, Businessplan } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil, IconFileText } from '@tabler/icons-react';

interface FinanzplanViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Finanzplan | null;
  onEdit: (record: Finanzplan) => void;
  gruenderprofilList: Gruenderprofil[];
  businessplanList: Businessplan[];
}

export function FinanzplanViewDialog({ open, onClose, record, onEdit, gruenderprofilList, businessplanList }: FinanzplanViewDialogProps) {
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

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finanzplan anzeigen</DialogTitle>
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
            <Label className="text-xs text-muted-foreground">Businessplan</Label>
            <p className="text-sm">{getBusinessplanDisplayName(record.fields.businessplan_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Startkapitalbedarf (EUR)</Label>
            <p className="text-sm">{record.fields.startkapital ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eigenkapital (EUR)</Label>
            <p className="text-sm">{record.fields.eigenkapital ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fremdkapital (EUR)</Label>
            <p className="text-sm">{record.fields.fremdkapital ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verwendung des Kapitals</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.kapitalverwendung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Umsatzplanung Jahr 1 (EUR)</Label>
            <p className="text-sm">{record.fields.umsatz_jahr1 ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Umsatzplanung Jahr 2 (EUR)</Label>
            <p className="text-sm">{record.fields.umsatz_jahr2 ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Umsatzplanung Jahr 3 (EUR)</Label>
            <p className="text-sm">{record.fields.umsatz_jahr3 ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fixkosten pro Monat (EUR)</Label>
            <p className="text-sm">{record.fields.kosten_fix ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Variable Kosten pro Monat (EUR)</Label>
            <p className="text-sm">{record.fields.kosten_var ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kostenbeschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.kostenbeschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Startliquidität (EUR)</Label>
            <p className="text-sm">{record.fields.liquiditaet_start ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Liquiditätsplanung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.liquiditaetsplanung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Break-Even-Umsatz (EUR)</Label>
            <p className="text-sm">{record.fields.break_even ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Break-Even-Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.break_even_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rentabilitätsvorschau Jahr 1 (EUR)</Label>
            <p className="text-sm">{record.fields.rentabilitaet ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Finanzplan hochladen (optional)</Label>
            {record.fields.fp_datei ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.fp_datei} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}