import {lineHit,circleHit,reflect} from '../geometry.js';
/** Mechanics are ordinary executable modules, not an allowlisted effect language. */
export const mirror = {
  id:'mirror',
  trace(ray,world) { if(world.prism?.enabled)return; return world.bodies.filter(body=>body.type==='mirror').map(body=>lineHit(ray,body)).filter(Boolean).sort((a,b)=>a.distance-b.distance)[0]; },
  scatter(ray,hit) { return {rays:[reflect(ray,hit)]}; }
};
export const receiver = {
  id:'receiver',
  trace(ray,world) { if(world.prism?.enabled)return; return world.bodies.filter(body=>body.type==='receiver'&&!body.bloomed).map(body=>circleHit(ray,body,body.radius||30)).filter(Boolean).sort((a,b)=>a.distance-b.distance)[0]; },
  scatter(ray,hit) { return {deposits:[{id:hit.body.id,power:ray.power}]}; }
};
export const stone = {
  id:'stone',
  trace(ray,world) { return world.bodies.filter(body=>body.type==='stone').map(body=>circleHit(ray,body,body.radius)).filter(Boolean).sort((a,b)=>a.distance-b.distance)[0]; },
  scatter() { return {}; }
};
