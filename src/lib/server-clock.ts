// Client-side access to the server clock (Cairo calendar).
// Every "today"/"this month" default in the UI comes from here, never from the device clock.
export type ServerToday = { now: string; isoDate: string; monthKey: string };

export async function fetchServerToday(): Promise<ServerToday> {
  const res = await fetch('/api/server-time', { cache: 'no-store' });
  if (!res.ok) throw new Error('تعذر جلب وقت السيرفر');
  return res.json();
}
