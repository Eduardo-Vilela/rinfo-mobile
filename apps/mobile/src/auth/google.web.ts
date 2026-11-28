/** En la web no hay inicio de sesión nativo de Google: solo email. */
export const googleConfigurado = false;
export async function entrarConGoogle(): Promise<boolean> { return false; }
export async function salirDeGoogle() {}
