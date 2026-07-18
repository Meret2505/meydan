// Stub for Next.js's "server-only" marker package.
//
// Importing it is a build-time assertion that a module never reaches the client
// bundle. Vitest has no client bundle, and the real package ships no resolvable
// entry outside Next's bundler, so it is aliased here to an empty module.
export {};
