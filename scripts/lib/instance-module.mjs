// The one fact the isolation scripts take from the ACRYL runtime's instance module (acryldev/acryl, runtime/harness-runtime/src/instance/select.ts): where the OS
// user's real home is. Everything else they know (which folders are a real ACRYL or DSH home) is written in isolated-run.mjs.
export { homedir as osHomeDirectory } from 'node:os'
