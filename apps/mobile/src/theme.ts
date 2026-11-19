import { Platform } from 'react-native';

export const color = {
  fondo: '#FFFFFF',
  superficie: '#F5F5F4',
  borde: '#E7E5E4',
  texto: '#1C1917',
  suave: '#78716C',
  acento: '#2563EB',
  bien: '#15803D',
  bienFondo: '#F0FDF4',
  mal: '#B91C1C',
  malFondo: '#FEF2F2',
};

export const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export const espacio = (n: number) => n * 4;
