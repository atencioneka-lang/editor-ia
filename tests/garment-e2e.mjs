import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const outputDir=path.resolve('artifacts/clothing-e2e');
await mkdir(outputDir,{recursive:true});
const candidates=[
 'https://images.pexels.com/photos/8423863/pexels-photo-8423863.jpeg?auto=compress&cs=tinysrgb&w=768',
 'https://images.pexels.com/photos/26692413/pexels-photo-26692413.jpeg?auto=compress&cs=tinysrgb&w=768'
];
let input=null,creditUrl='';
for(const url of candidates){
 try{
  const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; EditorIATest/1.0)'}});
  const bytes=Buffer.from(await r.arrayBuffer());
  console.log('TEST PHOTO:',r.status,r.headers.get('content-type'),bytes.length,url);
  if(r.ok&&bytes.length>12000&&/image\/jpeg/.test(r.headers.get('content-type')||'')){
   input=bytes;creditUrl=url;break;
  }
 }catch(err){console.log('TEST PHOTO source error:',err instanceof Error?err.message:String(err));}
}
if(!input)throw Error('A real adult-clothing stock photo could not be downloaded; this test must not claim success.');
const photoPath=path.join(outputDir,'before.jpg');
await writeFile(photoPath,input);
await writeFile(path.join(outputDir,'source.txt'),creditUrl+'\nPexels image used for this internal visual integration test. Source photo is from the free stock collection.\n');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1580,height:1050},deviceScaleFactor:1,acceptDownloads:true});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const timeout=180000;
try{
 const base=process.env.EDITOR_TEST_URL||'http://127.0.0.1:4173/editor-ia/';
 console.log('E2E: loading app',base);
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:25000});
 await page.locator('input[type="file"][accept="image/jpeg,image/png,image/webp"]').first().setInputFiles(photoPath);
 await page.locator('.advanced-photo-layer img').waitFor({timeout:20000});
 console.log('E2E: photo appeared in editor');
 await page.getByRole('button',{name:/Cambiar prenda/}).first().click();
 await page.locator('#advanced-instruction').fill(
  'Replace the blue denim trousers with a knee-length navy pleated skirt. Keep the woman fully clothed. Preserve her face, upper clothing, pose, body proportions, photo composition and background. Make the skirt look naturally photographed.'
 );
 await page.locator('#advanced-ai-engine').selectOption('fibo');
 await page.locator('.advanced-ai-consent input[type="checkbox"]').check();
 await page.screenshot({path:path.join(outputDir,'before-screen.png'),fullPage:true});
 console.log('E2E: clicking in-app Apply AI button with adult-clothing change');
 await page.locator('.advanced-ai-cta').click();
 const start=Date.now();
 try{
  await page.locator('.advanced-compare').waitFor({timeout});
 }catch(err){
  const status=await page.locator('.advanced-notice').innerText().catch(()=>'<missing>');
  console.error('E2E: no edited image returned. Status:',status,'elapsed ms:',Date.now()-start);
  throw Error('No edited image appeared inside the app. Status: '+status);
 }
 const status=await page.locator('.advanced-notice').innerText();
 console.log('E2E: app displayed edited image after ms=',Date.now()-start);
 console.log('E2E: status:',status);
 await page.screenshot({path:path.join(outputDir,'after-screen.png'),fullPage:true});
 const downloadPromise=page.waitForEvent('download',{timeout:10000});
 await page.locator('.advanced-upload-row a[download]').click();
 const download=await downloadPromise;
 const afterPath=path.join(outputDir,'after.png');
 await download.saveAs(afterPath);
 const file=await readFile(afterPath);
 if(file.length<15000)throw Error('Downloaded edited PNG too small to evaluate.');
 console.log('E2E: clicked and downloaded edited PNG in browser; bytes=',file.length);
 await writeFile(path.join(outputDir,'report.json'),JSON.stringify({ok:true,photo:creditUrl,elapsedMs:Date.now()-start,beforeBytes:input.length,afterBytes:file.length,status,browserErrors:errors},null,2));
}finally{
 if(errors.length)console.log('E2E: browser console errors:',errors.slice(0,10));
 await page.screenshot({path:path.join(outputDir,'final-screen.png'),fullPage:true}).catch(()=>{});
 await browser.close();
}
