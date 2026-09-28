// Name pools for crew, riggers and the tender naming screen.
// Linefolk names are warm and a little odd: two hundred years of shift rosters, first packets and nicknames that stuck.

export const GIVEN_NAMES: string[] = [
  "Imre", "Maud", "Tobiah", "Wenna", "Ossian", "Pim", "Hester", "Brannoch", "Quill", "Linnet",
  "Aurel", "Dace", "Senna", "Tamsin", "Idris", "Fenwick", "Ottilie", "Casimir", "Juno", "Bram",
  "Elspeth", "Nell", "Oona", "Tobi", "Wilder", "Ysolde", "Corin", "Mabli", "Anselm", "Petra",
  "Rafe", "Hallam", "Isaure", "Kestrel", "Loveday", "Merrin", "Nico", "Orla", "Perrin", "Rosalind",
  "Sabeth", "Teodor", "Ulla", "Vesna", "Wystan", "Xanthe", "Yarrow", "Zelie", "Agnetha", "Barnaby",
  "Cosmo", "Delphine", "Emrys", "Fable", "Gethin", "Honor", "Ilar", "Jory", "Kit", "Lark",
  "Mungo", "Noor", "Obadiah", "Pansy", "Quintus", "Ruth", "Solomon", "Tilly", "Umar", "Viggo",
  "Wren", "Ada", "Birgit", "Cato", "Dilys", "Ebbe", "Faro", "Greta", "Hamish", "Ines",
  "Jessamy", "Konrad", "Lise", "Marek", "Nesta", "Odile", "Piet", "Romilly", "Sigrid", "Tancred",
  "Ursel", "Veda", "Willa", "Yannick", "Zeno", "Thursday", "Morrow", "Ember", "Kettle", "Hollis",
  "Sparrow", "Tuesday", "Farthing", "Bede", "Clemency", "Duncan", "Edda", "Fitz", "Gwen", "Ivo",
];

export const FAMILY_NAMES: string[] = [
  "Varga", "Tallis", "Corran", "Seldon", "Mirrow", "Adair", "Brisk", "Fairweather", "Coldharbour", "Lampwright",
  "Spooler", "Crimp", "Tollgate", "Ninegate", "Oakes", "Pennick", "Senna", "Salk", "Dunmore", "Rook",
  "Vale", "Ossery", "Marl", "Tamsyn", "Quillon", "Hask", "Brennock", "Carvell", "Dray", "Everley",
  "Fosse", "Gantry", "Hollin", "Ironside", "Jessop", "Kell", "Latchford", "Mallory", "Nettle", "Orrin",
  "Pollard", "Quarry", "Rushlight", "Sutter", "Threlkeld", "Underhill", "Voss", "Winch", "Yarrowby", "Zell",
  "Halfpenny", "Eastlake", "Copperwaite", "Longwire", "Sevenways",
];

/** Birds the Night Shift name riggers after (a serial number and a bird, e.g. "Rigger 7-Tern"). */
export const DESIGNATION_BIRDS: string[] = [
  "Tern", "Wren", "Stint", "Plover", "Knot", "Dunlin", "Petrel", "Shag", "Linnet", "Pipit",
  "Rook", "Jay", "Finch", "Swift", "Martin", "Snipe", "Curlew", "Heron", "Gannet", "Auk",
  "Merlin", "Kite", "Owl", "Dipper", "Chough", "Grebe", "Egret", "Lark", "Robin", "Starling",
];

export const RIGGER_DESIGNATIONS: string[] = [
  "Rigger 7-Tern", "Rigger 2-Wren", "Rigger 11-Stint", "Rigger 4-Plover", "Rigger 9-Knot",
  "Rigger 3-Dunlin", "Rigger 16-Petrel", "Rigger 5-Shag", "Rigger 8-Rook",
  "Rigger 1-Jay", "Rigger 14-Finch", "Rigger 6-Swift", "Rigger 21-Martin", "Rigger 10-Snipe",
  "Rigger 13-Curlew", "Rigger 17-Heron", "Rigger 19-Gannet", "Rigger 22-Auk", "Rigger 15-Merlin",
  "Rigger 23-Kite", "Rigger 18-Owl", "Rigger 24-Dipper", "Rigger 27-Chough", "Rigger 30-Grebe",
  "Rigger 31-Egret", "Rigger 26-Lark", "Rigger 29-Robin", "Rigger 33-Starling", "Rigger 40-Linnet",
];

// Full names per species (the campaign's name picker reads these first; GIVEN/FAMILY are the raw pools).

