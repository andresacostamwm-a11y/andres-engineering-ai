/**
 * Catálogo de países, su moneda oficial y cómo se escribe el dinero allí.
 *
 * El presupuesto de una obra se cotiza en la moneda del país donde se construye:
 * una obra en Bogotá se presupuesta en pesos colombianos, no en pesos mexicanos.
 * De aquí sale la moneda principal de todo el proyecto.
 */

/** Código ISO 4217 de las monedas que el sistema sabe manejar. */
export type Moneda =
  | "MXN" | "USD" | "EUR" | "COP" | "CLP" | "PEN" | "ARS" | "BRL"
  | "GBP" | "CAD" | "DOP" | "GTQ" | "CRC" | "PAB" | "UYU" | "BOB"
  | "PYG" | "HNL" | "NIO" | "CUP" | "VES";

export interface FichaPais {
  /** Código ISO 3166-1 alfa-2. */
  codigo: string;
  nombre: string;
  moneda: Moneda;
  /** Locale para `Intl.NumberFormat`: decide separadores y posición del símbolo. */
  locale: string;
  /**
   * Términos que aparecen en el campo de ubicación y delatan el país: estados,
   * ciudades grandes y gentilicios. Se comparan sin acentos ni mayúsculas.
   */
  pistas: string[];
}

export const PAISES: FichaPais[] = [
  {
    codigo: "MX", nombre: "México", moneda: "MXN", locale: "es-MX",
    pistas: [
      "mexico", "mexicana", "mexicano", "cdmx", "df", "ciudad de mexico",
      "quintana roo", "cancun", "tulum", "playa del carmen", "cozumel", "chetumal",
      "akumal", "puerto morelos", "merida", "yucatan", "campeche", "chiapas",
      "tabasco", "veracruz", "puebla", "queretaro", "guanajuato", "jalisco",
      "guadalajara", "monterrey", "nuevo leon", "coahuila", "chihuahua", "sonora",
      "sinaloa", "durango", "zacatecas", "aguascalientes", "san luis potosi",
      "tamaulipas", "hidalgo", "morelos", "tlaxcala", "michoacan", "colima",
      "nayarit", "oaxaca", "guerrero", "acapulco", "baja california", "tijuana",
      "los cabos", "la paz", "estado de mexico", "toluca", "puerto vallarta",
    ],
  },
  {
    codigo: "US", nombre: "Estados Unidos", moneda: "USD", locale: "en-US",
    pistas: [
      "estados unidos", "united states", "usa", "eeuu", "ee.uu",
      "texas", "california", "florida", "new york", "nueva york", "miami",
      "houston", "dallas", "austin", "los angeles", "san diego", "chicago",
      "arizona", "phoenix", "nevada", "las vegas", "georgia", "atlanta",
      "illinois", "colorado", "denver", "washington", "seattle", "boston",
    ],
  },
  {
    codigo: "ES", nombre: "España", moneda: "EUR", locale: "es-ES",
    pistas: [
      "espana", "espanola", "espanol", "madrid", "barcelona", "valencia",
      "sevilla", "zaragoza", "malaga", "murcia", "bilbao", "alicante",
      "cataluna", "andalucia", "galicia", "asturias", "cantabria", "navarra",
      "pais vasco", "castilla", "extremadura", "aragon", "canarias", "baleares",
      "palma", "las palmas", "tenerife", "vigo", "granada", "cordoba",
    ],
  },
  {
    codigo: "CO", nombre: "Colombia", moneda: "COP", locale: "es-CO",
    pistas: [
      "colombia", "colombiana", "colombiano", "bogota", "medellin", "cali",
      "barranquilla", "cartagena", "bucaramanga", "pereira", "manizales",
      "santa marta", "cucuta", "ibague", "villavicencio", "antioquia",
      "cundinamarca", "valle del cauca", "atlantico", "santander", "bolivar",
    ],
  },
  {
    codigo: "CL", nombre: "Chile", moneda: "CLP", locale: "es-CL",
    pistas: [
      "chile", "chilena", "chileno", "santiago", "valparaiso", "concepcion",
      "antofagasta", "vina del mar", "temuco", "iquique", "la serena",
      "puerto montt", "rancagua", "calama", "arica", "atacama", "biobio",
    ],
  },
  {
    codigo: "PE", nombre: "Perú", moneda: "PEN", locale: "es-PE",
    pistas: [
      "peru", "peruana", "peruano", "lima", "arequipa", "trujillo", "cusco",
      "chiclayo", "piura", "iquitos", "huancayo", "tacna", "callao", "ica",
    ],
  },
  {
    codigo: "AR", nombre: "Argentina", moneda: "ARS", locale: "es-AR",
    pistas: [
      "argentina", "argentino", "buenos aires", "cordoba argentina", "rosario",
      "mendoza", "la plata", "mar del plata", "tucuman", "salta", "neuquen",
      "bariloche", "patagonia", "santa fe",
    ],
  },
  {
    codigo: "BR", nombre: "Brasil", moneda: "BRL", locale: "pt-BR",
    pistas: [
      "brasil", "brazil", "brasilena", "sao paulo", "rio de janeiro", "brasilia",
      "salvador", "fortaleza", "belo horizonte", "manaus", "curitiba", "recife",
      "porto alegre", "goiania", "belem",
    ],
  },
  {
    codigo: "DO", nombre: "República Dominicana", moneda: "DOP", locale: "es-DO",
    pistas: [
      "republica dominicana", "dominicana", "santo domingo", "punta cana",
      "puerto plata", "la romana", "bavaro", "santiago de los caballeros",
    ],
  },
  {
    codigo: "GT", nombre: "Guatemala", moneda: "GTQ", locale: "es-GT",
    pistas: ["guatemala", "guatemalteca", "quetzaltenango", "antigua guatemala", "escuintla"],
  },
  {
    codigo: "CR", nombre: "Costa Rica", moneda: "CRC", locale: "es-CR",
    pistas: ["costa rica", "costarricense", "san jose costa rica", "alajuela", "guanacaste", "liberia costa rica"],
  },
  {
    codigo: "PA", nombre: "Panamá", moneda: "PAB", locale: "es-PA",
    pistas: ["panama", "panamena", "ciudad de panama", "colon panama", "david panama"],
  },
  {
    codigo: "UY", nombre: "Uruguay", moneda: "UYU", locale: "es-UY",
    pistas: ["uruguay", "uruguaya", "montevideo", "punta del este", "maldonado"],
  },
  {
    codigo: "BO", nombre: "Bolivia", moneda: "BOB", locale: "es-BO",
    pistas: ["bolivia", "boliviana", "la paz bolivia", "santa cruz de la sierra", "cochabamba", "sucre"],
  },
  {
    codigo: "PY", nombre: "Paraguay", moneda: "PYG", locale: "es-PY",
    pistas: ["paraguay", "paraguaya", "asuncion", "ciudad del este"],
  },
  {
    codigo: "HN", nombre: "Honduras", moneda: "HNL", locale: "es-HN",
    pistas: ["honduras", "hondurena", "tegucigalpa", "san pedro sula", "roatan"],
  },
  {
    codigo: "NI", nombre: "Nicaragua", moneda: "NIO", locale: "es-NI",
    pistas: ["nicaragua", "nicaraguense", "managua", "leon nicaragua", "granada nicaragua"],
  },
  {
    codigo: "GB", nombre: "Reino Unido", moneda: "GBP", locale: "en-GB",
    pistas: ["reino unido", "united kingdom", "inglaterra", "londres", "london", "manchester", "escocia"],
  },
  {
    codigo: "CA", nombre: "Canadá", moneda: "CAD", locale: "en-CA",
    pistas: ["canada", "canadiense", "toronto", "vancouver", "montreal", "ottawa", "calgary", "quebec"],
  },
];

