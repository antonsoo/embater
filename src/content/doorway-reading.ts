export const DOOR_PASSAGES = [
  {
    id: "kinds",
    cite: "IV.6.1",
    page: 88,
    latin: "genera sunt enim thyromaton haec: doricum, ionicum, atticurges.",
    english: "For these are the kinds of doorway: Doric, Ionic and Attic.",
    note: "Thyromaton is Greek in Latin letters. This desk draws only the Doric and Ionic proportions; it does not supply an Attic doorway.",
  },
  {
    id: "height",
    cite: "IV.6.1",
    page: 88,
    latin:
      "lumen autem thyretri constituatur sic, uti quae altitudo aedis a pavimento ad lacunaria fuerit, dividatur in partes tres semis et ex eis duae partes ⟨semis⟩ lumini valvarum altitudine constituantur.",
    english:
      "Set the opening of the doorway as follows: divide the temple’s height from the pavement to the coffered ceiling into three and a half parts; of these, let two ⟨and a half⟩ parts establish the height of the opening for the doors.",
    note: "Krohn prints the second semis inside angle brackets. His apparatus credits its addition to Rode. With it, (2½)/(3½) = 5/7; omit only that supplement and 2/(3½) = 4/7. These are two readings of this instruction, not two complete recovered buildings or two uniform manuscript traditions.",
  },
  {
    id: "width",
    cite: "IV.6.1",
    page: 88,
    latin:
      "haec autem dividatur in partes xii et ex eis quinque et dimidia latitudo luminis fiat in imo.",
    english:
      "Divide this [height] into twelve parts, and let five and a half of them be the width of the opening at the bottom.",
    note: "The Doric lower opening is 5½/12 = 11/24 of its height. Luminis means ‘of the opening’: this width excludes both stone jambs.",
  },
  {
    id: "taper",
    cite: "IV.6.1",
    page: 88,
    latin:
      "et in summo contrahatur, si erit lumen ab imo ad sedecim pedes, antepagmenti iii parte; ⟨si⟩ xvi pedum ad xxv, superior pars luminis contrahatur antepagmenti parte iiii; si ab pedibus xxv ad xxx, summa pars contrahatur antepagmenti parte viii. reliqua, quo altiora erunt, ad perpendiculum videntur oportere conlocari.",
    english:
      "At the top let it narrow, if the opening is up to sixteen feet high from the bottom, by a third of the casing; from sixteen feet to twenty-five, let the upper part of the opening narrow by a quarter of the casing; from twenty-five to thirty feet, by an eighth. The remaining, taller ones seem to require perpendicular sides.",
    note: "The fraction is of the jamb, not the opening or its height. This desk subtracts it once from the whole opening width and splits that loss equally between the two sides. The ranges share endpoints: this desk keeps 16, 25 and 30 in the lower band. That boundary convention and the symmetric allocation are modelling decisions. No interpolation between bands is implied.",
  },
  {
    id: "jamb",
    cite: "IV.6.2",
    page: 88,
    latin:
      "ipsa autem antepagmenta * * * * contrahantur in summo suae crassitudinis xiiii parte. supercilii crassitudo, quanta antepagmentorum in summa parte erit crassitudo.",
    english:
      "The casings themselves [gap in the text] are to narrow at the top by a fourteenth of their own width. The lintel’s thickness is to be as much as the casings’ width at their upper end.",
    note: "The stars reproduce Krohn’s marked lacuna, not a passage omitted for brevity. The jamb loses 1/14 of its own lower width, independently of the opening’s contraction. The desk draws the lintel height as that upper jamb width and omits the overdoor mouldings.",
  },
  {
    id: "ionic",
    cite: "IV.6.3",
    page: 89,
    latin:
      "Sin autem ionico genere futura erunt, lumen altum ad eundem modum quemadmodum in doricis fieri videtur. latitudo constituatur, ut altitudo dividatur in partes duas et dimidiam, eiusque partis unius ima luminis fiat latitudo. contracturae ita uti in doricis. crassitudo antepagmentorum ⟨ex⟩ altitudine luminis in fronte xiiii parte",
    english:
      "If they are to be Ionic, the opening’s height seems to be made in the same way as in Doric. Set the width by dividing the height into two and a half parts and giving the lower opening one of them. The contractions are as in Doric. The width of the casings on their face is a fourteenth of the opening’s height.",
    note: "The print on p. 89 reads XIIII, fourteen, rather than XII, twelve. This fixes the Ionic lower jamb at H/14. For Doric, the desk explicitly borrows that Ionic value across the lacuna; it does not silently supply missing Latin. Ionic lower width is H/2½ = 2H/5. Consoles, fasciae and door leaves are outside this diagram.",
  },
] as const;

