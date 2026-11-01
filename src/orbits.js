import {json2satrec,propagate,gstime,eciToEcf,eciToGeodetic} from 'satellite.js';
export const EARTH_RADIUS=6378.137;
export const makeSatrec=omm=>json2satrec(omm);
export function calculate(satrec,date) {
 const state=propagate(satrec,date);
 if(!state?.position||!Object.values(state.position).every(Number.isFinite))return null;
 const gmst=gstime(date),fixed=eciToEcf(state.position,gmst),geo=eciToGeodetic(state.position,gmst);
 if(!Number.isFinite(geo.height)||geo.height<0)return null;
 // Three.js Y is north; Earth texture lon=0 is +X, with east toward -Z.
 return {x:fixed.x/EARTH_RADIUS,y:fixed.z/EARTH_RADIUS,z:-fixed.y/EARTH_RADIUS,altitude:geo.height};
}
