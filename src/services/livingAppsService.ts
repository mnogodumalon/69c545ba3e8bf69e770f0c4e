// AUTOMATICALLY GENERATED SERVICE
import { APP_IDS, LOOKUP_OPTIONS, FIELD_TYPES } from '@/types/app';
import type { Aufgaben, VorlagenTools, Meilensteine, Phasen, Gruenderprofil, RoadmapCockpit, ReviewPunkte, Businessplan, Finanzplan, CreateAufgaben, CreateVorlagenTools, CreateMeilensteine, CreatePhasen, CreateGruenderprofil, CreateRoadmapCockpit, CreateReviewPunkte, CreateBusinessplan, CreateFinanzplan } from '@/types/app';

// Base Configuration
const API_BASE_URL = 'https://my.living-apps.de/rest';

// --- HELPER FUNCTIONS ---
export function extractRecordId(url: unknown): string | null {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  const match = url.match(/([a-f0-9]{24})$/i);
  return match ? match[1] : null;
}

export function createRecordUrl(appId: string, recordId: string): string {
  return `https://my.living-apps.de/rest/apps/${appId}/records/${recordId}`;
}

async function callApi(method: string, endpoint: string, data?: any) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Nutze Session Cookies für Auth
    body: data ? JSON.stringify(data) : undefined
  });
  if (!response.ok) throw new Error(await response.text());
  // DELETE returns often empty body or simple status
  if (method === 'DELETE') return true;
  return response.json();
}

/** Upload a file to LivingApps. Returns the file URL for use in record fields. */
export async function uploadFile(file: File | Blob, filename?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, filename ?? (file instanceof File ? file.name : 'upload'));
  const res = await fetch(`${API_BASE_URL}/files`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error(`File upload failed: ${res.status}`);
  const data = await res.json();
  return data.url;
}

function enrichLookupFields<T extends { fields: Record<string, unknown> }>(
  records: T[], entityKey: string
): T[] {
  const opts = LOOKUP_OPTIONS[entityKey];
  if (!opts) return records;
  return records.map(r => {
    const fields = { ...r.fields };
    for (const [fieldKey, options] of Object.entries(opts)) {
      const val = fields[fieldKey];
      if (typeof val === 'string') {
        const m = options.find(o => o.key === val);
        fields[fieldKey] = m ?? { key: val, label: val };
      } else if (Array.isArray(val)) {
        fields[fieldKey] = val.map(v => {
          if (typeof v === 'string') {
            const m = options.find(o => o.key === v);
            return m ?? { key: v, label: v };
          }
          return v;
        });
      }
    }
    return { ...r, fields } as T;
  });
}

/** Normalize fields for API writes: strip lookup objects to keys, fix date formats. */
export function cleanFieldsForApi(
  fields: Record<string, unknown>,
  entityKey: string
): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...fields };
  for (const [k, v] of Object.entries(clean)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && 'key' in v) clean[k] = (v as any).key;
    if (Array.isArray(v)) clean[k] = v.map((item: any) => item && typeof item === 'object' && 'key' in item ? item.key : item);
  }
  const types = FIELD_TYPES[entityKey];
  if (types) {
    for (const [k, ft] of Object.entries(types)) {
      if (!(k in clean)) continue;
      const val = clean[k];
      // applookup fields: undefined → null (clear single reference)
      if ((ft === 'applookup/select' || ft === 'applookup/choice') && val === undefined) { clean[k] = null; continue; }
      // multipleapplookup fields: undefined/null → [] (clear multi reference)
      if ((ft === 'multipleapplookup/select' || ft === 'multipleapplookup/choice') && (val === undefined || val === null)) { clean[k] = []; continue; }
      // lookup fields: undefined → null (clear single lookup)
      if ((ft.startsWith('lookup/')) && val === undefined) { clean[k] = null; continue; }
      // multiplelookup fields: undefined/null → [] (clear multi lookup)
      if ((ft.startsWith('multiplelookup/')) && (val === undefined || val === null)) { clean[k] = []; continue; }
      if (typeof val !== 'string' || !val) continue;
      if (ft === 'date/datetimeminute') clean[k] = val.slice(0, 16);
      else if (ft === 'date/date') clean[k] = val.slice(0, 10);
    }
  }
  return clean;
}