/** País que se asume cuando la ubicación no permite deducirlo. */
export const PAIS_POR_DEFECTO = PAISES[0]; // México

/** Quita acentos y pasa a minúsculas para poder comparar texto libre. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * ¿Aparece la pista como palabra completa?
 *
 * La comparación por subcadena da falsos positivos caros: "especificar" contiene
 * "ica" (Ica, Perú) y "calidad" contiene "cali" (Cali, Colombia). Un país mal
 * deducido cambia la moneda de todo el presupuesto, así que se exige que la
 * pista esté delimitada por algo que no sea letra ni dígito.
 */
function contienePalabra(texto: string, pista: string): boolean {
  const escapada = pista.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapada}(?![\\p{L}\\p{N}])`, "u").test(texto);
}

export function paisPorCodigo(codigo: string): FichaPais | null {
  const c = codigo.trim().toUpperCase();
  return PAISES.find((p) => p.codigo === c) ?? null;
}

export function paisPorMoneda(moneda: Moneda): FichaPais | null {
  return PAISES.find((p) => p.moneda === moneda) ?? null;
}

/**
 * Deduce el país a partir del texto de ubicación que escribió el usuario.
 *
 * Gana la pista más larga que aparezca: "la paz" existe en México y en Bolivia,
 * pero "la paz bolivia" es más específica y debe imponerse. Devuelve también la
 * pista que decidió, para poder mostrarla y que la deducción sea auditable.
 */
export function deducirPais(ubicacion: string): {
  pais: FichaPais;
  pista: string | null;
  deducido: boolean;
} {
  const texto = normalizar(ubicacion);
  if (!texto) return { pais: PAIS_POR_DEFECTO, pista: null, deducido: false };

  let mejor: { pais: FichaPais; pista: string } | null = null;

  for (const pais of PAISES) {
    for (const pista of pais.pistas) {
      if (!contienePalabra(texto, pista)) continue;
      if (!mejor || pista.length > mejor.pista.length) {
        mejor = { pais, pista };
      }
    }
  }

  if (mejor) return { pais: mejor.pais, pista: mejor.pista, deducido: true };
  return { pais: PAIS_POR_DEFECTO, pista: null, deducido: false };
}
