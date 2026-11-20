// Team identity in one place (see docs/WORLD.md). Colours stay blue/red.
// `short` is used where space is tight (score lines, tiles, banners).
export const TEAM_INFO = Object.freeze({
  // `mark` + `terminal` frame the student screen: guardians use HUMAN's official terminal,
  // Luddites a terminal they broke into.
  blue: { name: '인류유산 보존관', short: '보존관', code: 'GUARDIAN', mark: 'HUMAN', terminal: '공식 기록 단말기', role: '인류유산 보존관 · 고용 형태: 임시 계약직' },
  red: { name: '러다이트', short: '러다이트', code: 'LUDDITE', mark: '[ 비인가 접속 ]', terminal: '신호 우회 중', role: '러다이트 · 기록 탈환 요원' },
});
export const SOLO_INFO = Object.freeze({ code: 'TRAINEE', mark: 'TRAINEE', terminal: '혼자 복원 연습', role: '연습생 · 혼자 복원 연습' });
export const teamName = team => TEAM_INFO[team]?.name ?? '';
export const teamShort = team => TEAM_INFO[team]?.short ?? '';
