import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextVitals,
  {
    // Static export hydrates URL/table state, sessions and external Supabase data
    // in effects. Keep hook ordering/dependency checks; defer this performance
    // heuristic until the state restoration architecture is refactored.
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts', 'supabase/functions/**'] },
];
export default config;
