export const SAVE_KEY = 'tpp_chile_clean_save';
export const BACKUP_KEY = `${SAVE_KEY}_backup`;
export const CHECKPOINT_KEY = `${SAVE_KEY}_checkpoint`;

export function writeManualSave(storage, raw, validate) {
  validate(raw);
  const previous = storage.getItem(SAVE_KEY);
  if (previous) {
    let intact = false;
    try { validate(previous); intact = true; } catch { /* Preserve the existing backup. */ }
    if (intact) storage.setItem(BACKUP_KEY, previous);
  }
  storage.setItem(SAVE_KEY, raw);
}

export function lastIntactCopy(storage, validate) {
  for (const key of [CHECKPOINT_KEY, BACKUP_KEY]) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    try { validate(raw); return raw; } catch { /* Try the other copy. */ }
  }
  return null;
}
