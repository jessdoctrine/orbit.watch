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
export const catalog=Array.from({length:180},(_,i)=>{const t=templates[i%templates.length];return {id:`DEMO-${String(i+1).padStart(4,'0')}`,category:t[0],name:`${t[1]} ${String(i+1).padStart(3,'0')}`,operator:t[2],purpose:t[3],country:t[4],altitude:t[5]+(i%7)*12,inclination:t[6],year:String(2020+i%6),phase:i*2.399963,plane:i*1.618};});
