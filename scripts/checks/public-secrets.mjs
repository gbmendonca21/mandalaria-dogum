import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const known=[];
for(const name of ['.dev.vars','.env','.env.local']){
 if(!fs.existsSync(name))continue;
 const text=fs.readFileSync(name,'utf8');
 for(const line of text.split('\n')){const match=line.match(/^([A-Z_]+)\s*=\s*["']?(.*?)["']?\s*$/);if(match && /SECRET|TOKEN|PASSWORD|DATABASE_URL|ACCESS_KEY_ID/.test(match[1]) && match[2].length>=12)known.push(match[2]);}
}
const patterns=[/postgres(?:ql)?:\/\/[^\s"'<>/@:]+:[^\s"'<>/@]+@/i,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\b(?:ghp_[a-zA-Z0-9]{30,}|github_pat_[a-zA-Z0-9_]{30,}|nsk_live_[a-zA-Z0-9_]{20,})\b/];
let checked=0;
const findings=[];
const scan=(text,label)=>{checked++;if(known.some(secret=>text.includes(secret))||patterns.some(pattern=>pattern.test(text)))findings.push(label)};
function walk(dir){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else{const data=fs.readFileSync(file);if(!data.includes(0))scan(data.toString('utf8'),file)}}}
for(const dir of ['public','dist/client','dist-pages'])walk(dir);
const configPath='dist/server/wrangler.json';
if(fs.existsSync(configPath)){const config=JSON.parse(fs.readFileSync(configPath));for(const key of Object.keys(config.vars||{}))if(/SECRET|TOKEN|PASSWORD|DATABASE_URL|ACCESS_KEY_ID/.test(key))findings.push(`${configPath}: forbidden public variable ${key}`);scan(JSON.stringify(config.vars),configPath);}
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
for(const file of tracked){if(/(?:^|\/)\.env(?:\..*)?$|(?:^|\/)\.dev\.vars/.test(file)&&!file.endsWith('.env.example'))findings.push(`${file}: sensitive env file tracked`);}
if(process.argv.includes('--history')){
 const objects=execFileSync('git',['rev-list','--objects','--all'],{encoding:'utf8'}).trim().split('\n').map(line=>line.split(' ')[0]);
 for(const oid of objects){if(execFileSync('git',['cat-file','-t',oid],{encoding:'utf8'}).trim()!=='blob')continue;const data=execFileSync('git',['cat-file','blob',oid],{maxBuffer:20*1024*1024});if(!data.includes(0))scan(data.toString('utf8'),`git blob ${oid}`)}
}
if(findings.length){console.error('Potential credentials require private review (values hidden):',findings);process.exit(1)}
console.log(`PASS: ${checked} text files/objects checked; no known local secrets or selected credential patterns found. This is a scoped scan, not a guarantee about every possible secret.`);
