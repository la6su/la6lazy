import { defineConfig } from 'vite';
import glslify from 'rollup-plugin-glslify';
export default defineConfig({
  root: 'src',
  build: {
    minify: 'esbuild',
    target: 'esnext',
    modulePreload: false,
    rollupOptions: {
      output: {
        dir: './build',

        manualChunks(id) {
          if (id.includes('three')) return 'three';
          if (id.includes('ore-three')) return 'ore';
          if (id.includes('scenes')) return 'scene-chunk';
        },
      },
    },
  },
  plugins: [
    {
      ...glslify({
        basedir: './src/glsl/',
        transform: [['glslify-hex'], ['glslify-import']],
      }),
      enforce: 'pre',
    },
  ],
});
