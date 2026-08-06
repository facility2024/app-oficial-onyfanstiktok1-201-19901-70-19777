import { supabase } from '@/integrations/supabase/client';

/**
 * Serviço ÚNICO de pesquisa de perfis do sistema.
 * Usado pelo painel Engajamento, pela lupa do Feed e por qualquer
 * seletor de modelo/criadora. Não altera nenhuma regra de negócio —
 * apenas localiza perfis já cadastrados no banco.
 */

export type ProfileSource = 'model' | 'creator';

export interface ProfileSearchResult {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  source: ProfileSource;
  created_at?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Remove "@", espaços extras, acentos e normaliza para minúsculas. */
export const normalizeSearchTerm = (raw: string): string =>
  String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

const deaccent = (v: string): string =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Escapa caracteres que quebram o filtro `.or()` do PostgREST. */
const escapeForOr = (v: string): string => v.replace(/[,()%]/g, ' ').trim();

export interface SearchProfilesOptions {
  limit?: number;
  offset?: number;
  /** Restringe a origem dos perfis retornados. */
  sources?: ProfileSource[];
}

export async function searchProfiles(
  query: string,
  options: SearchProfilesOptions = {}
): Promise<ProfileSearchResult[]> {
  const limit = options.limit ?? 30;
  const offset = options.offset ?? 0;
  const sources = options.sources ?? ['model', 'creator'];

  const term = normalizeSearchTerm(query);
  if (!term) return [];

  const safe = escapeForOr(term);
  if (!safe) return [];

  const isUuid = UUID_RE.test(term);
  const pattern = `%${safe}%`;
  const orFilter = `name.ilike.${pattern},username.ilike.${pattern}`;

  const fetchModels = async (): Promise<ProfileSearchResult[]> => {
    let q = (supabase as any)
      .from('models')
      .select('id, name, username, avatar_url, created_at')
      .limit(limit * 2);
    q = isUuid ? q.eq('id', term) : q.or(orFilter);
    const { data, error } = await q;
    if (error) {
      console.warn('searchProfiles/models:', error.message);
      return [];
    }
    return (data || []).map((m: any) => ({
      id: m.id,
      name: m.name || m.username || 'Modelo',
      username: m.username || m.name || '',
      avatar_url: m.avatar_url || null,
      source: 'model' as const,
      created_at: m.created_at || null,
    }));
  };

  const fetchCreators = async (): Promise<ProfileSearchResult[]> => {
    let q = (supabase as any)
      .from('profiles')
      .select('id, name, username, avatar_url, created_at')
      .limit(limit * 2);
    q = isUuid ? q.eq('id', term) : q.or(orFilter);
    const { data, error } = await q;
    if (error) {
      // Fallback para a view pública quando o RLS bloquear `profiles`
      let pq = (supabase as any)
        .from('public_profiles')
        .select('id, name, username, avatar_url')
        .limit(limit * 2);
      pq = isUuid ? pq.eq('id', term) : pq.or(orFilter);
      const { data: pub } = await pq;
      return (pub || []).map((p: any) => ({
        id: p.id,
        name: p.name || p.username || 'Criadora',
        username: p.username || p.name || '',
        avatar_url: p.avatar_url || null,
        source: 'creator' as const,
        created_at: null,
      }));
    }
    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name || p.username || 'Criadora',
      username: p.username || p.name || '',
      avatar_url: p.avatar_url || null,
      source: 'creator' as const,
      created_at: p.created_at || null,
    }));
  };

  const [models, creators] = await Promise.all([
    sources.includes('model') ? fetchModels() : Promise.resolve([]),
    sources.includes('creator') ? fetchCreators() : Promise.resolve([]),
  ]);

  // Deduplica pelo id e pelo username (mesmo perfil em models + profiles)
  const seenIds = new Set<string>();
  const seenUsernames = new Set<string>();
  const merged: ProfileSearchResult[] = [];
  for (const p of [...models, ...creators]) {
    const uname = deaccent(String(p.username || '').toLowerCase());
    if (seenIds.has(p.id)) continue;
    if (uname && seenUsernames.has(uname)) continue;
    seenIds.add(p.id);
    if (uname) seenUsernames.add(uname);
    merged.push(p);
  }

  const t = deaccent(term);
  const rank = (p: ProfileSearchResult): number => {
    const u = deaccent(String(p.username || '').toLowerCase());
    const n = deaccent(String(p.name || '').toLowerCase());
    if (p.id.toLowerCase() === term) return 0;
    if (u === t) return 1;
    if (u.startsWith(t)) return 2;
    if (n.startsWith(t)) return 3;
    if (u.includes(t)) return 4;
    return 5;
  };

  merged.sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    const da = a.created_at ? Date.parse(a.created_at) : 0;
    const db = b.created_at ? Date.parse(b.created_at) : 0;
    if (db !== da) return db - da;
    return String(a.name).localeCompare(String(b.name));
  });

  return merged.slice(offset, offset + limit);
}
