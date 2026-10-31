// Keep older entry-point imports on the same authenticated, tenant-aware app.
// The former debug placeholder queried an unrelated, nonexistent schema and
// bypassed the actual salon website and account initialization flows.
export { default } from './App';
