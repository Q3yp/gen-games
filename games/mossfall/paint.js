import { AREAS } from './world.js';

// A deliberately small, asset-free illustration engine. All randomness is seeded
// by map coordinates, so the forest stays still while its little lights breathe.
const CELL = 60, LEFT = 40, TOP = 105, WIDTH = 900, HEIGHT = 540;
const TAU = Math.PI * 2;
const animation = new WeakMap();
const noise = (x, y, salt = 0) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
const point = (x, y) => ({ x: LEFT + x * CELL + CELL / 2, y: TOP + y * CELL + CELL / 2 });
function ellipse(ctx, x, y, rx, ry, color) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = color; ctx.fill();
}
function polygon(ctx, points, fill, stroke, width = 1) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function line(ctx, points, color, width = 1) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
function glow(ctx, x, y, size, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, size);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x - size, y - size, size * 2, size * 2);
}
function diamond(ctx, x, y, r, color) {
  polygon(ctx, [[x,y-r],[x+r*.65,y],[x,y+r],[x-r*.65,y]], color);
}
function palette(area) {
  const text = `${area.name || ''} ${area.subtitle || ''}`.toLowerCase();
  const ruins = /ruin|abbey|stone|vault|shrine|bell|sanctum|archive|drowned/.test(text);
  const deep = /root|heart|hollow|crown|depth|throne/.test(text);
  return {
    ruins, deep,
    ground: deep ? '#172b29' : ruins ? '#223732' : '#263c30',
    grass: deep ? '#315046' : '#3d5940',
    edge: deep ? '#0d2122' : '#142a24',
    tree: deep ? '#24443e' : '#315341',
    leaf: deep ? '#375c4d' : '#496c4a',
    light: deep ? '#588268' : '#688458',
    water: deep ? '#123b43' : '#173f43',
  };
}
function ground(ctx, x, y, tile, p, t, map) {
  const sx = LEFT + x * CELL, sy = TOP + y * CELL;
  const n = noise(x,y);
  ctx.fillStyle = tile === '~' ? p.water : p.ground; ctx.fillRect(sx,sy,CELL,CELL);
  if (tile === '~') {
    const g = ctx.createLinearGradient(sx,sy,sx+CELL,sy+CELL);
    g.addColorStop(0,'#294f4d'); g.addColorStop(1,p.water);
    ctx.fillStyle = g; ctx.fillRect(sx,sy,CELL,CELL);
    for (let i=0;i<4;i++) {
      const yy = sy + 8 + i*13, xx = sx + 8 + noise(x,y,i+9)*18;
      const sway = Math.sin(t*0.7+y+i)*4;
      line(ctx,[[xx+sway,yy],[xx+12+sway,yy-1],[xx+19+sway,yy]], i%2 ? '#3b6766' : '#4c7d77',1);
    }
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      if (map[y+dy]?.[x+dx] && map[y+dy][x+dx] !== '~') {
        const points = dx ? [[sx+(dx>0?58:2),sy],[sx+(dx>0?58:2),sy+60]] : [[sx,sy+(dy>0?58:2)],[sx+60,sy+(dy>0?58:2)]];
        line(ctx,points,'#517569',3);
        line(ctx,points,'#83a28b55',1);
      }
    }
    if (n>.78) {
      ellipse(ctx,sx+35,sy+35,8,4,'#547756');
      line(ctx,[[sx+35,sy+35],[sx+40,sy+32]],p.water,2);
      ellipse(ctx,sx+33,sy+32,2,1,'#d6d7a0');
    }
    return;
  }
  // Soft soil patches and individual blades make a tile map without a board grid.
  ellipse(ctx,sx+26,sy+31,26,22,n>.5?'#37503a55':'#152d2638');
  for (let i=0;i<8;i++) {
    const gx=sx+5+noise(x,y,i+1)*50, gy=sy+7+noise(y,x,i+35)*46;
    if (i<4) {
      line(ctx,[[gx-2,gy],[gx,gy-4-noise(x,i)*3],[gx+1,gy]],p.grass,1);
    } else ellipse(ctx,gx,gy,1.1+noise(x,y,i),.7, n>.5?'#7a866050':'#a8ac7840');
  }
  if (p.ruins && n>.58 && tile !== '#') {
    polygon(ctx,[[sx+8,sy+11],[sx+29,sy+8],[sx+32,sy+21],[sx+11,sy+24]],'#46554a65','#61715a35');
    polygon(ctx,[[sx+32,sy+34],[sx+49,sy+31],[sx+51,sy+43],[sx+34,sy+46]],'#40534b65');
  }
  if (n>.89 && tile!== '#') {
    for (let i=0;i<3;i++) {
      const fx=sx+12+i*5, fy=sy+43-i%2*5;
      line(ctx,[[fx,fy],[fx,fy-4]],'#79966a',1);
      ellipse(ctx,fx,fy-4,1.6,1.6,p.deep?'#81a9a0':'#b2b796');
    }
  }
}
function tree(ctx, x, y, p, t) {
  const c = point(x,y), n=noise(x,y), h=20+n*7;
  ellipse(ctx,c.x+7,c.y+21,29,11,'#06191570');
  // The warm timber and exposed roots are a visual cue that this cell is solid.
  line(ctx,[[c.x-11,c.y+24],[c.x-2,c.y+11],[c.x+6,c.y+11],[c.x+13,c.y+25]],'#39483a',5);
  polygon(ctx,[[c.x-6,c.y+21],[c.x-4,c.y-h],[c.x+5,c.y-h],[c.x+9,c.y+19]],'#4b5340','#202f29');
  line(ctx,[[c.x+2,c.y+18],[c.x,c.y-15]],'#74806055',2);
  const leaves = [
    [-18,-4,17,16], [18,-6,18,17], [0,-21,21,19], [-7,2,25,18], [10,-14,20,20],
  ];
  for (let i=0;i<leaves.length;i++) {
    const [dx,dy,rx,ry]=leaves[i];
    ellipse(ctx,c.x+dx,c.y+dy-3,rx,ry,'#102b25');
    ellipse(ctx,c.x+dx-1,c.y+dy-6,rx-1,ry-2,i%2?p.leaf:p.tree);
    ctx.beginPath(); ctx.ellipse(c.x+dx-2,c.y+dy-9,rx*.65,ry*.61,-.3,Math.PI*1.05,Math.PI*1.8);
    ctx.strokeStyle=p.light+'70'; ctx.lineWidth=2; ctx.stroke();
  }
  for (let i=0;i<8;i++) {
    const lx=c.x-25+noise(x,y,i+71)*49, ly=c.y-26+noise(x,y,i+81)*36;
    line(ctx,[[lx,ly],[lx+3,ly-1]],i%3?p.leaf:p.light,1.5);
  }
  if(n>.82) {
    line(ctx,[[c.x-21,c.y+20],[c.x-21,c.y+15]],'#adb49c',2);
    ellipse(ctx,c.x-21,c.y+14,4.5,2,'#ad765d');
    ellipse(ctx,c.x-20,c.y+13,1,.7,'#e7c9a7');
  }
}
function ruin(ctx,x,y,p) {
  const c=point(x,y), n=noise(x,y);
  ellipse(ctx,c.x+5,c.y+23,29,10,'#081b1b80');
  polygon(ctx,[[c.x-25,c.y-20],[c.x+20,c.y-23],[c.x+26,c.y+19],[c.x-23,c.y+23]],'#374b46','#142f2d',2);
  polygon(ctx,[[c.x-25,c.y-20],[c.x-17,c.y-29],[c.x+24,c.y-29],[c.x+20,c.y-23]],'#617063');
  polygon(ctx,[[c.x+20,c.y-23],[c.x+24,c.y-29],[c.x+29,c.y+12],[c.x+26,c.y+19]],'#293f3c');
  line(ctx,[[c.x-23,c.y-3],[c.x+21,c.y-7]],'#182e2b',2);
  line(ctx,[[c.x-22,c.y+12],[c.x+24,c.y+7]],'#1b302c',2);
  line(ctx,[[c.x+2,c.y-22],[c.x,c.y-5],[c.x-8,c.y+10]],'#18302e',2);
  line(ctx,[[c.x-17,c.y-24],[c.x+15,c.y-26]],'#9aa07b55',1);
  ellipse(ctx,c.x-11,c.y-24,13,4,p.leaf);
  line(ctx,[[c.x-17,c.y-22],[c.x-15,c.y-11],[c.x-19,c.y-1]],'#789265',3);
  if(n>.55) {
    ctx.save();ctx.globalAlpha=.6;
    diamond(ctx,c.x+11,c.y+5,5,'#a9b18b');
    diamond(ctx,c.x+11,c.y+5,2,'#374b46'); ctx.restore();
  }
}
function exit(ctx, e, t, player) {
  const c=point(e.x,e.y), pulse=.7+Math.sin(t*1.7)*.15;
  glow(ctx,c.x,c.y,48,`rgba(139,200,168,${pulse*.19})`);
  ellipse(ctx,c.x,c.y+20,24,8,'#a7c29b20');
  ctx.save(); ctx.translate(c.x,c.y+12);
  ctx.beginPath(); ctx.moveTo(-20,10);ctx.lineTo(-20,-14);ctx.quadraticCurveTo(-20,-40,0,-40);ctx.quadraticCurveTo(20,-40,20,-14);ctx.lineTo(20,10);
  ctx.strokeStyle='#152d2a';ctx.lineWidth=12;ctx.stroke();
  ctx.strokeStyle='#687d66';ctx.lineWidth=8;ctx.stroke();
  ctx.strokeStyle='#b8c59b';ctx.lineWidth=1.3;ctx.stroke();
  ctx.beginPath();ctx.ellipse(0,-6,14,26,0,0,TAU);ctx.fillStyle='#83b9a019';ctx.fill();
  for(let i=0;i<4;i++) diamond(ctx,-10+i*7,3-Math.sin(t+i)*6,1.7,'#c7e0b2');
  ctx.restore();
  if (Math.abs(player.x-e.x)+Math.abs(player.y-e.y)<3) label(ctx,c.x,c.y+34,e.label || 'Passage','#d1dbc3');
}
function label(ctx,x,y,text,color='#c2d2b9') {
  ctx.save();ctx.font='11px Georgia, serif';ctx.textAlign='center';
  ctx.shadowColor='#071914';ctx.shadowBlur=5;ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
}
function object(ctx,o,t,world) {
  const c=point(o.x,o.y), bob=Math.sin(t*2+o.x)*2;
  if(o.kind==='camp') {
    glow(ctx,c.x,c.y+2,70,'#d29c442e');
    ellipse(ctx,c.x,c.y+18,23,9,'#102821');
    for(let i=0;i<7;i++) {const a=i/7*TAU;ellipse(ctx,c.x+Math.cos(a)*17,c.y+12+Math.sin(a)*7,5,3,'#73806a');}
    line(ctx,[[c.x-11,c.y+15],[c.x+11,c.y+5]],'#715c3c',5);
    line(ctx,[[c.x-10,c.y+5],[c.x+11,c.y+15]],'#917247',5);
    polygon(ctx,[[c.x-11,c.y+8],[c.x-6,c.y-7],[c.x-1,c.y-2],[c.x+3,c.y-21-bob],[c.x+9,c.y-6],[c.x+11,c.y+7],[c.x+2,c.y+13]],'#df9d4f');
    polygon(ctx,[[c.x-5,c.y+7],[c.x,c.y-5],[c.x+2,c.y+1],[c.x+5,c.y-9],[c.x+6,c.y+9],[c.x,c.y+12]],'#ffe2a0');
    for(let i=0;i<4;i++) {
      const rise=(t*14+i*13)%45;ellipse(ctx,c.x+Math.sin(i*3+t)*8,c.y-rise,1.3,1.3,`rgba(247,203,126,${1-rise/45})`);
    }
  } else if (o.kind==='cache') {
    ellipse(ctx,c.x,c.y+17,21,7,'#0a211b99');
    polygon(ctx,[[c.x-17,c.y-2],[c.x+15,c.y-2],[c.x+15,c.y+16],[c.x-17,c.y+16]],'#705c3d','#b09a64',1);
    polygon(ctx,[[c.x-17,c.y-2],[c.x-12,c.y-13],[c.x+11,c.y-13],[c.x+15,c.y-2]],'#a28b52','#cab47a',1);
    line(ctx,[[c.x-9,c.y-12],[c.x-10,c.y+15]],'#4b5340',4);
    line(ctx,[[c.x+8,c.y-12],[c.x+8,c.y+15]],'#4b5340',4);
    diamond(ctx,c.x,c.y+2,5,'#ead78c');
    glow(ctx,c.x,c.y,35,'#e0d1931c');
    diamond(ctx,c.x+17,c.y-19+bob,2,'#e8dc9a');
  } else if (o.id==='keeper') {
    glow(ctx,c.x,c.y-5,41,'#c0a9d321');
    ellipse(ctx,c.x,c.y+22,20,7,'#0a201c99');
    polygon(ctx,[[c.x-8,c.y-8],[c.x+7,c.y-8],[c.x+15,c.y+20],[c.x-14,c.y+20]],'#847890','#b6a7b2');
    polygon(ctx,[[c.x-10,c.y-9],[c.x-8,c.y-23],[c.x+1,c.y-28],[c.x+10,c.y-20],[c.x+9,c.y-6]],'#b1a1b3');
    ellipse(ctx,c.x+1,c.y-14,6,8,'#47524e');
    line(ctx,[[c.x-1,c.y-16],[c.x+3,c.y-16]],'#e7d5b0',1.5);
    line(ctx,[[c.x+9,c.y+1],[c.x+20,c.y-1]],'#c5b7b0',3);
    diamond(ctx,c.x+20,c.y-7+bob,4,'#d6e7c2');
    for(const dir of [-1,1]) {
      line(ctx,[[c.x+dir*23,c.y+22],[c.x+dir*16,c.y+12],[c.x+dir*20,c.y+3],[c.x+dir*14,c.y-4]],'#526b48',3);
      polygon(ctx,[[c.x+dir*19,c.y+10],[c.x+dir*28,c.y+5],[c.x+dir*22,c.y+14]],'#879366');
    }
  } else if (o.id==='forge') {
    ellipse(ctx,c.x,c.y+21,22,8,'#112820');
    polygon(ctx,[[c.x-14,c.y+3],[c.x+13,c.y+3],[c.x+16,c.y+21],[c.x-17,c.y+21]],'#655b43','#938467');
    polygon(ctx,[[c.x-22,c.y-10],[c.x+24,c.y-10],[c.x+14,c.y-2],[c.x+5,c.y],[c.x+5,c.y+9],[c.x-11,c.y+9],[c.x-10,c.y-1]],'#758580','#afbbb0');
    line(ctx,[[c.x-17,c.y-12],[c.x+25,c.y-12]],'#d0d3b6',2);
    line(ctx,[[c.x+12,c.y+17],[c.x+24,c.y+3]],'#b8a17c',3);
    polygon(ctx,[[c.x+20,c.y-1],[c.x+29,c.y+5],[c.x+25,c.y+11],[c.x+16,c.y+5]],'#96a397');
  } else if (o.kind==='seal') {
    glow(ctx,c.x,c.y-3,55,'#78c6b938');
    ellipse(ctx,c.x,c.y+16,23,9,'#162d29');
    ellipse(ctx,c.x,c.y+9,20,9,'#647b68');
    ellipse(ctx,c.x,c.y+7,16,6,'#253e37');
    ctx.save();ctx.translate(c.x,c.y-8+bob);ctx.rotate(Math.sin(t*.5)*.16);
    polygon(ctx,[[0,-20],[12,-4],[9,11],[0,18],[-11,7],[-10,-8]],'#7aa996','#d2e4bb',1.5);
    polygon(ctx,[[0,-20],[0,18],[-11,7],[-10,-8]],'#477a70');
    line(ctx,[[0,-13],[4,-2],[-3,3],[0,11]],'#e4efbc',1.5);ctx.restore();
    for(let i=0;i<3;i++) diamond(ctx,c.x+Math.cos(t*.5+i*TAU/3)*24,c.y+Math.sin(t*.5+i*TAU/3)*9-9,1.5,'#bfe0ba');
  } else if (o.kind==='gate') {
    glow(ctx,c.x,c.y,45,'#baaa5d18');
    for (const dx of [-21,21]) {
      polygon(ctx,[[c.x+dx-6,c.y+23],[c.x+dx-6,c.y-30],[c.x+dx+6,c.y-34],[c.x+dx+7,c.y+23]],'#596b59','#8d9b72');
      ellipse(ctx,c.x+dx,c.y-32,9,4,'#a7ae7e');
    }
    for(let i=0;i<5;i++) line(ctx,[[c.x-17+i*8,c.y-23],[c.x-17+i*8,c.y+20]],'#a9a47a',2);
    line(ctx,[[c.x-20,c.y-19],[c.x+20,c.y-19]],'#929d77',3);
    line(ctx,[[c.x-21,c.y+9],[c.x+21,c.y+9]],'#929d77',3);
    diamond(ctx,c.x,c.y-5,7,'#d2b86e');
  } else {
    // Wanderers have cream hoods and carved walking staffs, unlike the player.
    ellipse(ctx,c.x,c.y+21,16,6,'#0c201b99');
    polygon(ctx,[[c.x-7,c.y-6],[c.x+8,c.y-5],[c.x+14,c.y+19],[c.x-15,c.y+19]],'#938b67','#c7bd8a');
    ellipse(ctx,c.x,c.y-9,10,12,'#c5c29b');ellipse(ctx,c.x+1,c.y-7,6,7,'#394a3d');
    line(ctx,[[c.x+19,c.y+22],[c.x+17,c.y-18],[c.x+23,c.y-24]],'#b7a17a',3);
    diamond(ctx,c.x,c.y-31+bob,3,'#e7d99f');
  }
  const dist=Math.abs(world.player.x-o.x)+Math.abs(world.player.y-o.y);
  if(dist<3) label(ctx,c.x,c.y+34,o.name || o.kind);
}
function telegraph(ctx,e,t) {
  if (!e.windup || !e.intent?.length || e.hp<=0) return;
  const alpha=.20+Math.sin(t*7)*.06;
  for(const v of e.intent) {
    const x=LEFT+v.x*CELL+3,y=TOP+v.y*CELL+3;
    ctx.fillStyle=`rgba(219,114,72,${alpha})`;ctx.fillRect(x,y,54,54);
    ctx.strokeStyle='#e9a76d';ctx.lineWidth=1.5;ctx.strokeRect(x+.5,y+.5,53,53);
    // Corner braces stay readable even when a creature overlaps the warning.
    for(const [dx,dy,sx,sy] of [[0,0,1,1],[54,0,-1,1],[0,54,1,-1],[54,54,-1,-1]]) {
      line(ctx,[[x+dx,y+dy+sy*9],[x+dx,y+dy],[x+dx+sx*9,y+dy]],'#ffc88a',2);
    }
    line(ctx,[[x+23,y+22],[x+31,y+30],[x+23,y+30],[x+31,y+22]],'#ffd09b88',1);
  }
}
function enemy(ctx,e,t) {
  const c=point(e.x,e.y), bob=Math.sin(t*2+e.x)*1.5;
  ctx.save();ctx.translate(c.x,c.y);
  ellipse(ctx,3,21,e.kind==='boss'?31:19,e.kind==='boss'?11:7,'#041a1a99');
  if(e.kind==='moth') {
    const flutter=Math.sin(t*7+e.x)*.12;
    glow(ctx,0,-9,37,'#b0b7d51c');
    for(const dir of [-1,1]) {
      ctx.save();ctx.scale(dir,1);ctx.rotate(flutter);
      polygon(ctx,[[2,-9],[20,-29+bob],[30,-13+bob],[22,3],[8,10],[3,1]],'#a5a5b4','#d5d4cb',1);
      polygon(ctx,[[6,0],[24,7],[19,21],[5,11]],'#676c82','#a7abaf');
      ellipse(ctx,18,-11+bob,5,7,'#58687a');ellipse(ctx,18,-11+bob,2,3,'#d2c9a1');
      line(ctx,[[3,-13],[9,-23],[13,-25]],'#c6ccb7',1);ctx.restore();
    }
    ellipse(ctx,0,0,5,16,'#485562');ellipse(ctx,0,-11,6,6,'#dde0c0');
  } else if(e.kind==='sentinel') {
    for(const dx of [-12,12]) polygon(ctx,[[dx-5,8],[dx+6,8],[dx+7,22],[dx-5,22]],'#5c7169','#869281');
    polygon(ctx,[[-15,-20],[13,-22],[19,10],[-17,12]],'#526b63','#9eaa8b',1.5);
    polygon(ctx,[[-12,-20],[13,-22],[5,-30],[-7,-29]],'#8b9a82');
    polygon(ctx,[[-13,-17],[14,-17],[13,-4],[-13,-3]],'#263d39');
    line(ctx,[[-8,-11],[-3,-11]],'#d4d899',2);line(ctx,[[4,-11],[9,-11]],'#d4d899',2);
    for(const dir of [-1,1]) polygon(ctx,[[dir*18,-10],[dir*27,-5],[dir*25,13],[dir*17,9]],'#657568','#87977e');
    line(ctx,[[0,0],[-4,5],[1,8],[5,3],[0,0]],'#cfcc8b',1.5);
    ellipse(ctx,-7,-26,8,3,'#708556');
  } else if(e.kind==='boss') {
    glow(ctx,0,-4,55,'#ad744223');
    for(const dir of [-1,1]) {
      line(ctx,[[dir*8,-23],[dir*19,-36],[dir*25,-55],[dir*34,-58]],'#8d8d63',6);
      line(ctx,[[dir*19,-36],[dir*34,-34],[dir*42,-44]],'#9da079',4);
      line(ctx,[[dir*25,-48],[dir*17,-54]],'#b0ae80',3);
      polygon(ctx,[[dir*15,-5],[dir*32,8],[dir*37,26],[dir*24,18],[dir*16,10]],'#5b6450','#87906d');
      line(ctx,[[dir*11,13],[dir*15,27],[dir*25,30]],'#71795b',7);
    }
    polygon(ctx,[[-17,-14],[-7,-25],[11,-25],[20,-9],[15,18],[0,26],[-17,15]],'#4f6050','#97a278',1.5);
    polygon(ctx,[[-13,-15],[0,-21],[13,-15],[7,6],[0,14],[-7,6]],'#b4b08a','#d3ca9f');
    polygon(ctx,[[-10,-10],[-3,-7],[-6,-3]],'#294139');polygon(ctx,[[10,-10],[3,-7],[6,-3]],'#294139');
    ellipse(ctx,-6,-7,2,1.5,'#f2cd7e');ellipse(ctx,6,-7,2,1.5,'#f2cd7e');
    line(ctx,[[0,-2],[0,7]],'#777d5b',2);
    for(let i=0;i<3;i++) ellipse(ctx,-17+i*15,13+i%2*6,8,5,'#61794b');
  } else {
    // Bramble wolves: four root-like paws, a long muzzle, and a thorned mane.
    line(ctx,[[-16,0],[-27,-9],[-30,-20]],'#718756',6);
    for(const [x,y] of [[-12,8],[-5,11],[10,8],[17,5]]) line(ctx,[[x,y],[x-3,y+13],[x+2,y+14]],'#758b57',4);
    ellipse(ctx,-3,0,21,13,'#4b6744');ellipse(ctx,-7,-5,15,9,'#698452');
    for(let i=0;i<5;i++) polygon(ctx,[[-20+i*7,-7],[-22+i*7,-21-i%2*4],[-12+i*7,-8]],'#8c9b63');
    polygon(ctx,[[9,-9],[10,-23],[17,-15],[25,-23],[26,-5],[33,1],[22,7],[12,3]],'#75915e','#a3ac76');
    polygon(ctx,[[13,-18],[14,-11],[17,-14]],'#304e39');
    polygon(ctx,[[23,-18],[20,-12],[24,-10]],'#304e39');
    line(ctx,[[20,-5],[24,-5]],'#f3ca7f',2);
    ellipse(ctx,30,1,3,2,'#243f32');
    line(ctx,[[-11,-8],[-5,-2],[-9,6]],'#9ca46d',1.3);
  }
  // Health belongs to the creature, rather than a panel; full-health foes are quiet.
  if(e.hp<e.maxHp || e.windup) {
    const w=e.kind==='boss'?49:30,y=e.kind==='boss'?40:31;
    ctx.fillStyle='#0b211e';ctx.fillRect(-w/2,y,w,3);
    ctx.fillStyle=e.windup?'#e7b073':'#b1b982';ctx.fillRect(-w/2,y,w*Math.max(0,e.hp/e.maxHp),3);
  }
  if(e.windup) {diamond(ctx,0,e.kind==='boss'?-68:-39,5,'#f3bf7b');}
  ctx.restore();
}
function player(ctx,p,t,world) {
  const c=point(p.x,p.y), bob=Math.sin(t*2.5)*.7;
  glow(ctx,c.x+15,c.y-4,78,'#e4b46125');
  ellipse(ctx,c.x,c.y+22,19,7,'#081c1ca6');
  ctx.strokeStyle='#bed7bb77';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(c.x,c.y+20,21,8,0,.1,Math.PI*1.75);ctx.stroke();
  ctx.save();ctx.translate(c.x,c.y+bob);
  line(ctx,[[-6,13],[-7,23]],'#a4aa8b',4);line(ctx,[[6,13],[7,23]],'#a4aa8b',4);
  polygon(ctx,[[-8,-9],[8,-8],[18,18],[5,23],[-15,18]],'#3c8c81','#91b8a1',1.2);
  polygon(ctx,[[-8,-9],[-3,1],[-2,19],[-15,18]],'#27655f');
  line(ctx,[[2,-3],[8,18]],'#97b6a0',1);
  polygon(ctx,[[-11,-12],[-8,-22],[1,-27],[10,-20],[12,-9],[3,-4],[-5,-5]],'#6ba08c','#bdd0ac',1);
  ellipse(ctx,2,-14,6.5,7,'#153c37');
  line(ctx,[[0,-16],[3,-16]],'#eed8a2',1.7);
  polygon(ctx,[[-9,-8],[5,-4],[10,0],[-2,0]],'#b7b78b');
  line(ctx,[[8,1],[18,3],[20,-4]],'#a6bda0',3);
  line(ctx,[[21,-8],[21,-4]],'#e1c080',1.5);
  ctx.strokeStyle='#c7ab75';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(21,-7,4,Math.PI,0);ctx.stroke();
  polygon(ctx,[[16,-6],[25,-6],[26,5],[21,8],[16,4]],'#f7d996','#d6b66f');
  line(ctx,[[18,-5],[18,4]],'#9b814c',1);line(ctx,[[24,-5],[24,4]],'#9b814c',1);
  ellipse(ctx,21,0,2,4,'#fff5cf');
  // A sheathed blade adds a tiny adventure silhouette without hiding the lantern.
  line(ctx,[[-11,4],[-19,18]],'#b9bda5',3);line(ctx,[[-15,4],[-7,9]],'#cab77c',2);
  ctx.restore();
}
function atmosphere(ctx, t, area, p) {
  // Wind-borne spores are deterministic and intentionally sparse over walkable cells.
  for(let i=0;i<29;i++) {
    const x=LEFT+((noise(i,17)*WIDTH+t*(1+i%3))%WIDTH), y=TOP+((noise(i,31)*HEIGHT+t*(i%2?-.7:.5)+HEIGHT)%HEIGHT);
    const a=.2+Math.sin(t*1.3+i*4)*.14;
    ellipse(ctx,x,y,i%5?1:1.7,i%5?1:1.7,`rgba(216,225,165,${a})`);
  }
  const vignette=ctx.createRadialGradient(LEFT+WIDTH*.48,TOP+HEIGHT*.49,150,LEFT+WIDTH*.48,TOP+HEIGHT*.49,550);
  vignette.addColorStop(0,'#061b1a00');vignette.addColorStop(.7,'#061b1a0b');vignette.addColorStop(1,'#04171790');
  ctx.fillStyle=vignette;ctx.fillRect(LEFT,TOP,WIDTH,HEIGHT);
  // Fine edge ornament, not a UI card: a weathered border for the painted map.
  ctx.strokeStyle='#6b866440';ctx.lineWidth=1;ctx.strokeRect(LEFT+.5,TOP+.5,WIDTH-1,HEIGHT-1);
  for(const [x,y,dx,dy] of [[LEFT,TOP,1,1],[LEFT+WIDTH,TOP,-1,1],[LEFT,TOP+HEIGHT,1,-1],[LEFT+WIDTH,TOP+HEIGHT,-1,-1]]) {
    line(ctx,[[x+dx*23,y],[x,y],[x,y+dy*23]],'#9fa97b88',1);
    diamond(ctx,x+dx*5,y+dy*5,2,'#b0b68a88');
  }
}

