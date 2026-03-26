// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Gruenderprofil {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    projektname?: string;
    branche?: LookupValue;
    geschaeftsidee_kurz?: string;
    zielgruppe?: string;
    gruendungsdatum_geplant?: string; // Format: YYYY-MM-DD oder ISO String
    rechtsform_geplant?: LookupValue;
    berater_vorname?: string;
    berater_nachname?: string;
    beratungsbeginn?: string; // Format: YYYY-MM-DD oder ISO String
    notizen_allgemein?: string;
  };
}

export interface Phasen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    phasen_nr?: number;
    phasen_name?: string;
    phasen_ziel?: string;
    meilenstein_kriterien?: string;
    ko_kriterien?: string;
    phase_status?: LookupValue;
    phase_ampel?: LookupValue;
    phase_notiz?: string;
  };
}

export interface Meilensteine {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    gruender_ref?: string; // applookup -> URL zu 'Gruenderprofil' Record
    phase_ref?: string; // applookup -> URL zu 'Phasen' Record
    meilenstein_titel?: string;
    meilenstein_beschreibung?: string;
    erfolgskriterium?: string;
    ko_kriterium_ja?: boolean;
    ko_kriterium_beschreibung?: string;
    ms_status?: LookupValue;
    ms_ampel?: LookupValue;
    verantwortlich?: string;
    zieltermin?: string; // Format: YYYY-MM-DD oder ISO String
    ms_notiz?: string;
  };
}

export interface Aufgaben {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    gruender_ref?: string; // applookup -> URL zu 'Gruenderprofil' Record
    phase_ref?: string; // applookup -> URL zu 'Phasen' Record
    meilenstein_ref?: string; // applookup -> URL zu 'Meilensteine' Record
    aufgabe_titel?: string;
    aufgabe_beschreibung?: string;
    aufwand?: LookupValue;
    prioritaet?: LookupValue;
    vorlage_tool?: string;
    aufgabe_status?: LookupValue;
    zieltermin_aufgabe?: string; // Format: YYYY-MM-DD oder ISO String
    verantwortlich_aufgabe?: string;
    ergebnis_notiz?: string;
  };
}

export interface VorlagenTools {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    phase_ref?: string; // applookup -> URL zu 'Phasen' Record
    vorlage_name?: string;
    tool_typ?: LookupValue;
    vorlage_zweck?: string;
    kerninhalte?: string;
    vorlage_datei?: string;
    vorlage_link?: string;
    vorlage_notiz?: string;
  };
}

export interface ReviewPunkte {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    gruender_ref?: string; // applookup -> URL zu 'Gruenderprofil' Record
    phase_ref?: string; // applookup -> URL zu 'Phasen' Record
    review_datum?: string; // Format: YYYY-MM-DD oder ISO String
    review_entscheidung?: LookupValue;
    entscheidungsfragen_antworten?: string;
    warnsignale?: LookupValue[];
    berater_empfehlung?: string;
    review_notiz?: string;
  };
}

export interface RoadmapCockpit {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    gruender_ref?: string; // applookup -> URL zu 'Gruenderprofil' Record
    sitzungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    phase_ref?: string; // applookup -> URL zu 'Phasen' Record
    meilensteine_refs?: string;
    phase_ampel_aktuell?: LookupValue;
    sitzungs_zusammenfassung?: string;
    naechste_schritte?: string;
    naechste_sitzung?: string; // Format: YYYY-MM-DD oder ISO String
    cockpit_notiz?: string;
  };
}

