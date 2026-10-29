import type { Term, Word } from "./terms";

/**
 * Other ancient traditions. Egyptian senses follow Wiktionary's entries, which cite the
 * Wörterbuch der ägyptischen Sprache (Wb), Faulkner's Concise Dictionary and Allen;
 * Sanskrit follows Monier-Williams (1899) via the Cologne digital edition; Nahuatl the
 * Online Nahuatl Dictionary (University of Oregon), which cites Molina's 1571 Vocabulario;
 * Chinese and Akkadian follow Wiktionary. Drawings on these plates are schematic.
 */
export interface Plate {
  id: string;
  title: string;
  place: string;
  lede: string;
  paragraphs: string[];
  terms: Term[];
  /** Words that belong to the tradition but not to a drawn part. */
  words?: { english: string; word: Word }[];
  sources: { label: string; url: string }[];
}

export const PLATES: Plate[] = [
  {
    id: "egypt",
    title: "A marsh in stone",
    place: "Egypt, about 2000–1200 BCE",
    lede: "Egyptian columns are plants: bundles of papyrus and lotus stems, palm trunks, a goddess's rattle. The drawing sets six kinds side by side.",
    paragraphs: [
      "The same word, wꜣḏ, means a papyrus stem, a papyrus-shaped column, and 'to be green, to flourish'. In the Great Hypostyle Hall at Karnak, begun under Seti I, twelve open-papyrus columns about 21 metres tall line the central aisle, and 122 closed-bud papyrus columns stand on either side: 134 in all.",
      "Greek travellers gave Egyptian buildings Greek names, and some of them were jokes from the kitchen. πυραμίς is also a cake; ὀβελίσκος is a little roasting spit. The Egyptians called them mr and tḫn.",
      "The sixteen-sided columns of Middle Kingdom rock tombs at Beni Hasan, with their flat abacus and shallow flutes, struck nineteenth-century travellers so much that they called them 'proto-Doric'. Whether Greek builders ever saw them is another question.",
    ],
    terms: [
      {
        id: "papyriform-closed",
        english: "papyrus-bundle column, closed bud",
        words: [
          {
            lang: "egy",
            word: "wꜣḏ",
            romanized: "wadj",
            literal:
              "papyrus stem; usually in the plural, a papyriform column; as a verb, to be green, to flourish",
            source: "Wiktionary, citing Loprieno",
          },
        ],
        note: "Several stems bound together under bands, ending in a closed bud. The Karnak hypostyle has 122 of the closed-bud kind.",
      },
      {
        id: "papyriform-open",
        english: "open papyrus column",
        words: [
          {
            lang: "egy",
            word: "wꜣḏ",
            romanized: "wadj",
            literal: "papyrus; papyriform column",
            source: "Wiktionary",
          },
        ],
        note: "A single stem opening into a bell of an umbel. At Karnak these line the raised central aisle, about 21 metres tall with capitals 5.4 metres across.",
      },
      {
        id: "lotiform",
        english: "lotus column",
        words: [
          {
            lang: "egy",
            word: "zšn",
            romanized: "seshen",
            literal: "lotus flower",
            source: "Wiktionary, citing Allen",
          },
        ],
        note: "A bundle of lotus stems ending in closed buds.",
      },
      {
        id: "palmiform",
        english: "palm column",
        words: [
          {
            lang: "egy",
            word: "jwn",
            romanized: "iwen",
            literal: "pillar, column; one of the mythical pillars that hold up the sky",
            source: "Wiktionary",
          },
        ],
        note: "A smooth trunk crowned by palm fronds tied to it. The general word for a column is jwn, which also names the pillars that hold up the sky.",
      },
      {
        id: "hathoric",
        english: "Hathor column",
        words: [
          {
            lang: "egy",
            word: "ḥwt-ḥr",
            romanized: "Hathor",
            literal: "the goddess Hathor; the name means 'house of Horus'",
            source: "Wiktionary, citing Allen",
          },
          {
            lang: "egy",
            word: "zšš.t",
            romanized: "seshesh",
            literal: "sistrum, a rattle shaken in her worship",
            source: "Wiktionary, citing Wb III 486 and Faulkner 248",
          },
        ],
        note: "The capital is the face of the goddess with cow's ears, crowned by a little shrine: the whole column is a giant sistrum, the rattle shaken for her.",
      },
      {
        id: "protodoric",
        english: "sixteen-sided column ('proto-Doric')",
        words: [
          {
            lang: "grc",
            word: "Δωρικός",
            romanized: "dōrikos",
            literal: "Dorian",
            source: "a nineteenth-century label, not an ancient one",
          },
        ],
        note: "Faceted shafts with a square slab on top, cut in Middle Kingdom tombs at Beni Hasan. Nineteenth-century writers saw in them the ancestor of the Doric column.",
      },
      {
        id: "egypt-abacus",
        english: "abacus",
        words: [
          { lang: "grc", word: "ἄβαξ", romanized: "abax", literal: "slab, board", source: "LSJ" },
        ],
        note: "A square block between capital and architrave, set back so the capital seems to carry nothing.",
      },
    ],
    words: [
      {
        english: "pyramid",
        word: {
          lang: "egy",
          word: "mr",
          literal: "pyramid; the etymology is disputed",
          source: "Wiktionary",
        },
      },
      {
        english: "pyramid (Greek)",
        word: {
          lang: "grc",
          word: "πυραμίς",
          romanized: "pyramis",
          literal: "pyramid (Herodotus 2.8); also a kind of cake (Ephippus)",
          source: "LSJ",
        },
      },
      {
        english: "obelisk",
        word: {
          lang: "egy",
          word: "tḫn",
          romanized: "tekhen",
          literal: "obelisk, since the Pyramid Texts",
          source: "Wiktionary, citing Wb V 326 and Faulkner 301",
        },
      },
      {
        english: "obelisk (Greek)",
        word: {
          lang: "grc",
          word: "ὀβελίσκος",
          romanized: "obeliskos",
          literal: "a small spit, a skewer",
          source: "LSJ",
        },
      },
      {
        english: "pylon",
        word: {
          lang: "egy",
          word: "bḫnt",
          romanized: "bekhenet",
          literal: "pylon, a monumental gateway flanked by two towers",
          source: "Wiktionary, citing Wb I 471 and Faulkner 84",
        },
      },
      {
        english: "pylon (Greek)",
        word: {
          lang: "grc",
          word: "πυλών",
          romanized: "pylōn",
          literal: "gateway; gate-tower",
          source: "LSJ",
        },
      },
      {
        english: "hypostyle",
        word: {
          lang: "grc",
          word: "ὑπόστυλος",
          romanized: "hypostylos",
          literal: "resting on pillars set underneath (Hecataeus of Abdera, writing about Egypt)",
          source: "LSJ",
        },
      },
      {
        english: "broad hall",
        word: {
          lang: "egy",
          word: "wsḫt",
          romanized: "wesekhet",
          literal: "a wide hall or court; also 'breadth'",
          source: "Wiktionary",
        },
      },
      {
        english: "temple",
        word: {
          lang: "egy",
          word: "ḥwt-nṯr",
          romanized: "hut-netjer",
          literal: "temple: ḥwt 'mansion' + nṯr 'god'",
          source: "Wiktionary, citing Faulkner",
        },
      },
    ],
    sources: [
      {
        label: "Digital Karnak (UCLA): the Great Hypostyle Hall",
        url: "https://digitalkarnak.ucsc.edu/hypostyle-hall/",
      },
      {
        label: "Wiktionary: Egyptian wꜣḏ",
        url: "https://en.wiktionary.org/wiki/w%EA%9C%A3%E1%B8%8F",
      },
      {
        label: "P. E. Newberry, Beni Hasan I (1893), Heidelberg digital copy",
        url: "https://digi.ub.uni-heidelberg.de/diglit/newberry1893bd1/0025",
      },
    ],
  },
  {
    id: "mesopotamia",
    title: "A mountain of brick",
    place: "Ur, Mesopotamia, about 2100 BCE",
    lede: "Mesopotamia had clay, reeds and bitumen, and almost no stone or tall timber. Its greatest buildings are solid mountains of brick.",
    paragraphs: [
      "The ziggurat of Ur, built under King Ur-Nammu around 2100 BCE, is a core of sun-dried mud brick wrapped in a skin of baked brick set in bitumen. Three stairways climb to a gateway on the first terrace. Leonard Woolley excavated it between 1922 and 1934; its upper stages are known mostly from a Neo-Babylonian restoration by Nabonidus.",
      "The Akkadian word comes from the verb zaqārum, 'to build high'. The same word could name a mountain peak, and in a Middle Assyrian text, a cake shaped like a ziggurat: Greek and Akkadian both named a pyramid-shaped cake after their tallest buildings.",
      "The Hebrew account of Babel describes exactly this way of building.",
    ],
    terms: [
      {
        id: "ziqqurratu",
        english: "ziggurat",
        words: [
          {
            lang: "akk",
            word: "ziqqurratum",
            romanized: "ziqqurratum",
            literal: "temple tower; a mountain peak; a cake in the shape of a ziggurat",
            source: "Wiktionary, citing the Chicago Assyrian Dictionary",
          },
          {
            lang: "sux",
            word: "u₆-nir",
            romanized: "unir",
            literal: "the Sumerian word the Akkadian translates",
            source: "Wiktionary",
          },
        ],
        note: "From zaqārum, 'to build high'. The stages are solid: there is no room inside, only a shrine on top.",
        deeper: {
          label: "Compare two sources for Babylon's tower in Gonia",
          url: "https://antonsoo.github.io/gonia/babylon.html",
        },
      },
      {
        id: "libittu",
        english: "mud-brick core",
        words: [
          {
            lang: "akk",
            word: "libittum",
            romanized: "libittum",
            literal: "mudbrick, brick",
            source: "Wiktionary; written with the Sumerian sign SIG₄",
          },
        ],
        note: "Sun-dried brick, cheap and quick, but it melts in rain. Hebrew lǝḇēnā, 'brick', is a cognate.",
      },
      {
        id: "agurru",
        english: "baked-brick casing",
        words: [],
        note: "A skin of kiln-fired brick protects the core from rain. Its bricks are laid in bitumen.",
      },
      {
        id: "bitumen",
        english: "bitumen",
        words: [],
        note: "Natural asphalt that seeps from the ground in southern Iraq, used as mortar and waterproofing.",
        quote: {
          text: "And they said one to another, Go to, let us make brick, and burn them throughly. And they had brick for stone, and slime had they for morter.",
          lang: "en",
          translation:
            "'Slime' is bitumen. The builders of Babel burn their bricks and set them in bitumen, as at Ur.",
          cite: "Genesis 11:3, King James Version (1611)",
        },
      },
      {
        id: "stairway",
        english: "the three stairways",
        words: [],
        note: "A central stair runs straight out from the façade; two more climb along the wall and meet it at a gateway on the first terrace.",
      },
      {
        id: "buttress",
        english: "buttresses",
        words: [],
        note: "Shallow piers break up the long walls, which lean slightly inward.",
      },
      {
        id: "shrine",
        english: "the top shrine",
        words: [
          {
            lang: "sux",
            word: "é",
            romanized: "e",
            literal: "house; also a temple, the god's house",
            source: "the ordinary Sumerian word for house",
          },
        ],
        note: "A temple stood on the top terrace. Nothing of it survives, so it is drawn in grey.",
      },
    ],
    sources: [
      {
        label: "Wiktionary: Akkadian ziqqurratum",
        url: "https://en.wiktionary.org/wiki/ziqqurratum",
      },
      { label: "Wiktionary: Akkadian libittum", url: "https://en.wiktionary.org/wiki/libittum" },
    ],
  },
  {
    id: "persia",
    title: "Stone from Elam, carvers from Ionia",
    place: "Persepolis and Susa, about 520–450 BCE",
    lede: "The columned halls of the Persian kings stood on very tall, slender stone columns, each crowned by the foreparts of two bulls that carried the roof beams between their necks.",
    paragraphs: [
      "Darius I's foundation charter for his palace at Susa lists where everything came from: cedar from Lebanon, gold from Sardis and Bactria, lapis lazuli from Sogdiana, ivory from Nubia, Sind and Arachosia. Of the columns it says: 'The stone columns which were here wrought, a village named Abiradu, in Elam -- from there were brought. The stone-cutters who wrought the stone, those were Ionians and Sardians.'",
      "The Ionians were Greeks of the Anatolian coast. Their Old Persian name, Yaunā, became the Persian and Arabic name for Greece, Yūnān. The volutes under the bulls have often been compared with the Ionic capital; the charter says who cut the stone, not whose design it was.",
    ],
    terms: [
      {
        id: "apadana",
        english: "columned hall",
        words: [
          {
            lang: "peo",
            word: "𐎠𐎱𐎭𐎠𐎴",
            romanized: "apadāna",
            literal: "a hypostyle hall; a citadel",
            source:
              "Wiktionary; borrowed into Hebrew and Aramaic, and the ancestor of Persian ayvān",
          },
        ],
        note: "A square hall of many columns, with porticoes on three sides, where the Persian kings received delegations.",
      },
      {
        id: "stuna",
        english: "column",
        words: [
          {
            lang: "peo",
            word: "𐎿𐎬𐎢𐎴𐎠",
            romanized: "stūnā",
            literal: "column, pillar",
            source: "Wiktionary; it survives as Persian sotun",
          },
        ],
        note: "Very tall and slender, fluted, on a bell-shaped base. Several stand at Persepolis today.",
      },
      {
        id: "protome",
        english: "double-bull capital",
        words: [
          {
            lang: "grc",
            word: "προτομή",
            romanized: "protomē",
            literal:
              "the front part cut off: the head and forequarters of an animal, of bulls among others",
            source: "LSJ",
          },
        ],
        note: "Two kneeling bulls set back to back. The beam of the roof rested in the saddle between their necks.",
      },
      {
        id: "persian-volute",
        english: "volutes",
        words: [],
        note: "Paired vertical scrolls between the crown and the bulls. Their form has long been compared with Greek Ionic volutes.",
      },
      {
        id: "crown",
        english: "leaf crown",
        words: [],
        note: "A ring of drooping leaves and an upturned flower at the top of the shaft.",
      },
      {
        id: "bell-base",
        english: "bell base",
        words: [],
        note: "An inverted bell carved with petals, on a stepped plinth.",
      },
      {
        id: "yauna",
        english: "Ionians, the stonecutters",
        words: [
          {
            lang: "peo",
            word: "𐎹𐎢𐎴𐎠",
            romanized: "Yaunā",
            literal: "Ionian, Greek; on Darius's tomb a figure is labelled 'this is a Greek'",
            source: "Wiktionary (DNa)",
          },
          {
            lang: "peo",
            word: "𐎿𐎱𐎼𐎭",
            romanized: "Sparda",
            literal: "Sardis; Lydia",
            source: "Wiktionary",
          },
        ],
        note: "The charter names Ionians and Sardians as the men who cut the stone columns.",
        quote: {
          text: "The stone columns which were here wrought, a village named Abiradu, in Elam -- from there were brought. The stone-cutters who wrought the stone, those were Ionians and Sardians.",
          lang: "en",
          translation:
            "Darius on his palace at Susa. The columns came from Elam; the men who cut them came from the Greek coast and from Lydia.",
          cite: "Darius I, Susa foundation charter (DSf) §3j, tr. R. G. Kent, Old Persian (1953)",
        },
      },
    ],
    sources: [
      {
        label: "Darius I, Susa foundation charter (DSf), Kent's translation at avesta.org",
        url: "https://www.avesta.org/op/op.htm#dsf",
      },
      {
        label: "Wiktionary: Old Persian apadāna",
        url: "https://en.wiktionary.org/wiki/%F0%90%8E%A0%F0%90%8E%B1%F0%90%8E%AD%F0%90%8E%A0%F0%90%8E%B4",
      },
    ],
  },
  {
    id: "india",
    title: "An egg, an umbrella, a railing",
    place: "Sanchi, India, 3rd–1st century BCE",
    lede: "The Great Stupa at Sanchi is a solid dome over relics of the Buddha, enlarged over two centuries and given four carved stone gateways.",
    paragraphs: [
      "Every part has a Sanskrit name with an ordinary meaning: the dome is an egg, its crown a little summer-house, the finial a royal umbrella on a staff. Even stūpa first meant a knot of hair, the crown of the head.",
      "The gateways are carved stone that behaves like carpentry, and an inscription on one of them credits the work to the ivory-workers of Vidisha, the nearby town. Visitors walk round the dome keeping it on their right: pradakṣiṇa.",
    ],
    terms: [
      {
        id: "anda",
        english: "dome",
        words: [
          {
            lang: "sa",
            word: "अण्ड",
            romanized: "aṇḍa",
            literal: "an egg; later also a pinnacle or cupola",
            source: "Monier-Williams, p. 11 and supplement p. 1309",
          },
        ],
        note: "A solid hemisphere of brick and stone over the relic chamber.",
      },
      {
        id: "stupa",
        english: "stupa",
        words: [
          {
            lang: "sa",
            word: "स्तूप",
            romanized: "stūpa",
            literal:
              "a knot or tuft of hair, the crown of the head, a summit; then a heap of earth or bricks, especially a Buddhist monument",
            source: "Monier-Williams, p. 1260",
          },
        ],
        note: "The whole monument. Monier-Williams compares Greek στύπος, a stump.",
      },
      {
        id: "medhi",
        english: "drum terrace",
        words: [
          {
            lang: "sa",
            word: "मेधि",
            romanized: "medhi",
            literal:
              "a variant of methi: a pillar or post, especially the one in the middle of a threshing floor to which oxen are tied",
            source: "Monier-Williams, p. 832",
          },
        ],
        note: "The raised terrace round the base of the dome, with its own railing and a double stair. Archaeologists use the name for this terrace.",
      },
      {
        id: "harmika",
        english: "harmikā",
        words: [
          {
            lang: "sa",
            word: "हर्मिका",
            romanized: "harmikā",
            literal: "a summer-house on a stūpa",
            source: "Monier-Williams, p. 1292, citing the Divyāvadāna",
          },
        ],
        note: "The square railing on top of the dome.",
      },
      {
        id: "yashti",
        english: "mast",
        words: [
          {
            lang: "sa",
            word: "यष्टि",
            romanized: "yaṣṭi",
            literal: "any support: a staff, pole, pillar, flagstaff, stalk",
            source: "Monier-Williams",
          },
        ],
        note: "The shaft that carries the umbrellas.",
      },
      {
        id: "chattra",
        english: "umbrellas",
        words: [
          {
            lang: "sa",
            word: "छत्त्र",
            romanized: "chattra",
            literal: "umbrella, parasol, an emblem of royal power",
            source: "Monier-Williams",
          },
        ],
        note: "Three stone parasols, honours fit for a king.",
      },
      {
        id: "vedika",
        english: "railing",
        words: [
          {
            lang: "sa",
            word: "वेदिका",
            romanized: "vedikā",
            literal: "a seat or bench; a sacrificial ground, altar; a balcony",
            source: "Monier-Williams, p. 1017",
          },
        ],
        note: "Stone posts and three rails, mortised like a wooden fence. Monier-Williams does not give the sense 'railing'; it is the archaeologists' name for this enclosure.",
      },
      {
        id: "torana",
        english: "gateway",
        words: [
          {
            lang: "sa",
            word: "तोरण",
            romanized: "toraṇa",
            literal: "an arch, an arched doorway, a portal; festoons over doorways",
            source: "Monier-Williams, p. 456",
          },
        ],
        note: "Two posts and three curved beams whose ends run through the posts like timber joints, carved with stories of the Buddha.",
      },
      {
        id: "pradakshina",
        english: "the walk round",
        words: [
          {
            lang: "sa",
            word: "प्रदक्षिण",
            romanized: "pradakṣiṇa",
            literal: "turning the right side towards; circumambulation from left to right",
            source: "Monier-Williams, p. 679",
          },
        ],
        note: "The paved path inside the railing, walked clockwise.",
      },
    ],
    sources: [
      {
        label: "Monier-Williams Sanskrit–English Dictionary (Cologne digital edition)",
        url: "https://www.sanskrit-lexicon.uni-koeln.de/scans/MWScan/2020/web/",
      },
      { label: "MAP Academy: the gateways of Sanchi", url: "https://mapacademy.io/?p=3012" },
    ],
  },
  {
    id: "china",
    title: "Brackets that survive only in clay",
    place: "China, Han dynasty, 206 BCE – 220 CE",
    lede: "Han halls were timber on rammed-earth platforms, and none survives. China's oldest standing timber hall dates from 782 CE. What we know of earlier building comes from tomb models in clay and from stone that imitates wood.",
    paragraphs: [
      "The characteristic Chinese support is not a capital but a bracket set: blocks shaped like grain measures, carrying arms that reach out to catch the eaves. Han pottery towers buried in tombs show them clearly.",
      "The words are everyday ones. The bracket block is 斗, the measure for a peck of grain and the Big Dipper; the roof is built of 瓦, tiles, ending in round 瓦當, tile-ends, often stamped with wishes.",
    ],
    terms: [
      {
        id: "tai",
        english: "platform",
        words: [
          {
            lang: "zh",
            word: "台",
            romanized: "tái",
            literal: "raised terrace, platform",
            source: "common Chinese",
          },
        ],
        note: "Halls stood on terraces of rammed earth faced with brick or stone.",
      },
      {
        id: "chu",
        english: "column base",
        words: [
          {
            lang: "zh",
            word: "礎",
            romanized: "chǔ",
            literal: "plinth; foundation, base, cornerstone",
            source: "Wiktionary",
          },
        ],
        note: "A stone under each post keeps the timber off the damp ground.",
      },
      {
        id: "zhu",
        english: "post",
        words: [
          {
            lang: "zh",
            word: "柱",
            romanized: "zhù",
            literal: "pillar, post",
            source: "common Chinese",
          },
        ],
        note: "Timber posts carry the roof; the walls between them carry nothing.",
      },
      {
        id: "dou",
        english: "bracket block",
        words: [
          {
            lang: "zh",
            word: "斗",
            romanized: "dǒu",
            literal: "a dipper, a cup; the dou, a peck measure for grain; the Big Dipper",
            source: "Wiktionary",
          },
          {
            lang: "zh",
            word: "枓",
            romanized: "dǒu",
            literal: "a ladle; a supporting bracket in wooden building",
            source: "Wiktionary",
          },
        ],
        note: "A block shaped like a grain measure, cut to seat the arm above it.",
      },
      {
        id: "gong",
        english: "bracket arm",
        words: [
          {
            lang: "zh",
            word: "栱",
            romanized: "gǒng",
            literal:
              "a large peg; a post; an arch; a square timber used for support in traditional buildings",
            source: "Wiktionary",
          },
        ],
        note: "A curved arm resting on a block, with smaller blocks on its ends. Together, block and arm make a bracket set, dǒugǒng.",
      },
      {
        id: "dougong",
        english: "bracket set",
        words: [
          {
            lang: "zh",
            word: "斗栱",
            romanized: "dǒugǒng",
            literal: "block-and-arm: the bracket set",
            source: "Wiktionary (斗拱)",
          },
          {
            lang: "zh",
            word: "欂櫨",
            romanized: "bólú",
            literal: "an older word for the bracket set; 櫨 alone is a supporting block",
            source: "Wiktionary",
          },
        ],
        note: "Bracket sets let the eaves reach far out, keeping rain off timber walls and earth platforms.",
      },
      {
        id: "yan",
        english: "eaves",
        words: [
          {
            lang: "zh",
            word: "檐",
            romanized: "yán",
            literal: "eaves of a house; brim, rim, edge",
            source: "Wiktionary",
          },
        ],
        note: "Deep overhanging eaves, carried on the brackets.",
      },
      {
        id: "wa",
        english: "roof tiles",
        words: [
          {
            lang: "zh",
            word: "瓦",
            romanized: "wǎ",
            literal: "tile; baked clay",
            source: "common Chinese",
          },
        ],
        note: "Rows of curved tiles, laid alternately concave and convex.",
      },
      {
        id: "wadang",
        english: "tile-ends",
        words: [
          {
            lang: "zh",
            word: "瓦當",
            romanized: "wǎdāng",
            literal: "eaves tile, roof tile-end",
            source: "Wiktionary",
          },
        ],
        note: "Round discs closing the tile rows, stamped with patterns or auspicious words.",
      },
      {
        id: "que",
        english: "gate towers",
        words: [
          {
            lang: "zh",
            word: "闕",
            romanized: "què",
            literal: "watchtower flanking both sides of a palace gate; an imperial palace",
            source: "Wiktionary",
          },
        ],
        note: "Han tombs and palaces had pairs of towers at their gates. Stone ones survive in Sichuan, carved to look like timber buildings.",
      },
    ],
    sources: [
      { label: "Wiktionary: 斗, 栱, 闕, 瓦當", url: "https://en.wiktionary.org/wiki/%E6%A0%B1" },
      {
        label: "Que (tower): stone gate-towers of the Han",
        url: "https://en.wikipedia.org/wiki/Que_(tower)",
      },
    ],
  },
  {
    id: "mexico",
    title: "Seven temples in one",
    place: "Tenochtitlan, Mexico, 1325–1521 CE",
    lede: "The Great Temple of the Aztec capital was rebuilt seven times, each new pyramid built over and around the last. Excavation has peeled the layers back.",
    paragraphs: [
      "Two shrines stood side by side on the summit, each with its own stair: Tlaloc, god of rain, on one side, and Huitzilopochtli, the city's war god, on the other. The Metropolitan Museum dates the first phase to the founding of Tenochtitlan in 1325; later rulers enlarged it again and again, sometimes because the lakebed beneath it sank.",
      "Nahuatl builds the name from plain words: teō- 'god' and calli 'house'. Archaeologists describe Mesoamerican platforms with two Spanish words, talud, 'slope', and tablero, 'board', for the sloping and vertical faces of each terrace.",
    ],
    terms: [
      {
        id: "teocalli",
        english: "temple pyramid",
        words: [
          {
            lang: "nah",
            word: "teōcalli",
            romanized: "teocalli",
            literal: "a temple; teōtl 'divinity' + calli 'house'",
            source: "Online Nahuatl Dictionary, citing Molina (1571)",
          },
          { lang: "nah", word: "huēyi", romanized: "huey", literal: "great", source: "Nahuatl" },
        ],
        note: "Huēyi Teōcalli, the Great Temple: a stepped platform carrying two shrines.",
      },
      {
        id: "phase",
        english: "earlier temples inside",
        words: [],
        note: "Seven construction phases, each sealed inside the next. The second phase survives with its shrines; the last is known mostly from Spanish accounts.",
      },
      {
        id: "tlaloc",
        english: "shrine of Tlaloc",
        words: [
          {
            lang: "nah",
            word: "Tlāloc",
            romanized: "Tlaloc",
            literal: "the rain god",
            source: "Nahuatl",
          },
        ],
        note: "The rain god's shrine, linked by the Metropolitan Museum to his mountain of sustenance.",
      },
      {
        id: "huitzilopochtli",
        english: "shrine of Huitzilopochtli",
        words: [
          {
            lang: "nah",
            word: "Huītzilōpōchtli",
            romanized: "Huitzilopochtli",
            literal: "the war and sun god of the Mexica",
            source: "Nahuatl",
          },
        ],
        note: "The war god's shrine, standing for Coatepec, the serpent mountain of his birth.",
      },
      {
        id: "stair",
        english: "twin stairs",
        words: [],
        note: "Two parallel stairs, one to each shrine, between sloping balustrades.",
      },
      {
        id: "talud",
        english: "talud (slope)",
        words: [],
        note: "Spanish 'slope': the battered face of each terrace.",
      },
      {
        id: "tablero",
        english: "tablero (panel)",
        words: [],
        note: "Spanish 'board': a vertical framed panel set above each slope. Talud and tablero together are the hallmark of Teotihuacan, centuries before the Aztecs; drawn here beside the Great Temple for comparison.",
      },
      {
        id: "calli",
        english: "house",
        words: [
          {
            lang: "nah",
            word: "calli",
            romanized: "calli",
            literal: "house, hut, building, room, container; also a day sign",
            source: "Online Nahuatl Dictionary, citing Lockhart",
          },
          {
            lang: "nah",
            word: "teōtl",
            romanized: "teotl",
            literal: "a divine or sacred force; a deity",
            source: "Online Nahuatl Dictionary, citing Molina",
          },
        ],
        note: "The two words that make teōcalli, the god-house.",
      },
    ],
    words: [
      {
        english: "skull rack",
        word: {
          lang: "nah",
          word: "tzompantli",
          romanized: "tzompantli",
          literal: "skull rack",
          source: "Online Nahuatl Dictionary",
        },
      },
    ],
    sources: [
      {
        label: "The Met, Heilbrunn Timeline: Tenochtitlan, Templo Mayor",
        url: "https://www.metmuseum.org/toah/hd/teno_2/teno_4.htm",
      },
      {
        label: "Online Nahuatl Dictionary: teocalli",
        url: "https://nahuatl.wired-humanities.org/content/teocalli",
      },
    ],
  },
];
