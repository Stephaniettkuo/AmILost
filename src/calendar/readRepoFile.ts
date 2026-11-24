// For tests only: read a file of this repo as text (Jest runs from the repo's top folder).
// (Plain `require`, so we don't need the Node type package just for tests.)
const { readFileSync } = require('fs') as { readFileSync: (path: string, encoding: string) => string };

export const readRepoFile = (path: string): string => readFileSync(path, 'utf8');
