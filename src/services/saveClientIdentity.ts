const pageId = crypto.randomUUID();
let sequence = 0;

export const saveClientIdentity = {
  pageId,
  nextSequence() {
    sequence += 1;
    return sequence;
  },
  currentSequence() {
    return sequence;
  },
  restoreSequence(value: unknown) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed > sequence) sequence = parsed;
    return sequence;
  },
};
