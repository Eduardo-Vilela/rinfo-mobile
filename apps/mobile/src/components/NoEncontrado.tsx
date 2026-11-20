import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { espacio } from '../theme';
import { Pantalla } from './Pantalla';
import { Boton, s as ui } from './ui';

export function NoEncontrado({ que }: { que: string }) {
  return (
    <Pantalla>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacio(6), gap: espacio(4) }}>
        <Text style={ui.texto}>No encontramos {que}.</Text>
        <View style={{ flexDirection: 'row', alignSelf: 'stretch' }}>
          <Boton titulo="Ir al inicio" onPress={() => router.replace('/')} />
        </View>
      </View>
    </Pantalla>
  );
}
