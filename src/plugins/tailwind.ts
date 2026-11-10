import path from 'path';
import tailwindcss from '@tailwindcss/postcss';
import type {Plugin} from '@docusaurus/types';

export default function tailwindPlugin(): Plugin {
  return {
    name: 'langguard-tailwind',
    // A client module, not an import in custom.css, so the site's own
    // stylesheet stays free of Tailwind entirely.
    getClientModules: () => [path.resolve(__dirname, '../css/tailwind.css')],
    configurePostCss(options) {
      // Tailwind also runs on custom.css because it has an @import. Docusaurus
      // minifies the bundle afterwards, so a second optimizer pass adds nothing.
      options.plugins.unshift(tailwindcss({optimize: false}));
      return options;
    },
    configureWebpack: () => ({
      resolve: {alias: {'@': path.resolve(__dirname, '..')}},
    }),
  };
}
