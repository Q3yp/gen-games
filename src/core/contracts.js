/**
 * @typedef {{id:string,name:string,kind:string,components:Record<string,any>}} Entity
 * @typedef {{id:string,title:string,description:string,version:string,plugins:string[],ui?:string,initial:World}} GamePack
 * @typedef {{scene:string,player:string,entities:Record<string,Entity>,scenes:Record<string,any>,assets:Record<string,any>,skills:Record<string,any>,variables:Record<string,any>,dialogue?:any}} World
 * @typedef {{id:string,gameId:string,revision:number,sceneEpoch:number,seed:number,state:World,status:string,createdAt:string,updatedAt:string}} Session
 * @typedef {{seq:number,sessionId:string,revision:number,type:string,text:string,data:any,at:string}} GameEvent
 * @typedef {{state:World,session:Session,actor:string,emit:(type:string,text:string,data?:any)=>void,random:()=>number,require:(condition:any,code:string,message:string,hint?:string)=>void}} Context
 * @typedef {{description:string,input?:Object,run:(ctx:Context,args:any)=>any}} ActionDefinition
 * @typedef {{id:string,version:string,requires?:string[],actions:Record<string,ActionDefinition>,tick?:(ctx:Context,deltaMs:number)=>void}} Plugin
 */
export {};
