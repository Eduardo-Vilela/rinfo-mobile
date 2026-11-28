import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { appleDisponible, BotonApple, entrarConApple, estiloBoton, tipoBoton } from '../auth/apple';
import { entrarConGoogle, googleConfigurado } from '../auth/google';
import { supabase } from '../auth/supabase';
import { Pantalla } from '../components/Pantalla';
import { Boton } from '../components/ui';
import { color, espacio, radio, sombra } from '../theme';

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

/** Mensajes de Supabase/Google traducidos a algo que se entienda. */
function explicar(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/rate limit|security purposes|too many/i.test(m)) return 'Pediste muchos códigos seguidos. Esperá un minuto y probá de nuevo.';
  if (/expired|invalid|otp/i.test(m)) return 'El código no es correcto o ya venció. Pedí uno nuevo.';
  if (/network|fetch/i.test(m)) return 'No hay conexión. Revisá internet y probá de nuevo.';
  return m;
}

export function Login() {
  const [paso, setPaso] = useState<'email' | 'codigo'>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState<'apple' | 'google' | 'email' | 'codigo' | null>(null);
  const [apple, setApple] = useState(false);
  useEffect(() => { appleDisponible().then(setApple); }, []);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  async function correr(tipo: 'apple' | 'google' | 'email' | 'codigo', accion: () => Promise<void>) {
    setOcupado(tipo); setError(''); setAviso('');
    try { await accion(); } catch (e) { setError(explicar(e)); } finally { setOcupado(null); }
  }

  const conApple = () => correr('apple', async () => { await entrarConApple(); });
  const google = () => correr('google', async () => { await entrarConGoogle(); });

  const pedirCodigo = () => correr('email', async () => {
    const { error: e } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
    if (e) throw e;
    setCodigo(''); setPaso('codigo'); setAviso(`Te mandamos un código a ${email.trim()}. Mirá también en spam.`);
  });

  const verificar = () => correr('codigo', async () => {
    const { error: e } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: codigo.trim(), type: 'email' });
    if (e) throw e;
  });

  return (
    <Pantalla>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={st.contenido} keyboardShouldPersistTaps="handled">
          <View style={st.marca}>
            <Image source={require('../../assets/icon.png')} style={st.logo} accessibilityIgnoresInvertColors />
            <Text style={st.titulo}>R-Info</Text>
            <Text style={st.subtitulo}>Practicá para los parciales del ingreso a Informática UNLP</Text>
          </View>

          <View style={st.tarjeta}>
            {paso === 'email' ? (
              <>
                {apple ? (
                  <View pointerEvents={ocupado ? 'none' : 'auto'} style={ocupado ? { opacity: 0.6 } : undefined}>
                    <BotonApple buttonType={tipoBoton} buttonStyle={estiloBoton} cornerRadius={radio.md} style={st.apple} onPress={conApple} />
                  </View>
                ) : null}
                {googleConfigurado ? (
                  <Pressable
                    onPress={google}
                    disabled={!!ocupado}
                    accessibilityRole="button"
                    style={({ pressed }) => [st.google, (pressed || !!ocupado) && { opacity: 0.7 }]}
                  >
                    {ocupado === 'google' ? <ActivityIndicator color={color.texto} /> : <Ionicons name="logo-google" size={18} color={color.texto} />}
                    <Text style={st.googleTexto}>Continuar con Google</Text>
                  </Pressable>
                ) : null}
                {apple || googleConfigurado ? (
                  <View style={st.separador}>
                    <View style={st.linea} /><Text style={st.separadorTexto}>o con tu email</Text><View style={st.linea} />
                  </View>
                ) : null}
                <Text style={st.etiqueta}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@email.com"
                  placeholderTextColor={color.suave}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={() => emailValido(email) && pedirCodigo()}
                  style={st.input}
                />
                <Boton
                  titulo={ocupado === 'email' ? 'Enviando…' : 'Enviarme un código'}
                  icono="mail-outline"
                  onPress={pedirCodigo}
                  deshabilitado={!emailValido(email) || !!ocupado}
                  estilo={st.botonFijo}
                />
              </>
            ) : (
              <>
                <Text style={st.etiqueta}>Código del email</Text>
                <TextInput
                  value={codigo}
                  onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, 8))}
                  placeholder="123456"
                  placeholderTextColor={color.suave}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  returnKeyType="done"
                  onSubmitEditing={() => codigo.length >= 6 && verificar()}
                  style={[st.input, st.inputCodigo]}
                  autoFocus
                />
                <Boton
                  titulo={ocupado === 'codigo' ? 'Verificando…' : 'Entrar'}
                  icono="log-in-outline"
                  onPress={verificar}
                  deshabilitado={codigo.length < 6 || !!ocupado}
                  estilo={st.botonFijo}
                />
                <View style={st.filaLinks}>
                  <Pressable onPress={() => { setPaso('email'); setError(''); setAviso(''); }} hitSlop={8}>
                    <Text style={st.link}>Cambiar email</Text>
                  </Pressable>
                  <Pressable onPress={pedirCodigo} disabled={!!ocupado} hitSlop={8}>
                    <Text style={st.link}>Reenviar código</Text>
                  </Pressable>
                </View>
              </>
            )}
            {aviso ? <Text style={st.aviso}>{aviso}</Text> : null}
            {error ? <Text style={st.error} accessibilityLiveRegion="polite">{error}</Text> : null}
          </View>

          <Text style={st.pie}>Usamos tu cuenta solo para guardar tu acceso. Es gratis.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Pantalla>
  );
}

const st = StyleSheet.create({
  contenido: { flexGrow: 1, justifyContent: 'center', padding: espacio(5), gap: espacio(6) },
  marca: { alignItems: 'center', gap: espacio(2) },
  logo: { width: 84, height: 84, borderRadius: 22, marginBottom: espacio(2) },
  titulo: { fontSize: 32, fontWeight: '800', color: color.texto, letterSpacing: -0.5 },
  subtitulo: { fontSize: 15, lineHeight: 21, color: color.suave, textAlign: 'center', maxWidth: 300 },
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: radio.lg, padding: espacio(5), gap: espacio(3), ...sombra },
  google: {
    minHeight: 48, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeControl, backgroundColor: color.tarjeta,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espacio(2),
  },
  apple: { width: '100%', height: 48 },
  googleTexto: { fontSize: 15, fontWeight: '700', color: color.texto },
  separador: { flexDirection: 'row', alignItems: 'center', gap: espacio(3), marginVertical: espacio(1) },
  linea: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color.bordeControl },
  separadorTexto: { fontSize: 13, color: color.suave },
  etiqueta: { fontSize: 13, fontWeight: '700', color: color.texto },
  input: {
    minHeight: 48, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeControl, paddingHorizontal: espacio(4),
    fontSize: 16, color: color.texto, backgroundColor: color.tarjeta,
  },
  inputCodigo: { fontSize: 22, letterSpacing: 6, fontWeight: '700', textAlign: 'center' },
  botonFijo: { flex: 0 },
  filaLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: espacio(1) },
  link: { fontSize: 14, fontWeight: '700', color: color.acentoTexto },
  aviso: { fontSize: 13, lineHeight: 18, color: color.suave },
  error: { fontSize: 13, lineHeight: 18, color: color.mal, backgroundColor: color.malFondo, padding: espacio(3), borderRadius: radio.sm },
  pie: { fontSize: 12, color: color.suave, textAlign: 'center' },
});
