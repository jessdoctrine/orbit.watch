import {defineConfig,loadEnv} from 'vite';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'EXODUS_');
 const origin=env.EXODUS_COLLECTOR_URL;
 const proxy={
  '/api/aircraft-photo-reg':{
   target:'https://api.planespotters.net',changeOrigin:true,secure:true,
   rewrite:path=>path.replace('/api/aircraft-photo-reg/','/pub/photos/reg/')
  },
  '/api/aircraft-photo':{
   target:'https://api.planespotters.net',changeOrigin:true,secure:true,
   rewrite:path=>path.replace('/api/aircraft-photo/','/pub/photos/hex/')
  },
  '/api/aircraft':{
   target:'https://api.adsb.lol',changeOrigin:true,secure:true,
   rewrite:path=>path.replace('/api/aircraft/','/v2/point/')
  }
 };
 if(origin&&origin.startsWith('https://')){
  proxy['/api/pattern-history']={
   target:origin,changeOrigin:true,secure:true,
   rewrite:path=>path.replace('/api/pattern-history/','/history?region=')
  };
 }
 return {server:{proxy}};
});
