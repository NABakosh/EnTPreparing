/** Date → значение для <input type="datetime-local"> во времени Алматы (UTC+5). */
export function toAlmatyLocalInput(d: Date): string {
  const shifted = new Date(d.getTime() + 5 * 3600_000);
  return shifted.toISOString().slice(0, 16);
}

/** Значение datetime-local (время Алматы) → ISO. */
export function fromAlmatyLocalInput(v: string): string {
  return new Date(`${v}:00+05:00`).toISOString();
}