let _cachedUserProfile: Record<string, unknown> | null = null;

export async function getUserProfile(): Promise<Record<string, unknown>> {
  if (_cachedUserProfile) return _cachedUserProfile;
  const raw = await callApi('GET', '/user');
  const skip = new Set(['id', 'image', 'lang', 'gender', 'title', 'fax', 'menus', 'initials']);
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && !skip.has(k)) data[k] = v;
  }
  _cachedUserProfile = data;
  return data;
}

export interface HeaderProfile {
  firstname: string;
  surname: string;
  email: string;
  image: string | null;
  company: string | null;
}

let _cachedHeaderProfile: HeaderProfile | null = null;

export async function getHeaderProfile(): Promise<HeaderProfile> {
  if (_cachedHeaderProfile) return _cachedHeaderProfile;
  const raw = await callApi('GET', '/user');
  _cachedHeaderProfile = {
    firstname: raw.firstname ?? '',
    surname: raw.surname ?? '',
    email: raw.email ?? '',
    image: raw.image ?? null,
    company: raw.company ?? null,
  };
  return _cachedHeaderProfile;
}

export interface AppGroupInfo {
  id: string;
  name: string;
  image: string | null;
  createdat: string;
  /** Resolved link: /objects/{id}/ if the dashboard exists, otherwise /gateway/apps/{firstAppId}?template=list_page */
  href: string;
}

let _cachedAppGroups: AppGroupInfo[] | null = null;

export async function getAppGroups(): Promise<AppGroupInfo[]> {
  if (_cachedAppGroups) return _cachedAppGroups;
  const raw = await callApi('GET', '/appgroups?with=apps');
  const groups: AppGroupInfo[] = Object.values(raw)
    .map((g: any) => {
      const firstAppId = Object.keys(g.apps ?? {})[0] ?? g.id;
      return {
        id: g.id,
        name: g.name,
        image: g.image ?? null,
        createdat: g.createdat ?? '',
        href: `/gateway/apps/${firstAppId}?template=list_page`,
        _firstAppId: firstAppId,
      };
    })
    .sort((a, b) => b.createdat.localeCompare(a.createdat));

  // Check which appgroups have a working dashboard at /objects/{id}/
  const checks = await Promise.allSettled(
    groups.map(g => fetch(`/objects/${g.id}/`, { method: 'HEAD', credentials: 'include' }))
  );
  checks.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.ok) {
      groups[i].href = `/objects/${groups[i].id}/`;
    }
  });

  // Clean up internal helper property
  groups.forEach(g => delete (g as any)._firstAppId);

  _cachedAppGroups = groups;
  return _cachedAppGroups;
}

