/**
 * 🇬🇧 English football clubs (Premier League + 4-tier pool for FA Cup).
 *
 * Club ids are prefixed with "club_en_" to avoid colliding with German ids.
 * Pool clubs carry a `tier` ("championship", "league-one", "league-two",
 * "non-league") so the FA Cup engine knows when each group enters and the
 * SeasonManager can group them when picking promotions.
 *
 * Logo URLs come from Wikipedia / Wikimedia Commons. A few smaller clubs
 * have no URL — the app falls back to a circle with the short name on the
 * club's primary color, which still looks fine.
 */

import type { Club } from "@/lib/db";

const SYSTEM_EN = "en";
const TIER_CHAMPIONSHIP = "championship";
const TIER_LEAGUE_ONE = "league-one";
const TIER_LEAGUE_TWO = "league-two";
const TIER_NON_LEAGUE = "non-league";

function tag<T extends Club>(clubs: T[], systemId: string, tier?: string): T[] {
  return clubs.map((c) => ({ ...c, systemId, ...(tier ? { tier } : {}) }));
}

// Premier League 2025/26 — 20 clubs
const CLUBS_PREMIER_LEAGUE_RAW: Club[] = [
  { id: "club_en_liv", name: "Liverpool FC", shortName: "LIV", slug: "liverpool", primaryColor: "#C8102E", secondaryColor: "#F6EB61", logoUrl: "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg" },
  { id: "club_en_ars", name: "Arsenal FC", shortName: "ARS", slug: "arsenal", primaryColor: "#EF0107", secondaryColor: "#023474", logoUrl: "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg" },
  { id: "club_en_mci", name: "Manchester City", shortName: "MCI", slug: "manchester-city", primaryColor: "#6CABDD", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg" },
  { id: "club_en_che", name: "Chelsea FC", shortName: "CHE", slug: "chelsea", primaryColor: "#034694", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg" },
  { id: "club_en_new", name: "Newcastle United", shortName: "NEW", slug: "newcastle-united", primaryColor: "#241F20", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg" },
  { id: "club_en_avl", name: "Aston Villa", shortName: "AVL", slug: "aston-villa", primaryColor: "#670E36", secondaryColor: "#95BFE5", logoUrl: "https://upload.wikimedia.org/wikipedia/en/9/9a/Aston_Villa_FC_new_crest.svg" },
  { id: "club_en_nfo", name: "Nottingham Forest", shortName: "NFO", slug: "nottingham-forest", primaryColor: "#DD0000", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg" },
  { id: "club_en_bha", name: "Brighton & Hove Albion", shortName: "BHA", slug: "brighton", primaryColor: "#0057B8", secondaryColor: "#FFCD00", logoUrl: "https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg" },
  { id: "club_en_bou", name: "AFC Bournemouth", shortName: "BOU", slug: "bournemouth", primaryColor: "#DA291C", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/en/e/e5/AFC_Bournemouth_%282013%29.svg" },
  { id: "club_en_bre", name: "Brentford FC", shortName: "BRE", slug: "brentford", primaryColor: "#E30613", secondaryColor: "#FBB80A", logoUrl: "https://upload.wikimedia.org/wikipedia/en/2/2a/Brentford_FC_crest.svg" },
  { id: "club_en_ful", name: "Fulham FC", shortName: "FUL", slug: "fulham", primaryColor: "#000000", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/e/eb/Fulham_FC_%28shield%29.svg" },
  { id: "club_en_cry", name: "Crystal Palace", shortName: "CRY", slug: "crystal-palace", primaryColor: "#1B458F", secondaryColor: "#C4122E", logoUrl: "https://upload.wikimedia.org/wikipedia/en/a/a2/Crystal_Palace_FC_logo_%282022%29.svg" },
  { id: "club_en_mun", name: "Manchester United", shortName: "MUN", slug: "manchester-united", primaryColor: "#DA291C", secondaryColor: "#FBE122", logoUrl: "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg" },
  { id: "club_en_tot", name: "Tottenham Hotspur", shortName: "TOT", slug: "tottenham", primaryColor: "#132257", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg" },
  { id: "club_en_whu", name: "West Ham United", shortName: "WHU", slug: "west-ham", primaryColor: "#7A263A", secondaryColor: "#1BB1E7", logoUrl: "https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg" },
  { id: "club_en_eve", name: "Everton FC", shortName: "EVE", slug: "everton", primaryColor: "#003399", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/7/7c/Everton_FC_logo.svg" },
  { id: "club_en_wol", name: "Wolverhampton Wanderers", shortName: "WOL", slug: "wolves", primaryColor: "#FDB913", secondaryColor: "#231F20", logoUrl: "https://upload.wikimedia.org/wikipedia/en/f/fc/Wolverhampton_Wanderers.svg" },
  { id: "club_en_sun", name: "Sunderland AFC", shortName: "SUN", slug: "sunderland", primaryColor: "#EB172B", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/7/77/Logo_Sunderland.svg" },
  { id: "club_en_lee", name: "Leeds United", shortName: "LEE", slug: "leeds-united", primaryColor: "#FFCD00", secondaryColor: "#1D428A", logoUrl: "https://upload.wikimedia.org/wikipedia/en/5/54/Leeds_United_F.C._logo.svg" },
  { id: "club_en_bur", name: "Burnley FC", shortName: "BUR", slug: "burnley", primaryColor: "#6C1D45", secondaryColor: "#99D6EA", logoUrl: "https://upload.wikimedia.org/wikipedia/en/6/6d/Burnley_FC_Logo.svg" },
];

// Championship — 24 clubs (FA Cup R3 entrants alongside Premier League)
const CLUBS_CHAMPIONSHIP_RAW: Club[] = [
  { id: "club_en_lei", name: "Leicester City", shortName: "LEI", slug: "leicester-city", primaryColor: "#003090", secondaryColor: "#FDBE11", logoUrl: "https://upload.wikimedia.org/wikipedia/en/2/2d/Leicester_City_crest.svg" },
  { id: "club_en_ips", name: "Ipswich Town", shortName: "IPS", slug: "ipswich-town", primaryColor: "#3764A3", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/4/43/Ipswich_Town.svg" },
  { id: "club_en_sou", name: "Southampton FC", shortName: "SOU", slug: "southampton", primaryColor: "#D71920", secondaryColor: "#130C0E", logoUrl: "https://upload.wikimedia.org/wikipedia/en/c/c9/FC_Southampton.svg" },
  { id: "club_en_shu", name: "Sheffield United", shortName: "SHU", slug: "sheffield-united", primaryColor: "#EE2737", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/en/9/9c/Sheffield_United_FC_logo.svg" },
  { id: "club_en_shw", name: "Sheffield Wednesday", shortName: "SHW", slug: "sheffield-wednesday", primaryColor: "#0E4C92", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/8/88/Sheffield_Wednesday_badge.svg" },
  { id: "club_en_nor", name: "Norwich City", shortName: "NOR", slug: "norwich-city", primaryColor: "#FFF200", secondaryColor: "#00A650", logoUrl: "https://upload.wikimedia.org/wikipedia/en/1/17/Norwich_City_FC_logo.svg" },
  { id: "club_en_wba", name: "West Bromwich Albion", shortName: "WBA", slug: "west-brom", primaryColor: "#122F67", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/8/8b/West_Bromwich_Albion.svg" },
  { id: "club_en_bri", name: "Bristol City", shortName: "BRC", slug: "bristol-city", primaryColor: "#E21C38", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/en/f/f5/Bristol_City_crest.svg" },
  { id: "club_en_cov", name: "Coventry City", shortName: "COV", slug: "coventry-city", primaryColor: "#5BBFEC", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/7/7b/Coventry_City_FC_crest.svg" },
  { id: "club_en_hul", name: "Hull City", shortName: "HUL", slug: "hull-city", primaryColor: "#F18A01", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/en/5/54/Hull_City_A.F.C._logo.svg" },
  { id: "club_en_mid", name: "Middlesbrough FC", shortName: "MID", slug: "middlesbrough", primaryColor: "#E21C38", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/2/2c/Middlesbrough_FC_crest.svg" },
  { id: "club_en_sto", name: "Stoke City", shortName: "STK", slug: "stoke-city", primaryColor: "#E03A3E", secondaryColor: "#1B449C", logoUrl: "https://upload.wikimedia.org/wikipedia/en/2/29/Stoke_City_FC.svg" },
  { id: "club_en_wat", name: "Watford FC", shortName: "WAT", slug: "watford", primaryColor: "#FBEE23", secondaryColor: "#ED2127", logoUrl: "https://upload.wikimedia.org/wikipedia/en/e/e2/Watford.svg" },
  { id: "club_en_bir", name: "Birmingham City", shortName: "BIR", slug: "birmingham-city", primaryColor: "#0000AA", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/6/68/Birmingham_City_FC_logo.svg" },
  { id: "club_en_wre", name: "Wrexham AFC", shortName: "WRE", slug: "wrexham", primaryColor: "#E10000", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/0/0d/Wrexham_A.F.C._Logo.svg" },
  { id: "club_en_cha", name: "Charlton Athletic", shortName: "CHA", slug: "charlton-athletic", primaryColor: "#E31B23", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/f/f5/Charlton_Athletic_FC_crest.svg" },
  { id: "club_en_der", name: "Derby County", shortName: "DER", slug: "derby-county", primaryColor: "#FFFFFF", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/en/4/4a/Derby_County_crest.svg" },
  { id: "club_en_pne", name: "Preston North End", shortName: "PNE", slug: "preston", primaryColor: "#003B73", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/8/82/Preston_North_End_FC.svg" },
  { id: "club_en_qpr", name: "Queens Park Rangers", shortName: "QPR", slug: "qpr", primaryColor: "#1D5BA4", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/3/31/Queens_Park_Rangers_crest.svg" },
  { id: "club_en_mil", name: "Millwall FC", shortName: "MIL", slug: "millwall", primaryColor: "#003B71", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/9/98/Millwall_FC_crest.svg" },
  { id: "club_en_swa", name: "Swansea City", shortName: "SWA", slug: "swansea-city", primaryColor: "#000000", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/f/f9/Swansea_City_AFC_logo.svg" },
  { id: "club_en_blb", name: "Blackburn Rovers", shortName: "BLB", slug: "blackburn", primaryColor: "#009EE0", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/0/0f/Blackburn_Rovers.svg" },
  { id: "club_en_oxf", name: "Oxford United", shortName: "OXF", slug: "oxford-united", primaryColor: "#FFCC33", secondaryColor: "#0033A0", logoUrl: "https://upload.wikimedia.org/wikipedia/en/3/3e/Oxford_United_FC_logo.svg" },
  { id: "club_en_por", name: "Portsmouth FC", shortName: "POR", slug: "portsmouth", primaryColor: "#001489", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/3/38/Portsmouth_FC_logo.svg" },
];

// League One — 24 clubs (FA Cup R1 entrants together with League Two)
const CLUBS_LEAGUE_ONE_RAW: Club[] = [
  { id: "club_en_rea", name: "Reading FC", shortName: "REA", slug: "reading", primaryColor: "#004494", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/1/11/Reading_FC.svg" },
  { id: "club_en_bol", name: "Bolton Wanderers", shortName: "BOL", slug: "bolton", primaryColor: "#1A4DA1", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/8/82/Bolton_Wanderers_FC_logo.svg" },
  { id: "club_en_wyc", name: "Wycombe Wanderers", shortName: "WYC", slug: "wycombe", primaryColor: "#0E1A40", secondaryColor: "#76C5F0", logoUrl: "https://upload.wikimedia.org/wikipedia/en/f/fb/Wycombe_Wanderers_FC_logo.svg" },
  { id: "club_en_stp2", name: "Stockport County", shortName: "STC", slug: "stockport", primaryColor: "#1F4FA0", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/9/93/Stockport_County_FC_logo.svg" },
  { id: "club_en_lin", name: "Lincoln City", shortName: "LIN", slug: "lincoln-city", primaryColor: "#E2231A", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/3/3a/Lincoln_City_FC_logo.svg" },
  { id: "club_en_hud", name: "Huddersfield Town", shortName: "HUD", slug: "huddersfield", primaryColor: "#0E63AD", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/5/5a/Huddersfield_Town_A.F.C._logo.svg" },
  { id: "club_en_ply", name: "Plymouth Argyle", shortName: "PLY", slug: "plymouth-argyle", primaryColor: "#0A4538", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/a/a8/Plymouth_Argyle_F.C._logo.svg" },
  { id: "club_en_lut", name: "Luton Town", shortName: "LUT", slug: "luton-town", primaryColor: "#F78F1E", secondaryColor: "#0033A0", logoUrl: "https://upload.wikimedia.org/wikipedia/en/9/9d/Luton_Town_logo.svg" },
  { id: "club_en_car", name: "Cardiff City", shortName: "CAR", slug: "cardiff-city", primaryColor: "#0070B5", secondaryColor: "#D11241", logoUrl: "https://upload.wikimedia.org/wikipedia/en/3/3c/Cardiff_City_crest.svg" },
  { id: "club_en_bla", name: "Blackpool FC", shortName: "BLA", slug: "blackpool", primaryColor: "#F58220", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/d/df/Blackpool_FC_logo.svg" },
  { id: "club_en_bar", name: "Barnsley FC", shortName: "BAR", slug: "barnsley", primaryColor: "#E2231A", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/c/c9/Barnsley_FC.svg" },
  { id: "club_en_btn", name: "Burton Albion", shortName: "BTN", slug: "burton-albion", primaryColor: "#FFFF00", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/en/7/7e/Burton_Albion_FC_logo.svg" },
  { id: "club_en_man2", name: "Mansfield Town", shortName: "MAN", slug: "mansfield-town", primaryColor: "#FFCC00", secondaryColor: "#0066B3", logoUrl: "https://upload.wikimedia.org/wikipedia/en/1/14/Mansfield_Town_FC_logo.svg" },
  { id: "club_en_nor2", name: "Northampton Town", shortName: "NTH", slug: "northampton-town", primaryColor: "#852C2A", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/d/d2/Northampton_Town_FC.svg" },
  { id: "club_en_rot", name: "Rotherham United", shortName: "ROT", slug: "rotherham", primaryColor: "#DD0000", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/c/c0/Rotherham_United_FC.svg" },
  { id: "club_en_ste", name: "Stevenage FC", shortName: "STV", slug: "stevenage", primaryColor: "#E2231A", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/4/49/Stevenage_FC_logo.svg" },
  { id: "club_en_wig", name: "Wigan Athletic", shortName: "WIG", slug: "wigan", primaryColor: "#1D549F", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/4/43/Wigan_Athletic.svg" },
  { id: "club_en_brd", name: "Bradford City", shortName: "BRD", slug: "bradford-city", primaryColor: "#900020", secondaryColor: "#FFCC00", logoUrl: "https://upload.wikimedia.org/wikipedia/en/9/97/Bradford_City_AFC.svg" },
  { id: "club_en_don", name: "Doncaster Rovers", shortName: "DON", slug: "doncaster", primaryColor: "#E2231A", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/0/0a/Doncaster_Rovers_FC_logo.svg" },
  { id: "club_en_lor", name: "Leyton Orient", shortName: "LOR", slug: "leyton-orient", primaryColor: "#E2231A", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/6/64/Leyton_Orient_F.C._logo.svg" },
  { id: "club_en_cra", name: "Crawley Town", shortName: "CRA", slug: "crawley-town", primaryColor: "#E2231A", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/5/5c/Crawley_Town_FC_logo.svg" },
  { id: "club_en_pet", name: "Peterborough United", shortName: "PET", slug: "peterborough", primaryColor: "#0033A0", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/d/d4/Peterborough_United_FC_logo.svg" },
  { id: "club_en_exe", name: "Exeter City", shortName: "EXE", slug: "exeter-city", primaryColor: "#E2231A", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/d/d9/Exeter_City_FC.svg" },
  { id: "club_en_pva", name: "Port Vale", shortName: "PVA", slug: "port-vale", primaryColor: "#FFFFFF", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/en/5/56/Port_Vale_logo.svg" },
];

// League Two — 24 clubs (FA Cup R1 entrants)
const CLUBS_LEAGUE_TWO_RAW: Club[] = [
  { id: "club_en_wal", name: "Walsall FC", shortName: "WAL", slug: "walsall", primaryColor: "#E2231A", secondaryColor: "#FFFFFF" },
  { id: "club_en_brm", name: "Bromley FC", shortName: "BRM", slug: "bromley", primaryColor: "#FFFFFF", secondaryColor: "#000000" },
  { id: "club_en_gil", name: "Gillingham FC", shortName: "GIL", slug: "gillingham", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_cre", name: "Crewe Alexandra", shortName: "CRE", slug: "crewe", primaryColor: "#E2231A", secondaryColor: "#FFFFFF" },
  { id: "club_en_not", name: "Notts County", shortName: "NOT", slug: "notts-county", primaryColor: "#000000", secondaryColor: "#FFFFFF" },
  { id: "club_en_sal", name: "Salford City", shortName: "SAL", slug: "salford", primaryColor: "#E2231A", secondaryColor: "#000000" },
  { id: "club_en_npc", name: "Newport County", shortName: "NPC", slug: "newport-county", primaryColor: "#FFB700", secondaryColor: "#000000" },
  { id: "club_en_acc", name: "Accrington Stanley", shortName: "ACC", slug: "accrington", primaryColor: "#E2231A", secondaryColor: "#FFFFFF" },
  { id: "club_en_tra", name: "Tranmere Rovers", shortName: "TRA", slug: "tranmere", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_wim", name: "AFC Wimbledon", shortName: "WIM", slug: "afc-wimbledon", primaryColor: "#003090", secondaryColor: "#FFFF00" },
  { id: "club_en_har", name: "Harrogate Town", shortName: "HAR", slug: "harrogate", primaryColor: "#FFD700", secondaryColor: "#000000" },
  { id: "club_en_che2", name: "Cheltenham Town", shortName: "CHL", slug: "cheltenham", primaryColor: "#E2231A", secondaryColor: "#FFFFFF" },
  { id: "club_en_cau", name: "Carlisle United", shortName: "CAU", slug: "carlisle", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_col", name: "Colchester United", shortName: "COL", slug: "colchester", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_gri", name: "Grimsby Town", shortName: "GRI", slug: "grimsby", primaryColor: "#000000", secondaryColor: "#FFFFFF" },
  { id: "club_en_fle", name: "Fleetwood Town", shortName: "FLE", slug: "fleetwood", primaryColor: "#E2231A", secondaryColor: "#FFFFFF" },
  { id: "club_en_brv", name: "Bristol Rovers", shortName: "BRV", slug: "bristol-rovers", primaryColor: "#1D5BA4", secondaryColor: "#FFFFFF" },
  { id: "club_en_cam", name: "Cambridge United", shortName: "CAM", slug: "cambridge-united", primaryColor: "#FFB700", secondaryColor: "#000000" },
  { id: "club_en_shr", name: "Shrewsbury Town", shortName: "SHR", slug: "shrewsbury", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_cst", name: "Chesterfield FC", shortName: "CST", slug: "chesterfield", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_mkd", name: "MK Dons", shortName: "MKD", slug: "mk-dons", primaryColor: "#FFFFFF", secondaryColor: "#000000" },
  { id: "club_en_swi", name: "Swindon Town", shortName: "SWI", slug: "swindon", primaryColor: "#E2231A", secondaryColor: "#FFFFFF" },
  { id: "club_en_brw", name: "Barrow AFC", shortName: "BRW", slug: "barrow", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_old", name: "Oldham Athletic", shortName: "OLD", slug: "oldham", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
];

// Non-League — 32 clubs (stand-ins for FA Cup Q4 winners that enter R1)
const CLUBS_NON_LEAGUE_RAW: Club[] = [
  { id: "club_en_yor", name: "York City", shortName: "YOR", slug: "york-city", primaryColor: "#E2231A", secondaryColor: "#003090" },
  { id: "club_en_bow", name: "Boreham Wood", shortName: "BOW", slug: "boreham-wood", primaryColor: "#000000", secondaryColor: "#FFFFFF" },
  { id: "club_en_brn", name: "Barnet FC", shortName: "BRN", slug: "barnet", primaryColor: "#FFB700", secondaryColor: "#000000" },
  { id: "club_en_wea", name: "Wealdstone FC", shortName: "WEA", slug: "wealdstone", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_mai", name: "Maidenhead United", shortName: "MAI", slug: "maidenhead", primaryColor: "#000000", secondaryColor: "#FFFFFF" },
  { id: "club_en_ald", name: "Aldershot Town", shortName: "ALD", slug: "aldershot", primaryColor: "#E2231A", secondaryColor: "#003090" },
  { id: "club_en_eas", name: "Eastleigh FC", shortName: "EAS", slug: "eastleigh", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_sol", name: "Solihull Moors", shortName: "SOL", slug: "solihull", primaryColor: "#FFB700", secondaryColor: "#000000" },
  { id: "club_en_hfx", name: "FC Halifax Town", shortName: "HFX", slug: "halifax", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_fgr", name: "Forest Green Rovers", shortName: "FGR", slug: "forest-green", primaryColor: "#0E5023", secondaryColor: "#FFFFFF" },
  { id: "club_en_yeo", name: "Yeovil Town", shortName: "YEO", slug: "yeovil", primaryColor: "#006633", secondaryColor: "#FFFFFF" },
  { id: "club_en_har2", name: "Hartlepool United", shortName: "HRP", slug: "hartlepool", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_sut", name: "Sutton United", shortName: "SUT", slug: "sutton-united", primaryColor: "#FFB700", secondaryColor: "#000000" },
  { id: "club_en_mor", name: "Morecambe FC", shortName: "MOR", slug: "morecambe", primaryColor: "#E2231A", secondaryColor: "#FFFFFF" },
  { id: "club_en_dag", name: "Dagenham & Redbridge", shortName: "DAG", slug: "dagenham", primaryColor: "#003090", secondaryColor: "#E2231A" },
  { id: "club_en_alt", name: "Altrincham FC", shortName: "ALT", slug: "altrincham", primaryColor: "#000000", secondaryColor: "#E2231A" },
  { id: "club_en_wok", name: "Woking FC", shortName: "WOK", slug: "woking", primaryColor: "#E2231A", secondaryColor: "#FFFFFF" },
  { id: "club_en_tam", name: "Tamworth FC", shortName: "TAM", slug: "tamworth", primaryColor: "#E2231A", secondaryColor: "#FFFFFF" },
  { id: "club_en_sho", name: "Southend United", shortName: "SHO", slug: "southend", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_roc", name: "Rochdale AFC", shortName: "ROC", slug: "rochdale", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_mst", name: "Maidstone United", shortName: "MST", slug: "maidstone", primaryColor: "#FFB700", secondaryColor: "#000000" },
  { id: "club_en_ebb", name: "Ebbsfleet United", shortName: "EBB", slug: "ebbsfleet", primaryColor: "#E2231A", secondaryColor: "#FFFFFF" },
  { id: "club_en_brt", name: "Braintree Town", shortName: "BRT", slug: "braintree", primaryColor: "#FFB700", secondaryColor: "#003090" },
  { id: "club_en_tru", name: "Truro City", shortName: "TRU", slug: "truro", primaryColor: "#000000", secondaryColor: "#FFFFFF" },
  { id: "club_en_brc2", name: "Brackley Town", shortName: "BRC2", slug: "brackley", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_oxc", name: "Oxford City", shortName: "OXC", slug: "oxford-city", primaryColor: "#003090", secondaryColor: "#FFB700" },
  { id: "club_en_ave", name: "Aveley FC", shortName: "AVE", slug: "aveley", primaryColor: "#FFFFFF", secondaryColor: "#003090" },
  { id: "club_en_bos", name: "Boston United", shortName: "BOS", slug: "boston-united", primaryColor: "#FFB700", secondaryColor: "#003090" },
  { id: "club_en_afy", name: "AFC Fylde", shortName: "AFY", slug: "afc-fylde", primaryColor: "#FFB700", secondaryColor: "#000000" },
  { id: "club_en_kid", name: "Kidderminster Harriers", shortName: "KID", slug: "kidderminster", primaryColor: "#E2231A", secondaryColor: "#FFFFFF" },
  { id: "club_en_scu", name: "Scunthorpe United", shortName: "SCU", slug: "scunthorpe", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
  { id: "club_en_mcc", name: "Macclesfield FC", shortName: "MCC", slug: "macclesfield", primaryColor: "#003090", secondaryColor: "#FFFFFF" },
];

// Public exports — tagged with system + tier
export const CLUBS_PREMIER_LEAGUE: Club[] = tag(CLUBS_PREMIER_LEAGUE_RAW, SYSTEM_EN);
export const CLUBS_CHAMPIONSHIP: Club[] = tag(CLUBS_CHAMPIONSHIP_RAW, SYSTEM_EN, TIER_CHAMPIONSHIP);
export const CLUBS_LEAGUE_ONE: Club[] = tag(CLUBS_LEAGUE_ONE_RAW, SYSTEM_EN, TIER_LEAGUE_ONE);
export const CLUBS_LEAGUE_TWO: Club[] = tag(CLUBS_LEAGUE_TWO_RAW, SYSTEM_EN, TIER_LEAGUE_TWO);
export const CLUBS_NON_LEAGUE: Club[] = tag(CLUBS_NON_LEAGUE_RAW, SYSTEM_EN, TIER_NON_LEAGUE);

export const CLUBS_EN_ALL: Club[] = [
  ...CLUBS_PREMIER_LEAGUE,
  ...CLUBS_CHAMPIONSHIP,
  ...CLUBS_LEAGUE_ONE,
  ...CLUBS_LEAGUE_TWO,
  ...CLUBS_NON_LEAGUE,
];
