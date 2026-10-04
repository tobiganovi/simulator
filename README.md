# Österreich-Simulator

Ein Politik-Strategiespiel im Browser, inspiriert vom „Republik Simulator“. Sie führen eine Partei durch die Nationalratswahl, bilden eine Koalition und regieren die Republik Österreich.

## Spielen

`index.html` im Browser öffnen. Es braucht keinen Build-Schritt und keinen Server. Der Spielstand wird automatisch im Browser gespeichert (`localStorage`).

## Inhalt

- **Republik Österreich mit allen 9 Bundesländern** und den Einwohnerzahlen laut Statistik Austria (Stand 1.1.2025), insgesamt rund 9,19 Mio.
- **Parteien:** FPÖ (blau), ÖVP (schwarz), SPÖ (rot), NEOS (pink), Grüne (grün), dazu „Sonstige“.
- **Ausgangslage:** Umfragewerte je Bundesland, angelehnt an die Nationalratswahl 2024.
- **Nationalrat:** 183 Mandate, 4-%-Hürde, Sitzverteilung nach d'Hondt, Mehrheit ab 92.
- **Regierungsbildung:** Zweier- und Dreierkoalitionen mit Chancen, die von der realen Koalitionsbereitschaft der Parteien abhängen.
- **Haushalt:** sieben Ausgabenbereiche und zwei Steuerhebel. Sie wirken auf Wachstum, Arbeitslosigkeit, Inflation, Defizit und Schulden.
- **20 Gesetzesvorhaben** von der Mietpreisbremse bis „Bargeld in die Verfassung“. Jede Partei stimmt nach ihrer Haltung ab, und die Koalitionspartner reagieren darauf.
- **Zufallsereignisse** wie Hochwasser, Teuerung, Chat-Affären oder ein Song-Contest-Sieg.
- **Landtagswahlen** zu den realen Terminen. Der Landeshauptmann wechselt, wenn eine andere Partei gewinnt.
- **Koalitionsbruch und Neuwahlen**, wenn das Koalitionsklima kippt.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Seitengerüst |
| `css/style.css` | Gestaltung (hell und dunkel) |
| `js/data.js` | Stammdaten: Bundesländer, Parteien, Haushalt, Gesetze, Ereignisse |
| `js/game.js` | Spiellogik und Oberfläche |

Neue Gesetze oder Ereignisse lassen sich direkt in `js/data.js` ergänzen.

---

# Apokalypse

Ein Überlebensspiel im Browser, inspiriert von „The Walking Dead“. Zehn Überlebende unter ihrem Anführer Tobi lassen sich nieder und bauen eine Siedlung auf, während draußen die Toten umgehen.

**Spielen:** `apokalypse/index.html` im Browser öffnen.

- Drei Startorte: Bauernhof, Gefängnis oder Einkaufszentrum
- Jeden Tag die Arbeit einteilen: Plündern, Holz, Wasser, Garten, Jagen, Bauen, Werkstatt, Wache, Pflege, Ausruhen
- Mauer in vier Stufen ausbauen, dazu zehn Gebäude von Wachturm bis Funkstation
- Werkstatt: Waffen, Fallen, Munition, Medizin, Wasserfilter
- Nächtliche Angriffe, alle 10 Tage eine Herde, Bisse mit Amputations-Entscheidung, die Plünderer-Bande „Die Erlöser“
- Ziel: 60 Tage überleben. Stirbt Tobi, ist das Spiel verloren.