export function paint(ctx, world, time = 0, viewport) {
  const area=AREAS[world.area] || Object.values(AREAS)[0];
  if(!area || !world.player) return;
  const p=palette(area), state=world.areas?.[world.area] || {}, t=Number(time)||0;
  const map=area.tiles;
  let anim=animation.get(ctx);
  if(!anim || anim.area!==world.area || t<anim.time) {
    anim={area:world.area,x:world.player.x,y:world.player.y,time:t,hp:world.player.hp,enemies:new Map(),sparks:[]};
    animation.set(ctx,anim);
  }
  const dt=Math.max(1/240,Math.min(.06,t-anim.time)), ease=1-Math.exp(-dt*25);
  anim.x+=(world.player.x-anim.x)*ease;anim.y+=(world.player.y-anim.y)*ease;
  if(Math.hypot(world.player.x-anim.x,world.player.y-anim.y)>3) {anim.x=world.player.x;anim.y=world.player.y;}
  if(world.player.hp!==anim.hp) {
    anim.sparks.push({x:anim.x,y:anim.y,at:t,heal:world.player.hp>anim.hp,player:true});
    anim.hp=world.player.hp;
  }
  for(const e of state.enemies || []) {
    const last=anim.enemies.get(e.id);
    if(last!==undefined && e.hp<last) anim.sparks.push({x:e.x,y:e.y,at:t,heal:false,player:false});
    anim.enemies.set(e.id,e.hp);
  }
  anim.time=t;anim.sparks=anim.sparks.filter(s=>t-s.at<.42);
  const drawnPlayer={...world.player,x:anim.x,y:anim.y};
  ctx.save();
  // The DOM owns the title, sidebar, and bottom action strip.
  ctx.beginPath();ctx.rect(0,95,1100,565);ctx.clip();
  ctx.fillStyle='#0c211e';ctx.fillRect(0,95,1100,565);
  const ambient=ctx.createLinearGradient(0,95,1100,660);
  ambient.addColorStop(0,'#24413666');ambient.addColorStop(.6,'#0c211e00');ambient.addColorStop(1,'#17372c55');
  ctx.fillStyle=ambient;ctx.fillRect(0,95,1100,565);
  // A faint botanical silhouette in the reserved margin keeps the scene cohesive.
  for(let i=0;i<5;i++) {
    const x=985+i*23,y=400+i%2*55;
    line(ctx,[[x,646],[x-9,y],[x-2,y-90]],'#34513a35',2);
    for(let j=0;j<5;j++) {ellipse(ctx,x-10-j%2*8,y+j*31,12,4,'#44634520');}
  }
  ctx.save();ctx.beginPath();ctx.rect(LEFT,TOP,WIDTH,HEIGHT);ctx.clip();
  for(let y=0;y<map.length;y++) for(let x=0;x<map[y].length;x++) ground(ctx,x,y,map[y][x],p,t,map);
  for(const e of area.exits || []) exit(ctx,e,t,world.player);
  for(const e of state.enemies || []) telegraph(ctx,e,t);
  const taken=new Set(state.taken || []), actors=[];
  for(let y=0;y<map.length;y++) for(let x=0;x<map[y].length;x++) if(map[y][x]==='#') actors.push({y,x,render:()=> p.ruins && noise(x,y)>.38 ? ruin(ctx,x,y,p) : tree(ctx,x,y,p,t)});
  for(const o of area.objects || []) if(!taken.has(o.id)||o.kind==='npc'||o.kind==='camp') actors.push({y:o.y,x:o.x,render:()=>object(ctx,o,t,world)});
  for(const e of state.enemies || []) if(e.hp>0) actors.push({y:e.y,x:e.x,render:()=>enemy(ctx,e,t)});
  actors.push({y:anim.y,x:anim.x,render:()=>player(ctx,drawnPlayer,t,world)});
  actors.sort((a,b)=>a.y-b.y||a.x-b.x);for(const actor of actors) actor.render();
  for(const spark of anim.sparks) {
    const age=(t-spark.at)/.42,c=point(spark.x,spark.y), color=spark.heal?'#cbe9a7':spark.player?'#ffc39a':'#fff1bb';
    ctx.save();ctx.globalAlpha=(1-age)*.8;
    ctx.strokeStyle=color;ctx.lineWidth=2*(1-age);ctx.beginPath();ctx.ellipse(c.x,c.y,12+age*30,12+age*24,0,0,TAU);ctx.stroke();
    for(let i=0;i<7;i++) {
      const a=i/7*TAU, r=12+age*35;
      line(ctx,[[c.x+Math.cos(a)*r,c.y+Math.sin(a)*r],[c.x+Math.cos(a)*(r+5),c.y+Math.sin(a)*(r+5)]],color,2);
    }
    if(spark.player && !spark.heal) {ctx.globalAlpha=(1-age)*.09;ctx.fillStyle='#e99172';ctx.fillRect(LEFT,TOP,WIDTH,HEIGHT);}
    ctx.restore();
  }
  atmosphere(ctx,t,area,p);ctx.restore();ctx.restore();
}
