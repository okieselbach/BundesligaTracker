import type { Club } from "@/lib/db";

// Increment this when club data changes (logos, names, new clubs, colors).
// The app auto-migrates the son's IndexedDB on next startup.
export const CLUBS_CONFIG_VERSION = 3;

// 1. Bundesliga 2025/26
export const CLUBS_1BL: Club[] = [
  { id: "club_fcb", name: "FC Bayern München", shortName: "FCB", slug: "fc-bayern-muenchen", primaryColor: "#DC052D", secondaryColor: "#0066B2", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg" },
  { id: "club_b04", name: "Bayer 04 Leverkusen", shortName: "B04", slug: "bayer-04-leverkusen", primaryColor: "#E32221", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg" },
  { id: "club_vfb", name: "VfB Stuttgart", shortName: "VfB", slug: "vfb-stuttgart", primaryColor: "#E32219", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/eb/VfB_Stuttgart_1893_Logo.svg" },
  { id: "club_bvb", name: "Borussia Dortmund", shortName: "BVB", slug: "borussia-dortmund", primaryColor: "#FDE100", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg" },
  { id: "club_rbl", name: "RB Leipzig", shortName: "RBL", slug: "rb-leipzig", primaryColor: "#DD0741", secondaryColor: "#001F47", logoUrl: "https://upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2014_logo.svg" },
  { id: "club_sge", name: "Eintracht Frankfurt", shortName: "SGE", slug: "eintracht-frankfurt", primaryColor: "#E1000F", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/en/7/7e/Eintracht_Frankfurt_crest.svg" },
  { id: "club_scf", name: "SC Freiburg", shortName: "SCF", slug: "sport-club-freiburg", primaryColor: "#E3000B", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/de/b/bf/SC_Freiburg_Logo.svg" },
  { id: "club_tsg", name: "TSG 1899 Hoffenheim", shortName: "TSG", slug: "tsg-hoffenheim", primaryColor: "#1961B5", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Logo_TSG_Hoffenheim.svg" },
  { id: "club_m05", name: "1. FSV Mainz 05", shortName: "M05", slug: "1-fsv-mainz-05", primaryColor: "#ED1C24", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Logo_Mainz_05.svg" },
  { id: "club_svw", name: "SV Werder Bremen", shortName: "SVW", slug: "sv-werder-bremen", primaryColor: "#1D9053", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/be/SV-Werder-Bremen-Logo.svg" },
  { id: "club_wob", name: "VfL Wolfsburg", shortName: "WOB", slug: "vfl-wolfsburg", primaryColor: "#65B32E", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/ce/VfL_Wolfsburg_Logo.svg" },
  { id: "club_fca", name: "FC Augsburg", shortName: "FCA", slug: "fc-augsburg", primaryColor: "#BA3733", secondaryColor: "#006A3A", logoUrl: "https://upload.wikimedia.org/wikipedia/en/c/c5/FC_Augsburg_logo.svg" },
  { id: "club_bmg", name: "Borussia Mönchengladbach", shortName: "BMG", slug: "borussia-moenchengladbach", primaryColor: "#000000", secondaryColor: "#1DB954", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/81/Borussia_M%C3%B6nchengladbach_logo.svg" },
  { id: "club_fcu", name: "1. FC Union Berlin", shortName: "FCU", slug: "1-fc-union-berlin", primaryColor: "#EB1923", secondaryColor: "#FDE100", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/44/1._FC_Union_Berlin_Logo.svg" },
  { id: "club_stp", name: "FC St. Pauli", shortName: "STP", slug: "fc-st-pauli", primaryColor: "#6F4E37", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Fc_st_pauli_logo.svg" },
  { id: "club_hei", name: "1. FC Heidenheim", shortName: "FCH", slug: "1-fc-heidenheim-1846", primaryColor: "#E30613", secondaryColor: "#004B87", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9d/1._FC_Heidenheim_1846.svg" },
  { id: "club_hsv", name: "Hamburger SV", shortName: "HSV", slug: "hamburger-sv", primaryColor: "#005B9A", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f7/Hamburger_SV_logo.svg" },
  { id: "club_koe", name: "1. FC Köln", shortName: "KOE", slug: "1-fc-koeln", primaryColor: "#ED1C24", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/01/1._FC_Koeln_Logo_2014%E2%80%93.svg" },
];

// 2. Bundesliga 2025/26
export const CLUBS_2BL: Club[] = [
  { id: "club_s04", name: "FC Schalke 04", shortName: "S04", slug: "fc-schalke-04", primaryColor: "#004D9D", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6d/FC_Schalke_04_Logo.svg" },
  { id: "club_d98", name: "SV Darmstadt 98", shortName: "D98", slug: "sv-darmstadt-98", primaryColor: "#004E9E", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/9/92/SV_Darmstadt_98_logo.svg" },
  { id: "club_els", name: "SV Elversberg", shortName: "SVE", slug: "sv-elversberg", primaryColor: "#009639", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d4/SV_Elversberg_Logo_2021.svg" },
  { id: "club_h96", name: "Hannover 96", shortName: "H96", slug: "hannover-96", primaryColor: "#009842", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/cd/Hannover_96_Logo.svg" },
  { id: "club_p07", name: "SC Paderborn 07", shortName: "SCP", slug: "sc-paderborn-07", primaryColor: "#005CA9", secondaryColor: "#FFD700", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e3/SC_Paderborn_07_Logo.svg" },
  { id: "club_bsc", name: "Hertha BSC", shortName: "BSC", slug: "hertha-bsc", primaryColor: "#005DAA", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/81/Hertha_BSC_Logo_2012.svg" },
  { id: "club_kai", name: "1. FC Kaiserslautern", shortName: "FCK", slug: "1-fc-kaiserslautern", primaryColor: "#E4002B", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d3/Logo_1_FC_Kaiserslautern.svg" },
  { id: "club_n08", name: "1. FC Nürnberg", shortName: "FCN", slug: "1-fc-nuernberg", primaryColor: "#8B0000", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fa/1._FC_N%C3%BCrnberg_logo.svg" },
  { id: "club_boc", name: "VfL Bochum", shortName: "BOC", slug: "vfl-bochum-1848", primaryColor: "#005BA1", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/72/VfL_Bochum_logo.svg" },
  { id: "club_bie", name: "Arminia Bielefeld", shortName: "DSC", slug: "dsc-arminia-bielefeld", primaryColor: "#004B87", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Arminia_Bielefeld_Logo_2021%E2%80%93.svg" },
  { id: "club_ksc", name: "Karlsruher SC", shortName: "KSC", slug: "karlsruher-sc", primaryColor: "#003DA5", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Karlsruher_SC_Logo_2.svg" },
  { id: "club_f95", name: "Fortuna Düsseldorf", shortName: "F95", slug: "fortuna-duesseldorf", primaryColor: "#E4002B", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/94/Fortuna_D%C3%BCsseldorf.svg" },
  { id: "club_bra", name: "Eintracht Braunschweig", shortName: "EBS", slug: "eintracht-braunschweig", primaryColor: "#FFD700", secondaryColor: "#0000FF", logoUrl: "https://upload.wikimedia.org/wikipedia/en/6/60/Eintracht_Braunschweig_logo.svg" },
  { id: "club_hsk", name: "Holstein Kiel", shortName: "KSV", slug: "holstein-kiel", primaryColor: "#003DA5", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/30/Holstein_Kiel_Logo.svg" },
  { id: "club_pce", name: "Preußen Münster", shortName: "SCM", slug: "sc-preussen-muenster", primaryColor: "#006A3A", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/de/7/7e/SC_Preussen_Muenster_Logo_2018.svg" },
  { id: "club_fcm", name: "1. FC Magdeburg", shortName: "FCM", slug: "1-fc-magdeburg", primaryColor: "#0066B3", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/84/1._FC_Magdeburg.svg" },
  { id: "club_sgd", name: "SG Dynamo Dresden", shortName: "SGD", slug: "sg-dynamo-dresden", primaryColor: "#FFCC00", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e1/Logo_SG_Dynamo_Dresden_neu.svg" },
  { id: "club_gre", name: "SpVgg Greuther Fürth", shortName: "SGF", slug: "spvgg-greuther-fuerth", primaryColor: "#006B3F", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b1/SpVgg_Greuther_F%C3%BCrth_2017.svg" },
];

// 3. Liga 2025/26
export const CLUBS_3BL: Club[] = [
  { id: "club_cfc", name: "Energie Cottbus", shortName: "FCE", slug: "energie-cottbus", primaryColor: "#E30613", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/55/Logo_Energie_Cottbus.svg" },
  { id: "club_verl", name: "SC Verl", shortName: "SCV", slug: "sc-verl", primaryColor: "#004B87", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/ce/SC_Verl_Logo.svg" },
  { id: "club_msv", name: "MSV Duisburg", shortName: "MSV", slug: "msv-duisburg", primaryColor: "#002D72", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/02/Msv_duisburg_(2017).svg" },
  { id: "club_osn", name: "VfL Osnabrück", shortName: "VOS", slug: "vfl-osnabrueck", primaryColor: "#662483", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4e/VfL_Osnabrueck_Logo_2021%E2%80%93.svg" },
  { id: "club_rot", name: "Rot-Weiss Essen", shortName: "RWE", slug: "rot-weiss-essen", primaryColor: "#E30613", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Logo_of_Rot-Weiss_Essen.svg" },
  { id: "club_weh", name: "SV Wehen Wiesbaden", shortName: "WEH", slug: "wehen-wiesbaden", primaryColor: "#E4002B", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/de/3/3d/Logo_SV_Wehen_Wiesbaden.svg" },
  { id: "club_ros", name: "FC Hansa Rostock", shortName: "HRO", slug: "hansa-rostock", primaryColor: "#003DA5", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8f/F.C._Hansa_Rostock_Logo.svg" },
  { id: "club_ver", name: "TSV 1860 München", shortName: "M60", slug: "1860-muenchen", primaryColor: "#005B9A", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/48/TSV_1860_M%C3%BCnchen.svg" },
  { id: "club_man", name: "SV Waldhof Mannheim", shortName: "SVM", slug: "waldhof-mannheim", primaryColor: "#0066B3", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/17/Svwaldhof.svg" },
  { id: "club_ing", name: "FC Ingolstadt 04", shortName: "FCI", slug: "fc-ingolstadt", primaryColor: "#E4002B", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/de/5/55/FC-Ingolstadt_logo.svg" },
  { id: "club_tsg2", name: "TSG Hoffenheim II", shortName: "TS2", slug: "tsg-hoffenheim-ii", primaryColor: "#1961B5", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Logo_TSG_Hoffenheim.svg" },
  { id: "club_vkm", name: "Viktoria Köln", shortName: "VIK", slug: "viktoria-koeln", primaryColor: "#E4002B", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/dc/FC_Viktoria_K%C3%B6ln_1904_Logo.svg" },
  { id: "club_vms", name: "VfB Stuttgart II", shortName: "VS2", slug: "vfb-stuttgart-ii", primaryColor: "#E32219", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/eb/VfB_Stuttgart_1893_Logo.svg" },
  { id: "club_aav", name: "Alemannia Aachen", shortName: "AAC", slug: "alemannia-aachen", primaryColor: "#FFD700", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/94/Alemannia_Aachen_2010.svg" },
  { id: "club_ssv", name: "SSV Jahn Regensburg", shortName: "SSV", slug: "jahn-regensburg", primaryColor: "#E30613", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5a/SSV_Jahn_Regensburg.svg" },
  { id: "club_saa", name: "1. FC Saarbrücken", shortName: "FCS", slug: "fc-saarbruecken", primaryColor: "#0066B3", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/de/f/ff/1._FC_Saarbr%C3%BCcken.svg" },
  { id: "club_aue", name: "FC Erzgebirge Aue", shortName: "AUE", slug: "erzgebirge-aue", primaryColor: "#662483", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/de/1/13/Fc_erzgebirge_aue.svg" },
  { id: "club_ulm", name: "SSV Ulm 1846", shortName: "ULM", slug: "ssv-ulm", primaryColor: "#000000", secondaryColor: "#FFD700", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6c/SSV_Ulm_1846_Fussball.svg" },
  { id: "club_hav", name: "TSV Havelse", shortName: "HAV", slug: "tsv-havelse", primaryColor: "#003DA5", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/89/TSV_Havelse_logo.svg" },
  { id: "club_swf", name: "1. FC Schweinfurt 05", shortName: "SWF", slug: "schweinfurt-05", primaryColor: "#006B3F", secondaryColor: "#FFD700", logoUrl: "https://upload.wikimedia.org/wikipedia/en/8/86/1._FC_Schweinfurt_05_logo.svg" },
];

// Regionalliga-Pool (4. Liga) - Bekannte Vereine fuer DFB-Pokal und 3.Liga Auf-/Abstieg
export const CLUBS_REGIONALLIGA: Club[] = [
  { id: "club_lok", name: "1. FC Lokomotive Leipzig", shortName: "LOK", slug: "lok-leipzig", primaryColor: "#0066B3", secondaryColor: "#FFD700", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/04/1._FC_Lokomotive_Leipzig_logo.svg" },
  { id: "club_hfc", name: "Hallescher FC", shortName: "HFC", slug: "hallescher-fc", primaryColor: "#E30613", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/21/Hallescher_FC_Logo.svg" },
  { id: "club_bfc", name: "BFC Dynamo", shortName: "BFC", slug: "bfc-dynamo", primaryColor: "#8B0000", secondaryColor: "#FFD700", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/50/BFC_Dynamo_logo.svg" },
  { id: "club_hom", name: "FC 08 Homburg", shortName: "HOM", slug: "fc-homburg", primaryColor: "#006B3F", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/11/FC_08_Homburg_Logo.svg" },
  { id: "club_lot", name: "Sportfreunde Lotte", shortName: "SFL", slug: "sf-lotte", primaryColor: "#003DA5", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/35/Sportfreunde_Lotte_Logo.svg" },
  { id: "club_bah", name: "Bahlinger SC", shortName: "BAH", slug: "bahlinger-sc", primaryColor: "#E30613", secondaryColor: "#000000", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/49/Bahlinger_SC.svg" },
  { id: "club_nor", name: "FC Eintracht Norderstedt", shortName: "NOR", slug: "eintracht-norderstedt", primaryColor: "#003DA5", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/47/Eintracht_Norderstedt_Logo.svg" },
  { id: "club_meu", name: "ZFC Meuselwitz", shortName: "ZFC", slug: "zfc-meuselwitz", primaryColor: "#E30613", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7a/ZFC_Meuselwitz_Logo.svg" },
  // Weitere bekannte Regionalliga-Vereine
  { id: "club_rwo", name: "Rot-Weiß Oberhausen", shortName: "RWO", slug: "rot-weiss-oberhausen", primaryColor: "#E30613", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/85/Rot-Wei%C3%9F_Oberhausen_Logo.svg" },
  { id: "club_wsv", name: "Wuppertaler SV", shortName: "WSV", slug: "wuppertaler-sv", primaryColor: "#E30613", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/53/Wuppertaler_SV_Logo.svg" },
  { id: "club_fck2", name: "Fortuna Köln", shortName: "FKO", slug: "fortuna-koeln", primaryColor: "#E30613", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9b/SC_Fortuna_K%C3%B6ln_Logo.svg" },
  { id: "club_mep", name: "SV Meppen", shortName: "MEP", slug: "sv-meppen", primaryColor: "#003DA5", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/55/SV_Meppen_Logo.svg" },
  { id: "club_aal", name: "VfR Aalen", shortName: "VFA", slug: "vfr-aalen", primaryColor: "#000000", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/af/VfR_Aalen_2016.svg" },
  { id: "club_uha", name: "SpVgg Unterhaching", shortName: "UHA", slug: "spvgg-unterhaching", primaryColor: "#E30613", secondaryColor: "#004B87", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c0/SpVgg_Unterhaching_Logo.svg" },
  { id: "club_bab", name: "SV Babelsberg 03", shortName: "BAB", slug: "sv-babelsberg", primaryColor: "#003DA5", secondaryColor: "#E30613", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d3/SV_Babelsberg_03_Logo.svg" },
  { id: "club_bak", name: "Berliner AK 07", shortName: "BAK", slug: "berliner-ak", primaryColor: "#8B0000", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/69/Berliner_AK_07_Logo.svg" },
  { id: "club_jena", name: "FC Carl Zeiss Jena", shortName: "CZJ", slug: "carl-zeiss-jena", primaryColor: "#003DA5", secondaryColor: "#FFD700", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b0/FC_Carl_Zeiss_Jena_Logo.svg" },
  { id: "club_chem", name: "Chemnitzer FC", shortName: "CFC", slug: "chemnitzer-fc", primaryColor: "#003DA5", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Chemnitzer_FC_Logo.svg" },
  { id: "club_roe", name: "SV Rödinghausen", shortName: "SVR", slug: "sv-roedinghausen", primaryColor: "#003DA5", secondaryColor: "#E30613", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a2/SV_R%C3%B6dinghausen_Logo.svg" },
  { id: "club_boch2", name: "1. FC Bocholt", shortName: "BOL", slug: "fc-bocholt", primaryColor: "#E30613", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7b/1._FC_Bocholt_Logo.svg" },
  { id: "club_bon", name: "Bonner SC", shortName: "BSC2", slug: "bonner-sc", primaryColor: "#003DA5", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/35/Bonner_SC_Logo.svg" },
  { id: "club_off", name: "Kickers Offenbach", shortName: "OFC", slug: "kickers-offenbach", primaryColor: "#E30613", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/49/Kickers_Offenbach_Logo.svg" },
  { id: "club_jed", name: "SSV Jeddeloh II", shortName: "JED", slug: "ssv-jeddeloh", primaryColor: "#006B3F", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/98/SSV_Jeddeloh_Logo.svg" },
  { id: "club_asch", name: "Viktoria Aschaffenburg", shortName: "VIA", slug: "viktoria-aschaffenburg", primaryColor: "#E30613", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d7/SVA01_Vereinswappen_(2015).svg" },
  { id: "club_wue", name: "Würzburger Kickers", shortName: "WKI", slug: "wuerzburger-kickers", primaryColor: "#E30613", secondaryColor: "#FFFFFF", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0c/W%C3%BCrzburger_Kickers_Logo.svg" },
];

// Backwards compatibility alias
export const CLUBS_POKAL_EXTRA = CLUBS_REGIONALLIGA;

export const ALL_CLUBS: Club[] = [...CLUBS_1BL, ...CLUBS_2BL, ...CLUBS_3BL, ...CLUBS_REGIONALLIGA];

export function getClubById(id: string): Club | undefined {
  return ALL_CLUBS.find((c) => c.id === id);
}

export function getBundesligaUrl(slug: string, competitionSlug?: string): string {
  if (competitionSlug === "2-bundesliga") {
    return `https://www.bundesliga.com/de/2bundesliga/clubs/${slug}`;
  }
  return `https://www.bundesliga.com/de/bundesliga/clubs/${slug}`;
}
