// Fallback bio generator — used only when player.bio is null at runtime.
export function generateFallbackBio(player) {
  if (!player) return '';
  const pos = { GK: 'goalkeeper', DEF: 'defender', MID: 'midfielder', FWD: 'forward' };
  return `${player.name} is a ${pos[player.position] || 'player'} with ${player.caps ?? 0} international caps.`;
}
