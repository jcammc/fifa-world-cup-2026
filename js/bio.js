const POSITION_LABELS = {
  GK: 'goalkeeper',
  DF: 'defender',
  MF: 'midfielder',
  FW: 'forward',
};

export function generateFallbackBio(player, club) {
  if (!player) return '';
  const pos = POSITION_LABELS[player.position] ?? 'player';
  const clubName = club?.name ?? null;
  const captain = player.captain ? ', captain of the national side,' : '';
  const clubPart = clubName ? ` for ${clubName}` : '';
  const caps = player.caps ?? 0;
  const goals = player.goals ?? 0;
  return `${player.name} is a ${pos}${captain} who plays${clubPart}. `
    + `They have earned ${caps} international cap${caps !== 1 ? 's' : ''} `
    + `and scored ${goals} international goal${goals !== 1 ? 's' : ''}.`;
}
