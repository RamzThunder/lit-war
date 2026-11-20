import { map } from '../map.js';

// Keep world sprites between sabotage graphics (5–6) and the service door jambs (12).
export function archiveDepth(groundY) {
  return 8 + groundY / map.height;
}
