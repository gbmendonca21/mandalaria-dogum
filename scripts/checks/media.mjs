import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { AwsClient } from 'aws4fetch';
const compile = file => ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/^import .+;\n/gm,'').replace(/^export /gm,'');
const bytes = new Uint8Array([255,216,255,224]);
const requests = [];
const savedFetch = globalThis.fetch;
globalThis.fetch = async request => {
  requests.push(request);
  return new Response(bytes, { headers: { 'content-type':'image/jpeg', 'content-length':String(bytes.length), etag:'"photo"', 'set-cookie':'do-not-forward=value' } });
};
try {
  const env = { AWS_REGION:'us-east-1', AWS_ACCESS_KEY_ID:'fake-access-key', AWS_SECRET_ACCESS_KEY:'fake-secret-key', AWS_ENDPOINT_URL_S3:'https://storage.example/' };
  const storageContext = vm.createContext({AwsClient, env, encodeURIComponent});
  vm.runInContext(compile('lib/storage.ts'),storageContext);
  const storage = storageContext.getStorageClient();
  await storage.put('products/example.jpg',bytes,'image/jpeg');
  assert.equal(requests[0].method,'PUT');
  assert.equal(new URL(requests[0].url).pathname,'/mandalaria-media/products/example.jpg');
  assert.match(requests[0].headers.get('authorization'), /AWS4-HMAC-SHA256/);
  const json = (data,status=200) => Response.json(data,{status});
  const context = vm.createContext({getStorageClient:()=>storage, json, Headers, Response, console});
  vm.runInContext(compile('app/api/media/[...key]/route.ts'),context);
  const key = ['products','bd3a1a0e-3863-4e77-83fa-e216d6f6b101.jpg'];
  const response = await context.GET(new Request('https://store.example/api/media/'+key.join('/')), {params:Promise.resolve({key})});
  assert.equal(response.status,200);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);
  assert.equal(response.headers.get('set-cookie'),null);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal(response.headers.get('content-type'),'image/jpeg');
  assert.equal((await context.GET(new Request('https://store.example'),{params:Promise.resolve({key:['private','other-file']})})).status,404);
  env.AWS_SECRET_ACCESS_KEY = '';
  assert.equal(storageContext.getStorageClient(),null);
  console.log('PASS: PUT/GET S3 assinados com fetch; bytes originais; cabeçalhos seguros; caminhos restritos e configuração obrigatória.');
} finally { globalThis.fetch=savedFetch; }
const json = (data,status=200) => Response.json(data,{status});
let queried=false, paymentCalled=false;
const checkout = vm.createContext({
  env:{MERCADOPAGO_ACCESS_TOKEN:'fake-test-token',SHIPPING_CENTS:'0'},URL,Response,console,json,
  errorResponse:error=>{throw error},isDemoProductId:()=>false,
  database:()=>({query:async query=>{assert.match(query,/price_cents > 0/);queried=true;return []}}),
  fetch:async()=>{paymentCalled=true;throw new Error('Produto sem preço não pode gerar pagamento')},
});
vm.runInContext(compile('lib/admin.ts'),checkout);
vm.runInContext(compile('app/api/checkout/route.ts'),checkout);
const denied=await checkout.POST(new Request('https://store.example/api/checkout',{
  method:'POST',headers:{origin:'https://store.example','content-type':'application/json'},
  body:JSON.stringify({customer:{name:'Teste local',email:'test@example.invalid',phone:'11999999999',zipCode:'01001000',street:'Rua de teste',number:'1',neighborhood:'Centro',city:'São Paulo',state:'SP'},items:[{productId:'bd3a1a0e-3863-4e77-83fa-e216d6f6b101',quantity:1}]})
}));
assert.equal(denied.status,409);assert.ok(queried);assert.equal(paymentCalled,false);
const products=vm.createContext({json,console});
vm.runInContext(compile('lib/admin.ts'),products);
vm.runInContext(compile('app/api/admin/products/route.ts'),products);
const parsed=products.parseProduct({name:'Mandala',categoryId:null,priceCents:0,stockQuantity:0,status:'active',imageUrl:'/api/media/products/bd3a1a0e-3863-4e77-83fa-e216d6f6b101.jpg'});
assert.equal(parsed.priceCents,0);assert.equal(parsed.status,'active');
console.log('PASS: cadastro permite foto sem preço; checkout recusa a foto sem criar pedido nem pagamento.');
