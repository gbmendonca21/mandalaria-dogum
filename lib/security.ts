import securityHeaders from '../config/security-headers.json';

type LimitBinding = { limit(input: { key: string }): Promise<{ success: boolean }> };
type SecurityEnv = { AUTH_RATE_LIMITER?: LimitBinding; WRITE_RATE_LIMITER?: LimitBinding; NEON_AUTH_COOKIE_SECRET?: string };

export function secureResponse(response: Response) {
  const secured = new Response(response.body, response);
  for (const [name,value] of Object.entries(securityHeaders)) secured.headers.set(name,value);
  return secured;
}

export function privatePath(pathname: string) {
  let decoded: string;
  try { decoded=decodeURIComponent(pathname).toLowerCase(); } catch { return true; }
  return /(^|\/)\.(?!well-known(?:\/|$))/.test(decoded) ||
    /^\/(?:node_modules|neon|scripts|lib|worker|config)(?:\/|$)/.test(decoded) ||
    /(?:\.map|\.pem|\.key)$/.test(decoded) ||
    /^\/(?:wrangler\.(?:json|jsonc|toml)|package(?:-lock)?\.json|vite\.config\.[^/]+|tsconfig\.json)$/.test(decoded);
}

function failure(message: string, status: number, retry = false) {
  const response=Response.json({error:message},{status,headers:{'cache-control':'no-store'}});
  if(retry)response.headers.set('retry-after','60');
  return response;
}

export async function guardRequest(request: Request, env: SecurityEnv): Promise<{ request: Request; response?: Response }> {
  const url = new URL(request.url);
  if (privatePath(url.pathname)) return {request,response:failure('Não encontrado.',404)};
  if (!url.pathname.startsWith('/api/') || ['GET','HEAD','OPTIONS'].includes(request.method)) return {request};
  const webhook=url.pathname==='/api/webhooks/mercadopago';
  if (!webhook && request.headers.get('origin')!==url.origin) return {request,response:failure('Origem não permitida.',403)};
  const media=url.pathname==='/api/media';
  const limit=media?52*1024*1024:64*1024;
  const size=Number(request.headers.get('content-length')||0);
  if (size>limit) return {request,response:failure('Os dados enviados excedem o limite permitido.',413)};
  const limiter=url.pathname.startsWith('/api/auth/')?env.AUTH_RATE_LIMITER:!webhook?env.WRITE_RATE_LIMITER:undefined;
  if (limiter) {
    // Limite de borda aproximado para abuso anônimo, não uma identificação do visitante.
    const ip=request.headers.get('cf-connecting-ip')||'local';
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${env.NEON_AUTH_COOKIE_SECRET||'local'}:${ip}`));
    const key=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
    const result=await limiter.limit({key});
    if(!result.success)return {request,response:failure('Muitas tentativas. Aguarde um minuto e tente novamente.',429,true)};
  }
  if (!media && request.body) {
    const reader=request.body.getReader();
    const parts: Uint8Array[]=[];let length=0;
    while(true){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>limit){await reader.cancel();return {request,response:failure('Os dados enviados excedem o limite permitido.',413)};}parts.push(part.value);}
    const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
    request=new Request(request,{body:bytes});
  }
  return {request};
}
