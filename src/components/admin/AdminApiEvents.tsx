import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Copy, Trash2, Plus, Send, RefreshCw, Key, Webhook, ScrollText, ListChecks, BookOpen } from 'lucide-react';

const PROJECT_REF = 'tnzvhwapfhkhqjgyiomk';
const API_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/api-events`;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function genToken(prefix = 'coco_live_'): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return prefix + hex;
}

const AVAILABLE_EVENTS = [
  '*',
  'model.*', 'model.created', 'model.updated', 'model.deleted',
  'video.*', 'video.created', 'video.updated', 'video.deleted',
  'sale.*', 'sale.created',
  'payment.*', 'payment.created', 'payment.updated',
  'subscription_vip.*', 'subscription_vip.created', 'subscription_vip.updated',
  'follow.*', 'like.*', 'comment.*',
  'referral.*', 'wallet_transaction.*',
  'checkout_purchase.*', 'entitlement.*',
  'creator_application.*', 'model_subscription.*',
  'transaction.*', 'user.*',
];

export default function AdminApiEvents() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">API de Eventos & Webhooks</h1>
        <p className="text-gray-400 mt-1">
          Exponha os eventos do app (vendas, cadastros, follows, PIX, etc.) para integrações externas
          via REST API ou Webhooks em tempo real.
        </p>
      </div>

      <Tabs defaultValue="keys" className="w-full">
        <TabsList className="bg-black border border-purple-800">
          <TabsTrigger value="keys"><Key className="w-4 h-4 mr-1" /> API Keys</TabsTrigger>
          <TabsTrigger value="hooks"><Webhook className="w-4 h-4 mr-1" /> Webhooks</TabsTrigger>
          <TabsTrigger value="events"><ScrollText className="w-4 h-4 mr-1" /> Eventos</TabsTrigger>
          <TabsTrigger value="deliveries"><ListChecks className="w-4 h-4 mr-1" /> Entregas</TabsTrigger>
          <TabsTrigger value="docs"><BookOpen className="w-4 h-4 mr-1" /> Documentação</TabsTrigger>
        </TabsList>

        <TabsContent value="keys"><ApiKeysTab /></TabsContent>
        <TabsContent value="hooks"><WebhooksTab /></TabsContent>
        <TabsContent value="events"><EventsTab /></TabsContent>
        <TabsContent value="deliveries"><DeliveriesTab /></TabsContent>
        <TabsContent value="docs"><DocsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============ API KEYS ============ */
function ApiKeysTab() {
  const [keys, setKeys] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
    setKeys(data || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return toast.error('Dê um nome à chave');
    setLoading(true);
    const token = genToken();
    const hash = await sha256Hex(token);
    const { error } = await supabase.from('api_keys').insert({
      name: name.trim(),
      key_prefix: token.slice(0, 14),
      key_hash: hash,
      scopes: ['read:events'],
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setJustCreated(token);
    setName('');
    load();
    toast.success('Chave criada! Copie agora — não será exibida novamente.');
  };

  const toggle = async (id: string, is_active: boolean) => {
    await supabase.from('api_keys').update({ is_active }).eq('id', id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Revogar esta chave? Integrações que a usam vão parar.')) return;
    await supabase.from('api_keys').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-4 pt-4">
      <Card className="p-4 bg-black border-purple-800">
        <h3 className="text-white font-bold mb-3">Criar nova API Key</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Nome (ex: Integração Lovable — Bot Vendas)"
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-gray-900 border-purple-700 text-white"
          />
          <Button onClick={create} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-1" /> Criar
          </Button>
        </div>
        {justCreated && (
          <div className="mt-3 p-3 bg-green-950 border border-green-600 rounded">
            <div className="text-green-300 text-sm mb-2 font-bold">⚠️ Copie agora — só será exibida uma vez:</div>
            <div className="flex gap-2 items-center">
              <code className="flex-1 bg-black p-2 rounded text-green-400 text-xs break-all">{justCreated}</code>
              <Button size="sm" onClick={() => { navigator.clipboard.writeText(justCreated); toast.success('Copiado'); }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-2 text-gray-400" onClick={() => setJustCreated(null)}>Fechar</Button>
          </div>
        )}
      </Card>

      <Card className="p-4 bg-black border-purple-800">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-bold">Chaves ativas</h3>
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        {keys.length === 0 && <p className="text-gray-500 text-sm">Nenhuma chave criada ainda.</p>}
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="flex items-center justify-between p-3 bg-gray-900 rounded border border-purple-900">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{k.name}</span>
                  {k.is_active ? <Badge className="bg-green-600">Ativa</Badge> : <Badge variant="destructive">Revogada</Badge>}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  <code>{k.key_prefix}…</code> • Usos: {k.usage_count} • Último: {k.last_used_at ? new Date(k.last_used_at).toLocaleString('pt-BR') : 'nunca'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={k.is_active} onCheckedChange={v => toggle(k.id, v)} />
                <Button size="sm" variant="destructive" onClick={() => remove(k.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============ WEBHOOKS ============ */
function WebhooksTab() {
  const [hooks, setHooks] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string>('*');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('webhook_endpoints').select('*').order('created_at', { ascending: false });
    setHooks(data || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim() || !url.trim()) return toast.error('Nome e URL são obrigatórios');
    try { new URL(url); } catch { return toast.error('URL inválida'); }
    setLoading(true);
    const secret = genToken('whsec_');
    const evArr = events.split(',').map(s => s.trim()).filter(Boolean);
    const { error } = await supabase.from('webhook_endpoints').insert({
      name: name.trim(), url: url.trim(), secret, events: evArr.length ? evArr : ['*'],
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setName(''); setUrl(''); setEvents('*');
    load();
    toast.success('Webhook cadastrado. Secret HMAC gerado — visível na listagem.');
  };

  const toggle = async (id: string, is_active: boolean) => {
    await supabase.from('webhook_endpoints').update({ is_active }).eq('id', id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Remover este webhook?')) return;
    await supabase.from('webhook_endpoints').delete().eq('id', id);
    load();
  };

  const sendTest = async (id: string) => {
    // Cria evento de teste — o trigger não dispara pois não é INSERT em tabela monitorada,
    // então chamamos o dispatcher direto
    const { data: ev, error: e1 } = await supabase.from('api_events').insert({
      event_type: 'test.ping',
      resource_type: 'test',
      resource_id: crypto.randomUUID(),
      action: 'ping',
      payload: { hello: 'world', ts: Date.now() },
    }).select().single();
    if (e1) return toast.error(e1.message);
    const { error: e2 } = await supabase.functions.invoke('webhook-dispatcher', {
      body: { event_id: ev.id },
    });
    if (e2) return toast.error('Falha ao disparar: ' + e2.message);
    toast.success('Evento de teste enviado');
    setTimeout(load, 1500);
  };

  return (
    <div className="space-y-4 pt-4">
      <Card className="p-4 bg-black border-purple-800">
        <h3 className="text-white font-bold mb-3">Cadastrar novo Webhook</h3>
        <div className="grid gap-2">
          <Input placeholder="Nome (ex: Lovable Bot Vendas)" value={name} onChange={e => setName(e.target.value)} className="bg-gray-900 border-purple-700 text-white" />
          <Input placeholder="https://minha-integracao.com/webhook" value={url} onChange={e => setUrl(e.target.value)} className="bg-gray-900 border-purple-700 text-white" />
          <div>
            <Label className="text-gray-400 text-xs">Eventos assinados (separados por vírgula, use * para todos)</Label>
            <Input value={events} onChange={e => setEvents(e.target.value)} placeholder="* ou sale.*, payment.created" className="bg-gray-900 border-purple-700 text-white" />
          </div>
          <div className="text-xs text-gray-500">
            Sugestões: {AVAILABLE_EVENTS.slice(0, 8).join(', ')}…
          </div>
          <Button onClick={create} disabled={loading} className="bg-purple-600 hover:bg-purple-700 w-fit">
            <Plus className="w-4 h-4 mr-1" /> Cadastrar
          </Button>
        </div>
      </Card>

      <Card className="p-4 bg-black border-purple-800">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-bold">Endpoints ativos</h3>
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        {hooks.length === 0 && <p className="text-gray-500 text-sm">Nenhum webhook cadastrado.</p>}
        <div className="space-y-2">
          {hooks.map(h => (
            <div key={h.id} className="p-3 bg-gray-900 rounded border border-purple-900">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{h.name}</span>
                    {h.is_active ? <Badge className="bg-green-600">Ativo</Badge> : <Badge variant="destructive">Pausado</Badge>}
                    {h.last_status && (
                      <Badge className={h.last_status < 300 ? 'bg-green-700' : 'bg-red-700'}>
                        HTTP {h.last_status}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 truncate">{h.url}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Eventos: <code>{(h.events || []).join(', ')}</code>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    Secret HMAC: <code className="bg-black px-1">{h.secret}</code>
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => { navigator.clipboard.writeText(h.secret); toast.success('Copiado'); }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button size="sm" variant="outline" onClick={() => sendTest(h.id)}>
                    <Send className="w-4 h-4 mr-1" /> Teste
                  </Button>
                  <Switch checked={h.is_active} onCheckedChange={v => toggle(h.id, v)} />
                  <Button size="sm" variant="destructive" onClick={() => remove(h.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============ EVENTOS ============ */
function EventsTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState('');

  const load = async () => {
    let q = supabase.from('api_events').select('*').order('created_at', { ascending: false }).limit(100);
    if (filter) q = q.ilike('event_type', `%${filter}%`);
    const { data } = await q;
    setEvents(data || []);
  };
  useEffect(() => { load(); }, [filter]);

  return (
    <div className="space-y-3 pt-4">
      <div className="flex gap-2 items-center">
        <Input placeholder="Filtrar por tipo (ex: sale, payment, model)" value={filter} onChange={e => setFilter(e.target.value)} className="bg-gray-900 border-purple-700 text-white max-w-md" />
        <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {events.map(e => (
          <details key={e.id} className="p-3 bg-gray-900 rounded border border-purple-900">
            <summary className="cursor-pointer flex items-center gap-2 text-white">
              <Badge className="bg-purple-700">{e.event_type}</Badge>
              <span className="text-xs text-gray-400">{new Date(e.created_at).toLocaleString('pt-BR')}</span>
              <span className="text-xs text-gray-500">#{String(e.resource_id).slice(0, 8)}</span>
            </summary>
            <pre className="mt-2 p-2 bg-black text-green-400 text-xs overflow-x-auto rounded">{JSON.stringify(e.payload, null, 2)}</pre>
          </details>
        ))}
        {events.length === 0 && <p className="text-gray-500 text-sm">Nenhum evento encontrado.</p>}
      </div>
    </div>
  );
}

/* ============ ENTREGAS ============ */
function DeliveriesTab() {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from('webhook_deliveries')
      .select('*, webhook_endpoints(name, url)')
      .order('created_at', { ascending: false }).limit(100);
    setRows(data || []);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3 pt-4">
      <div className="flex justify-between">
        <h3 className="text-white font-bold">Últimas 100 entregas</h3>
        <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {rows.map(r => (
          <div key={r.id} className="p-3 bg-gray-900 rounded border border-purple-900">
            <div className="flex items-center gap-2">
              <Badge className={r.status_code && r.status_code < 300 ? 'bg-green-700' : 'bg-red-700'}>
                {r.status_code || 'FAIL'}
              </Badge>
              <span className="text-white text-sm">{r.event_type}</span>
              <span className="text-xs text-gray-400">→ {r.webhook_endpoints?.name || 'endpoint removido'}</span>
              <span className="text-xs text-gray-500 ml-auto">{new Date(r.created_at).toLocaleString('pt-BR')}</span>
            </div>
            {r.error_message && <div className="text-xs text-red-400 mt-1">{r.error_message}</div>}
            {r.response_body && (
              <details className="mt-1">
                <summary className="text-xs text-gray-500 cursor-pointer">Resposta</summary>
                <pre className="text-xs bg-black p-2 mt-1 rounded overflow-x-auto">{r.response_body}</pre>
              </details>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="text-gray-500 text-sm">Nenhuma entrega ainda.</p>}
      </div>
    </div>
  );
}

/* ============ DOCS ============ */
function DocsTab() {
  const example = `curl "${API_URL}?type=sale.created&limit=20" \\
  -H "Authorization: Bearer SUA_API_KEY"`;

  const webhookExample = `POST https://sua-integracao.com/webhook
