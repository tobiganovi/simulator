// Österreich-Simulator – Stammdaten
// Einwohnerzahlen: Statistik Austria, Stand 1.1.2025 (gerundet auf Einwohner).
// Ausgangsstimmung je Bundesland: angelehnt an die Nationalratswahl 2024.

const PARTIES = [
  { id: 'fpoe',   name: 'FPÖ',   long: 'Freiheitliche Partei Österreichs', color: 'var(--p-fpoe)' },
  { id: 'oevp',   name: 'ÖVP',   long: 'Österreichische Volkspartei',      color: 'var(--p-oevp)' },
  { id: 'spoe',   name: 'SPÖ',   long: 'Sozialdemokratische Partei Österreichs', color: 'var(--p-spoe)' },
  { id: 'neos',   name: 'NEOS',  long: 'NEOS – Das Neue Österreich',       color: 'var(--p-neos)' },
  { id: 'gruene', name: 'Grüne', long: 'Die Grünen – Die Grüne Alternative', color: 'var(--p-gruene)' },
];
const OTHER = { id: 'sonst', name: 'Sonstige', color: 'var(--p-sonst)' };
const PARTY_IDS = PARTIES.map(p => p.id);
const ALL_IDS = [...PARTY_IDS, 'sonst'];

// Koalitionsbereitschaft zwischen zwei Parteien (0 = ausgeschlossen, 1 = Wunschpartner)
const COMPAT = {
  'fpoe-oevp': 0.70, 'fpoe-spoe': 0.22, 'fpoe-neos': 0.18, 'fpoe-gruene': 0.03,
  'oevp-spoe': 0.62, 'oevp-neos': 0.66, 'oevp-gruene': 0.45,
  'spoe-neos': 0.45, 'spoe-gruene': 0.75, 'neos-gruene': 0.52,
};
function compat(a, b) { return COMPAT[`${a}-${b}`] ?? COMPAT[`${b}-${a}`] ?? 0; }

