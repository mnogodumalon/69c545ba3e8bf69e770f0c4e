import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReviewPunkte, Gruenderprofil, Phasen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconCircleCheck, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey, lookupKeys } from '@/lib/formatters';

interface ReviewPunkteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: ReviewPunkte['fields']) => Promise<void>;
  defaultValues?: ReviewPunkte['fields'];
  gruenderprofilList: Gruenderprofil[];
  phasenList: Phasen[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function ReviewPunkteDialog({ open, onClose, onSubmit, defaultValues, gruenderprofilList, phasenList, enablePhotoScan = true, enablePhotoLocation = true }: ReviewPunkteDialogProps) {
  const [fields, setFields] = useState<Partial<ReviewPunkte['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'review_punkte');
      await onSubmit(clean as ReviewPunkte['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    setScanSuccess(false);
    try {
      const [uri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
      if (file.type.startsWith('image/')) setPreview(uri);
      const gps = enablePhotoLocation ? meta?.gps ?? null : null;
      const parts: string[] = [];
      let geoAddr = '';
      if (gps) {
        geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
        parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
        if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
      }
      if (meta?.dateTime) {
        parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="gruender_ref" entity="Gründerprofil">\n${JSON.stringify(gruenderprofilList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="phase_ref" entity="Phasen">\n${JSON.stringify(phasenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "gruender_ref": string | null, // Display name from Gründerprofil (see <available-records>)\n  "phase_ref": string | null, // Display name from Phasen (see <available-records>)\n  "review_datum": string | null, // YYYY-MM-DD\n  "review_entscheidung": LookupValue | null, // Entscheidung (select one key: "go" | "nachbessern" | "stop") mapping: go=Go – Weiter zur nächsten Phase, nachbessern=Nachbessern – Aktuelle Phase überarbeiten, stop=Stop – Gründungsvorhaben pausieren oder beenden\n  "entscheidungsfragen_antworten": string | null, // Antworten auf die Entscheidungsfragen\n  "warnsignale": LookupValue[] | null, // Beobachtete Warnsignale (select one or more keys: "unrealistische_umsaetze" | "kein_eigenkapital" | "markt_zu_klein" | "kein_usb" | "fehlende_erfahrung" | "eignung_fraglich" | "rechtliche_risiken" | "finanzierungsluecke" | "kein_kundenfeedback" | "ueberlastung") mapping: unrealistische_umsaetze=Unrealistische Umsatzerwartungen, kein_eigenkapital=Fehlende Eigenkapitalbasis, markt_zu_klein=Markt zu klein oder gesättigt, kein_usb=Kein klares Alleinstellungsmerkmal, fehlende_erfahrung=Gründer fehlt Branchenerfahrung, eignung_fraglich=Persönliche Eignung fraglich, rechtliche_risiken=Rechtliche Risiken ungeklärt, finanzierungsluecke=Finanzierungslücke nicht geschlossen, kein_kundenfeedback=Kein valides Kundenfeedback, ueberlastung=Überlastung / fehlende Ressourcen\n  "berater_empfehlung": string | null, // Empfehlung des Beraters / der Beraterin\n  "review_notiz": string | null, // Weitere Notizen zum Review\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["gruender_ref", "phase_ref"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const gruender_refName = raw['gruender_ref'] as string | null;
        if (gruender_refName) {
          const gruender_refMatch = gruenderprofilList.find(r => matchName(gruender_refName!, [[r.fields.vorname ?? '', r.fields.nachname ?? ''].filter(Boolean).join(' ')]));
          if (gruender_refMatch) merged['gruender_ref'] = createRecordUrl(APP_IDS.GRUENDERPROFIL, gruender_refMatch.record_id);
        }
        const phase_refName = raw['phase_ref'] as string | null;
        if (phase_refName) {
          const phase_refMatch = phasenList.find(r => matchName(phase_refName!, [String(r.fields.phasen_name ?? '')]));
          if (phase_refMatch) merged['phase_ref'] = createRecordUrl(APP_IDS.PHASEN, phase_refMatch.record_id);
        }
        return merged as Partial<ReviewPunkte['fields']>;
      });
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handlePhotoScan(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handlePhotoScan(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Review-Punkte bearbeiten' : 'Review-Punkte hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <IconSparkles className="h-4 w-4 text-primary" />
                KI-Assistent
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versteht deine Fotos / Dokumente und füllt alles für dich aus</p>
            </div>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1.5" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1.5" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1.5" />Dokument
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gruender_ref">Gründer</Label>
            <Select
              value={extractRecordId(fields.gruender_ref) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, gruender_ref: v === 'none' ? undefined : createRecordUrl(APP_IDS.GRUENDERPROFIL, v) }))}
            >
              <SelectTrigger id="gruender_ref"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {gruenderprofilList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.vorname ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phase_ref">Phase (Review nach Phase …)</Label>
            <Select
              value={extractRecordId(fields.phase_ref) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, phase_ref: v === 'none' ? undefined : createRecordUrl(APP_IDS.PHASEN, v) }))}
            >
              <SelectTrigger id="phase_ref"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {phasenList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.phasen_name ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="review_datum">Review-Datum</Label>
            <Input
              id="review_datum"
              type="date"
              value={fields.review_datum ?? ''}
              onChange={e => setFields(f => ({ ...f, review_datum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="review_entscheidung">Entscheidung</Label>
            <Select
              value={lookupKey(fields.review_entscheidung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, review_entscheidung: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="review_entscheidung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="go">Go – Weiter zur nächsten Phase</SelectItem>
                <SelectItem value="nachbessern">Nachbessern – Aktuelle Phase überarbeiten</SelectItem>
                <SelectItem value="stop">Stop – Gründungsvorhaben pausieren oder beenden</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="entscheidungsfragen_antworten">Antworten auf die Entscheidungsfragen</Label>
            <Textarea
              id="entscheidungsfragen_antworten"
              value={fields.entscheidungsfragen_antworten ?? ''}
              onChange={e => setFields(f => ({ ...f, entscheidungsfragen_antworten: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="warnsignale">Beobachtete Warnsignale</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="warnsignale_unrealistische_umsaetze"
                  checked={lookupKeys(fields.warnsignale).includes('unrealistische_umsaetze')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.warnsignale);
                      const next = checked ? [...current, 'unrealistische_umsaetze'] : current.filter(k => k !== 'unrealistische_umsaetze');
                      return { ...f, warnsignale: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="warnsignale_unrealistische_umsaetze" className="font-normal">Unrealistische Umsatzerwartungen</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="warnsignale_kein_eigenkapital"
                  checked={lookupKeys(fields.warnsignale).includes('kein_eigenkapital')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.warnsignale);
                      const next = checked ? [...current, 'kein_eigenkapital'] : current.filter(k => k !== 'kein_eigenkapital');
                      return { ...f, warnsignale: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="warnsignale_kein_eigenkapital" className="font-normal">Fehlende Eigenkapitalbasis</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="warnsignale_markt_zu_klein"
                  checked={lookupKeys(fields.warnsignale).includes('markt_zu_klein')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.warnsignale);
                      const next = checked ? [...current, 'markt_zu_klein'] : current.filter(k => k !== 'markt_zu_klein');
                      return { ...f, warnsignale: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="warnsignale_markt_zu_klein" className="font-normal">Markt zu klein oder gesättigt</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="warnsignale_kein_usb"
                  checked={lookupKeys(fields.warnsignale).includes('kein_usb')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.warnsignale);
                      const next = checked ? [...current, 'kein_usb'] : current.filter(k => k !== 'kein_usb');
                      return { ...f, warnsignale: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="warnsignale_kein_usb" className="font-normal">Kein klares Alleinstellungsmerkmal</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="warnsignale_fehlende_erfahrung"
                  checked={lookupKeys(fields.warnsignale).includes('fehlende_erfahrung')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.warnsignale);
                      const next = checked ? [...current, 'fehlende_erfahrung'] : current.filter(k => k !== 'fehlende_erfahrung');
                      return { ...f, warnsignale: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="warnsignale_fehlende_erfahrung" className="font-normal">Gründer fehlt Branchenerfahrung</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="warnsignale_eignung_fraglich"
                  checked={lookupKeys(fields.warnsignale).includes('eignung_fraglich')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.warnsignale);
                      const next = checked ? [...current, 'eignung_fraglich'] : current.filter(k => k !== 'eignung_fraglich');
                      return { ...f, warnsignale: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="warnsignale_eignung_fraglich" className="font-normal">Persönliche Eignung fraglich</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="warnsignale_rechtliche_risiken"
                  checked={lookupKeys(fields.warnsignale).includes('rechtliche_risiken')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.warnsignale);
                      const next = checked ? [...current, 'rechtliche_risiken'] : current.filter(k => k !== 'rechtliche_risiken');
                      return { ...f, warnsignale: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="warnsignale_rechtliche_risiken" className="font-normal">Rechtliche Risiken ungeklärt</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="warnsignale_finanzierungsluecke"
                  checked={lookupKeys(fields.warnsignale).includes('finanzierungsluecke')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.warnsignale);
                      const next = checked ? [...current, 'finanzierungsluecke'] : current.filter(k => k !== 'finanzierungsluecke');
                      return { ...f, warnsignale: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="warnsignale_finanzierungsluecke" className="font-normal">Finanzierungslücke nicht geschlossen</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="warnsignale_kein_kundenfeedback"
                  checked={lookupKeys(fields.warnsignale).includes('kein_kundenfeedback')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.warnsignale);
                      const next = checked ? [...current, 'kein_kundenfeedback'] : current.filter(k => k !== 'kein_kundenfeedback');
                      return { ...f, warnsignale: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="warnsignale_kein_kundenfeedback" className="font-normal">Kein valides Kundenfeedback</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="warnsignale_ueberlastung"
                  checked={lookupKeys(fields.warnsignale).includes('ueberlastung')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.warnsignale);
                      const next = checked ? [...current, 'ueberlastung'] : current.filter(k => k !== 'ueberlastung');
                      return { ...f, warnsignale: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="warnsignale_ueberlastung" className="font-normal">Überlastung / fehlende Ressourcen</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="berater_empfehlung">Empfehlung des Beraters / der Beraterin</Label>
            <Textarea
              id="berater_empfehlung"
              value={fields.berater_empfehlung ?? ''}
              onChange={e => setFields(f => ({ ...f, berater_empfehlung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="review_notiz">Weitere Notizen zum Review</Label>
            <Textarea
              id="review_notiz"
              value={fields.review_notiz ?? ''}
              onChange={e => setFields(f => ({ ...f, review_notiz: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}