// `node --import ./scripts/register-ts.mjs scripts/seed.mjs`: switches on the TypeScript hooks.
import { register } from 'node:module';
register('./ts-hooks.mjs', import.meta.url);
