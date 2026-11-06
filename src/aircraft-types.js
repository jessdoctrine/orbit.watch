// Conservative ICAO aircraft designator classification, not an operator or mission detector.
// Maintain these curated sets against authoritative aircraft type registries.
export const BUSINESS_TYPES=new Set([
 'C25A','C25B','C25C','C500','C501','C510','C525','C550','C551','C560','C56X','C650','C680','C68A','C700','C750',
 'CL30','CL35','CL60','CRJ1','E50P','E55P','E545','E550','E35L','E145','F2TH','F900','FA7X','FA8X',
 'GLF4','GLF5','GLF6','GLEX','GL5T','GL7T','G280','LJ24','LJ31','LJ35','LJ40','LJ45','LJ55','LJ60','LJ70','LJ75',
 'PC24','PRM1','H25A','H25B','H25C','BE40','BE4W'
]);
export const AGRICULTURAL_TYPES=new Set([
 'AT3T','AT4T','AT5T','AT6T','AT8T','C188','M18','M18T','M21','PA25','S2R','S2T','AGCA','AGB1','CLB1','PZL6','PZL1'
]);
export function classifyAircraft(type){
 const t=String(type||'').trim().toUpperCase();
 if(BUSINESS_TYPES.has(t))return 'business';
 if(AGRICULTURAL_TYPES.has(t))return 'agricultural';
 return 'other';
}
export function categoryLabel(type){
 switch(classifyAircraft(type)){
  case 'business':return 'Business-jet model (type only)';
  case 'agricultural':return 'Agricultural-capable model (activity unverified)';
  default:return 'Other or unclassified model';
 }
}