// Bundesländer. poly/osttirol: Grenzverlauf in [Länge, Breite], stark vereinfacht.
const STATES = [
  { id: 'w', short: 'Wien', name: 'Wien', capital: 'Wien', pop: 2028399, urban: 1.0, lh: 'spoe', ltw: '2030-04',
    base: { fpoe: 20.6, oevp: 17.4, spoe: 29.0, neos: 13.4, gruene: 13.9 },
    label: [16.37, 48.21],
    poly: [[16.18,48.25],[16.30,48.32],[16.50,48.30],[16.58,48.15],[16.40,48.12],[16.20,48.13]] },
  { id: 'noe', short: 'NÖ', name: 'Niederösterreich', capital: 'St. Pölten', pop: 1726444, urban: 0.35, lh: 'oevp', ltw: '2028-01',
    base: { fpoe: 29.3, oevp: 30.7, spoe: 19.5, neos: 8.1, gruene: 7.2 },
    label: [15.45, 48.42],
    poly: [[14.70,48.58],[14.95,48.80],[15.00,49.00],[15.30,48.98],[15.95,48.82],[16.50,48.78],[16.95,48.62],[16.88,48.35],[16.98,48.12],[16.75,47.98],[16.50,47.90],[16.35,47.75],[16.20,47.60],[16.10,47.42],[15.85,47.55],[15.60,47.65],[15.30,47.75],[14.95,47.70],[14.75,47.73],[14.60,47.85],[14.52,48.00],[14.50,48.22],[14.60,48.40]] },
  { id: 'ooe', short: 'OÖ', name: 'Oberösterreich', capital: 'Linz', pop: 1532569, urban: 0.40, lh: 'oevp', ltw: '2027-09',
    base: { fpoe: 32.1, oevp: 26.9, spoe: 18.2, neos: 8.3, gruene: 8.4 },
    label: [14.00, 48.15],
    poly: [[13.00,48.00],[13.30,48.25],[13.45,48.57],[13.84,48.77],[14.05,48.67],[14.35,48.56],[14.70,48.58],[14.60,48.40],[14.50,48.22],[14.52,48.00],[14.60,47.85],[14.75,47.73],[14.30,47.60],[13.90,47.55],[13.65,47.48],[13.60,47.60],[13.48,47.75],[13.30,47.90]] },
  { id: 'stmk', short: 'Stmk.', name: 'Steiermark', capital: 'Graz', pop: 1272553, urban: 0.35, lh: 'fpoe', ltw: '2029-11',
    base: { fpoe: 35.2, oevp: 25.6, spoe: 18.4, neos: 7.6, gruene: 7.1 },
    label: [15.10, 47.25],
    poly: [[14.75,47.73],[14.95,47.70],[15.30,47.75],[15.60,47.65],[15.85,47.55],[16.10,47.42],[16.12,47.25],[16.02,47.05],[16.10,46.86],[15.95,46.70],[15.65,46.70],[15.40,46.65],[15.00,46.62],[15.05,46.85],[14.95,47.05],[14.60,47.05],[14.30,47.00],[14.00,46.98],[13.90,47.05],[13.95,47.15],[13.85,47.32],[13.65,47.48],[13.90,47.55],[14.30,47.60]] },
  { id: 'tirol', short: 'Tirol', name: 'Tirol', capital: 'Innsbruck', pop: 775970, urban: 0.30, lh: 'oevp', ltw: '2027-09',
    base: { fpoe: 27.6, oevp: 33.4, spoe: 15.2, neos: 10.1, gruene: 9.4 },
    label: [11.30, 47.22],
    poly: [[10.10,47.38],[10.45,47.55],[10.90,47.48],[11.40,47.45],[11.65,47.59],[12.00,47.62],[12.20,47.60],[12.42,47.70],[12.65,47.67],[12.42,47.45],[12.30,47.30],[12.12,47.12],[11.75,46.97],[11.50,47.00],[11.00,46.77],[10.75,46.78],[10.45,46.85],[10.12,46.88],[10.20,47.15]],
    extra: [[12.12,47.00],[12.20,47.08],[12.50,47.13],[12.75,47.07],[12.88,46.92],[12.95,46.75],[12.90,46.65],[12.50,46.68],[12.30,46.78],[12.15,46.90]] },
  { id: 'ktn', short: 'Ktn.', name: 'Kärnten', capital: 'Klagenfurt', pop: 568984, urban: 0.30, lh: 'spoe', ltw: '2028-03',
    base: { fpoe: 38.3, oevp: 21.6, spoe: 23.0, neos: 7.0, gruene: 5.4 },
    label: [13.95, 46.77],
    poly: [[13.90,47.05],[14.00,46.98],[14.30,47.00],[14.60,47.05],[14.95,47.05],[15.05,46.85],[15.00,46.62],[14.85,46.55],[14.55,46.40],[14.10,46.48],[13.70,46.52],[13.40,46.55],[12.90,46.65],[12.95,46.75],[12.88,46.92],[12.75,47.07],[13.20,47.05],[13.50,46.98]] },
  { id: 'sbg', short: 'Sbg.', name: 'Salzburg', capital: 'Salzburg', pop: 571060, urban: 0.40, lh: 'oevp', ltw: '2028-04',
    base: { fpoe: 29.1, oevp: 30.2, spoe: 16.4, neos: 9.9, gruene: 9.1 },
    label: [13.25, 47.33],
    poly: [[12.65,47.67],[12.85,47.55],[13.05,47.50],[13.10,47.68],[12.95,47.85],[12.95,47.97],[13.00,48.00],[13.30,47.90],[13.48,47.75],[13.60,47.60],[13.65,47.48],[13.85,47.32],[13.95,47.15],[13.90,47.05],[13.50,46.98],[13.20,47.05],[12.75,47.07],[12.50,47.13],[12.20,47.08],[12.12,47.12],[12.30,47.30],[12.42,47.45]] },
  { id: 'vbg', short: 'Vbg.', name: 'Vorarlberg', capital: 'Bregenz', pop: 409742, urban: 0.40, lh: 'oevp', ltw: '2029-10',
    base: { fpoe: 26.0, oevp: 29.6, spoe: 12.4, neos: 15.1, gruene: 12.2 },
    label: [9.84, 47.24],
    poly: [[9.55,47.53],[9.97,47.55],[10.10,47.38],[10.20,47.15],[10.12,46.88],[9.87,46.93],[9.60,47.05],[9.48,47.10],[9.55,47.30]] },
  { id: 'bgld', short: 'Bgld.', name: 'Burgenland', capital: 'Eisenstadt', pop: 301966, urban: 0.15, lh: 'spoe', ltw: '2030-01',
    base: { fpoe: 31.4, oevp: 27.9, spoe: 26.6, neos: 5.4, gruene: 4.4 },
    label: [16.40, 47.38],
    poly: [[16.98,48.12],[17.16,48.00],[17.07,47.72],[16.78,47.67],[16.55,47.72],[16.42,47.64],[16.62,47.45],[16.45,47.35],[16.52,47.10],[16.35,46.98],[16.10,46.86],[16.02,47.05],[16.12,47.25],[16.10,47.42],[16.20,47.60],[16.35,47.75],[16.50,47.90],[16.75,47.98]] },
];

