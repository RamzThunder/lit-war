// Era ownership as shown on every screen. Display only: the server's rules don't change.
// 접전 (close match): the gap is one mission (10 points) or less, and not a tie.
export const CLOSE_GAP = 10;
export const eraOwner = ({ blue, red }) => (!blue && !red ? 'empty' : blue > red ? 'blue' : red > blue ? 'red' : 'tie');
export const isClose = ({ blue, red }) => blue !== red && Math.abs(blue - red) <= CLOSE_GAP;
export const teamTotal = (scores, eras, team) => eras.reduce((sum, era) => sum + scores[era][team], 0);
export const heldCount = (scores, eras, team) => eras.filter(era => eraOwner(scores[era]) === team).length;
