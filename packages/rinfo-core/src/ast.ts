export type Pos = { linea: number; columna: number };
export type Tipo = 'numero' | 'boolean';

export type Expr = Pos & (
  | { k: 'num'; valor: number }
  | { k: 'bool'; valor: boolean }
  | { k: 'texto'; valor: string }
  | { k: 'var'; nombre: string }
  | { k: 'sensor'; nombre: string }
  | { k: 'no'; e: Expr }
  | { k: 'neg'; e: Expr }
  | { k: 'bin'; op: '+' | '-' | '*' | '/' | '=' | '<>' | '<' | '>' | '<=' | '>=' | '&' | '|'; a: Expr; b: Expr }
);

export type Sent = Pos & (
  | { k: 'primitiva'; nombre: string }
  | { k: 'pos'; av: Expr; ca: Expr }
  | { k: 'informar'; args: Expr[] }
  | { k: 'asignar'; nombre: string; valor: Expr }
  | { k: 'llamada'; nombre: string; args: Expr[] }
  | { k: 'si'; cond: Expr; entonces: Sent[]; sino?: Sent[] }
  | { k: 'mientras'; cond: Expr; cuerpo: Sent[] }
  | { k: 'repetir'; veces: Expr; cuerpo: Sent[] }
);

export type Decl = Pos & { nombre: string; tipo: Tipo };
export type Param = Decl & { clase: 'E' | 'ES' };

export type Proceso = Pos & { nombre: string; params: Param[]; variables: Decl[]; cuerpo: Sent[] };
export type Area = Pos & { nombre: string; av1: number; ca1: number; av2: number; ca2: number };
export type TipoRobot = Pos & { nombre: string; variables: Decl[]; cuerpo: Sent[] };
export type VarRobot = Pos & { nombre: string; tipo: string };
export type Principal = Pos & (
  | { k: 'asignarArea'; robot: string; area: string }
  | { k: 'iniciar'; robot: string; av: Expr; ca: Expr }
);

export type Programa = {
  nombre: string;
  procesos: Proceso[];
  areas: Area[];
  robots: TipoRobot[];
  variables: VarRobot[];
  principal: Principal[];
};