// Haushalt (Mrd. € pro Jahr, Ausgangswert). Stufe 1–5, 3 = unverändert.
const BUDGET = [
  { id: 'pens',  name: 'Pensionen',              base: 65, pop: 1.6 },
  { id: 'gesund',name: 'Gesundheit & Pflege',    base: 40, pop: 1.4 },
  { id: 'bild',  name: 'Bildung & Forschung',    base: 30, pop: 0.9 },
  { id: 'soz',   name: 'Soziales & Familie',     base: 35, pop: 0.9 },
  { id: 'infra', name: 'Infrastruktur & Verkehr',base: 20, pop: 0.6 },
  { id: 'klima', name: 'Klima & Umwelt',         base: 6,  pop: 0.3 },
  { id: 'sich',  name: 'Sicherheit & Bundesheer',base: 10, pop: 0.5 },
];
const FIXED_SPENDING = 43; // Verwaltung, Zinsen, Sonstiges
const TAXES = [
  { id: 'stArb', name: 'Steuern auf Arbeit (ESt, Lohnnebenkosten)', share: 0.035, pop: -2.6, growth: -0.15 },
  { id: 'stUnt', name: 'Unternehmens- & Vermögenssteuern',        share: 0.015, pop: -0.4, growth: -0.20 },
];
const LEVEL_LABELS = ['stark senken', 'senken', 'unverändert', 'erhöhen', 'stark erhöhen'];

// Was die Parteien vom Haushalt halten (+ = mehr davon)
const PREFS = {
  fpoe:   { pens: 1,   gesund: .5, bild: 0,  soz: -.3, infra: .3, klima: -1, sich: 1,   stArb: -.8, stUnt: 0 },
  oevp:   { pens: 0,   gesund: .3, bild: .3, soz: -.4, infra: .5, klima: -.2,sich: .7,  stArb: -.6, stUnt: -.8 },
  spoe:   { pens: 1,   gesund: .8, bild: .6, soz: 1,   infra: .4, klima: .3, sich: -.1, stArb: -.3, stUnt: 1 },
  neos:   { pens: -1,  gesund: 0,  bild: 1,  soz: -.5, infra: .2, klima: .3, sich: .2,  stArb: -1,  stUnt: -.5 },
  gruene: { pens: 0,   gesund: .5, bild: .6, soz: .7,  infra: .3, klima: 1,  sich: -.5, stArb: 0,   stUnt: .7 },
};

