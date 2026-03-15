import esbuild from 'esbuild';

const isProduction = process.env.NODE_ENV === 'production';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/index.js',
  minify: isProduction,
  keepNames: true,
  sourcemap: !isProduction,
  // Shim require() for ESM bundle - some deps (better-auth, ws) use require() internally
  banner: {
    js: "import{createRequire as __createRequire}from'module';const require=__createRequire(import.meta.url);",
  },
});

console.info(`[esbuild] Build OK → dist/index.js (${isProduction ? 'minified' : 'dev'})`);
