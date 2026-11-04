const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const exportsValue={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/admin-filters.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText,{exports:exportsValue});const {filterAdminRows,emptyAdminFilters,paymentMethodOptions,policyOptions}=exportsValue;
const rows=[
 {id:'A',name:'María López',email:'maria@example.com',identification:'ID-111',reference:'REF-ABC',status:'PENDING',selectedPolicy:'9000',method:'SINPE'},
 {id:'B',name:'José Mora',email:'jose@example.com',status:'APPROVED',selectedPolicy:18000,method:'sinpe móvil'},
 {id:'C',name:'Ana Cruz',email:'ana@example.com',status:'PENDING',selectedPolicy:'18000',method:'Transferencia bancaria'},
 {id:'D',name:'Mario Solís',email:'mario@example.com',status:'REJECTED',selectedPolicy:'9000',method:'TRANSFERENCIA'},
 {id:'E',name:'Registro anterior',email:'legacy@example.com',status:'PENDING',method:'Efectivo'},
 {id:'F',name:'Sin datos de pago',status:'PENDING'},
];
const result=filters=>filterAdminRows(rows,{...emptyAdminFilters,...filters}).map(row=>row.id);
test('sin filtros muestra todas las solicitudes sin modificar los registros',()=>{assert.equal(filterAdminRows(rows,emptyAdminFilters).length,6);assert.equal(rows.length,6);assert.equal(rows[0].name,'María López');});
test('combina estado, póliza y método con búsqueda sin distinción de tildes',()=>{assert.deepEqual(Array.from(result({status:'PENDING',policy:'9000',method:'SINPE',search:'  MARIA lopez '})),['A']);assert.deepEqual(Array.from(result({status:'PENDING',policy:'18000',method:'TRANSFERENCIA'})),['C']);assert.equal(result({status:'REJECTED',policy:'18000'}).length,0);});
test('reconoce métodos antiguos y valores numéricos de pólizas en Sheets',()=>{assert.deepEqual(Array.from(result({method:'SINPE'})),['A','B']);assert.deepEqual(Array.from(result({method:'TRANSFERENCIA'})),['C','D']);assert.deepEqual(Array.from(result({policy:'18000'})),['B','C']);});
test('busca también por correo, identificación y referencia',()=>{for(const search of ['maria@example.com','id-111','ref-abc'])assert.deepEqual(Array.from(result({search})),['A']);});
test('registros anteriores sin datos o con métodos distintos siguen disponibles',()=>{assert.deepEqual(Array.from(result({policy:'__missing__'})),['E','F']);assert.deepEqual(Array.from(result({method:'__missing__'})),['F']);assert.deepEqual(Array.from(result({method:'EFECTIVO'})),['E']);assert.ok(paymentMethodOptions(rows).some(option=>option.value==='EFECTIVO'));assert.ok(paymentMethodOptions(rows).some(option=>option.value==='__missing__'));assert.ok(policyOptions(rows).some(option=>option.value==='__missing__'));});