export const APP_IDS = {
  GRUENDERPROFIL: '69c54567f38f0d936edaa827',
  PHASEN: '69c54571f147e4e484ea484e',
  MEILENSTEINE: '69c5457263560a48066e92c4',
  AUFGABEN: '69c5457338dee1223162d8ea',
  VORLAGEN_TOOLS: '69c54574802124266829d88d',
  REVIEW_PUNKTE: '69c54575290ee4a096f988e2',
  ROADMAP_COCKPIT: '69c54576c2a189f872b56772',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'gruenderprofil': {
    branche: [{ key: "handel", label: "Handel" }, { key: "dienstleistung", label: "Dienstleistung" }, { key: "gastronomie", label: "Gastronomie & Lebensmittel" }, { key: "handwerk", label: "Handwerk" }, { key: "it_software", label: "IT & Software" }, { key: "gesundheit", label: "Gesundheit & Pflege" }, { key: "bildung", label: "Bildung & Coaching" }, { key: "produktion", label: "Produktion & Fertigung" }, { key: "kreativ", label: "Kreativwirtschaft" }, { key: "sonstige", label: "Sonstige" }],
    rechtsform_geplant: [{ key: "einzelunternehmen", label: "Einzelunternehmen" }, { key: "gbr", label: "GbR" }, { key: "ug", label: "UG (haftungsbeschränkt)" }, { key: "gmbh", label: "GmbH" }, { key: "ag", label: "AG" }, { key: "freiberufler", label: "Freiberufler" }, { key: "offen", label: "Noch nicht entschieden" }],
  },
  'phasen': {
    phase_status: [{ key: "in_arbeit", label: "In Arbeit" }, { key: "abgeschlossen", label: "Abgeschlossen" }, { key: "offen", label: "Offen" }],
    phase_ampel: [{ key: "gruen", label: "Grün" }, { key: "gelb", label: "Gelb" }, { key: "rot", label: "Rot" }],
  },
  'meilensteine': {
    ms_status: [{ key: "offen", label: "Offen" }, { key: "in_arbeit", label: "In Arbeit" }, { key: "erreicht", label: "Erreicht" }, { key: "nicht_erreicht", label: "Nicht erreicht" }],
    ms_ampel: [{ key: "gruen", label: "Grün" }, { key: "gelb", label: "Gelb" }, { key: "rot", label: "Rot" }],
  },
  'aufgaben': {
    aufwand: [{ key: "s", label: "S – Klein (bis 1 Stunde)" }, { key: "m", label: "M – Mittel (1–4 Stunden)" }, { key: "l", label: "L – Groß (mehr als 4 Stunden)" }],
    prioritaet: [{ key: "hoch", label: "Hoch" }, { key: "mittel", label: "Mittel" }, { key: "niedrig", label: "Niedrig" }],
    aufgabe_status: [{ key: "offen", label: "Offen" }, { key: "in_arbeit", label: "In Arbeit" }, { key: "erledigt", label: "Erledigt" }, { key: "zurueckgestellt", label: "Zurückgestellt" }],
  },
  'vorlagen_&_tools': {
    tool_typ: [{ key: "fragenkatalog", label: "Fragenkatalog" }, { key: "excel", label: "Excel-Vorlage" }, { key: "checkliste", label: "Checkliste" }, { key: "strukturvorlage", label: "Strukturvorlage / Gliederung" }, { key: "praesentation", label: "Präsentationsvorlage" }, { key: "online_tool", label: "Online-Tool / Software" }, { key: "sonstiges", label: "Sonstiges" }],
  },
  'review_punkte': {
    review_entscheidung: [{ key: "go", label: "Go – Weiter zur nächsten Phase" }, { key: "nachbessern", label: "Nachbessern – Aktuelle Phase überarbeiten" }, { key: "stop", label: "Stop – Gründungsvorhaben pausieren oder beenden" }],
    warnsignale: [{ key: "unrealistische_umsaetze", label: "Unrealistische Umsatzerwartungen" }, { key: "kein_eigenkapital", label: "Fehlende Eigenkapitalbasis" }, { key: "markt_zu_klein", label: "Markt zu klein oder gesättigt" }, { key: "kein_usb", label: "Kein klares Alleinstellungsmerkmal" }, { key: "fehlende_erfahrung", label: "Gründer fehlt Branchenerfahrung" }, { key: "eignung_fraglich", label: "Persönliche Eignung fraglich" }, { key: "rechtliche_risiken", label: "Rechtliche Risiken ungeklärt" }, { key: "finanzierungsluecke", label: "Finanzierungslücke nicht geschlossen" }, { key: "kein_kundenfeedback", label: "Kein valides Kundenfeedback" }, { key: "ueberlastung", label: "Überlastung / fehlende Ressourcen" }],
  },
  'roadmap_cockpit': {
    phase_ampel_aktuell: [{ key: "gelb", label: "Gelb – Leichte Verzögerung / offene Punkte" }, { key: "rot", label: "Rot – Kritische Probleme / Stopp-Risiko" }, { key: "gruen", label: "Grün – Auf Kurs" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'gruenderprofil': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'projektname': 'string/text',
    'branche': 'lookup/select',
    'geschaeftsidee_kurz': 'string/textarea',
    'zielgruppe': 'string/text',
    'gruendungsdatum_geplant': 'date/date',
    'rechtsform_geplant': 'lookup/select',
    'berater_vorname': 'string/text',
    'berater_nachname': 'string/text',
    'beratungsbeginn': 'date/date',
    'notizen_allgemein': 'string/textarea',
  },
  'phasen': {
    'phasen_nr': 'number',
    'phasen_name': 'string/text',
    'phasen_ziel': 'string/textarea',
    'meilenstein_kriterien': 'string/textarea',
    'ko_kriterien': 'string/textarea',
    'phase_status': 'lookup/radio',
    'phase_ampel': 'lookup/radio',
    'phase_notiz': 'string/textarea',
  },
  'meilensteine': {
    'gruender_ref': 'applookup/select',
    'phase_ref': 'applookup/select',
    'meilenstein_titel': 'string/text',
    'meilenstein_beschreibung': 'string/textarea',
    'erfolgskriterium': 'string/textarea',
    'ko_kriterium_ja': 'bool',
    'ko_kriterium_beschreibung': 'string/textarea',
    'ms_status': 'lookup/select',
    'ms_ampel': 'lookup/radio',
    'verantwortlich': 'string/text',
    'zieltermin': 'date/date',
    'ms_notiz': 'string/textarea',
  },
  'aufgaben': {
    'gruender_ref': 'applookup/select',
    'phase_ref': 'applookup/select',
    'meilenstein_ref': 'applookup/select',
    'aufgabe_titel': 'string/text',
    'aufgabe_beschreibung': 'string/textarea',
    'aufwand': 'lookup/radio',
    'prioritaet': 'lookup/radio',
    'vorlage_tool': 'string/text',
    'aufgabe_status': 'lookup/select',
    'zieltermin_aufgabe': 'date/date',
    'verantwortlich_aufgabe': 'string/text',
    'ergebnis_notiz': 'string/textarea',
  },
  'vorlagen_&_tools': {
    'phase_ref': 'applookup/select',
    'vorlage_name': 'string/text',
    'tool_typ': 'lookup/select',
    'vorlage_zweck': 'string/textarea',
    'kerninhalte': 'string/textarea',
    'vorlage_datei': 'file',
    'vorlage_link': 'string/url',
    'vorlage_notiz': 'string/textarea',
  },
  'review_punkte': {
    'gruender_ref': 'applookup/select',
    'phase_ref': 'applookup/select',
    'review_datum': 'date/date',
    'review_entscheidung': 'lookup/radio',
    'entscheidungsfragen_antworten': 'string/textarea',
    'warnsignale': 'multiplelookup/checkbox',
    'berater_empfehlung': 'string/textarea',
    'review_notiz': 'string/textarea',
  },
  'roadmap_cockpit': {
    'gruender_ref': 'applookup/select',
    'sitzungsdatum': 'date/date',
    'phase_ref': 'applookup/select',
    'meilensteine_refs': 'multipleapplookup/select',
    'phase_ampel_aktuell': 'lookup/radio',
    'sitzungs_zusammenfassung': 'string/textarea',
    'naechste_schritte': 'string/textarea',
    'naechste_sitzung': 'date/date',
    'cockpit_notiz': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateGruenderprofil = StripLookup<Gruenderprofil['fields']>;
export type CreatePhasen = StripLookup<Phasen['fields']>;
export type CreateMeilensteine = StripLookup<Meilensteine['fields']>;
export type CreateAufgaben = StripLookup<Aufgaben['fields']>;
export type CreateVorlagenTools = StripLookup<VorlagenTools['fields']>;
export type CreateReviewPunkte = StripLookup<ReviewPunkte['fields']>;
export type CreateRoadmapCockpit = StripLookup<RoadmapCockpit['fields']>;