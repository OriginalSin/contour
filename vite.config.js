import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import pkg from './package.json';
import mkcert from 'vite-plugin-mkcert'
import glsl from 'vite-plugin-glsl';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    glsl(),
    mkcert(),
    svelte()
  ],
  server: {
		open: true,
		host: '127.0.0.1',
		port: 8081,
		https: true
  }
})
