// Executa o arquivo real servido ao navegador, sem criar um global Node `process`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const origin = 'https://mandalaria-dogum.vertice-digital.workers.dev';
const location = { origin, href: origin + '/?login=1', pathname: '/', search: '?login=1' };
const requests = [];
const context = vm.createContext({
  window: { location, addEventListener() {}, removeEventListener() {} }, location,
  document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
  navigator: { onLine: true }, URL, URLSearchParams, Headers, Request, Response, AbortController,
  TextEncoder, TextDecoder, crypto, console, setTimeout, clearTimeout, setInterval, clearInterval,
  fetch: async (input, options) => {
    const url = new URL(String(input), origin);
    requests.push({ url, options });
    if (url.pathname.endsWith('/sign-in/social')) return Response.json({ url: 'https://accounts.google.com/o/oauth2/v2/auth', redirect: false });
    if (url.pathname.endsWith('/get-session')) return Response.json(null);
    if (url.pathname.endsWith('/list-accounts')) return Response.json([{providerId:'credential'}]);
    if (url.pathname.endsWith('/change-password')) return Response.json({token:null,user:{id:'test-user'}});
    return Response.json({ message: 'Credenciais inválidas para este teste', code: 'INVALID_CREDENTIALS' }, { status: 401 });
  },
});
assert.equal(vm.runInContext('typeof process', context), 'undefined');
vm.runInContext(fs.readFileSync('public/auth-client.js', 'utf8'), context);
const auth = context.window.MANDALARIA_AUTH;
assert.ok(auth, 'O bundle precisa disponibilizar o cliente sem depender de Node.');
for (const method of [auth.signIn.email, auth.signIn.social, auth.signUp.email, auth.signOut, auth.emailOtp.verifyEmail, auth.changePassword, auth.listAccounts]) assert.equal(typeof method, 'function');
const social = await auth.signIn.social({ provider: 'google', callbackURL: origin + '/?login=1&auth=google', disableRedirect: true });
assert.equal(social.error, null);
assert.equal(new URL(social.data.url).hostname, 'accounts.google.com');
const request = requests.find(({ url }) => url.pathname === '/api/auth/sign-in/social');
assert.ok(request, 'O cliente real deve chamar o proxy da própria loja.');
assert.equal(JSON.parse(request.options.body).provider, 'google');
assert.equal(request.url.origin, origin);
const accounts = await auth.listAccounts();
assert.equal(accounts.data[0].providerId,'credential');
await auth.changePassword({currentPassword:'old-test-password',newPassword:'new-test-password',revokeOtherSessions:true});
const changed=requests.find(({url})=>url.pathname==='/api/auth/change-password');
assert.ok(changed);assert.equal(changed.options.method,'POST');assert.equal(JSON.parse(changed.options.body).revokeOtherSessions,true);
const session = await auth.getSession();
assert.equal(session.data, null);
await assert.rejects(auth.signIn.email({ email: 'test@example.invalid', password: 'not-a-real-password' }), /Credenciais inválidas para este teste/);
assert.ok(requests.some(({ url }) => url.pathname === '/api/auth/sign-in/email'));
assert.equal(vm.runInContext('typeof process', context), 'undefined');
console.log('PASS: bundle real inicia sem Node, expõe Google/cadastro/login e envia requisições ao proxy da loja.');
