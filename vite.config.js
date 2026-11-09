import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { pageFragments } from './tooling/page-fragments.js';

export default defineConfig({ plugins: [pageFragments(), tailwindcss()] });
