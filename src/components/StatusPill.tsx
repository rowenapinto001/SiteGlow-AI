import type { ConnectionState } from '../shared/types';

interface StatusPillProps {
  state: ConnectionState;
}

export function StatusPill({ state }: StatusPillProps) {
  const label = state === 'active' ? 'Connection active' : state === 'inactive' ? 'Connection inactive' : 'Connection untested';
  return <span className={`status-pill ${state}`} aria-label={label} title={label} />;
}
