raven.ipl -- a bigram Markov text generator in IPL-V, trained on THE RAVEN

WHAT IT DOES
  The first two stanzas of Poe's "The Raven" (12 lines, about 115 words, 83
  distinct) are built into the program as data.  When run it:
    1. TRAINS: walks the text once and, for every pair of adjacent words,
       adds one to a count of "word B followed word A".  Each word is an IPL-V
       list whose description list maps each successor word to its count.
    2. PRINTS the continuation table: every word followed by each of its
       successors and their counts.
    3. GENERATES 100 words: starting from the first word, it repeatedly asks
       the IPL-V library routine J16 to pick one successor of the current word
       at random, with probability proportional to the counts, and prints it.
  Nothing in it knows what a word means; it only knows what has followed what.

HOW TO RUN (browser emulator or CLI): load these four card decks, in order
    1. software/IPL-V/Mod-3-4/IPL-V-Interpreter-Mod-3-4-Deck-1.card
    2. raven.ipl
    3. software/IPL-V/IPL-V-Subroutines.card
    4. software/IPL-V/Mod-3-4/IPL-V-Interpreter-Mod-3-4-Deck-2.card
  40000 digits of core (the emulator default) is enough.

OUTPUT
  The program prints on the card punch.  Words are longer than an IPL-V
  alphanumeric data term (5 characters), so each word is printed as a short run
  of pieces of up to 4 letters; a "+" flag begins a word and a "-" flag continues
  it.  The continuation table comes first (each word's line ends with a
  "****" separator), followed by the 100 generated words.  Because the choice
  is random, the generated text differs from run to run.

  The "OVERLAP" message that appears on the typewriter is benign and can be
  ignored.

RELATED FILES
  raven_commented.ipl  the same program with a comment card per step, for reading
  mkdeck.py            generates both decks from raven.txt
                         python3 mkdeck.py [nlines=12] [steps=100]
                             [--lspace=900] [--no-table] [--no-comments]
                             [--out=raven_commented.ipl]
                       (raven.ipl = "--no-comments --out=raven.ipl")
  raven.txt            the poem;  raven.vocab  word -> symbol (Tn) map

CARD FORMAT NOTE
  Cards use only characters the browser card reader accepts: uppercase A-Z,
  0-9, space and  . ) + $ * - / , ( = @ | } ! "
