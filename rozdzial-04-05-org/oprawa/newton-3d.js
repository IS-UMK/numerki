/* Pierwszy krok Newtona: rzut przestrzenny, powiększenie i przesuwanie. */
(function () {
  'use strict';
  const root=document.getElementById('newton-zoom');
  if (!root) return;
  const plot=root.querySelector('.nz-plot'),legend=root.querySelector('.nz-legend');
  const prev=root.querySelector('[data-prev]'),next=root.querySelector('[data-next]');
  const zoomIn=root.querySelector('[data-in]'),zoomOut=root.querySelector('[data-out]');
  const zoomValue=root.querySelector('[data-zoom]');
  const fit=root.querySelector('[data-fit]');
  const phase=root.querySelector('[data-stage]'),value=root.querySelector('[data-value]');
  const A=[1.5,1],f1=(x,y)=>x*x+y*y-2,f2=(x,y)=>x-y;
  const J=[[2*A[0],2*A[1]],[1,-1]],b=[-f1(...A),-f2(...A)];
  const det=J[0][0]*J[1][1]-J[0][1]*J[1][0];
  const H=[(b[0]*J[1][1]-J[0][1]*b[1])/det,(J[0][0]*b[1]-b[0]*J[1][0])/det];
  const B=A.map((x,i)=>x+H[i]);
  const t1=(x,y)=>f1(...A)+J[0][0]*(x-A[0])+J[0][1]*(y-A[1]);
  const t2=(x,y)=>f2(...A)+x-A[0]-(y-A[1]);
  const bounds={xmin:.6,xmax:1.85,ymin:.5,ymax:1.65,zmin:-.6,zmax:1.8};
  const C={f1:'var(--viz-series-1)',f2:'var(--viz-series-2)',t1:'var(--viz-series-3)',ink:'var(--foreground)',grid:'var(--border)'};
  const q0=[...A,0],q1=[...B,0],p1=[...A,f1(...A)],p2=[...A,f2(...A)];
  let step=0;
  function clip(points,axis,limit,above){
    const out=[];
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      const ina=above?a[axis]>=limit:a[axis]<=limit,inb=above?b[axis]>=limit:b[axis]<=limit;
      if(ina)out.push(a);
      if(ina!==inb){const t=(limit-a[axis])/(b[axis]-a[axis]);out.push(a.map((v,j)=>v+t*(b[j]-v)));}
    }
    return out;
  }
  function mesh(fn,color,n=18){
    const rows=[];
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){
      const x=bounds.xmin+(bounds.xmax-bounds.xmin)*i/n,x2=bounds.xmin+(bounds.xmax-bounds.xmin)*(i+1)/n;
      const y=bounds.ymin+(bounds.ymax-bounds.ymin)*j/n,y2=bounds.ymin+(bounds.ymax-bounds.ymin)*(j+1)/n;
      const quad=[[x,y,fn(x,y)],[x2,y,fn(x2,y)],[x2,y2,fn(x2,y2)],[x,y2,fn(x,y2)]];
      const poly=clip(clip(quad,2,bounds.zmin,true),2,bounds.zmax,false);
      if(poly.length>=3)rows.push({points:poly,color});
    }
    return rows;
  }
  const surfaces=mesh(f1,C.f1),plane2=mesh(t2,C.f2,7),plane1=mesh(t1,C.t1,7);
  const base={points:[[bounds.xmin,bounds.ymin,0],[bounds.xmax,bounds.ymin,0],[bounds.xmax,bounds.ymax,0],[bounds.xmin,bounds.ymax,0]],color:C.ink,base:true};
  const yaw=.25,tilt=.50,cy=Math.cos(yaw),sy=Math.sin(yaw),st=Math.sin(tilt),ct=Math.cos(tilt);
  const project=p=>[cy*p[0]-sy*p[1],st*(sy*p[0]+cy*p[1])-ct*p[2]];
  const depth=p=>ct*(sy*p[0]+cy*p[1])+st*p[2];
  const axes=[[[bounds.xmin,bounds.ymin,0],[bounds.xmax+.08,bounds.ymin,0],'x'],[[bounds.xmin,bounds.ymin,0],[bounds.xmin,bounds.ymax+.08,0],'y'],[[bounds.xmin,bounds.ymin,bounds.zmin],[bounds.xmin,bounds.ymin,bounds.zmax+.08],'z']];
  const all=[...surfaces,...plane1,...plane2,base].flatMap(s=>s.points).concat(axes.flatMap(a=>a.slice(0,2)),[q0,q1,p1,p2]);
  const projected=all.map(project),us=projected.map(p=>p[0]),vs=projected.map(p=>p[1]);
  const umin=Math.min(...us),umax=Math.max(...us),vmin=Math.min(...vs),vmax=Math.max(...vs);
  // Orthographic camera: zoom and pan preserve the geometry and all three scales.
  const camera={zoom:1,u:(umin+umax)/2,v:(vmin+vmax)/2};
  let viewWidth=736,viewHeight=427,baseScale=1,pending=0;
  const pointers=new Map();
  const fmt=x=>Number(x.toFixed(3)).toString().replace('-','−');
  function draw(){
    viewWidth=Math.max(200,plot.clientWidth||root.clientWidth||736);
    viewHeight=Math.max(350,Math.min(470,viewWidth*.58));
    baseScale=Math.min((viewWidth-100)/(umax-umin),(viewHeight-72)/(vmax-vmin));
    const scale=baseScale*camera.zoom;
    const px=p=>{const q=project(p);return[viewWidth/2+(q[0]-camera.u)*scale,viewHeight/2+(q[1]-camera.v)*scale];};
    const pair=p=>px(p).map(x=>x.toFixed(2)).join(',');
    const label=(p,text,dx=0,dy=0,anchor='middle',extra='')=>{const a=px(p);return `<text x="${a[0]+dx}" y="${a[1]+dy}" text-anchor="${anchor}" ${extra}>${text}</text>`;};
    const line=(a,b,color,width=1,extra='')=>{const x=px(a),y=px(b);return `<line x1="${x[0]}" y1="${x[1]}" x2="${y[0]}" y2="${y[1]}" stroke="${color}" stroke-width="${width}" ${extra}/>`;};
    const dot=(p,r=4,color=C.ink,extra='')=>{const a=px(p);return `<circle cx="${a[0]}" cy="${a[1]}" r="${r}" fill="${color}" ${extra}/>`;};
    let svg='<title id="nz-title">Krok Newtona dla dwóch równań</title><desc id="nz-desc">Trzy etapy: powierzchnie funkcji, ich płaszczyzny styczne i nowe przybliżenie. Przyciski plus i minus oraz kółko myszy zmieniają powiększenie. Przeciąganie przesuwa widok, a gest dwoma palcami zmienia powiększenie. Punkty P jeden i P dwa leżą nad Q zero. Strzałka od Q zero do Q jeden przedstawia poprawkę Newtona.</desc>';
    svg+=`<defs><clipPath id="nz-viewport"><rect x="0" y="0" width="${viewWidth}" height="${viewHeight}"/></clipPath></defs><g clip-path="url(#nz-viewport)">`;
    const objects=[base,...plane2,...(step===0?surfaces:plane1)];
    objects.sort((a,b)=>a.points.reduce((s,p)=>s+depth(p),0)/a.points.length-b.points.reduce((s,p)=>s+depth(p),0)/b.points.length);
    for(const obj of objects)svg+=`<polygon points="${obj.points.map(pair).join(' ')}" fill="${obj.color}" fill-opacity="${obj.base ? .025 : .13}" stroke="${obj.color}" stroke-opacity=".3" stroke-width=".65"/>`;
    for(const x of [.75,1,1.25,1.5,1.75])svg+=line([x,bounds.ymin,0],[x,bounds.ymax,0],C.grid,.7);
    for(const y of [.75,1,1.25,1.5])svg+=line([bounds.xmin,y,0],[bounds.xmax,y,0],C.grid,.7);
    for(const [a,b,name] of axes){svg+=line(a,b,C.ink,1);svg+=label(b,name,name==='y'?-6:8,name==='z'?-5:8,name==='y'?'end':'start',`class="axis-title" data-axis="${name}"`);}
    for(const x of [1,1.5])svg+=label([x,bounds.ymin,0],fmt(x),0,19);
    for(const y of [1,1.5])svg+=label([bounds.xmin,y,0],fmt(y),-9,4,'end');
    for(const z of [.5,1,1.5])svg+=label([bounds.xmin,bounds.ymin,z],fmt(z),-8,4,'end');
    svg+=label([bounds.xmax,bounds.ymax,0],'z = 0',0,19);
    svg+=line(q0,p1,C.ink,1,'stroke-dasharray="3 4" stroke-opacity=".55"');
    svg+=dot(q0,4,C.ink,'data-point="q0"')+label(q0,'Q₀',11,17,'start');
    svg+=dot(p1,4.5,step===0?C.f1:C.t1)+label(p1,'P₁',11,-5,'start');
    const pp=px(p2);svg+=`<path d="M ${pp[0]} ${pp[1]-5} l 5 10 h -10 z" fill="${C.f2}"/>`+label(p2,'P₂',11,3,'start');
    if(step>0){
      const first=[],constant=J[0][0]*A[0]+J[0][1]*A[1]-f1(...A);
      for(const x of [bounds.xmin,bounds.xmax]){const y=(constant-J[0][0]*x)/J[0][1];if(y>=bounds.ymin&&y<=bounds.ymax)first.push([x,y,0]);}
      for(const y of [bounds.ymin,bounds.ymax]){const x=(constant-J[0][1]*y)/J[0][0];if(x>=bounds.xmin&&x<=bounds.xmax)first.push([x,y,0]);}
      if(first.length>=2)svg+=line(first[0],first[1],C.t1,2.5);
      const lo=Math.max(bounds.xmin,bounds.ymin),hi=Math.min(bounds.xmax,bounds.ymax);
      svg+=line([lo,lo,0],[hi,hi,0],C.f2,2.5);
    }
    if(step===2){
      const a=px(q0),b=px(q1),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
      svg+=line(q0,q1,C.ink,2);
      const tx=b[0]-8*ux,ty=b[1]-8*uy;
      svg+=`<path d="M ${tx} ${ty} L ${tx-9*ux+4*uy} ${ty-9*uy-4*ux} L ${tx-9*ux-4*uy} ${ty-9*uy+4*ux} Z" fill="${C.ink}"/>`;
      svg+=label(q0.map((v,i)=>(v+q1[i])/2),'H₀',0,32);
      svg+=`<circle cx="${b[0]}" cy="${b[1]}" r="7" fill="var(--background)" stroke="${C.ink}" stroke-width="1.8"/>`;
      svg+=dot(q1,2,C.ink,'data-point="q1"')+label(q1,'Q₁',-10,17,'end');
    }
    svg+='</g>';
    plot.innerHTML=`<svg viewBox="0 0 ${viewWidth} ${viewHeight}" height="${viewHeight}" role="img" aria-labelledby="nz-title nz-desc">${svg}</svg>`;
    const names=['Powierzchnie','Płaszczyzny styczne','Nowe przybliżenie'];
    phase.textContent=`${step+1} / 3 · ${names[step]}`;
    const entries=step===0?[[C.f1,'z = f₁ = x² + y² − 2'],[C.f2,'z = f₂ = x − y']]:[[C.t1,'T₁: z = 3x + 2y − 5.25'],[C.f2,'T₂: z = x − y']];
    legend.innerHTML=entries.map(([color,name])=>`<span><i class="nz-swatch" style="border-color:${color}"></i>${name}</span>`).join('');
    value.textContent=step===2?`Q₁ = (${fmt(B[0])}; ${fmt(B[1])}; 0) · H₀ = (${fmt(H[0])}; ${fmt(H[1])})`:'P₁ = (1.5; 1; 1.25) · P₂ = (1.5; 1; 0.5)';
    prev.disabled=step===0;next.disabled=step===2;
    zoomValue.textContent=Math.round(camera.zoom*100)+'%';
    zoomIn.disabled=camera.zoom>=4-1e-9;zoomOut.disabled=camera.zoom<=1+1e-9;
    root.dataset.zoom=String(camera.zoom);
    root.dataset.stage=String(step);
    fit.disabled=camera.zoom===1;
  }
  function scheduleDraw(){
    if(!pending)pending=window.requestAnimationFrame(()=>{pending=0;draw();});
  }
  function setZoom(target,x=viewWidth/2,y=viewHeight/2){
    const z=Math.max(1,Math.min(4,target));
    const anchorU=camera.u+(x-viewWidth/2)/(baseScale*camera.zoom);
    const anchorV=camera.v+(y-viewHeight/2)/(baseScale*camera.zoom);
    camera.u=anchorU-(x-viewWidth/2)/(baseScale*z);
    camera.v=anchorV-(y-viewHeight/2)/(baseScale*z);
    camera.zoom=z;
    if(z===1){camera.u=(umin+umax)/2;camera.v=(vmin+vmax)/2;}
  }
  function pan(dx,dy){if(camera.zoom>1){camera.u-=dx/(baseScale*camera.zoom);camera.v-=dy/(baseScale*camera.zoom);}}
  function position(event){
    const rect=plot.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*viewWidth/(rect.width||viewWidth),y:(event.clientY-rect.top)*viewHeight/(rect.height||viewHeight)};
  }
  prev.addEventListener('click',()=>{step=Math.max(0,step-1);draw();});
  next.addEventListener('click',()=>{step=Math.min(2,step+1);draw();});
  zoomIn.addEventListener('click',()=>{setZoom(camera.zoom+.25);draw();});
  zoomOut.addEventListener('click',()=>{setZoom(camera.zoom-.25);draw();});
  fit.addEventListener('click',()=>{setZoom(1);draw();});
  plot.addEventListener('wheel',event=>{
    event.preventDefault();
    const p=position(event),unit=event.deltaMode===1?16:event.deltaMode===2?viewHeight:1;
    const delta=Math.max(-600,Math.min(600,event.deltaY*unit));
    setZoom(camera.zoom*Math.exp(-delta*.0015),p.x,p.y);scheduleDraw();
  },{passive:false});
  plot.addEventListener('pointerdown',event=>{
    if((event.button!==0&&event.pointerType!=='touch')||pointers.size>=2)return;
    event.preventDefault();pointers.set(event.pointerId,position(event));
    try{plot.setPointerCapture(event.pointerId);}catch(_){}
    plot.classList.add('is-dragging');
  });
  plot.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    event.preventDefault();
    const before=[...pointers.values()],old=pointers.get(event.pointerId),p=position(event);
    pointers.set(event.pointerId,p);
    if(pointers.size===2){
      const after=[...pointers.values()];
      const a={x:(before[0].x+before[1].x)/2,y:(before[0].y+before[1].y)/2};
      const b={x:(after[0].x+after[1].x)/2,y:(after[0].y+after[1].y)/2};
      const d0=Math.hypot(before[0].x-before[1].x,before[0].y-before[1].y),d1=Math.hypot(after[0].x-after[1].x,after[0].y-after[1].y);
      if(d0>0&&d1>0)setZoom(camera.zoom*d1/d0,a.x,a.y);
      pan(b.x-a.x,b.y-a.y);
    }else pan(p.x-old.x,p.y-old.y);
    scheduleDraw();
  });
  function release(event){
    pointers.delete(event.pointerId);
    try{plot.releasePointerCapture(event.pointerId);}catch(_){}
    if(!pointers.size)plot.classList.remove('is-dragging');
  }
  for(const name of ['pointerup','pointercancel','lostpointercapture'])plot.addEventListener(name,release);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(plot.clientWidth!==viewWidth)draw();}).observe(plot);
  draw();
})();
