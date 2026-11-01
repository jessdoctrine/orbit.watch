export const categories = [
 {id:'starlink',name:'Starlink',description:'Internet constellation',color:'#55bfff'},
 {id:'satellite',name:'Other satellites',description:'Other cataloged payloads',color:'#a38bff'},
 {id:'debris',name:'Space debris',description:'Cataloged fragments & objects',color:'#ff8174'},
 {id:'rocket',name:'Rocket bodies',description:'Cataloged launch hardware',color:'#efc272'},
 {id:'station',name:'Space stations',description:'ISS & Tiangong core',color:'#66debd'},
 {id:'unknown',name:'Unclassified',description:'Object type unavailable',color:'#b8c6d4'},
];
export function classify(omm,meta) {
 if(meta.OBJECT_TYPE==='DEB')return 'debris';
 if(meta.OBJECT_TYPE==='R/B')return 'rocket';
 if([25544,48274].includes(Number(omm.NORAD_CAT_ID)))return 'station';
 if(/^STARLINK-/.test(omm.OBJECT_NAME)&&meta.OBJECT_TYPE==='PAY')return 'starlink';
 if(meta.OBJECT_TYPE==='PAY')return 'satellite';
 return 'unknown';
}
const descriptions={
 starlink:['Communications satellite','A cataloged satellite in the Starlink constellation.','The constellation provides broadband internet connectivity. This describes the constellation, not this satellite’s current operating state.'],
 satellite:['Satellite / payload','An object classified as a payload in the CelesTrak catalog.','Its specific mission is not supplied by this orbital feed. The catalog link below can help identify it.'],
 debris:['Debris','An object classified as debris in the CelesTrak catalog.','Debris has no intended active mission. The feed does not identify the exact material or origin of every fragment.'],
 rocket:['Rocket body','A cataloged rocket body left in orbit after a launch.','Launch hardware used to deliver a payload. Its present operating state is not established by orbital elements.'],
 station:['Space station','A cataloged core object of a space station.','Supports crewed operations and research in orbit. Docked vehicles and modules may have separate catalog entries.'],
 unknown:['Unclassified object','An object with orbital elements but no supported type classification in the joined catalog.','Its purpose is not available from this source.'],
};
export function makeObject(record,index){
 const {omm,meta}=record,category=classify(omm,meta),[type,description,activity]=descriptions[category];
 return {index,id:String(omm.NORAD_CAT_ID),name:omm.OBJECT_NAME||`NORAD ${omm.NORAD_CAT_ID}`,category,type,description,activity,
 owner:meta.OWNER||'Unknown',status:meta.OPS_STATUS_CODE||'Unknown',launch:meta.LAUNCH_DATE||'Unknown',year:meta.LAUNCH_DATE?.slice(0,4)||'',
 internationalId:omm.OBJECT_ID||'Unknown',epoch:omm.EPOCH.endsWith('Z')?omm.EPOCH:omm.EPOCH+'Z',inclination:Number(omm.INCLINATION),period:1440/Number(omm.MEAN_MOTION),altitude:null,omm,meta};
}
