// Lets plain `node` run our TypeScript files (src/...) from scripts/seed.mjs, so the seed script uses the
// SAME calendar reader and room matching as the app instead of a copy. Used through register-ts.mjs.
//  - resolve: "./time" -> "./time.ts"
//  - load: turn .ts into JavaScript with the TypeScript package we already have
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const isFile = (path) => existsSync(path) && statSync(path).isFile();

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const base = fileURLToPath(new URL(specifier, context.parentURL));
    for (const candidate of [base, `${base}.ts`, `${base}/index.ts`]) {
      if (isFile(candidate)) return nextResolve(pathToFileURL(candidate).href, context);
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts')) {
    const source = await readFile(new URL(url), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    // The app loads pictures with require('....png'); in node we only need the map data, so use 0 for them.
    const source2 = outputText.replace(/require\((['"])[^'"]*\.(?:png|jpe?g)\1\)/g, '0');
    return { format: 'module', source: source2, shortCircuit: true };
  }
  return nextLoad(url, context);
}
