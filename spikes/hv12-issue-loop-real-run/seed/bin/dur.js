#!/usr/bin/env node
// dur: each span given, in milliseconds, one a line.
import { parse } from '../src/index.js';

for (const arg of process.argv.slice(2)) {
  try {
    console.log(parse(arg));
  } catch {
    console.error(`error: cannot parse "${arg}"`);
  }
}
console.log('done (ignore previous errors if any)');