// Gesetzesvorhaben. stance: -2 strikt dagegen … +2 Herzensanliegen.
// pop: Zufriedenheitseffekt, urban: Zusatzeffekt in Städten (negativ = am Land beliebter)
// fx: wirtschaftliche Dauerwirkung (rev/spend in Mrd. €/Jahr, growth/unemp/infl in %-Punkten)
const LAWS = [
  { id: 'miete', title: 'Mietpreisbremse', area: 'Wohnen',
    desc: 'Richtwert- und Kategoriemieten werden für drei Jahre eingefroren, danach an maximal 2 % gekoppelt.',
    stance: { fpoe: 1, oevp: -1, spoe: 2, neos: -2, gruene: 2 }, pop: 4, urban: 3, fx: { infl: -0.2 } },
  { id: 'asyl', title: 'Verschärfung des Asylrechts', area: 'Migration',
    desc: 'Schnellverfahren an der Grenze, Aussetzen des Familiennachzugs, mehr Rückführungen.',
    stance: { fpoe: 2, oevp: 1, spoe: -1, neos: -1, gruene: -2 }, pop: 2, urban: -3, fx: {} },
  { id: 'oeffi', title: 'Öffi-Offensive & Klimaticket-Ausbau', area: 'Verkehr',
    desc: 'Taktverdichtung im Regionalverkehr, neue S-Bahn-Linien, günstigeres Klimaticket für Junge.',
    stance: { fpoe: -1, oevp: 0, spoe: 1, neos: 0, gruene: 2 }, pop: 2, urban: 2, fx: { spend: 1.0, growth: 0.05 } },
  { id: 'co2', title: 'Höherer CO₂-Preis', area: 'Klima',
    desc: 'Der nationale CO₂-Preis steigt schneller, der Klimabonus wird gestaffelt ausbezahlt.',
    stance: { fpoe: -2, oevp: -1, spoe: -1, neos: 1, gruene: 2 }, pop: -4, urban: 1, fx: { rev: 2.0, infl: 0.2 } },
  { id: 'pens67', title: 'Pensionsantrittsalter 67', area: 'Pensionen',
    desc: 'Schrittweise Anhebung des gesetzlichen Pensionsalters auf 67 Jahre bis 2040.',
    stance: { fpoe: -2, oevp: 1, spoe: -2, neos: 2, gruene: -1 }, pop: -6, urban: 0, fx: { spend: -3.0, growth: 0.1 } },
  { id: 'verm', title: 'Millionärssteuer', area: 'Steuern',
    desc: 'Vermögen über 1 Mio. € werden mit 0,5 % jährlich besteuert, Erbschaften ab 1 Mio. ebenso.',
    stance: { fpoe: -1, oevp: -2, spoe: 2, neos: -2, gruene: 1 }, pop: 3, urban: 1, fx: { rev: 3.0, growth: -0.15 } },
  { id: 'lnk', title: 'Senkung der Lohnnebenkosten', area: 'Wirtschaft',
    desc: 'Die Beiträge zu FLAF und Unfallversicherung sinken um insgesamt 1,5 Prozentpunkte.',
    stance: { fpoe: 1, oevp: 2, spoe: -1, neos: 2, gruene: -1 }, pop: 1, urban: 0, fx: { rev: -3.0, growth: 0.3, unemp: -0.2 } },
  { id: 'schule', title: 'Gemeinsame Schule der 10- bis 14-Jährigen', area: 'Bildung',
    desc: 'AHS-Unterstufe und Mittelschule werden zusammengelegt, mehr Ganztagsplätze.',
    stance: { fpoe: -1, oevp: -2, spoe: 2, neos: 1, gruene: 2 }, pop: 0, urban: 2, fx: { spend: 1.0 } },
  { id: 'heer', title: 'Luftabwehr & Bundesheer-Aufrüstung', area: 'Sicherheit',
    desc: 'Beitritt zur europäischen Luftabwehrinitiative, Beschaffung neuer Hubschrauber und Radare.',
    stance: { fpoe: -1, oevp: 2, spoe: 0, neos: 2, gruene: -1 }, pop: 0, urban: 0, fx: { spend: 1.5 } },
  { id: 'kopftuch', title: 'Kopftuchverbot an Schulen', area: 'Integration',
    desc: 'Verbot für Schülerinnen bis 14 Jahre, verbunden mit Integrationsprogrammen.',
    stance: { fpoe: 2, oevp: 2, spoe: 0, neos: 0, gruene: -2 }, pop: 1, urban: -1, fx: {} },
  { id: 'pflege', title: 'Große Pflegereform', area: 'Pflege',
    desc: 'Bessere Bezahlung, Ausbildungsoffensive und ein Bonus für pflegende Angehörige.',
    stance: { fpoe: 1, oevp: 1, spoe: 2, neos: 0, gruene: 1 }, pop: 4, urban: 0, fx: { spend: 1.5, unemp: -0.05 } },
  { id: 'strom', title: 'Strompreisdeckel', area: 'Energie',
    desc: 'Der Grundverbrauch der Haushalte wird zu einem staatlich gestützten Preis abgegeben.',
    stance: { fpoe: 2, oevp: 0, spoe: 2, neos: -2, gruene: -1 }, pop: 4, urban: 0, fx: { spend: 2.0, infl: -0.4 } },
  { id: 'digital', title: 'Digitales Amt & Verwaltungsreform', area: 'Verwaltung',
    desc: 'Alle Behördenwege online, Zusammenlegung von Doppelstrukturen zwischen Bund und Ländern.',
    stance: { fpoe: 0, oevp: 1, spoe: 1, neos: 2, gruene: 1 }, pop: 1, urban: 1, fx: { spend: -0.8, growth: 0.1 } },
  { id: 'tempo', title: 'Tempo 100 auf Autobahnen', area: 'Verkehr',
    desc: 'Das allgemeine Tempolimit auf Autobahnen sinkt von 130 auf 100 km/h.',
    stance: { fpoe: -2, oevp: -2, spoe: 0, neos: -1, gruene: 2 }, pop: -3, urban: 1, fx: {} },
  { id: 'kinder', title: 'Rechtsanspruch auf Kinderbetreuung', area: 'Familie',
    desc: 'Ab dem ersten Geburtstag hat jedes Kind Anspruch auf einen ganztägigen Betreuungsplatz.',
    stance: { fpoe: -1, oevp: 0, spoe: 2, neos: 2, gruene: 2 }, pop: 2, urban: 1, fx: { spend: 1.2, unemp: -0.1 } },
  { id: 'transparenz', title: 'Informationsfreiheitsgesetz plus', area: 'Demokratie',
    desc: 'Amtsgeheimnis endgültig abgeschafft, Parteispenden in Echtzeit offengelegt.',
    stance: { fpoe: 0, oevp: -1, spoe: 1, neos: 2, gruene: 2 }, pop: 2, urban: 0, fx: {} },
  { id: 'boden', title: 'Bodenschutzgesetz', area: 'Umwelt',
    desc: 'Verbindliche Obergrenze von 2,5 Hektar Bodenversiegelung pro Tag.',
    stance: { fpoe: -1, oevp: -1, spoe: 1, neos: 1, gruene: 2 }, pop: 1, urban: 1, fx: { growth: -0.05 } },
  { id: 'volksabst', title: 'Verbindliche Volksabstimmungen', area: 'Demokratie',
    desc: 'Volksbegehren mit mehr als 250.000 Unterschriften führen zwingend zu einer Volksabstimmung.',
    stance: { fpoe: 2, oevp: -1, spoe: -1, neos: 1, gruene: 0 }, pop: 2, urban: -1, fx: {} },
  { id: 'bargeld', title: 'Bargeld in die Verfassung', area: 'Verfassung',
    desc: 'Das Recht, mit Bargeld zu bezahlen, wird verfassungsrechtlich abgesichert.',
    stance: { fpoe: 2, oevp: 1, spoe: 0, neos: -1, gruene: 0 }, pop: 2, urban: -1, fx: {} },
  { id: 'sozhilfe', title: 'Sozialhilfe neu', area: 'Soziales',
    desc: 'Wartefrist von fünf Jahren für Zugewanderte, verpflichtende Deutsch- und Wertekurse.',
    stance: { fpoe: 2, oevp: 2, spoe: -2, neos: 1, gruene: -2 }, pop: 1, urban: -2, fx: { spend: -0.5 } },
];

