import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';
import { renderResumeHTML, renderNoscript } from './src/content/render';
import { site } from './src/content/data';

/**
 * - Injects the résumé (and a no-JavaScript fallback for the desk) as real HTML
 *   at build time, so recruiters, search engines and screen readers get the
 *   content without running WebGL. Both come from src/content/data.ts.
 * - Fills in %SITE_URL% for the link-preview tags.
 * - Adds Vercel Web Analytics to production builds only (enable it in the
 *   Vercel dashboard under Analytics; no package needed).
 */
function injectContent(): Plugin {
  let isBuild = false;
  return {
    name: 'inject-content',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    transformIndexHtml(html) {
      let out = html
        .replace('<!--resume-->', renderResumeHTML())
        .replace('<!--noscript-->', renderNoscript())
        .replaceAll('%SITE_URL%', site.url.replace(/\/$/, ''));
      if (isBuild) out = out.replace('</head>', '    <script defer src="/_vercel/insights/script.js"></script>\n  </head>');
      return out;
    },
  };
}

export default defineConfig({
  plugins: [injectContent()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        resume: fileURLToPath(new URL('./resume/index.html', import.meta.url)),
      },
    },
  },
});
