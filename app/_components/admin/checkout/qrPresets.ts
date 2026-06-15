// QR color presets — single source of truth so the single-room print dialog
// and the bulk-ZIP picker can never drift (a mismatch would print one room in
// a different shade than the batch, and the codes are physical).
export const COLOR_PRESETS = [
  { key: 'Black', hex: '000000' },
  { key: 'Gold', hex: 'A09060' },
  { key: 'Brown', hex: '8B7B70' },
  { key: 'Wine', hex: '923D4F' },
] as const
