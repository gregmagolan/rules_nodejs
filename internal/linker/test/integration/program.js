// First-party package from ./pkg_a
const a = require('a');
// Third-party package installed in the root node_modules
const semver = require('semver');

console.error(`[program.js] running in ${process.cwd()}`);
console.error(`[program.js] process.env:\n${JSON.stringify(process.env, null, 2)}`);
console.log(a.addA(semver.clean(' =v1.2.3 ')));