export class LivingAppsService {
  // --- AUFGABEN ---
  static async getAufgaben(): Promise<Aufgaben[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.AUFGABEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Aufgaben[];
    return enrichLookupFields(records, 'aufgaben');
  }
  static async getAufgabenEntry(id: string): Promise<Aufgaben | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.AUFGABEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Aufgaben;
    return enrichLookupFields([record], 'aufgaben')[0];
  }
  static async createAufgabenEntry(fields: CreateAufgaben) {
    return callApi('POST', `/apps/${APP_IDS.AUFGABEN}/records`, { fields: cleanFieldsForApi(fields as any, 'aufgaben') });
  }
  static async updateAufgabenEntry(id: string, fields: Partial<CreateAufgaben>) {
    return callApi('PATCH', `/apps/${APP_IDS.AUFGABEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'aufgaben') });
  }
  static async deleteAufgabenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.AUFGABEN}/records/${id}`);
  }

  // --- VORLAGEN_&_TOOLS ---
  static async getVorlagenTools(): Promise<VorlagenTools[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.VORLAGEN_TOOLS}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as VorlagenTools[];
    return enrichLookupFields(records, 'vorlagen_&_tools');
  }
  static async getVorlagenTool(id: string): Promise<VorlagenTools | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.VORLAGEN_TOOLS}/records/${id}`);
    const record = { record_id: data.id, ...data } as VorlagenTools;
    return enrichLookupFields([record], 'vorlagen_&_tools')[0];
  }
  static async createVorlagenTool(fields: CreateVorlagenTools) {
    return callApi('POST', `/apps/${APP_IDS.VORLAGEN_TOOLS}/records`, { fields: cleanFieldsForApi(fields as any, 'vorlagen_&_tools') });
  }
  static async updateVorlagenTool(id: string, fields: Partial<CreateVorlagenTools>) {
    return callApi('PATCH', `/apps/${APP_IDS.VORLAGEN_TOOLS}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'vorlagen_&_tools') });
  }
  static async deleteVorlagenTool(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.VORLAGEN_TOOLS}/records/${id}`);
  }

  // --- MEILENSTEINE ---
  static async getMeilensteine(): Promise<Meilensteine[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.MEILENSTEINE}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Meilensteine[];
    return enrichLookupFields(records, 'meilensteine');
  }
  static async getMeilensteineEntry(id: string): Promise<Meilensteine | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.MEILENSTEINE}/records/${id}`);
    const record = { record_id: data.id, ...data } as Meilensteine;
    return enrichLookupFields([record], 'meilensteine')[0];
  }
  static async createMeilensteineEntry(fields: CreateMeilensteine) {
    return callApi('POST', `/apps/${APP_IDS.MEILENSTEINE}/records`, { fields: cleanFieldsForApi(fields as any, 'meilensteine') });
  }
  static async updateMeilensteineEntry(id: string, fields: Partial<CreateMeilensteine>) {
    return callApi('PATCH', `/apps/${APP_IDS.MEILENSTEINE}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'meilensteine') });
  }
  static async deleteMeilensteineEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.MEILENSTEINE}/records/${id}`);
  }

  // --- PHASEN ---
  static async getPhasen(): Promise<Phasen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.PHASEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Phasen[];
    return enrichLookupFields(records, 'phasen');
  }
  static async getPhasenEntry(id: string): Promise<Phasen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.PHASEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Phasen;
    return enrichLookupFields([record], 'phasen')[0];
  }
  static async createPhasenEntry(fields: CreatePhasen) {
    return callApi('POST', `/apps/${APP_IDS.PHASEN}/records`, { fields: cleanFieldsForApi(fields as any, 'phasen') });
  }
  static async updatePhasenEntry(id: string, fields: Partial<CreatePhasen>) {
    return callApi('PATCH', `/apps/${APP_IDS.PHASEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'phasen') });
  }
  static async deletePhasenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.PHASEN}/records/${id}`);
  }

  // --- GRUENDERPROFIL ---
  static async getGruenderprofil(): Promise<Gruenderprofil[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.GRUENDERPROFIL}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Gruenderprofil[];
    return enrichLookupFields(records, 'gruenderprofil');
  }
  static async getGruenderprofilEntry(id: string): Promise<Gruenderprofil | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.GRUENDERPROFIL}/records/${id}`);
    const record = { record_id: data.id, ...data } as Gruenderprofil;
    return enrichLookupFields([record], 'gruenderprofil')[0];
  }
  static async createGruenderprofilEntry(fields: CreateGruenderprofil) {
    return callApi('POST', `/apps/${APP_IDS.GRUENDERPROFIL}/records`, { fields: cleanFieldsForApi(fields as any, 'gruenderprofil') });
  }
  static async updateGruenderprofilEntry(id: string, fields: Partial<CreateGruenderprofil>) {
    return callApi('PATCH', `/apps/${APP_IDS.GRUENDERPROFIL}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'gruenderprofil') });
  }
  static async deleteGruenderprofilEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.GRUENDERPROFIL}/records/${id}`);
  }

  // --- ROADMAP_COCKPIT ---
  static async getRoadmapCockpit(): Promise<RoadmapCockpit[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.ROADMAP_COCKPIT}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as RoadmapCockpit[];
    return enrichLookupFields(records, 'roadmap_cockpit');
  }
  static async getRoadmapCockpitEntry(id: string): Promise<RoadmapCockpit | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.ROADMAP_COCKPIT}/records/${id}`);
    const record = { record_id: data.id, ...data } as RoadmapCockpit;
    return enrichLookupFields([record], 'roadmap_cockpit')[0];
  }
  static async createRoadmapCockpitEntry(fields: CreateRoadmapCockpit) {
    return callApi('POST', `/apps/${APP_IDS.ROADMAP_COCKPIT}/records`, { fields: cleanFieldsForApi(fields as any, 'roadmap_cockpit') });
  }
  static async updateRoadmapCockpitEntry(id: string, fields: Partial<CreateRoadmapCockpit>) {
    return callApi('PATCH', `/apps/${APP_IDS.ROADMAP_COCKPIT}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'roadmap_cockpit') });
  }
  static async deleteRoadmapCockpitEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.ROADMAP_COCKPIT}/records/${id}`);
  }

  // --- REVIEW_PUNKTE ---
  static async getReviewPunkte(): Promise<ReviewPunkte[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.REVIEW_PUNKTE}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as ReviewPunkte[];
    return enrichLookupFields(records, 'review_punkte');
  }
  static async getReviewPunkteEntry(id: string): Promise<ReviewPunkte | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.REVIEW_PUNKTE}/records/${id}`);
    const record = { record_id: data.id, ...data } as ReviewPunkte;
    return enrichLookupFields([record], 'review_punkte')[0];
  }
  static async createReviewPunkteEntry(fields: CreateReviewPunkte) {
    return callApi('POST', `/apps/${APP_IDS.REVIEW_PUNKTE}/records`, { fields: cleanFieldsForApi(fields as any, 'review_punkte') });
  }
  static async updateReviewPunkteEntry(id: string, fields: Partial<CreateReviewPunkte>) {
    return callApi('PATCH', `/apps/${APP_IDS.REVIEW_PUNKTE}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'review_punkte') });
  }
  static async deleteReviewPunkteEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.REVIEW_PUNKTE}/records/${id}`);
  }

  // --- BUSINESSPLAN ---
  static async getBusinessplan(): Promise<Businessplan[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.BUSINESSPLAN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Businessplan[];
    return enrichLookupFields(records, 'businessplan');
  }
  static async getBusinessplanEntry(id: string): Promise<Businessplan | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.BUSINESSPLAN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Businessplan;
    return enrichLookupFields([record], 'businessplan')[0];
  }
  static async createBusinessplanEntry(fields: CreateBusinessplan) {
    return callApi('POST', `/apps/${APP_IDS.BUSINESSPLAN}/records`, { fields: cleanFieldsForApi(fields as any, 'businessplan') });
  }
  static async updateBusinessplanEntry(id: string, fields: Partial<CreateBusinessplan>) {
    return callApi('PATCH', `/apps/${APP_IDS.BUSINESSPLAN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'businessplan') });
  }
  static async deleteBusinessplanEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.BUSINESSPLAN}/records/${id}`);
  }

  // --- FINANZPLAN ---
  static async getFinanzplan(): Promise<Finanzplan[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.FINANZPLAN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Finanzplan[];
    return enrichLookupFields(records, 'finanzplan');
  }
  static async getFinanzplanEntry(id: string): Promise<Finanzplan | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.FINANZPLAN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Finanzplan;
    return enrichLookupFields([record], 'finanzplan')[0];
  }
  static async createFinanzplanEntry(fields: CreateFinanzplan) {
    return callApi('POST', `/apps/${APP_IDS.FINANZPLAN}/records`, { fields: cleanFieldsForApi(fields as any, 'finanzplan') });
  }
  static async updateFinanzplanEntry(id: string, fields: Partial<CreateFinanzplan>) {
    return callApi('PATCH', `/apps/${APP_IDS.FINANZPLAN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'finanzplan') });
  }
  static async deleteFinanzplanEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.FINANZPLAN}/records/${id}`);
  }

}