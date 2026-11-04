const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const exportsValue={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/receipt.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsValue,File,Buffer});const {readReceipt}=exportsValue;
test('registro y reenvío aceptan JPG, PNG y PDF con firma válida',async()=>{
 for(const [type,header] of [['application/pdf',Buffer.from('%PDF-')],['image/png',Buffer.from([137,80,78,71,13,10,26,10])],['image/jpeg',Buffer.from([255,216,255])]]){const bytes=Buffer.concat([header,Buffer.alloc(100)]);const receipt=await readReceipt(new File([bytes],'receipt',{type}));assert.equal(receipt.type,type);assert.equal(Buffer.from(receipt.base64,'base64').length,bytes.length);}
});
test('rechaza archivos ausentes, muy grandes o con firma falsificada',async()=>{
 await assert.rejects(readReceipt(null),/Adjuntá/);await assert.rejects(readReceipt(new File(['short'],'x.pdf',{type:'application/pdf'})),/entre/);await assert.rejects(readReceipt(new File([Buffer.alloc(4*1024*1024+1)],'x.pdf',{type:'application/pdf'})),/entre/);await assert.rejects(readReceipt(new File([Buffer.alloc(120)],'x.pdf',{type:'application/pdf'})),/no coincide/);await assert.rejects(readReceipt(new File([Buffer.alloc(120)],'x.txt',{type:'text/plain'})),/Solo/);
});
