export const categories = [
  {id:'starlink',name:'Starlink',description:'Internet constellation concept',color:'#55bfff'},
  {id:'satellite',name:'Other satellites',description:'Science, navigation & imaging',color:'#a38bff'},
  {id:'debris',name:'Space debris',description:'Fragments & discarded objects',color:'#ff8174'},
  {id:'rocket',name:'Rocket bodies',description:'Spent launch hardware',color:'#efc272'},
  {id:'station',name:'Space stations',description:'Crewed orbital platforms',color:'#66debd'},
];
// Deliberately fictional: these entries are not associated with real catalog IDs.
const templates = [
 ['starlink','Starlink concept','Example internet operator','Internet connectivity','Example country',550,53],
 ['satellite','Aurora imaging','Example Earth observatory','Earth observation','Example country',710,98],
 ['satellite','Meridian navigation','Example navigation operator','Navigation research','Example country',1200,65],
 ['debris','Fragment','Unknown','Illustrative debris object','Unknown',850,78],
 ['rocket','Upper stage','Example launch operator','Spent launch hardware','Example country',1000,42],
 ['station','Horizon station','Example research partnership','Crewed research platform','International example',420,52],
];
const explanations = [
 ['Communications satellite', 'An example of a satellite in an internet constellation.', 'Relays internet signals between ground equipment and the wider network.'],
 ['Earth observation satellite', 'An example of a satellite carrying Earth-imaging instruments.', 'Collects images that can support mapping, environmental monitoring, and disaster assessment.'],
 ['Navigation satellite', 'An example of a satellite carrying timing and positioning equipment.', 'Broadcasts signals that receivers can use to estimate their position and time.'],
 ['Debris fragment', 'An example of a detached fragment from spacecraft or launch hardware. Its original source is unknown in this demo.', 'Has no active mission. It remains in orbit as a piece of space debris.'],
 ['Spent rocket upper stage', 'An example of a rocket section left in orbit after deploying its payload.', 'Originally helped carry a payload into orbit. It no longer performs an active mission in this example.'],
 ['Crewed space station', 'An example of an orbital platform designed to support astronauts.', 'Provides a place to live and work while conducting research in microgravity.'],
];
export const catalog=Array.from({length:180},(_,i)=>{const t=templates[i%templates.length],e=explanations[i%templates.length];return {id:`DEMO-${String(i+1).padStart(4,'0')}`,category:t[0],name:`${t[1]} ${String(i+1).padStart(3,'0')}`,operator:t[2],purpose:t[3],country:t[4],altitude:t[5]+(i%7)*12,inclination:t[6],year:String(2020+i%6),phase:i*2.399963,plane:i*1.618,type:e[0],description:e[1],activity:e[2]};});
