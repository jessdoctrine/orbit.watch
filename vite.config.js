import {defineConfig} from 'vite';
export default defineConfig({
  server:{
    proxy:{
      '/api/aircraft':{
        target:'https://api.adsb.lol',
        changeOrigin:true,
        secure:true,
        rewrite:path=>path.replace(/^\/api\/aircraft(?=\/)/,'/v2/point')
      }
    }
  }
});
