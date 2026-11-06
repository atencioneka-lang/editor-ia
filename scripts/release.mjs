import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const release={
  version:pkg.version,
  revision:process.env.DEPLOY_SHA||'local',
  published:new Date().toISOString()
};
mkdirSync(new URL('../dist/',import.meta.url),{recursive:true});
writeFileSync(new URL('../dist/release.json',import.meta.url),JSON.stringify(release,null,2)+'\n');
console.log(`Release ${release.version}: ${release.revision}`);