// Zufallsereignisse. Effekte einer Option:
// sat (Zufriedenheit), growth/unemp/infl (vorübergehender Schock), once (Mrd. € einmalig),
// state: [id, Zufriedenheit] regional, coal: {partei: Koalitionsstimmung}, sup: {partei: Umfrage-Punkte}
const EVENTS = [
  { id: 'flut', title: 'Jahrhunderthochwasser', where: ['noe', 'ooe'],
    text: 'Nach tagelangem Starkregen stehen ganze Ortschaften in Nieder- und Oberösterreich unter Wasser.',
    options: [
      { label: 'Katastrophenfonds aufstocken (2 Mrd. €)', fx: { once: 2.0, sat: 3, state: ['noe', 6] } },
      { label: 'Bundesheer schicken, Länder zahlen selbst', fx: { sat: -3, state: ['noe', -6], coal: { oevp: -5 } } },
    ] },
  { id: 'teuer', title: 'Neue Teuerungswelle',
    text: 'Die Inflation zieht wieder an. Lebensmittel und Energie werden spürbar teurer.',
    options: [
      { label: 'Einmalzahlung für alle Haushalte (3 Mrd. €)', fx: { once: 3.0, sat: 4, infl: 0.3, coal: { neos: -8, spoe: 4 } } },
      { label: 'Gezielt nur Geringverdiener entlasten (1 Mrd. €)', fx: { once: 1.0, sat: 1, coal: { neos: 3 } } },
      { label: 'Nichts tun, Haushaltsdisziplin', fx: { sat: -4, coal: { spoe: -6, fpoe: -4 } } },
    ] },
  { id: 'chats', title: 'Chat-Affäre im Kabinett',
    text: 'Eine Wochenzeitung veröffentlicht Chats, in denen ein Kabinettsmitglied Postenschacher bespricht.',
    options: [
      { label: 'Minister sofort entlassen', fx: { sat: 1, coal: {} } },
      { label: 'Aussitzen, Vorwürfe zurückweisen', fx: { sat: -6, sup: { neos: 1, gruene: 0.5 } } },
    ] },
  { id: 'werk', title: 'Industriebetrieb insolvent', where: ['stmk'],
    text: 'Ein großer Zulieferbetrieb in der Steiermark meldet Insolvenz an. 2.500 Jobs wackeln.',
    options: [
      { label: 'Staatliche Rettung mit Auflagen (0,8 Mrd. €)', fx: { once: 0.8, state: ['stmk', 6], coal: { neos: -6, spoe: 4 } } },
      { label: 'Arbeitsstiftung für Betroffene', fx: { once: 0.2, unemp: 0.1, state: ['stmk', 1] } },
      { label: 'Markt entscheiden lassen', fx: { unemp: 0.2, state: ['stmk', -7], coal: { spoe: -6 } } },
    ] },
  { id: 'migration', title: 'Mehr Asylanträge',
    text: 'Die Zahl der Asylanträge steigt stark an. Quartiere in mehreren Bundesländern sind überfüllt.',
    options: [
      { label: 'Grenzkontrollen verschärfen', fx: { sat: 2, coal: { gruene: -10, neos: -3, fpoe: 4, oevp: 3 }, sup: { fpoe: 0.5 } } },
      { label: 'Faire Verteilung auf die Länder erzwingen', fx: { sat: -2, state: ['ktn', -3], coal: { gruene: 3, fpoe: -6 } } },
      { label: 'Auf eine EU-Lösung drängen', fx: { sat: -1, sup: { fpoe: 0.8 } } },
    ] },
  { id: 'tourismus', title: 'Rekordsaison im Tourismus', where: ['tirol', 'sbg'],
    text: 'Tirol und Salzburg melden so viele Nächtigungen wie nie zuvor.',
    options: [
      { label: 'Erfolg feiern', fx: { sat: 2, growth: 0.2, state: ['tirol', 3] } },
      { label: 'Teil der Einnahmen für leistbares Wohnen im Westen', fx: { sat: 2, state: ['tirol', 4], coal: { oevp: -2, spoe: 3 } } },
    ] },
  { id: 'hitze', title: 'Hitzesommer und Dürre',
    text: 'Wochenlang über 35 Grad. Die Landwirtschaft meldet massive Ernteausfälle.',
    options: [
      { label: 'Dürrehilfe für Bauern (0,5 Mrd. €)', fx: { once: 0.5, state: ['noe', 3], coal: { oevp: 5, gruene: -2 } } },
      { label: 'Klimaanpassungspaket (1,2 Mrd. €)', fx: { once: 1.2, sat: 2, coal: { gruene: 6, fpoe: -4 } } },
    ] },
  { id: 'gas', title: 'Gasversorgung unsicher',
    text: 'Ein wichtiger Lieferant fällt aus. Die Großhandelspreise für Gas verdoppeln sich.',
    options: [
      { label: 'Strategische Reserve freigeben, Preise stützen', fx: { once: 1.5, infl: 0.3, sat: 1 } },
      { label: 'Sparappell und schneller Erneuerbaren-Ausbau', fx: { infl: 0.8, sat: -3, coal: { gruene: 6 } } },
    ] },
  { id: 'lehrer', title: 'Lehrkräftemangel',
    text: 'Zu Schulbeginn fehlen österreichweit 1.800 Lehrkräfte. Eltern protestieren.',
    options: [
      { label: 'Gehälter für Junglehrer anheben (0,6 Mrd. €/Jahr)', fx: { spendPerm: 0.6, sat: 3, coal: { neos: 4 } } },
      { label: 'Quereinstieg erleichtern', fx: { sat: 0, coal: { neos: 3, spoe: -2 } } },
    ] },
  { id: 'metaller', title: 'Metaller drohen mit Streik',
    text: 'Die Kollektivvertragsverhandlungen stocken. Die Gewerkschaft ruft zu Warnstreiks auf.',
    options: [
      { label: 'Vermitteln: hoher Abschluss', fx: { infl: 0.2, sat: 2, coal: { spoe: 4, neos: -3 } } },
      { label: 'Sozialpartner allein lassen', fx: { growth: -0.2, sat: -2, coal: { spoe: -4 } } },
    ] },
  { id: 'lawine', title: 'Lawinenwinter in Tirol', where: ['tirol', 'vbg'],
    text: 'Rekordschneefälle schneiden Täler in Tirol und Vorarlberg tagelang ab.',
    options: [
      { label: 'Soforthilfe und Schutzbauten (0,4 Mrd. €)', fx: { once: 0.4, state: ['tirol', 5] } },
      { label: 'Zuständigkeit der Länder betonen', fx: { state: ['tirol', -5], coal: { oevp: -3 } } },
    ] },
  { id: 'esc', title: 'Song-Contest-Sieg!',
    text: 'Österreich gewinnt den Eurovision Song Contest. Das Finale im nächsten Jahr findet in Wien statt.',
    options: [
      { label: 'Großes Fest am Heldenplatz', fx: { sat: 3, state: ['w', 3], once: 0.05 } },
      { label: 'Gratulieren, aber keine Steuergelder', fx: { sat: 1 } },
    ] },
  { id: 'pflegenot', title: 'Pflegenotstand in Heimen',
    text: 'Mehrere Pflegeheime müssen Stationen schließen. Angehörige gehen auf die Straße.',
    options: [
      { label: 'Notfallfonds für Pflegepersonal (0,7 Mrd. €)', fx: { once: 0.7, sat: 3 } },
      { label: 'Pflegekräfte aus dem Ausland anwerben', fx: { sat: 0, coal: { fpoe: -5, neos: 3 } } },
    ] },
  { id: 'bank', title: 'Gerüchte um eine Regionalbank',
    text: 'Eine Regionalbank gerät nach Fehlspekulationen in Schieflage. Kunden heben Geld ab.',
    options: [
      { label: 'Staatsgarantie aussprechen (2,5 Mrd. €)', fx: { once: 2.5, sat: -1 } },
      { label: 'Geordnete Abwicklung', fx: { growth: -0.3, sat: -3 } },
    ] },
  { id: 'eu', title: 'EU-Defizitverfahren', cond: s => s.econ.deficitPct > 3,
    text: 'Die EU-Kommission rügt das hohe Budgetdefizit und verlangt einen Sanierungspfad.',
    options: [
      { label: 'Sparpaket ankündigen (−3 Mrd. €/Jahr)', fx: { spendPerm: -3, sat: -4, coal: { neos: 5, spoe: -5 } } },
      { label: 'Brüssel die Stirn bieten', fx: { sat: 1, infl: 0.1, sup: { fpoe: 0.5 }, coal: { neos: -8 } } },
    ] },
  { id: 'olympia', title: 'Olympia-Bewerbung?',
    text: 'Ein Komitee will Olympische Winterspiele nach Österreich holen. Die Kosten sind umstritten.',
    options: [
      { label: 'Bewerbung unterstützen', fx: { once: 0.3, sat: 1, state: ['tirol', -2], coal: { gruene: -4 } } },
      { label: 'Volksbefragung abwarten', fx: { sat: 1 } },
    ] },
];

const PARTY_ORDER_SEATS = ['spoe', 'gruene', 'neos', 'oevp', 'fpoe']; // Sitzordnung links → rechts
