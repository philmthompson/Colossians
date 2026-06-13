export interface SiteData {
  id: string;
  title: string;
  verb: 'Examine' | 'Talk' | 'Read' | 'Enter' | 'Inspect' | 'Observe';
  era?: string;
  body: string;
  accuracy: string;
  lines?: string[];
}

export const SITES: SiteData[] = [
  {
    id: 'theatre',
    title: 'The Theatre',
    verb: 'Examine',
    body: `The cavea is cut into the eastern slope of a low hill, its tiered seats opening westward across the valley to the mound of the acropolis. On a clear afternoon the white plaster of the upper city catches the light. You can see the whole city from the top row. In 1836, William John Hamilton found several rows of seats still in place — the hollow of the hill has preserved them through centuries of neglect. The orchestra floor is level limestone, worn smooth. No plays are being performed today; the season has not yet begun.`,
    accuracy: `Location and east-slope siting attested by Hamilton (1836). Cavea orientation westward (opening toward the city) is confirmed by the terrain. Seating rows in situ: Hamilton. Scale, column order, and stage building are conjectural reconstruction.`,
  },
  {
    id: 'agora',
    title: 'The Agora',
    verb: 'Examine',
    body: `The market square of Colossae is busy even now, as the city declines. Wool — above all, wool — dominates the stalls. The famous <em>colossinus</em> colour, a deep crimson-red somewhere between purple and scarlet, hangs in skeins from every rack. Strabo recorded it as one of the glories of the Lycus valley, produced from local fleeces and mineral-rich river waters. Laodicea may now surpass Colossae in volume, but the dyers here know the old methods. A merchant argues over the price of a bale. The smell of mordant and woodsmoke drifts from the river bank.`,
    accuracy: `Wool industry and <em>colossinus</em> colour: attested, Strabo <em>Geography</em> 12.8.16. Agora siting is conjectural; no excavated agora has been identified. Market stalls and street furniture are plausible reconstruction.`,
  },
  {
    id: 'dye-works',
    title: 'Dye Works on the Lycus',
    verb: 'Examine',
    body: `Stone vats line the bank where the gorge opens out. Workers lower fleeces into the steaming basins, where mineral waters from the Cadmus springs have already been mixed with madder root and alum. The crimson hangs on drying racks, blazing in the afternoon light — the <em>colossinus</em> that made this city famous across the Roman world. The Lycus water here is cold and fast, unlike the lukewarm supply Laodicea pipes in from the hills. It is better for the dye, the old men say.`,
    accuracy: `Dye industry in the Lycus valley: firmly attested, Strabo 12.8.16; analogous installations are excavated at Hierapolis and Laodicea. This specific riverbank location is conjectural. The Laodicea water contrast: NT Rev 3:15-16.`,
  },
  {
    id: 'cardo',
    title: 'The Cardo',
    verb: 'Examine',
    body: `A column-lined street runs roughly north-south through the lower city. Surface surveys have found column drums, architrave fragments, and ashlar blocks scattered along this line — the bones of what was once a colonnaded avenue. In a city built on the great Ephesus-to-Euphrates highway, a monumental cardo would have been expected. The columns here are limestone, weathered but still upright in places. A woman with a water jug passes between them without looking up.`,
    accuracy: `A colonnaded street is attested as probable from surface survey finds (column drums, architrave fragments, ashlar blocks). Yener survey 2021-25. The exact course and column order are conjectural.`,
  },
  {
    id: 'temple',
    title: 'Sanctuary of Tyche Protogeneia',
    verb: 'Examine',
    body: `A podium temple, its columns older than the city's current prosperity. The cult statue in the naos wears a mural crown: Tyche, Fortune the Firstborn, <em>Protogeneia</em>. The epithet is unusual — almost nowhere else in Asia Minor does Tyche bear this title. Coins from the city also show the Phrygian moon-god Men, horns rising from his crescent. Colossae's religious world is not simple. Within a decade, a letter will circulate to the assembly here that names Christ as the true <em>prototokos</em> — firstborn — of all creation. The argument is shaped for this city.`,
    accuracy: `Tyche Protogeneia sanctuary: attested by coins and inscriptions (Cadwallader surveys). Men cult: attested by coins. The connection to Col 1:15-20 is scholarly interpretation (attested text; interpretive link is the author's). Temple form and location are conjectural.`,
  },
  {
    id: 'acropolis',
    title: 'The Acropolis',
    verb: 'Examine',
    body: `The mound rises from the valley floor in two peaks — a biconical profile that locals call the twin summits. It is a <em>hoyuk</em>, a tell, built up over millennia of occupation: Chalcolithic farmers, Bronze Age settlers, Hittite soldiers, Phrygian kings, Persian governors, Hellenistic colonists, Romans. The GPR surveys have read layer beneath layer without digging. A defensive wall rings the summit, interrupted by the east gate. On the western slope, a stone-lined pit — probably a grain silo — marks the practicalities of a fortress city. From up here, the whole valley is visible: the river gorge to the north, the road east and west, Cadmus rising behind you to the south.`,
    accuracy: `Biconical mound and hoyuk profile: attested, Yener survey 2021-25, GPR. Chalcolithic occupation depth: Yener. Defensive wall and east gate: attested by surface survey. Stone-lined pit as silo: tentative reading in survey literature. Twin peaks: confirmed by topography.`,
  },
  {
    id: 'silo',
    title: 'The Stone-Lined Pit',
    verb: 'Examine',
    body: `A ring of fitted stones surrounds a dark pit in the western slope of the acropolis mound. The construction is careful — this was not dug in haste. Survey literature reads it tentatively as a grain silo or storage pit, common on Anatolian hillforts where the garrison needed to withstand a siege. The stones are Lycus valley limestone, the same material as the wall. Looking down into the darkness, you can smell damp earth and something older.`,
    accuracy: `Stone-lined pit on the west slope of the acropolis: attested in survey literature (Yener et al.). Identification as a silo is tentative, noted as such in the source. Dimensions and depth are not published.`,
  },
  {
    id: 'chasm',
    title: 'The Chasm of the Lycus',
    verb: 'Examine',
    body: `Here the Lycus disappears. It rushes into a cleft in the travertine rock — you can hear it below — and runs underground for nearly five stadia, almost a kilometre, before it emerges again to the east. Herodotus reported it when Xerxes marched through in 481 BC; Ovid alludes to it. Geomorphologists have confirmed a collapsed travertine tunnel beneath this reach. The fallen blocks you see are the roof, already cracked and settling in AD 52. In eight years, an earthquake will shake the Lycus valley, and the tunnel will finally give way completely. Later generations, wondering at the sudden vanishing of a river, will say that the archangel Michael split the rock with his staff — a story told at nearby Chonai for centuries. But that story belongs to the future. For now, the water simply goes somewhere you cannot follow.`,
    accuracy: `River disappearing underground: attested, Herodotus <em>Histories</em> 7.30; Strabo; Ovid. Length of underground reach (~5 stadia): Herodotus. Collapsed travertine tunnel: confirmed by geomorphological study. AD 60 earthquake: historical record. Chonai/Michael legend: Byzantine hagiography. The tunnel roof-fall and earthquake connection is scholarly inference.`,
  },
  {
    id: 'necropolis',
    title: 'The Necropolis',
    verb: 'Examine',
    body: `North of the river, in the flat travertine ground, sixty tombs have been cut side by side. They are bathtub-shaped — carved directly from the bedrock, each sized for one body. Some lids lie where they were sealed; others have been slid aside. The bones remain. The excavation of 2025 found them approximately 2,200 years old — Hellenistic, contemporary with or slightly before the city Xenophon described as "inhabited, prosperous, and large." Cypress trees shade the avenue that leads here. The path across the bridge is the only way in from the city. You are north of the river, which is where the dead belong.`,
    accuracy: `Necropolis north of the Lycus: attested by Hamilton (1836) and confirmed by excavation. 60 rock-cut bathtub tombs, skeletal remains, some lids displaced: 2025 excavation (Yener, Pamukkale University). ~2,200 years old: excavation report. "inhabited, prosperous and large": Xenophon, <em>Anabasis</em> 1.2.6.`,
  },
  {
    id: 'necropolis-dig',
    title: '2025 Excavation — Rock-Cut Tombs',
    verb: 'Examine',
    era: 'Colossae · AD 52 / Modern Archaeology',
    body: `Sixty bathtub-shaped tombs were hewn directly from the bedrock here — no masonry, no mortar, just the chisel and the stone. Pamukkale University archaeologists excavated this burial field in 2025, dating the tombs to roughly 2,200 years ago, the Hellenistic period. Skeletal remains lay inside many of them, lids slid or toppled aside over the centuries. The site is the first formally excavated necropolis at Colossae.
<p style="margin-top:0.9rem">
  <a href="https://www.turkiyetoday.com/culture/archaeologists-uncover-2200-year-old-rock-cut-burial-field-in-turkiyes-colossae-3208042" target="_blank" rel="noopener">
    Read the excavation report with photographs →
  </a>
</p>`,
    accuracy: `60 rock-cut bathtub tombs, ~2,200 years old, skeletal remains: Pamukkale University excavation, 2025 (Yener et al.). First formally excavated necropolis at Colossae. Photographs and report: Türkiye Today, 2025.`,
  },
  {
    id: 'milestone',
    title: 'Milestone — The Southern Road',
    verb: 'Read',
    body: `The stone is worn but legible in places: a distance marker on the great road that runs from Ephesus to the Euphrates. Xerxes of Persia marched his army along this road in 481 BC, pausing at Colossae — Herodotus records the stop. Cyrus the Younger brought his Greek mercenaries through in 401 BC; Xenophon, who was there, called the city "inhabited, prosperous and large." That was 450 years ago. The road has not changed. The city has. Laodicea, twelve Roman miles to the northwest, now draws the trade. Colossae's wool is still the finest, but the merchants who used to stop here overnight now press on to the newer city. The milestone says nothing about that.`,
    accuracy: `Eastern trade road (Ephesus-Euphrates): attested by multiple ancient sources. Xerxes at Colossae: Herodotus <em>Histories</em> 7.30. Cyrus and Xenophon: <em>Anabasis</em> 1.2.6. Laodicea ~12 Roman miles: approximate from ancient geographers. City's relative decline: inferred from Strabo's tone and later NT references.`,
  },
  {
    id: 'philemon',
    title: 'The House of Philemon',
    verb: 'Enter',
    body: `A peristyle house, larger than most in the lower city: a colonnade surrounds a central courtyard where a fig tree grows. This is the house of Philemon, or a house very like it. Within the decade, a small letter will arrive here — short, personal, intensely careful — from a man in prison asking Philemon to receive back a runaway slave named Onesimus "no longer as a slave, but better than a slave, as a dear brother." A few years after that, a longer letter will be read aloud in this courtyard, or one like it, to the assembly that meets in this house. It opens: "To the holy and faithful brothers and sisters in Christ at Colossae." You are standing in the city that produced that letter.`,
    accuracy: `Philemon and Onesimus of Colossae: NT, <em>Philemon</em> 1-2; Col 4:9. Archippus: Col 4:17. House-church assembly in Philemon's home: <em>Philemon</em> 2. The letter to the Colossians: Col 1:2, 1:7, 4:16-17. The physical house and its location are conjectural; peristyle plan is typical of prosperous Hellenistic/Roman Anatolian houses.`,
  },
  {
    id: 'baths',
    title: 'The Baths of Colossae',
    verb: 'Examine',
    body: `A public bath building, its half-dome still intact. The water here comes cold from the Cadmus springs — sharply cold, even in summer — and must be heated in the furnace room. This is a point of local pride. Laodicea must pipe its water in from distant springs, and by the time it arrives it is tepid, good for neither hot nor cold uses. Colossae's water is alive. A bather emerges, scraping oil from his forearm with a strigil. He nods at the stranger on the threshold.`,
    accuracy: `Baths: attested as probable from surface survey (Yener, Cadwallader). Cold Cadmus-fed water: inferred from local hydrology. Cold water as local identity marker vs Laodicea: NT Rev 3:15-16 (written ~AD 95, extrapolated back). Specific plan and location are conjectural.`,
  },
  {
    id: 'aristarchus',
    title: 'Aristarchus',
    verb: 'Talk',
    body: '',
    accuracy: '',
    lines: [
      `The colossinus clip this season is the best I have seen in fifteen years. The fleeces from the eastern pastures — Cadmus water, you understand. The mineral content is what makes it take the dye.`,
      `Laodicea takes everything now. The road trade, the new construction, the banking. But who do the Laodicean merchants come to when they want dyed wool? Us. We have always been here. We will be here after them.`,
      `I have heard there is an assembly meeting in Philemon's house. Strange things, these new brotherhoods. Still — wool is wool, and a man must eat. What brings you to Colossae, stranger?`,
    ],
  },
  {
    id: 'shepherd',
    title: 'The Shepherd',
    verb: 'Talk',
    body: '',
    accuracy: '',
    lines: [
      `Twelve to count this morning, twelve this evening. The Cadmus pastures are good in spring. By July I will have to move them higher up the slope — the heat comes early in the valley.`,
      `See those clouds on the peak? By tomorrow there will be wind from the south. I have been watching that mountain for thirty years. It does not lie.`,
      `The river does as it pleases down there. It runs underground half a stade and comes back out like nothing happened. I have never trusted a river that does that.`,
    ],
  },
  {
    id: 'doorkeeper',
    title: 'Doorkeeper',
    verb: 'Talk',
    body: '',
    accuracy: '',
    lines: [
      `Onesimus? Haven't seen him in days. The master hasn't said anything, but I notice things. I always notice things.`,
      `If you're looking for the assembly, they meet in the evenings, in the courtyard. Ask for Archippus if you need the master.`,
      `Nobody comes and goes from this house without my knowing it. Except Onesimus, apparently.`,
    ],
  },
  {
    id: 'cadmus',
    title: 'Mount Cadmus',
    verb: 'Observe',
    era: 'Colossae · AD 52',
    body: `The mountain fills the southern sky. Its Phrygian name is Honaz Dağı — the Romans know it as Cadmus, after the Phoenician founder-hero whose wanderings the Greeks traced everywhere they found a high place worth naming. The peak stands at nearly two thousand six hundred metres; even in late spring, the summit carries snow. The shepherds of the valley pastures read the weather by its caps and shadows. <br><br>The springs that water Colossae — cold, minerally, fast — descend from these flanks. The same water that feeds the Lycus, stains the wool crimson, and fills the baths runs off this mountain. It is, in the most literal sense, the source of everything the city lives on.`,
    accuracy: `Mount Cadmus (Honaz Dağı): name and height (2,571 m) attested. Cadmus myth association: ancient and medieval sources. Lycus River headwaters from the Cadmus massif: geographical fact. Role of mineral spring water in Colossae's dye industry: Strabo <em>Geography</em> 12.8.16.`,
  },
  {
    id: 'flocks',
    title: 'The Flocks of the Lycus',
    verb: 'Inspect',
    body: `A flock of sheep grazes the eastern pastures below Mount Cadmus, watched by a shepherd who knows the mountain's weather better than any almanac. The fleeces are thick and clean — this is the wool that made Colossae. Strabo, writing a generation after this moment, praised the sheep of the Lycus valley above almost all others in Asia Minor, singling out the distinctive <em>colossinus</em> colour produced from local dyes. The city's name may even have attached itself to the colour, rather than the other way around.`,
    accuracy: `Lycus valley wool quality and <em>colossinus</em> colour: Strabo <em>Geography</em> 12.8.16. Eastern pastures location is conjectural; sheep-grazing in the valley bottom is consistent with the landscape and attested by the wool industry.`,
  },
];

export function getSite(id: string): SiteData | undefined {
  return SITES.find(s => s.id === id);
}