export const LINEFOLK_NAMES: string[] = [
  "Oona Brisk", "Imre Salk", "Tobiah Fairweather",
  "Quill Nettle", "Aurel Winch", "Idris Halfpenny",
  "Casimir Dray", "Juno Pennick", "Bram Everley", "Elspeth Fosse", "Nell Mallory", "Tobi Senna",
  "Ysolde Kell", "Corin Hollin", "Mabli Orrin", "Petra Voss", "Rafe Jessop",
  "Merrin Threlkeld", "Orla Eastlake", "Perrin Longwire", "Rosalind Spooler",
  "Wystan Copperwaite", "Yarrow Sevenways", "Barnaby Tollgate", "Delphine Rushlight", "Honor Lampwright",
  "Jory Zell", "Kit Underhill", "Lark Coldharbour", "Mungo Ninegate", "Tilly Winch", "Thursday Vale",
  "Morrow Salk", "Kettle Oakes", "Sparrow Dunmore", "Fable Tamsyn", "Ivo Carvell",
];

export const WARDEN_NAMES: string[] = [
  "Hallam Ironside", "Vesna Kell", "Konrad Threlkeld", "Tancred Fosse", "Ursel Brennock",
  "Greta Latchford", "Hamish Quarry", "Birgit Gantry", "Marek Winch", "Edda Pollard", "Solomon Dray",
  "Honor Mallory", "Duncan Everley", "Agnetha Sutter", "Viggo Eastlake", "Cato Nettle",
  "Ruth Underhill", "Emrys Jessop",
];

export const COURIER_NAMES: string[] = [
  "Kestrel Oakes", "Wren Pennick", "Nico Spooler", "Zelie Longwire", "Faro Tollgate", "Jessamy Fairweather",
  "Kit Sevenways", "Lise Carvell", "Piet Halfpenny", "Romilly Marl", "Fitz Rushlight", "Gwen Latchford",
  "Ilar Copperwaite", "Yannick Ninegate", "Willa Orrin", "Zeno Dunmore", "Tuesday Crimp",
  "Farthing Hask", "Bede Coldharbour",
];

/** Bellmakers often go by their bell: the one they tuned first. */
export const BELLMAKER_NAMES: string[] = [
  "Isaure of the North Bell", "Aurel Quarter-Tone", "Linnet of Pane Forty",
  "Oswin of the Birth Bell", "Sabeth of the Thursday Bell", "Ebbe Rushlight", "Honor Tamsyn",
  "Perrin of the Small Bell", "Oriel Vantongeren", "Sella of the Wedding Bell", "Brisca Tamsyn", "Hollis Quire",
];

/** Names for relays on the stage map (the {relay} placeholder). Neutral enough for any stage. */
export const RELAY_NAMES: string[] = [
  "Relay 212", "Lampstand Nine", "Keel Relay", "Relay Forty", "Sevenways", "Quiet Lamp", "Relay 3-West",
  "Old Tally", "Halfway Lamp", "Relay 118", "Long Throw", "Tallow Lamp", "Relay 61", "Crossbeam",
  "Second Lamp", "Relay 7-East", "Knot Relay", "Slack Line", "Relay 404", "Lamp of the Short Shift",
  "Relay 90", "Guide Nine", "Twin Lamps", "Relay 23", "Brasswork", "Relay 1,006", "Hook Relay",
  "Relay 77", "Late Lamp", "Kettle Relay", "Relay 5-North", "Thrum", "Relay 300", "Near Lamp", "Far Lamp",
  "Relay 14", "Burnt Wick", "Relay 202", "Low Beam", "High Beam", "Relay 8", "Stamp Relay", "Relay 443",
  "Candle Relay", "Relay 1,440", "Last Reel", "Relay 33", "Spool Relay",
];

/** Suggestions for the tender naming screen. The dock plate keeps the car's own name (Lamplighter, Glasswing or
 * Switchback) underneath, so no suggestion repeats a dock name. */
export const TENDER_NAMES: string[] = [
  "Second Shift", "Kettle On", "Received", "Keepalive", "Small Hours", "Good Crimper",
  "Next Shift", "Hello Again", "Window Seat", "Thursday", "Quarter Tone", "Late Answer", "Paid Mostly",
  "Leave It Lit", "Still Here", "Return Trip", "Night Relief", "Fair Prices", "Sixteen Hops",
];

/** Default tender name (the Lamplighter's dock name; the other cars default to their own). */
export const DEFAULT_TENDER_NAME = "Lamplighter";
