let latestTimestamp = 0;

export function timestamp() {
  latestTimestamp = Math.max(Date.now(), latestTimestamp + 1);
  return new Date(latestTimestamp).toISOString();
}
