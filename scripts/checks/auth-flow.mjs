import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = fs.readFileSync('public/app.js','utf8').replace(/renderProducts\(\); renderCart\(\);\nPromise\.all\(\[loadCatalog\(\), loadMe\(\)\]\)[\s\S]*$/, '');
const elements=new Map(), handlers=new Map(), calls=[];
function element(selector){
 if(!elements.has(selector))elements.set(selector,{textContent:'',innerHTML:'',style:{},open:false,value:'',disabled:false,listeners:new Map(),classList:{toggle(){},add(){},remove(){},contains(){return false}},setAttribute(){},addEventListener(name,fn){this.listeners.set(name,fn)},showModal(){this.open=true},close(){this.open=false},reportValidity(){return true}});
 return elements.get(selector);
}
let session={authenticated:false,admin:false};
let socialError=false;
let hasPassword=true, changeError=false;
const auth={
 listAccounts:async()=>({data:[{providerId:hasPassword?'credential':'google'}]}),
 changePassword:async input=>{calls.push(['change',input]);return changeError?{error:{message:'Senha atual incorreta'}}:{}},
 signOut:async()=>{calls.push(['signout']);session={authenticated:false,admin:false};return {}},
 signIn:{social:async input=>{calls.push(['google',input]);return socialError?{error:{message:'Google indisponível'}}:{}},email:async input=>{calls.push(['signin',input]);session={authenticated:true,admin:true,emailVerified:true,email:input.email};return {}}},
 signUp:{email:async input=>{calls.push(['signup',input]);session={authenticated:true,admin:false,emailVerified:false,email:input.email};return {}}},
 emailOtp:{sendVerificationOtp:async input=>{calls.push(['otp',input]);return {}},verifyEmail:async input=>{calls.push(['verify',input]);session={...session,emailVerified:true,admin:true};return {}},resetPassword:async input=>{calls.push(['reset',input]);return {}}},
};
const app=vm.createContext({window:{MANDALARIA_CONFIG:{},MANDALARIA_AUTH:auth},document:{querySelector:element,querySelectorAll:selector=>selector==='dialog[open]'?[...elements.values()].filter(e=>e.open):[],addEventListener(name,fn){handlers.set(name,[...handlers.get(name)||[],fn])}},localStorage:{getItem:()=>null},location:{origin:'https://mandalaria-dogum.vertice-digital.workers.dev',search:''},Intl,URLSearchParams,console,FormData:class{constructor(form){this.values=form.values}entries(){return Object.entries(this.values)[Symbol.iterator]()}get(key){return this.values[key]}},fetch:async path=>({ok:true,json:async()=>path==='/api/me'?session:{products:[],categories:[]}})});
const run=code=>vm.runInContext(code,app);
const click=async(id='',dataset={})=>{const node=element('#'+id);node.id=id;node.dataset=dataset;node.matches=()=>false;node.closest=()=>node;return handlers.get('click')[0]({target:node,preventDefault(){},stopPropagation(){}})};
const submit=async(id,values)=>handlers.get('submit')[0]({preventDefault(){},target:{id,values,querySelector:()=>({disabled:false})}});
vm.runInContext(source,app);
await run('openAccount()');
assert.equal(element('#accountTitle').textContent,'Login');
assert.match(element('#accountContent').innerHTML,/Continuar com Google/);
assert.match(element('#accountContent').innerHTML,/data-auth-mode="signup"/);
await click('googleSignIn');
const google=calls.find(([type])=>type==='google')[1];
assert.equal(google.provider,'google');
assert.equal(new URL(google.callbackURL).origin,'https://mandalaria-dogum.vertice-digital.workers.dev');
assert.equal(new URL(google.callbackURL).searchParams.get('login'),'1');
assert.equal(new URL(google.errorCallbackURL).searchParams.get('auth'),'error');
app.window.MANDALARIA_AUTH = undefined;
await click('googleSignIn');
assert.equal(element('#googleSignIn').disabled, false);
assert.match(element('#authMessage').textContent, /Recarregue a página/);
app.window.MANDALARIA_AUTH = auth;
socialError=true;await click('googleSignIn');
assert.equal(element('#googleSignIn').disabled,false);
assert.equal(element('#authMessage').textContent,'Google indisponível');
await click('',{authMode:'signup'});
assert.equal(element('#accountTitle').textContent,'Criar conta');
assert.match(element('#accountContent').innerHTML,/name="name"/);
await submit('accountAuthForm',{name:'Usuária',email:'owner@example.com',password:'example-password'});
assert.equal(calls.find(([type])=>type==='signup')[1].name,'Usuária');
assert.equal(calls.find(([type])=>type==='otp')[1].type,'email-verification');
assert.match(element('#accountContent').innerHTML,/verifyEmailForm/);
await submit('verifyEmailForm',{otp:'123456'});
assert.equal(element('#adminDialog').open,true);
assert.equal(element('#accountDialog').open,false);
session={authenticated:false,admin:false};await run('openAccount()');
await click('forgotPassword');
assert.equal(element('#accountTitle').textContent,'Recuperar senha');
element('#passwordResetEmail').value='owner@example.com';
await click('sendPasswordResetCode');
assert.equal(calls.filter(([type])=>type==='otp').at(-1)[1].type,'forget-password');
await submit('passwordResetForm',{email:'owner@example.com',otp:'123456',password:'new-password',confirmPassword:'new-password'});
assert.equal(element('#accountTitle').textContent,'Login');
assert.match(element('#authMessage').textContent,/Senha atualizada/);
// Password controls belong to every account, independently of admin membership.
session={authenticated:true,admin:false,emailVerified:true,email:'client@example.com'};
await run('openAccount()');
assert.match(element('#accountContent').innerHTML,/id="changePasswordButton"/);
assert.doesNotMatch(element('#accountContent').innerHTML,/id="openAdminFromAccount"/);
await click('changePasswordButton');
assert.equal(element('#accountTitle').textContent,'Alterar senha');
await submit('changePasswordForm',{currentPassword:'old-password',password:'new-password',confirmPassword:'different'});
assert.match(element('#authMessage').textContent,/não confere/);
assert.equal(calls.filter(([type])=>type==='change').length,0);
await submit('changePasswordForm',{currentPassword:'old-password',password:'short',confirmPassword:'short'});
assert.equal(calls.filter(([type])=>type==='change').length,0);
changeError=true;
await submit('changePasswordForm',{currentPassword:'wrong-password',password:'new-password',confirmPassword:'new-password'});
assert.equal(element('#authMessage').textContent,'Senha atual incorreta');
changeError=false;
await submit('changePasswordForm',{email:'other@example.com',userId:'another-user',currentPassword:'old-password',password:'new-password',confirmPassword:'new-password'});
const changed=calls.filter(([type])=>type==='change').at(-1)[1];
assert.equal(changed.currentPassword,'old-password');assert.equal(changed.newPassword,'new-password');assert.equal(changed.revokeOtherSessions,true);
assert.equal(Object.hasOwn(changed,'userId'),false);assert.equal(Object.hasOwn(changed,'email'),false);
assert.match(element('#accountMessage').textContent,/Senha alterada/);
session={...session,admin:true};await run('openAccount()');
assert.match(element('#accountContent').innerHTML,/id="changePasswordButton"/);
// Google-only users create a password by proving mailbox access; the account email is fixed.
hasPassword=false;session={authenticated:true,admin:false,emailVerified:true,email:'client@example.com'};
await run('openAccount()');await click('changePasswordButton');
assert.equal(element('#accountTitle').textContent,'Criar ou redefinir senha');
assert.match(element('#accountContent').innerHTML,/value="client@example.com" readonly/);
element('#passwordResetEmail').value='other@example.com';
await click('sendPasswordResetCode');
assert.equal(calls.filter(([type])=>type==='otp').at(-1)[1].email,'client@example.com');
await submit('passwordResetForm',{email:'other@example.com',otp:'123456',password:'created-password',confirmPassword:'created-password'});
assert.equal(calls.filter(([type])=>type==='reset').at(-1)[1].email,'client@example.com');
assert.equal(session.authenticated,false);assert.equal(element('#accountTitle').textContent,'Login');
console.log('PASS: senha para cliente e administrador; confirmação e tamanho; senha atual incorreta; revogação de outros acessos; Google via OTP; alvo restrito à própria conta.');
const transpile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^import .+;\n/gm,'').replace(/^export /gm,'');
let user=null, queryEmail;
const server=vm.createContext({getAuth:()=>({getSession:async options=>{assert.equal(options.query.disableCookieCache,"true");return {data:{user}}}}),database:()=>({query:async(_query,args)=>{queryEmail=args[0];return queryEmail==='owner@example.com'?[{role:'editor'}]:[]}}),json:(body,status=200)=>Response.json(body,{status})});
vm.runInContext(transpile('lib/admin.ts'),server);
assert.equal((await server.requireAdmin()).response.status,401);
user={email:'owner@example.com',emailVerified:false};assert.equal((await server.requireAdmin()).response.status,403);
user={email:'client@example.com',emailVerified:true};assert.equal((await server.requireAdmin()).response.status,403);
user={email:'OWNER@EXAMPLE.COM',emailVerified:true};assert.equal((await server.requireAdmin()).role,'editor');assert.equal(queryEmail,'owner@example.com');
// Both the account status endpoint and admin guard must reject cached identity snapshots.
vm.runInContext(transpile('app/api/me/route.ts'),server);
assert.equal((await (await server.GET()).json()).admin,true);
const authProxy=vm.createContext({URL,Request,getAuth:()=>({handler:()=>({GET:async request=>{assert.equal(new URL(request.url).searchParams.get('disableCookieCache'),'true');return Response.json(null)}})})});
vm.runInContext(transpile('app/api/auth/[...path]/route.ts'),authProxy);
await vm.runInContext("GET(new Request('https://store.example/api/auth/get-session?disableCookieCache=false'),{})",authProxy);
let exchanges=0;
const proxy=vm.createContext({NextResponse:{next:()=>({next:true})},getAuth:()=>({middleware:options=>{assert.equal(options.publicRoutes[0],'/');return async()=>{exchanges++;return {exchanged:true}}}})});
vm.runInContext(transpile('proxy.ts'),proxy);
assert.equal((await proxy.proxy({nextUrl:new URL('https://store.example/')})).next,true);
assert.equal(exchanges,0);
assert.equal((await proxy.proxy({nextUrl:new URL('https://store.example/?neon_auth_session_verifier=example')})).exchanged,true);
console.log('PASS: Google e erros; cadastro e verificação de e-mail; recuperação de senha; autorização administrativa; troca do verificador OAuth sem restringir a vitrine.');
