import type { Businessplan, Gruenderprofil, Phasen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil, IconFileText } from '@tabler/icons-react';

interface BusinessplanViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Businessplan | null;
  onEdit: (record: Businessplan) => void;
  gruenderprofilList: Gruenderprofil[];
  phasenList: Phasen[];
}

export function BusinessplanViewDialog({ open, onClose, record, onEdit, gruenderprofilList, phasenList }: BusinessplanViewDialogProps) {
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
          <DialogTitle>Businessplan anzeigen</DialogTitle>
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
            <Label className="text-xs text-muted-foreground">Phase (optional)</Label>
            <p className="text-sm">{getPhasenDisplayName(record.fields.phase_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Titel des Businessplans</Label>
            <p className="text-sm">{record.fields.bp_titel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Executive Summary</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.executive_summary ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unternehmenskonzept</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.unternehmenskonzept ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Marktanalyse</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.marktanalyse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wettbewerbsanalyse</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.wettbewerbsanalyse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Marketingstrategie</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.marketingstrategie ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Betriebsplan</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.betriebsplan ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Team / Gründerperson</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.team ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rechtsform</Label>
            <p className="text-sm">{record.fields.rechtsform_bp ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">SWOT-Analyse</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.swot_analyse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Businessplan hochladen (optional)</Label>
            {record.fields.bp_datei ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.bp_datei} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}