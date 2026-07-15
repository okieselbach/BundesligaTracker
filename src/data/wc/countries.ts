import type { Club } from "@/lib/db";

/**
 * All footballing nations of the world, used by the World Cup ("wc") system.
 *
 * These are NOT part of ALL_CLUBS — we deliberately keep them out of every
 * user's database. A country only becomes a `Club` row when the user actually
 * adds it to their World Cup (see WorldCupGroupStage). That keeps German /
 * English databases lean while still offering the full, searchable list here.
 *
 * Flags are rendered by ClubLogo as <img> from flagcdn.com. The ISO 3166-1
 * alpha-2 code drives the flag URL; the UK home nations use flagcdn's
 * "gb-eng" / "gb-sct" / "gb-wls" / "gb-nir" subdivision codes.
 */

export const WC_SYSTEM_ID = "wc";
export const WC_NATION_TIER = "nation";

/** [iso2 (flagcdn code), German name, 3-letter short code] */
const RAW: [string, string, string][] = [
  // ── Europa (UEFA) ────────────────────────────────────────────────
  ["de", "Deutschland", "GER"],
  ["gb-eng", "England", "ENG"],
  ["gb-sct", "Schottland", "SCO"],
  ["gb-wls", "Wales", "WAL"],
  ["gb-nir", "Nordirland", "NIR"],
  ["fr", "Frankreich", "FRA"],
  ["es", "Spanien", "ESP"],
  ["it", "Italien", "ITA"],
  ["pt", "Portugal", "POR"],
  ["nl", "Niederlande", "NED"],
  ["be", "Belgien", "BEL"],
  ["hr", "Kroatien", "CRO"],
  ["ch", "Schweiz", "SUI"],
  ["at", "Österreich", "AUT"],
  ["dk", "Dänemark", "DEN"],
  ["se", "Schweden", "SWE"],
  ["no", "Norwegen", "NOR"],
  ["fi", "Finnland", "FIN"],
  ["is", "Island", "ISL"],
  ["ie", "Irland", "IRL"],
  ["pl", "Polen", "POL"],
  ["cz", "Tschechien", "CZE"],
  ["sk", "Slowakei", "SVK"],
  ["hu", "Ungarn", "HUN"],
  ["ro", "Rumänien", "ROU"],
  ["bg", "Bulgarien", "BUL"],
  ["gr", "Griechenland", "GRE"],
  ["rs", "Serbien", "SRB"],
  ["si", "Slowenien", "SVN"],
  ["ba", "Bosnien-Herzegowina", "BIH"],
  ["me", "Montenegro", "MNE"],
  ["mk", "Nordmazedonien", "MKD"],
  ["al", "Albanien", "ALB"],
  ["xk", "Kosovo", "KVX"],
  ["ua", "Ukraine", "UKR"],
  ["ru", "Russland", "RUS"],
  ["by", "Belarus", "BLR"],
  ["tr", "Türkei", "TUR"],
  ["ge", "Georgien", "GEO"],
  ["am", "Armenien", "ARM"],
  ["az", "Aserbaidschan", "AZE"],
  ["il", "Israel", "ISR"],
  ["lu", "Luxemburg", "LUX"],
  ["mt", "Malta", "MLT"],
  ["cy", "Zypern", "CYP"],
  ["ee", "Estland", "EST"],
  ["lv", "Lettland", "LVA"],
  ["lt", "Litauen", "LTU"],
  ["md", "Moldau", "MDA"],
  ["ad", "Andorra", "AND"],
  ["li", "Liechtenstein", "LIE"],
  ["sm", "San Marino", "SMR"],
  ["fo", "Färöer", "FRO"],
  ["gi", "Gibraltar", "GIB"],

  // ── Südamerika (CONMEBOL) ────────────────────────────────────────
  ["br", "Brasilien", "BRA"],
  ["ar", "Argentinien", "ARG"],
  ["uy", "Uruguay", "URU"],
  ["co", "Kolumbien", "COL"],
  ["cl", "Chile", "CHI"],
  ["pe", "Peru", "PER"],
  ["ec", "Ecuador", "ECU"],
  ["py", "Paraguay", "PAR"],
  ["bo", "Bolivien", "BOL"],
  ["ve", "Venezuela", "VEN"],

  // ── Nord-/Mittelamerika & Karibik (CONCACAF) ─────────────────────
  ["us", "USA", "USA"],
  ["mx", "Mexiko", "MEX"],
  ["ca", "Kanada", "CAN"],
  ["cr", "Costa Rica", "CRC"],
  ["pa", "Panama", "PAN"],
  ["hn", "Honduras", "HON"],
  ["jm", "Jamaika", "JAM"],
  ["sv", "El Salvador", "SLV"],
  ["gt", "Guatemala", "GUA"],
  ["tt", "Trinidad und Tobago", "TRI"],
  ["ht", "Haiti", "HAI"],
  ["cu", "Kuba", "CUB"],
  ["cw", "Curaçao", "CUW"],
  ["sr", "Suriname", "SUR"],
  ["ni", "Nicaragua", "NCA"],
  ["do", "Dominikanische Republik", "DOM"],

  // ── Afrika (CAF) ─────────────────────────────────────────────────
  ["ma", "Marokko", "MAR"],
  ["sn", "Senegal", "SEN"],
  ["ng", "Nigeria", "NGA"],
  ["cm", "Kamerun", "CMR"],
  ["eg", "Ägypten", "EGY"],
  ["gh", "Ghana", "GHA"],
  ["dz", "Algerien", "ALG"],
  ["tn", "Tunesien", "TUN"],
  ["ci", "Elfenbeinküste", "CIV"],
  ["ml", "Mali", "MLI"],
  ["cd", "DR Kongo", "COD"],
  ["za", "Südafrika", "RSA"],
  ["bf", "Burkina Faso", "BFA"],
  ["cv", "Kap Verde", "CPV"],
  ["ao", "Angola", "ANG"],
  ["gn", "Guinea", "GUI"],
  ["ga", "Gabun", "GAB"],
  ["zm", "Sambia", "ZAM"],
  ["ug", "Uganda", "UGA"],
  ["ke", "Kenia", "KEN"],
  ["mr", "Mauretanien", "MTN"],
  ["gw", "Guinea-Bissau", "GNB"],
  ["bj", "Benin", "BEN"],
  ["mz", "Mosambik", "MOZ"],
  ["mg", "Madagaskar", "MAD"],
  ["tg", "Togo", "TOG"],
  ["zw", "Simbabwe", "ZIM"],
  ["ne", "Niger", "NIG"],
  ["sd", "Sudan", "SDN"],
  ["ly", "Libyen", "LBY"],
  ["cg", "Kongo", "CGO"],
  ["gq", "Äquatorialguinea", "EQG"],
  ["sl", "Sierra Leone", "SLE"],
  ["lr", "Liberia", "LBR"],
  ["na", "Namibia", "NAM"],
  ["bw", "Botswana", "BOT"],
  ["mw", "Malawi", "MWI"],
  ["rw", "Ruanda", "RWA"],
  ["tz", "Tansania", "TAN"],
  ["et", "Äthiopien", "ETH"],
  ["gm", "Gambia", "GAM"],
  ["cf", "Zentralafrikanische Rep.", "CTA"],
  ["bi", "Burundi", "BDI"],
  ["km", "Komoren", "COM"],

  // ── Asien (AFC) ──────────────────────────────────────────────────
  ["jp", "Japan", "JPN"],
  ["kr", "Südkorea", "KOR"],
  ["ir", "Iran", "IRN"],
  ["sa", "Saudi-Arabien", "KSA"],
  ["au", "Australien", "AUS"],
  ["qa", "Katar", "QAT"],
  ["iq", "Irak", "IRQ"],
  ["ae", "Ver. Arab. Emirate", "UAE"],
  ["uz", "Usbekistan", "UZB"],
  ["cn", "China", "CHN"],
  ["jo", "Jordanien", "JOR"],
  ["om", "Oman", "OMA"],
  ["bh", "Bahrain", "BHR"],
  ["kw", "Kuwait", "KUW"],
  ["sy", "Syrien", "SYR"],
  ["lb", "Libanon", "LIB"],
  ["ps", "Palästina", "PLE"],
  ["kp", "Nordkorea", "PRK"],
  ["th", "Thailand", "THA"],
  ["vn", "Vietnam", "VIE"],
  ["id", "Indonesien", "IDN"],
  ["my", "Malaysia", "MAS"],
  ["in", "Indien", "IND"],
  ["tj", "Tadschikistan", "TJK"],
  ["tm", "Turkmenistan", "TKM"],
  ["kg", "Kirgisistan", "KGZ"],
  ["kz", "Kasachstan", "KAZ"],
  ["ph", "Philippinen", "PHI"],
  ["sg", "Singapur", "SGP"],
  ["bd", "Bangladesch", "BAN"],
  ["mm", "Myanmar", "MYA"],
  ["ye", "Jemen", "YEM"],
  ["hk", "Hongkong", "HKG"],

  // ── Ozeanien (OFC) ───────────────────────────────────────────────
  ["nz", "Neuseeland", "NZL"],
  ["fj", "Fidschi", "FIJ"],
  ["pg", "Papua-Neuguinea", "PNG"],
  ["nc", "Neukaledonien", "NCL"],
  ["sb", "Salomonen", "SOL"],
  ["vu", "Vanuatu", "VAN"],
  ["ta", "Tahiti", "TAH"],
];

function toClub([iso2, name, code]: [string, string, string]): Club {
  const key = iso2.replace(/-/g, "_");
  return {
    id: `nat_${key}`,
    name,
    shortName: code,
    slug: `wc-${iso2}`,
    logoUrl: `https://flagcdn.com/${iso2}.svg`,
    primaryColor: "#334155",
    secondaryColor: "#FFFFFF",
    systemId: WC_SYSTEM_ID,
    tier: WC_NATION_TIER,
  };
}

/** Every selectable nation, sorted alphabetically by German name. */
export const WC_COUNTRIES: Club[] = RAW.map(toClub).sort((a, b) =>
  a.name.localeCompare(b.name, "de"),
);

const WC_COUNTRY_BY_ID = new Map(WC_COUNTRIES.map((c) => [c.id, c]));

export function getCountryById(id: string): Club | undefined {
  return WC_COUNTRY_BY_ID.get(id);
}
