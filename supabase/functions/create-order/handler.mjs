const productionHost = 'courmet-express.pages.dev';
export const allowedHostname = host => host === productionHost || /^[a-z0-9-]+\.courmet-express\.pages\.dev$/.test(host);
const json = (status, data, origin) => new Response(JSON.stringify(data), { status, headers: {
  'Content-Type': 'application/json', 'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'X-Content-Type-Options': 'nosniff',
}});
export function createHandler({ env, request = fetch }) {
  return async req => {
    const origin = req.headers.get('origin') || '';
    let host;
    try { const url = new URL(origin); if (url.protocol !== 'https:') throw new Error(); host = url.hostname; }
    catch { return json(403, {error:'Origine refusée.'}, 'null'); }
    if (!allowedHostname(host)) return json(403,{error:'Origine refusée.'},'null');
    if (req.method === 'OPTIONS') return json(200,{},origin);
    if (req.method !== 'POST') return json(405,{error:'Méthode refusée.'},origin);
    try {
      // Read a bounded stream; Content-Length is not trusted.
      const reader = req.body?.getReader();
      if (!reader) return json(400,{error:'Requête invalide.'},origin);
      const chunks=[]; let length=0;
      while (true) {
        const {done,value}=await reader.read(); if(done) break;
        length+=value.byteLength;
        if(length>131072) { await reader.cancel(); return json(413,{error:'Requête trop volumineuse.'},origin); }
        chunks.push(value);
      }
      const bytes=new Uint8Array(length); let offset=0;
      for(const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.byteLength;}
      let body;
      try {body=JSON.parse(new TextDecoder().decode(bytes));} catch {return json(400,{error:'Requête invalide.'},origin);}
      const token=body?.captchaToken;
      if(typeof token!=='string'||!token.trim()||token.length>2048||!body.payload||typeof body.payload!=='object')
        return json(403,{error:'Validation anti-robot requise.'},origin);
      const base=env('SUPABASE_URL');
      const modern=JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}');
      const key=modern.default||env('SUPABASE_SERVICE_ROLE_KEY');
      const publicKeys=JSON.parse(env('SUPABASE_PUBLISHABLE_KEYS')||'{}');
      const publicKey=publicKeys.default||env('SUPABASE_ANON_KEY');
      if(!base||!key||!publicKey) throw new Error('configuration');
      const adminHeaders={apikey:key,'Content-Type':'application/json'};
      // Supabase's legacy JWT keys need Authorization; new secret keys must not use it.
      if(!key.startsWith('sb_secret_')) adminHeaders.Authorization='Bearer '+key;
      const rpc=async(name,args)=>request(base+'/rest/v1/rpc/'+name,{
        method:'POST',headers:adminHeaders,body:JSON.stringify(args),signal:AbortSignal.timeout(10000),
      });
      const secretResponse=await rpc('checkout_turnstile_secret',{});
      if(!secretResponse.ok) throw new Error('configuration');
      const secret=await secretResponse.json();
      if(typeof secret!=='string'||!secret) throw new Error('configuration');
      const verification=await request('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
        method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({secret,response:token}),signal:AbortSignal.timeout(10000),
      });
      if(!verification.ok) return json(403,{error:'Validation anti-robot refusée. Réessayez.'},origin);
      const verdict=await verification.json();
      if(verdict.success!==true||verdict.action!=='checkout'||verdict.hostname!==host||!allowedHostname(verdict.hostname))
        return json(403,{error:'Validation anti-robot refusée. Réessayez.'},origin);
      let customer=null;
      const authorization=req.headers.get('authorization');
      if(authorization) {
        if(!authorization.startsWith('Bearer ')) return json(401,{error:'Session invalide.'},origin);
        const identity=await request(base+'/auth/v1/user',{headers:{apikey:publicKey,Authorization:authorization},signal:AbortSignal.timeout(10000)});
        if(!identity.ok) return json(401,{error:'Session expirée. Reconnectez-vous.'},origin);
        const user=await identity.json();
        if(typeof user.id!=='string') return json(401,{error:'Session invalide.'},origin);
        customer=user.id;
      }
      // Customer identity always comes from Auth, never from the submitted JSON.
      const result=await rpc('server_create_order',{payload:body.payload,verified_customer:customer});
      const data=await result.json();
      if(!result.ok) {
        const message=typeof data?.message==='string'&&/^(Commande|Restaurant|Produit|Option|Groupe|Nombre|Quantité|Panier|Montant|Coordonnées|Numéro|Veuillez|Trop|Frais|Prix)/.test(data.message)
          ? data.message : 'Commande refusée. Vérifiez le panier ou contactez le restaurant.';
        return json(400,{error:message},origin);
      }
      return json(200,data,origin);
    } catch {
      // Never log tokens, Auth headers, customer details or secrets.
      return json(503,{error:'Validation indisponible. Réessayez ou contactez le restaurant.'},origin);
    }
  };
}
