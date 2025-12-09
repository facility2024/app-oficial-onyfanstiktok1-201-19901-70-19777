// Bunny Upload - Ultra Minimal Test v1
Deno.serve(() => new Response(JSON.stringify({ ok: true }), {
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
}));