Content-Type: application/json
X-Coconudi-Event: sale.created
X-Coconudi-Event-Id: <uuid>
X-Coconudi-Signature: <hmac_sha256_hex>

{
  "id": "evt_uuid",
  "type": "sale.created",
  "resource_type": "sale",
  "resource_id": "sale_uuid",
  "action": "created",
  "data": { /* linha da tabela */ },
  "created_at": "2026-07-23T00:00:00Z"
}`;

  const validate = `// Node.js — valida assinatura HMAC
import crypto from 'crypto';
const sig = req.headers['x-coconudi-signature'];
const raw = JSON.stringify(req.body);
const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
if (sig !== expected) return res.status(401).end();`;

  return (
    <div className="space-y-4 pt-4 text-gray-300">
      <Card className="p-4 bg-black border-purple-800">
        <h3 className="text-white font-bold text-lg">🔑 Autenticação</h3>
        <p className="text-sm mt-1">Envie a API Key no header <code className="bg-gray-900 px-1">Authorization: Bearer &lt;chave&gt;</code>.</p>
      </Card>

      <Card className="p-4 bg-black border-purple-800">
        <h3 className="text-white font-bold text-lg">📖 REST API — Listar eventos</h3>
        <div className="text-sm mt-2 space-y-1">
          <div><code className="bg-gray-900 px-2 py-1">GET {API_URL}</code></div>
          <div className="text-xs text-gray-400 mt-2">Query params:</div>
          <ul className="text-xs ml-4 list-disc">
            <li><code>type</code> — filtro por tipo (ex: <code>sale.created</code>)</li>
            <li><code>resource_type</code> — <code>sale</code>, <code>payment</code>, <code>model</code>…</li>
            <li><code>since</code> / <code>until</code> — ISO 8601</li>
            <li><code>limit</code> — máx. 500 (default 50)</li>
            <li><code>cursor</code> — timestamp para paginação</li>
          </ul>
        </div>
        <pre className="mt-3 p-3 bg-gray-950 text-green-400 text-xs overflow-x-auto rounded">{example}</pre>
        <div className="mt-2 text-sm">
          Endpoint auxiliar: <code className="bg-gray-900 px-1">GET {API_URL}/types</code> — lista todos tipos disponíveis.
        </div>
      </Card>

      <Card className="p-4 bg-black border-purple-800">
        <h3 className="text-white font-bold text-lg">🔔 Webhooks — Formato da entrega</h3>
        <pre className="mt-2 p-3 bg-gray-950 text-green-400 text-xs overflow-x-auto rounded">{webhookExample}</pre>
        <h4 className="text-white font-bold mt-4">Validar assinatura HMAC:</h4>
        <pre className="mt-2 p-3 bg-gray-950 text-green-400 text-xs overflow-x-auto rounded">{validate}</pre>
      </Card>

      <Card className="p-4 bg-black border-purple-800">
        <h3 className="text-white font-bold text-lg">📋 Tipos de evento disponíveis</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mt-2 text-xs">
          {AVAILABLE_EVENTS.filter(e => !e.endsWith('*') || e === '*').map(e => (
            <code key={e} className="bg-gray-900 px-2 py-1 rounded">{e}</code>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Use <code>resource.*</code> para assinar todas as ações de um recurso (ex: <code>sale.*</code>).</p>
      </Card>
    </div>
  );
}
