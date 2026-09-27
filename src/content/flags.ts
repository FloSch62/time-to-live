// Run flags shared across stages (set and read by events; the campaign only stores them).
// Stage-local flags are declared next to the events that use them (see events/index.ts, ALL_FLAGS).
// Every flag used anywhere in content must be declared in one of these records (validated by content.test.ts).

export const CORE_FLAGS: Record<string, string> = {
  // Guardians (set by each stage's exit aftermath event; the campaign may use them for the stage transition)
  "guardian-1-ended": "The Iron Regent's task ended; the Copper Gate is open.",
  "guardian-2-ended": "The Hollow Choir's task ended; the voices left the glass.",
  "guardian-3-ended": "The Blackout Core's task ended; the queue is released (ending follows).",

  // Chain: the evening caller
  "evening-frequency": "The tender's radio has found the evening caller's frequency.",
  "answer-queued": "The crew queued a reply to the evening caller; it goes out with the queue.",

  // Chain: the music box
  "music-box": "The crew carry the music box from the Reach sorting office.",
  "music-box-wound": "The music box was wound in the Glass Cathedral.",
  "music-box-sent": "The music box went down a spire's freight rail to the collection desk below.",

  // Chain: the courier's log and the Kittiwake
  "courier-log-1": "Read the first pages of the courier's logbook (Stage I).",
  "courier-log-2": "Found the Kittiwake and read the rest of the log (Stage II).",
  "courier-log-3": "Found the courier's last entry near the Heart (Stage III).",
  "kittiwake-lit": "Left the Kittiwake's lamp lit and let it run its round.",
  "kittiwake-rested": "Finished the Kittiwake's round and put its lamp out, as the lampers' rule says.",

  // Chain: Moss Adair and the Second Helping
  "moss-met": "Met the Second Helping in the Reach.",
  "moss-owes": "Spared or helped Moss Adair's crew. They remember.",
  "moss-robbed": "Took everything the Second Helping had. They remember that too.",
  "moss-paid": "Moss paid back what he owed (Stage II).",
  "moss-decoy": "The Second Helping drew the Seal off for a while (Stage III).",

  // Pell
  "pell-letter": "Carrying Pell's letter to A. Varga, to be posted into the queue.",
  "pell-letter-posted": "Pell's letter is in the queue.",
  "pell-crimper": "Varga's crimper is aboard, bought (or otherwise) from Pell.",

  // The Lamplighter
  "corran-berth": "Found the harbour master's message to Ilse Corran, the Lamplighter's last chief.",
};
