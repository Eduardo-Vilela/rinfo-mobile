import AsyncStorage from '@react-native-async-storage/async-storage';

const BORRADOR = 'borrador:';
const RESUELTOS = 'resueltos';

export async function leerBorrador(id: string): Promise<string | null> {
  try { return await AsyncStorage.getItem(BORRADOR + id); } catch { return null; }
}
export async function guardarBorrador(id: string, codigo: string) {
  try { await AsyncStorage.setItem(BORRADOR + id, codigo); } catch {}
}
export async function leerResueltos(): Promise<Set<string>> {
  try { return new Set(JSON.parse((await AsyncStorage.getItem(RESUELTOS)) ?? '[]')); } catch { return new Set(); }
}
export async function marcarResuelto(id: string) {
  const s = await leerResueltos();
  s.add(id);
  try { await AsyncStorage.setItem(RESUELTOS, JSON.stringify([...s])); } catch {}
}
