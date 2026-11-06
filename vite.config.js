import {defineConfig} from 'vite';
export default defineConfig({
  server:{
    proxy:{
      '/api/aircraft-photo-reg':{
        target:'https://api.planespotters.net',
        changeOrigin:true,
        secure:true,
        rewrite:path=>path.replace('/api/aircraft-photo-reg/','/pub/photos/reg/')
      },
      '/api/aircraft-photo':{
        target:'https://api.planespotters.net',
        changeOrigin:true,
        secure:true,
        rewrite:path=>path.replace('/api/aircraft-photo/','/pub/photos/hex/')
      },
      '/api/aircraft':{
        target:'https://api.adsb.lol',
        changeOrigin:true,
        secure:true,
        rewrite:path=>path.replace(/^\/api\/aircraft(?=\/)/,'/v2/point')
      }
    }
  }
});