export const DOOR_TERMS = [
  {
    id: "opening",
    latin: "lumen",
    title: "The opening",
    form: "luminis: ‘of the opening’",
    text: "The clear space through the wall. The Doric width sentence measures this empty space at its foot; adding two jambs would measure something else. The more general Latin sense is ‘light’.",
    cite: "IV.6.1, p. 88",
    passage: "width",
    dictionary: "lumen",
  },
  {
    id: "jamb",
    latin: "antepagmentum",
    title: "The casing",
    form: "antepagmenti: ‘of the casing’",
    text: "The doorway surround; here the side pieces are the jambs. Its width supplies the unit for narrowing the opening. Its own narrowing follows a different fraction, one fourteenth.",
    cite: "IV.6.1–3, pp. 88–89",
    passage: "jamb",
    dictionary: "antepagmentum",
  },
  {
    id: "lintel",
    latin: "supercilium",
    title: "The lintel",
    form: "supercilii: ‘of the lintel’",
    text: "An ‘eyebrow’ above the doorway. The text relates its thickness to the upper end of the casing. The drawing shows that relation but leaves the mouldings and the frieze above it aside.",
    cite: "IV.6.2, p. 88",
    passage: "jamb",
    dictionary: "supercilium",
  },
  {
    id: "ceiling",
    latin: "lacunaria",
    title: "The coffered ceiling",
    form: "ad lacunaria: ‘to the coffered ceiling’",
    text: "This is the upper end of the height being divided. The opening height is a fraction of the distance from the pavement to this ceiling; it is not a fraction of the columns or the roof ridge.",
    cite: "IV.6.1, p. 88",
    passage: "height",
    dictionary: "lacunar",
  },
  {
    id: "taper",
    latin: "contrahatur",
    title: "Let it narrow",
    form: "Present passive subjunctive of contraho",
    text: "A prescription: ‘let it be drawn together’. Identify what is being narrowed and what supplies the fraction. The opening narrows by a fraction of a jamb; the jamb narrows by a fraction of itself.",
    cite: "IV.6.1–2, p. 88",
    passage: "taper",
    dictionary: "contraho",
  },
  {
    id: "doors",
    latin: "valvae",
    title: "The door leaves",
    form: "valvarum: ‘of the doors’",
    text: "The doors that close the opening. The Latin distinguishes these from the lumen. Door-leaf construction appears later in IV.6; the drawing deliberately leaves the opening empty.",
    cite: "IV.6.1, p. 88",
    passage: "height",
    dictionary: "valva",
  },
  {
    id: "greek",
    latin: "thyromaton",
    title: "A Greek word inside the Latin",
    form: "Greek θυρωμάτων, genitive plural of θύρωμα",
    text: "Vitruvius names Doric, Ionic and Attic kinds of doorway with this Greek genitive plural, ‘of doorways’. Krohn prints the word in Latin letters on p. 88; the accented Greek here is the dictionary form, not a quotation of Greek lettering on the scan.",
    cite: "IV.6.1, p. 88",
    passage: "kinds",
    dictionary: "θύρωμα",
  },
] as const;
export type DoorTerm = (typeof DOOR_TERMS)[number]["id"];
