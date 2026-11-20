import { Platform, type ViewStyle } from 'react-native';

export const color = {
  fondo: '#F4F4F6',
  tarjeta: '#FFFFFF',
  superficie: '#EEEEF2',
  borde: '#E4E4E9',
  bordeControl: '#8E8E9A',
  texto: '#16161D',
  suave: '#62626E',
  acento: '#4F46E5',
  acentoSuave: '#EEF0FF',
  acentoTexto: '#4338CA',
  bien: '#15803D',
  bienFondo: '#ECFDF3',
  mal: '#B42318',
  malFondo: '#FEF3F2',
  codigoFondo: '#17171F',
  codigoTexto: '#E6E6EF',
  codigoSuave: '#8A8A99',
  codigoResaltado: '#2B2B45',
  codigoError: '#3A1C1C',
  flor: '#BE185D',
  papel: '#57534E',
  grilla: '#D9D9E1',
};

export const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export const espacio = (n: number) => n * 4;

export const radio = { sm: 10, md: 14, lg: 18 };

export const sombra: ViewStyle = {
  shadowColor: '#101828',
  shadowOpacity: 0.07,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};
