import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Gruenderprofil, Phasen, Meilensteine, Aufgaben, VorlagenTools, ReviewPunkte, RoadmapCockpit } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { GruenderprofilDialog } from '@/components/dialogs/GruenderprofilDialog';
import { GruenderprofilViewDialog } from '@/components/dialogs/GruenderprofilViewDialog';
import { PhasenDialog } from '@/components/dialogs/PhasenDialog';
import { PhasenViewDialog } from '@/components/dialogs/PhasenViewDialog';
import { MeilensteineDialog } from '@/components/dialogs/MeilensteineDialog';
import { MeilensteineViewDialog } from '@/components/dialogs/MeilensteineViewDialog';
import { AufgabenDialog } from '@/components/dialogs/AufgabenDialog';
import { AufgabenViewDialog } from '@/components/dialogs/AufgabenViewDialog';
import { VorlagenToolsDialog } from '@/components/dialogs/VorlagenToolsDialog';
import { VorlagenToolsViewDialog } from '@/components/dialogs/VorlagenToolsViewDialog';
import { ReviewPunkteDialog } from '@/components/dialogs/ReviewPunkteDialog';
import { ReviewPunkteViewDialog } from '@/components/dialogs/ReviewPunkteViewDialog';
import { RoadmapCockpitDialog } from '@/components/dialogs/RoadmapCockpitDialog';
import { RoadmapCockpitViewDialog } from '@/components/dialogs/RoadmapCockpitViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const GRUENDERPROFIL_FIELDS = [
  { key: 'vorname', label: 'Vorname', type: 'string/text' },
  { key: 'nachname', label: 'Nachname', type: 'string/text' },
  { key: 'email', label: 'E-Mail-Adresse', type: 'string/email' },
  { key: 'telefon', label: 'Telefonnummer', type: 'string/tel' },
  { key: 'projektname', label: 'Projektname / Arbeitstitel', type: 'string/text' },
  { key: 'branche', label: 'Branche', type: 'lookup/select', options: [{ key: 'handel', label: 'Handel' }, { key: 'dienstleistung', label: 'Dienstleistung' }, { key: 'gastronomie', label: 'Gastronomie & Lebensmittel' }, { key: 'handwerk', label: 'Handwerk' }, { key: 'it_software', label: 'IT & Software' }, { key: 'gesundheit', label: 'Gesundheit & Pflege' }, { key: 'bildung', label: 'Bildung & Coaching' }, { key: 'produktion', label: 'Produktion & Fertigung' }, { key: 'kreativ', label: 'Kreativwirtschaft' }, { key: 'sonstige', label: 'Sonstige' }] },
  { key: 'geschaeftsidee_kurz', label: 'Kurzbeschreibung der Geschäftsidee', type: 'string/textarea' },
  { key: 'zielgruppe', label: 'Zielgruppe (grob)', type: 'string/text' },
  { key: 'gruendungsdatum_geplant', label: 'Geplantes Gründungsdatum', type: 'date/date' },
  { key: 'rechtsform_geplant', label: 'Angestrebte Rechtsform', type: 'lookup/select', options: [{ key: 'einzelunternehmen', label: 'Einzelunternehmen' }, { key: 'gbr', label: 'GbR' }, { key: 'ug', label: 'UG (haftungsbeschränkt)' }, { key: 'gmbh', label: 'GmbH' }, { key: 'ag', label: 'AG' }, { key: 'freiberufler', label: 'Freiberufler' }, { key: 'offen', label: 'Noch nicht entschieden' }] },
  { key: 'berater_vorname', label: 'Vorname Berater/in', type: 'string/text' },
  { key: 'berater_nachname', label: 'Nachname Berater/in', type: 'string/text' },
  { key: 'beratungsbeginn', label: 'Beratungsbeginn', type: 'date/date' },
  { key: 'notizen_allgemein', label: 'Allgemeine Notizen zum Gründer', type: 'string/textarea' },
];
const PHASEN_FIELDS = [
  { key: 'phasen_nr', label: 'Phasennummer (1–10)', type: 'number' },
  { key: 'phasen_name', label: 'Phasenname', type: 'string/text' },
  { key: 'phasen_ziel', label: 'Ziel der Phase', type: 'string/textarea' },
  { key: 'meilenstein_kriterien', label: 'Meilenstein-Kriterien (Phase bestanden, wenn …)', type: 'string/textarea' },
  { key: 'ko_kriterien', label: 'K.O.-Kriterien (Wann stoppen oder neu denken?)', type: 'string/textarea' },
  { key: 'phase_status', label: 'Status der Phase', type: 'lookup/radio', options: [{ key: 'in_arbeit', label: 'In Arbeit' }, { key: 'abgeschlossen', label: 'Abgeschlossen' }, { key: 'offen', label: 'Offen' }] },
  { key: 'phase_ampel', label: 'Ampel', type: 'lookup/radio', options: [{ key: 'gruen', label: 'Grün' }, { key: 'gelb', label: 'Gelb' }, { key: 'rot', label: 'Rot' }] },
  { key: 'phase_notiz', label: 'Notizen zur Phase', type: 'string/textarea' },
];
const MEILENSTEINE_FIELDS = [
  { key: 'gruender_ref', label: 'Gründer', type: 'applookup/select', targetEntity: 'gruenderprofil', targetAppId: 'GRUENDERPROFIL', displayField: 'vorname' },
  { key: 'phase_ref', label: 'Phase', type: 'applookup/select', targetEntity: 'phasen', targetAppId: 'PHASEN', displayField: 'phasen_name' },
  { key: 'meilenstein_titel', label: 'Meilenstein-Titel', type: 'string/text' },
  { key: 'meilenstein_beschreibung', label: 'Kurzbeschreibung', type: 'string/textarea' },
  { key: 'erfolgskriterium', label: 'Erfolgskriterium (woran erkennt man Erfüllung?)', type: 'string/textarea' },
  { key: 'ko_kriterium_ja', label: 'K.O.-Kriterium relevant?', type: 'bool' },
  { key: 'ko_kriterium_beschreibung', label: 'K.O.-Kriterium Beschreibung', type: 'string/textarea' },
  { key: 'ms_status', label: 'Status', type: 'lookup/select', options: [{ key: 'offen', label: 'Offen' }, { key: 'in_arbeit', label: 'In Arbeit' }, { key: 'erreicht', label: 'Erreicht' }, { key: 'nicht_erreicht', label: 'Nicht erreicht' }] },
  { key: 'ms_ampel', label: 'Ampel', type: 'lookup/radio', options: [{ key: 'gruen', label: 'Grün' }, { key: 'gelb', label: 'Gelb' }, { key: 'rot', label: 'Rot' }] },
  { key: 'verantwortlich', label: 'Verantwortlich', type: 'string/text' },
  { key: 'zieltermin', label: 'Zieltermin', type: 'date/date' },
  { key: 'ms_notiz', label: 'Notizen / Ergebnisse', type: 'string/textarea' },
];
const AUFGABEN_FIELDS = [
  { key: 'gruender_ref', label: 'Gründer', type: 'applookup/select', targetEntity: 'gruenderprofil', targetAppId: 'GRUENDERPROFIL', displayField: 'vorname' },
  { key: 'phase_ref', label: 'Phase', type: 'applookup/select', targetEntity: 'phasen', targetAppId: 'PHASEN', displayField: 'phasen_name' },
  { key: 'meilenstein_ref', label: 'Meilenstein (optional)', type: 'applookup/select', targetEntity: 'meilensteine', targetAppId: 'MEILENSTEINE', displayField: 'meilenstein_titel' },
  { key: 'aufgabe_titel', label: 'Aufgabentitel', type: 'string/text' },
  { key: 'aufgabe_beschreibung', label: 'Beschreibung / Vorgehen', type: 'string/textarea' },
  { key: 'aufwand', label: 'Aufwand', type: 'lookup/radio', options: [{ key: 's', label: 'S – Klein (bis 1 Stunde)' }, { key: 'm', label: 'M – Mittel (1–4 Stunden)' }, { key: 'l', label: 'L – Groß (mehr als 4 Stunden)' }] },
  { key: 'prioritaet', label: 'Priorität', type: 'lookup/radio', options: [{ key: 'hoch', label: 'Hoch' }, { key: 'mittel', label: 'Mittel' }, { key: 'niedrig', label: 'Niedrig' }] },
  { key: 'vorlage_tool', label: 'Benötigte Vorlage / Tool', type: 'string/text' },
  { key: 'aufgabe_status', label: 'Status', type: 'lookup/select', options: [{ key: 'offen', label: 'Offen' }, { key: 'in_arbeit', label: 'In Arbeit' }, { key: 'erledigt', label: 'Erledigt' }, { key: 'zurueckgestellt', label: 'Zurückgestellt' }] },
  { key: 'zieltermin_aufgabe', label: 'Zieltermin', type: 'date/date' },
  { key: 'verantwortlich_aufgabe', label: 'Verantwortlich', type: 'string/text' },
  { key: 'ergebnis_notiz', label: 'Notizen / Ergebnisse', type: 'string/textarea' },
];
const VORLAGENTOOLS_FIELDS = [
  { key: 'phase_ref', label: 'Phase', type: 'applookup/select', targetEntity: 'phasen', targetAppId: 'PHASEN', displayField: 'phasen_name' },
  { key: 'vorlage_name', label: 'Name der Vorlage / des Tools', type: 'string/text' },
  { key: 'tool_typ', label: 'Typ', type: 'lookup/select', options: [{ key: 'fragenkatalog', label: 'Fragenkatalog' }, { key: 'excel', label: 'Excel-Vorlage' }, { key: 'checkliste', label: 'Checkliste' }, { key: 'strukturvorlage', label: 'Strukturvorlage / Gliederung' }, { key: 'praesentation', label: 'Präsentationsvorlage' }, { key: 'online_tool', label: 'Online-Tool / Software' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'vorlage_zweck', label: 'Zweck der Vorlage', type: 'string/textarea' },
  { key: 'kerninhalte', label: 'Kerninhalte (Stichpunkte)', type: 'string/textarea' },
  { key: 'vorlage_datei', label: 'Vorlage hochladen (optional)', type: 'file' },
  { key: 'vorlage_link', label: 'Link zur Vorlage / zum Tool', type: 'string/url' },
  { key: 'vorlage_notiz', label: 'Hinweise zur Nutzung', type: 'string/textarea' },
];
const REVIEWPUNKTE_FIELDS = [
  { key: 'gruender_ref', label: 'Gründer', type: 'applookup/select', targetEntity: 'gruenderprofil', targetAppId: 'GRUENDERPROFIL', displayField: 'vorname' },
  { key: 'phase_ref', label: 'Phase (Review nach Phase …)', type: 'applookup/select', targetEntity: 'phasen', targetAppId: 'PHASEN', displayField: 'phasen_name' },
  { key: 'review_datum', label: 'Review-Datum', type: 'date/date' },
  { key: 'review_entscheidung', label: 'Entscheidung', type: 'lookup/radio', options: [{ key: 'go', label: 'Go – Weiter zur nächsten Phase' }, { key: 'nachbessern', label: 'Nachbessern – Aktuelle Phase überarbeiten' }, { key: 'stop', label: 'Stop – Gründungsvorhaben pausieren oder beenden' }] },
  { key: 'entscheidungsfragen_antworten', label: 'Antworten auf die Entscheidungsfragen', type: 'string/textarea' },
  { key: 'warnsignale', label: 'Beobachtete Warnsignale', type: 'multiplelookup/checkbox', options: [{ key: 'unrealistische_umsaetze', label: 'Unrealistische Umsatzerwartungen' }, { key: 'kein_eigenkapital', label: 'Fehlende Eigenkapitalbasis' }, { key: 'markt_zu_klein', label: 'Markt zu klein oder gesättigt' }, { key: 'kein_usb', label: 'Kein klares Alleinstellungsmerkmal' }, { key: 'fehlende_erfahrung', label: 'Gründer fehlt Branchenerfahrung' }, { key: 'eignung_fraglich', label: 'Persönliche Eignung fraglich' }, { key: 'rechtliche_risiken', label: 'Rechtliche Risiken ungeklärt' }, { key: 'finanzierungsluecke', label: 'Finanzierungslücke nicht geschlossen' }, { key: 'kein_kundenfeedback', label: 'Kein valides Kundenfeedback' }, { key: 'ueberlastung', label: 'Überlastung / fehlende Ressourcen' }] },
  { key: 'berater_empfehlung', label: 'Empfehlung des Beraters / der Beraterin', type: 'string/textarea' },
  { key: 'review_notiz', label: 'Weitere Notizen zum Review', type: 'string/textarea' },
];
const ROADMAPCOCKPIT_FIELDS = [
  { key: 'gruender_ref', label: 'Gründer', type: 'applookup/select', targetEntity: 'gruenderprofil', targetAppId: 'GRUENDERPROFIL', displayField: 'vorname' },
  { key: 'sitzungsdatum', label: 'Sitzungsdatum', type: 'date/date' },
  { key: 'phase_ref', label: 'Bearbeitete Phase', type: 'applookup/select', targetEntity: 'phasen', targetAppId: 'PHASEN', displayField: 'phasen_name' },
  { key: 'meilensteine_refs', label: 'Adressierte Meilensteine', type: 'multipleapplookup/select', targetEntity: 'meilensteine', targetAppId: 'MEILENSTEINE', displayField: 'meilenstein_titel' },
  { key: 'phase_ampel_aktuell', label: 'Aktueller Phasenstatus (Ampel)', type: 'lookup/radio', options: [{ key: 'gelb', label: 'Gelb – Leichte Verzögerung / offene Punkte' }, { key: 'rot', label: 'Rot – Kritische Probleme / Stopp-Risiko' }, { key: 'gruen', label: 'Grün – Auf Kurs' }] },
  { key: 'sitzungs_zusammenfassung', label: 'Sitzungszusammenfassung', type: 'string/textarea' },
  { key: 'naechste_schritte', label: 'Nächste Schritte', type: 'string/textarea' },
  { key: 'naechste_sitzung', label: 'Nächster Sitzungstermin', type: 'date/date' },
  { key: 'cockpit_notiz', label: 'Weitere Notizen', type: 'string/textarea' },
];

const ENTITY_TABS = [
  { key: 'gruenderprofil', label: 'Gründerprofil', pascal: 'Gruenderprofil' },
  { key: 'phasen', label: 'Phasen', pascal: 'Phasen' },
  { key: 'meilensteine', label: 'Meilensteine', pascal: 'Meilensteine' },
  { key: 'aufgaben', label: 'Aufgaben', pascal: 'Aufgaben' },
  { key: 'vorlagen_&_tools', label: 'Vorlagen & Tools', pascal: 'VorlagenTools' },
  { key: 'review_punkte', label: 'Review-Punkte', pascal: 'ReviewPunkte' },
  { key: 'roadmap_cockpit', label: 'Roadmap-Cockpit', pascal: 'RoadmapCockpit' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('gruenderprofil');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'gruenderprofil': new Set(),
    'phasen': new Set(),
    'meilensteine': new Set(),
    'aufgaben': new Set(),
    'vorlagen_&_tools': new Set(),
    'review_punkte': new Set(),
    'roadmap_cockpit': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'gruenderprofil': {},
    'phasen': {},
    'meilensteine': {},
    'aufgaben': {},
    'vorlagen_&_tools': {},
    'review_punkte': {},
    'roadmap_cockpit': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'gruenderprofil': return (data as any).gruenderprofil as Gruenderprofil[] ?? [];
      case 'phasen': return (data as any).phasen as Phasen[] ?? [];
      case 'meilensteine': return (data as any).meilensteine as Meilensteine[] ?? [];
      case 'aufgaben': return (data as any).aufgaben as Aufgaben[] ?? [];
      case 'vorlagen_&_tools': return (data as any).vorlagenTools as VorlagenTools[] ?? [];
      case 'review_punkte': return (data as any).reviewPunkte as ReviewPunkte[] ?? [];
      case 'roadmap_cockpit': return (data as any).roadmapCockpit as RoadmapCockpit[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'meilensteine':
        lists.gruenderprofilList = (data as any).gruenderprofil ?? [];
        lists.phasenList = (data as any).phasen ?? [];
        break;
      case 'aufgaben':
        lists.gruenderprofilList = (data as any).gruenderprofil ?? [];
        lists.phasenList = (data as any).phasen ?? [];
        lists.meilensteineList = (data as any).meilensteine ?? [];
        break;
      case 'vorlagen_&_tools':
        lists.phasenList = (data as any).phasen ?? [];
        break;
      case 'review_punkte':
        lists.gruenderprofilList = (data as any).gruenderprofil ?? [];
        lists.phasenList = (data as any).phasen ?? [];
        break;
      case 'roadmap_cockpit':
        lists.gruenderprofilList = (data as any).gruenderprofil ?? [];
        lists.phasenList = (data as any).phasen ?? [];
        lists.meilensteineList = (data as any).meilensteine ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'meilensteine' && fieldKey === 'gruender_ref') {
      const match = (lists.gruenderprofilList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.vorname ?? '—';
    }
    if (entity === 'meilensteine' && fieldKey === 'phase_ref') {
      const match = (lists.phasenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.phasen_name ?? '—';
    }
    if (entity === 'aufgaben' && fieldKey === 'gruender_ref') {
      const match = (lists.gruenderprofilList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.vorname ?? '—';
    }
    if (entity === 'aufgaben' && fieldKey === 'phase_ref') {
      const match = (lists.phasenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.phasen_name ?? '—';
    }
    if (entity === 'aufgaben' && fieldKey === 'meilenstein_ref') {
      const match = (lists.meilensteineList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.meilenstein_titel ?? '—';
    }
    if (entity === 'vorlagen_&_tools' && fieldKey === 'phase_ref') {
      const match = (lists.phasenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.phasen_name ?? '—';
    }
    if (entity === 'review_punkte' && fieldKey === 'gruender_ref') {
      const match = (lists.gruenderprofilList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.vorname ?? '—';
    }
    if (entity === 'review_punkte' && fieldKey === 'phase_ref') {
      const match = (lists.phasenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.phasen_name ?? '—';
    }
    if (entity === 'roadmap_cockpit' && fieldKey === 'gruender_ref') {
      const match = (lists.gruenderprofilList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.vorname ?? '—';
    }
    if (entity === 'roadmap_cockpit' && fieldKey === 'phase_ref') {
      const match = (lists.phasenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.phasen_name ?? '—';
    }
    if (entity === 'roadmap_cockpit' && fieldKey === 'meilensteine_refs') {
      const match = (lists.meilensteineList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.meilenstein_titel ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'gruenderprofil': return GRUENDERPROFIL_FIELDS;
      case 'phasen': return PHASEN_FIELDS;
      case 'meilensteine': return MEILENSTEINE_FIELDS;
      case 'aufgaben': return AUFGABEN_FIELDS;
      case 'vorlagen_&_tools': return VORLAGENTOOLS_FIELDS;
      case 'review_punkte': return REVIEWPUNKTE_FIELDS;
      case 'roadmap_cockpit': return ROADMAPCOCKPIT_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

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

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'gruenderprofil': return {
        create: (fields: any) => LivingAppsService.createGruenderprofilEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateGruenderprofilEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteGruenderprofilEntry(id),
      };
      case 'phasen': return {
        create: (fields: any) => LivingAppsService.createPhasenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updatePhasenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deletePhasenEntry(id),
      };
      case 'meilensteine': return {
        create: (fields: any) => LivingAppsService.createMeilensteineEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateMeilensteineEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteMeilensteineEntry(id),
      };
      case 'aufgaben': return {
        create: (fields: any) => LivingAppsService.createAufgabenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateAufgabenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteAufgabenEntry(id),
      };
      case 'vorlagen_&_tools': return {
        create: (fields: any) => LivingAppsService.createVorlagenTool(fields),
        update: (id: string, fields: any) => LivingAppsService.updateVorlagenTool(id, fields),
        remove: (id: string) => LivingAppsService.deleteVorlagenTool(id),
      };
      case 'review_punkte': return {
        create: (fields: any) => LivingAppsService.createReviewPunkteEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateReviewPunkteEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteReviewPunkteEntry(id),
      };
      case 'roadmap_cockpit': return {
        create: (fields: any) => LivingAppsService.createRoadmapCockpitEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateRoadmapCockpitEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteRoadmapCockpitEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.includes('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.includes('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'gruenderprofil' || dialogState?.entity === 'gruenderprofil') && (
        <GruenderprofilDialog
          open={createEntity === 'gruenderprofil' || dialogState?.entity === 'gruenderprofil'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'gruenderprofil' ? handleUpdate : (fields: any) => handleCreate('gruenderprofil', fields)}
          defaultValues={dialogState?.entity === 'gruenderprofil' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Gruenderprofil']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Gruenderprofil']}
        />
      )}
      {(createEntity === 'phasen' || dialogState?.entity === 'phasen') && (
        <PhasenDialog
          open={createEntity === 'phasen' || dialogState?.entity === 'phasen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'phasen' ? handleUpdate : (fields: any) => handleCreate('phasen', fields)}
          defaultValues={dialogState?.entity === 'phasen' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Phasen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Phasen']}
        />
      )}
      {(createEntity === 'meilensteine' || dialogState?.entity === 'meilensteine') && (
        <MeilensteineDialog
          open={createEntity === 'meilensteine' || dialogState?.entity === 'meilensteine'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'meilensteine' ? handleUpdate : (fields: any) => handleCreate('meilensteine', fields)}
          defaultValues={dialogState?.entity === 'meilensteine' ? dialogState.record?.fields : undefined}
          gruenderprofilList={(data as any).gruenderprofil ?? []}
          phasenList={(data as any).phasen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Meilensteine']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Meilensteine']}
        />
      )}
      {(createEntity === 'aufgaben' || dialogState?.entity === 'aufgaben') && (
        <AufgabenDialog
          open={createEntity === 'aufgaben' || dialogState?.entity === 'aufgaben'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'aufgaben' ? handleUpdate : (fields: any) => handleCreate('aufgaben', fields)}
          defaultValues={dialogState?.entity === 'aufgaben' ? dialogState.record?.fields : undefined}
          gruenderprofilList={(data as any).gruenderprofil ?? []}
          phasenList={(data as any).phasen ?? []}
          meilensteineList={(data as any).meilensteine ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Aufgaben']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Aufgaben']}
        />
      )}
      {(createEntity === 'vorlagen_&_tools' || dialogState?.entity === 'vorlagen_&_tools') && (
        <VorlagenToolsDialog
          open={createEntity === 'vorlagen_&_tools' || dialogState?.entity === 'vorlagen_&_tools'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'vorlagen_&_tools' ? handleUpdate : (fields: any) => handleCreate('vorlagen_&_tools', fields)}
          defaultValues={dialogState?.entity === 'vorlagen_&_tools' ? dialogState.record?.fields : undefined}
          phasenList={(data as any).phasen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['VorlagenTools']}
          enablePhotoLocation={AI_PHOTO_LOCATION['VorlagenTools']}
        />
      )}
      {(createEntity === 'review_punkte' || dialogState?.entity === 'review_punkte') && (
        <ReviewPunkteDialog
          open={createEntity === 'review_punkte' || dialogState?.entity === 'review_punkte'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'review_punkte' ? handleUpdate : (fields: any) => handleCreate('review_punkte', fields)}
          defaultValues={dialogState?.entity === 'review_punkte' ? dialogState.record?.fields : undefined}
          gruenderprofilList={(data as any).gruenderprofil ?? []}
          phasenList={(data as any).phasen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['ReviewPunkte']}
          enablePhotoLocation={AI_PHOTO_LOCATION['ReviewPunkte']}
        />
      )}
      {(createEntity === 'roadmap_cockpit' || dialogState?.entity === 'roadmap_cockpit') && (
        <RoadmapCockpitDialog
          open={createEntity === 'roadmap_cockpit' || dialogState?.entity === 'roadmap_cockpit'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'roadmap_cockpit' ? handleUpdate : (fields: any) => handleCreate('roadmap_cockpit', fields)}
          defaultValues={dialogState?.entity === 'roadmap_cockpit' ? dialogState.record?.fields : undefined}
          gruenderprofilList={(data as any).gruenderprofil ?? []}
          phasenList={(data as any).phasen ?? []}
          meilensteineList={(data as any).meilensteine ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['RoadmapCockpit']}
          enablePhotoLocation={AI_PHOTO_LOCATION['RoadmapCockpit']}
        />
      )}
      {viewState?.entity === 'gruenderprofil' && (
        <GruenderprofilViewDialog
          open={viewState?.entity === 'gruenderprofil'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'gruenderprofil', record: r }); }}
        />
      )}
      {viewState?.entity === 'phasen' && (
        <PhasenViewDialog
          open={viewState?.entity === 'phasen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'phasen', record: r }); }}
        />
      )}
      {viewState?.entity === 'meilensteine' && (
        <MeilensteineViewDialog
          open={viewState?.entity === 'meilensteine'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'meilensteine', record: r }); }}
          gruenderprofilList={(data as any).gruenderprofil ?? []}
          phasenList={(data as any).phasen ?? []}
        />
      )}
      {viewState?.entity === 'aufgaben' && (
        <AufgabenViewDialog
          open={viewState?.entity === 'aufgaben'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'aufgaben', record: r }); }}
          gruenderprofilList={(data as any).gruenderprofil ?? []}
          phasenList={(data as any).phasen ?? []}
          meilensteineList={(data as any).meilensteine ?? []}
        />
      )}
      {viewState?.entity === 'vorlagen_&_tools' && (
        <VorlagenToolsViewDialog
          open={viewState?.entity === 'vorlagen_&_tools'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'vorlagen_&_tools', record: r }); }}
          phasenList={(data as any).phasen ?? []}
        />
      )}
      {viewState?.entity === 'review_punkte' && (
        <ReviewPunkteViewDialog
          open={viewState?.entity === 'review_punkte'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'review_punkte', record: r }); }}
          gruenderprofilList={(data as any).gruenderprofil ?? []}
          phasenList={(data as any).phasen ?? []}
        />
      )}
      {viewState?.entity === 'roadmap_cockpit' && (
        <RoadmapCockpitViewDialog
          open={viewState?.entity === 'roadmap_cockpit'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'roadmap_cockpit', record: r }); }}
          gruenderprofilList={(data as any).gruenderprofil ?? []}
          phasenList={(data as any).phasen ?? []}
          meilensteineList={(data as any).meilensteine ?? []}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}