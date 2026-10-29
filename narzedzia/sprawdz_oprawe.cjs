// Porównanie obliczeń i generowanych SVG z zachowanymi modułami źródłowymi.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const path=require('path');
const base=path.resolve(__dirname,'..')+path.sep;
const book=require(base+'oprawa/scalone/book.js');
assert.equal(book.errors.length,0);
const model1={},model2={};
vm.runInNewContext(fs.readFileSync(base+'narzedzia/wzorce/01-numerics.js','utf8'),model1);
vm.runInNewContext(fs.readFileSync(base+'narzedzia/wzorce/02-numerics.js','utf8'),model2);
let runs=0;
for(const mu of [0,1])for(const h of [.025,.05,.1]){
 const count=Math.round(6/h);
 assert.equal(JSON.stringify(model1.euler(mu,h,count)),JSON.stringify(book.modules.cel.euler(mu,h,count)));runs++;
}
for(const p of [3,4,5])for(const d of [.125,.0625,.09375]){
 assert.equal(JSON.stringify(model2.accumulation(p,d,16)),JSON.stringify(book.modules.arytmetyka.accumulation(p,d,16)));runs++;
}
for(const p of [3,4,5]){
 assert.equal(JSON.stringify(model2.representablePoints(p)),JSON.stringify(book.modules.arytmetyka.representablePoints(p)));
 for(const x of [1,1.09375,1.125,1.5,2,3.875])assert.equal(JSON.stringify(model2.roundingInfo(x,p)),JSON.stringify(book.modules.arytmetyka.roundingInfo(x,p)));
}
const originalApis=[];let holder={};const mod={};Object.defineProperty(mod,'exports',{get(){return holder},set(x){holder=x;originalApis.push(x)}});
vm.runInNewContext(fs.readFileSync(base+'narzedzia/wzorce/pierwiastki.js','utf8'),{module:mod,document:{querySelectorAll:()=>[]}});
assert.equal(originalApis.length,3);
const a=originalApis[0],b=book.modules.pierwiastki.RootMethods;let frames=0;
function same(x,y){assert.equal(JSON.stringify(x),JSON.stringify(y));}
function unprefix(x){return x.replaceAll('pierwiastki-','');}
for(const method of Object.keys(a.cases))for(let i=0;i<a.cases[method].length;i++){
 const cfg=a.cases[method][i],newcfg=b.cases[method][i];
 const oldRows=a.trace(method,cfg),newRows=b.trace(method,newcfg);same(oldRows,newRows);
 for(let frame=0;frame<a.frameCount(oldRows);frame++){
  same(a.state(method,cfg,oldRows,frame),b.state(method,newcfg,newRows,frame));
  assert.equal(a.plot(method,cfg,oldRows,frame,'plot-'+method),unprefix(b.plot(method,newcfg,newRows,frame,'plot-'+method)));
  frames++;
 }
}
const oldMap=originalApis[1],newMap=book.modules.pierwiastki.IntervalMap;
for(let i=0;i<oldMap.cases.length;i++)for(const [u,v]of [[1,2],[1.25,1.75],[1.1,1.9]]){
 same(oldMap.values(oldMap.cases[i],u,v),newMap.values(newMap.cases[i],u,v));
 assert.equal(oldMap.graph(oldMap.cases[i],u,v),unprefix(newMap.graph(newMap.cases[i],u,v)));
 assert.equal(oldMap.distances(oldMap.cases[i],u,v),unprefix(newMap.distances(newMap.cases[i],u,v)));
}
const oldD=originalApis[2],newD=book.modules.pierwiastki.DerivativeIntuition;
for(let i=0;i<oldD.cases.length;i++)for(const x of [-1,0,.6,1]){
 same(oldD.stats(oldD.cases[i],x),newD.stats(newD.cases[i],x));
 assert.equal(oldD.plot(oldD.cases[i],x),unprefix(newD.plot(newD.cases[i],x)));
}
const input='<svg aria-labelledby="title desc"><title id="title"></title><desc id="desc"></desc><path id="path" clip-path="url(#clip)"/><use href="#path"/></svg>';
const ns=book.namespaceMarkup(input,'test-');assert.equal(ns,book.namespaceMarkup(ns,'test-'));
assert(ns.includes('id="test-title"'));assert(ns.includes('url(#test-clip)'));assert(ns.includes('href="#test-path"'));
console.log('OK: '+runs+' przebiegów modeli 01–02, '+frames+' klatek metod z rozdziału 3, obraz przedziału i pochodne.');
console.log('Obliczenia i geometria SVG zgodne z oryginałem; prefiksy ID są idempotentne.');

{
function harness(book){
 const nodes=new Map();
 function node(selector){
  if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',clientWidth:736,dataset:{},handlers:{},disabled:false,
   addEventListener(t,fn){this.handlers[t]=fn},classList:{add(){},remove(){}},getBoundingClientRect(){return{left:0,top:0,width:736,height:427}}});
  return nodes.get(selector);
 }
 const root=node('root');root.querySelector=node;
 const chapter={contains:()=>true};
 const document={readyState:'complete',getElementById(id){return id===(book?'nieliniowe-newton-zoom':'newton-zoom')?root:null},querySelector(s){return s==='.chapter-nieliniowe'?chapter:null},querySelectorAll(){return[]}};
 const context={document,console,URLSearchParams,location:{search:''}};
 context.window=context;
 vm.runInNewContext(fs.readFileSync(base+(book?'oprawa/scalone/book.js':'narzedzia/wzorce/newton-3d.js'),'utf8'),context);
 if(book)assert.equal(context.NumerkiBook.errors.length,0);
 return {nodes,node};
}
const a=harness(false),b=harness(true);
for(let i=0;i<3;i++){
 const svg1=a.node('.nz-plot').innerHTML,svg2=b.node('.nz-plot').innerHTML.replaceAll('nieliniowe-','');
 assert(svg1.startsWith('<svg'));
 assert.equal(svg1,svg2);
 assert.equal(a.node('[data-value]').textContent,b.node('[data-value]').textContent);
 if(i<2){a.node('[data-next]').handlers.click();b.node('[data-next]').handlers.click();}
}
a.node('[data-in]').handlers.click();b.node('[data-in]').handlers.click();
assert.equal(a.node('.nz-plot').innerHTML,b.node('.nz-plot').innerHTML.replaceAll('nieliniowe-',''));
console.log('OK: trzy etapy Newtona 3D i powiększenie — obliczenia, SVG i wartości identyczne.');
}
