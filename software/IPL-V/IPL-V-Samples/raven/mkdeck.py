#!/usr/bin/env python3
"""Tokenize the first N lines of raven.txt and emit raven_commented.ipl (+ raven.vocab).
usage: mkdeck.py [nlines=12] [steps=100] [--lspace=900] [--no-table] [--no-comments] [--out=raven_commented.ipl]
Words -> regional symbols T1..Tn (first-seen order); the text is a data list X1;
each word gets an empty successor list named by its own symbol. The IPL-V
program trains (appends each word to its predecessor's list) and generates.
Long explanations go on TYPE-1 comment cards (text in cols 7-40, '1' in col 41)."""
import re, sys, textwrap

def card(comment="", typ="", name="", pq="", symb="", link=""):
    s = [" "] * 80
    def put(col, txt):
        for i, c in enumerate(txt): s[col - 1 + i] = c
    comment = re.sub(r"[^A-Z0-9.)*$(,=@+\-/ ]", " ", comment.upper())   # only characters the 1620 card reader accepts
    put(7, comment[:34]); put(41, typ); put(43, name); put(49, pq); put(51, symb)
    if link != "": put(57, link)
    return "".join(s).rstrip()

def const(comment, name, value):            # integer data term, value right-justified to col 61
    s = [" "] * 80
    comment = re.sub(r"[^A-Z0-9.)*$(,=@+\-/ ]", " ", comment.upper())
    for i, c in enumerate(comment[:34]): s[6 + i] = c
    s[42], s[43], s[48], s[49] = name[0], name[1], "0", "1"
    v = str(value)
    for i, c in enumerate(v): s[61 - len(v) + i] = c
    return "".join(s).rstrip()

args = [a for a in sys.argv[1:] if not a.startswith("--")]
table = "--no-table" not in sys.argv
nocomm = "--no-comments" in sys.argv        # omit the type-1 comment cards (faster loading)
out = ([a.split("=")[1] for a in sys.argv if a.startswith("--out=")] or ["raven_commented.ipl"])[0]
lspace = int(([a.split("=")[1] for a in sys.argv if a.startswith("--lspace=")] or ["900"])[0])
nlines = int(args[0]) if len(args) > 0 else 12
steps = int(args[1]) if len(args) > 1 else 100
lines = [l for l in open("raven.txt", encoding="utf-8").read().split("\n") if l.strip()][:nlines]
words = re.findall(r"[a-z']+", " ".join(lines).lower())
vocab = {}
for w in words: vocab.setdefault(w, "T%d" % (len(vocab) + 1))
text = [vocab[w] for w in words]
assert len(vocab) < 300
pterms, wpieces = [], {}                    # text pieces: alnum terms V1..Vp; word -> its piece names
for w in vocab:
    t = re.sub(r"[^a-z]", "", w).upper() or "X"
    ch = [("+" if k == 0 else "-") + t[k:k + 4] for k in range(0, len(t), 4)]
    names = []
    for c in ch:
        pterms.append(("V%d" % (len(pterms) + 1), c)); names.append(pterms[-1][0])
    wpieces[w] = names
open("raven.vocab", "w").write("\n".join("%s %s" % (v, w) for w, v in vocab.items()) + "\n")

def alnum(name, text):                       # alphanumeric data term: PQ=21, <=5 chars in the SYMB field
    s = [" "] * 80; s[48], s[49] = "2", "1"
    for i, c in enumerate(name): s[42 + i] = c
    for i, c in enumerate(text[:5]): s[50 + i] = c
    return "".join(s).rstrip()

L = []
def C(*paras):                               # type-1 comment cards, wrapped to 34 cols
    if nocomm: return
    for p in paras:
        for ln in textwrap.wrap(p, 34) or [""]: L.append(card(ln, typ="1"))
def I(pq="", symb="", name="", link="", c=""):
    L.append(card(c, name=name, pq=pq, symb=symb, link=link))

L.append(card("RAVEN4: TRAIN + GENERATE", typ="9"))
C("BIGRAM MARKOV TEXT GENERATOR USING DESCRIPTION LISTS.",
  "TEXT: FIRST %d LINES OF THE RAVEN, %d TOKENS, %d DISTINCT WORDS (SEE RAVEN4.VOCAB)." % (nlines, len(words), len(vocab)),
  "EVERY WORD IS A REGIONAL SYMBOL T1..T%d, AND IS ALSO A DESCRIBABLE LIST (A HEAD CELL, INITIALLY EMPTY)." % len(vocab),
  "A WORD'S DESCRIPTION LIST HOLDS ITS SUCCESSORS: EACH ATTRIBUTE IS A WORD THAT FOLLOWED IT IN THE TEXT, AND ITS VALUE IS AN INTEGER DATA TERM COUNTING HOW OFTEN. ONLY SUCCESSORS ACTUALLY SEEN ARE STORED, SO THE TABLE IS SPARSE.",
  "TEXT FOR OUTPUT: AN ALPHANUMERIC DATA TERM HOLDS ONLY 5 CHARACTERS, SO EACH WORD IS SPELLED BY A LIST Yn OF PIECES V..: A FLAG CHARACTER PLUS UP TO 4 LETTERS, + FOR THE FIRST PIECE OF A WORD AND - FOR A CONTINUATION (POND ERED = +POND -ERED). THE MAP Tn -> Yn IS THE DESCRIPTION LIST OF ONE SEPARATE DESCRIBABLE LIST X4. IT IS KEPT OUT OF THE SUCCESSOR LISTS BECAUSE J16 TRAPS ON NON-NUMERIC VALUES. G4 PRINTS ONE WORD BY PRINTING ITS PIECES; THE DECODER JOINS THEM.",
  "PHASE 0 (LABEL): ATTACH THE TEXT TERMS. PHASE 1 (TRAIN): FOR EACH ADJACENT PAIR (PREV, THIS) OF THE TEXT LIST X1, ADD 1 TO THE COUNT OF THIS IN PREV'S DESCRIPTION LIST, CREATING IT WITH COUNT 1 IF IT IS NEW (ROUTINE G2).",
  "PHASE 2 (GENERATE): REPEAT N TIMES: J16 PICKS A SUCCESSOR OF THE CURRENT WORD AT RANDOM, WEIGHTED BY THE COUNTS (ROUTINE G1).",
  "WORKING CELLS (W0-W2 ARE AVOIDED: J11 AND OTHER LIBRARY ROUTINES OVERWRITE THEM): W9 CURRENT WORD, W4 PREVIOUS WORD, W6 CURRENT TEXT CELL, W5 THIS WORD, W7 FIRST WORD, W8 STEP COUNTER.")
L += [card("DEFINE REGIONS", typ="2", name="A0", link="2"),
      card("LIST REGION", typ="2", name="L0", link=str(lspace)),
      card("TOKEN REGION", typ="2", name="T0", link=str(len(vocab) + 2)),
      card("SUPPORT LIST REGION", typ="2", name="X0", link="6"),
      card("ROUTINE REGION", typ="2", name="G0", link="6"),
      card("NUMBER REGION", typ="2", name="N0", link="4"),
      card("TEXT-PIECE REGION", typ="2", name="V0", link=str(len(pterms) + 2)),
      card("PIECE-LIST REGION", typ="2", name="Y0", link=str(len(vocab) + 2)),
      card("ATTRIBUTE KEY REGION", typ="2", name="K0", link="3")]
C("SIZES: T0/V0 = VOCABULARY + 2. X0 HOLDS THE THREE SUPPORT LISTS X1 (TEXT), X2 (WORDS), X3 (TEXT TERMS). X4 IS THE WORD -> TEXT MAP, K2 A TABLE SEPARATOR MARK.",
  "REGION L0 SUPPLIES CELLS FOR THE PUSHDOWN STACK AND FOR THE DESCRIPTION LISTS AND COUNTS BUILT DURING TRAINING.")
L.append(card("ROUTINE HEADER. TYPE=5,Q=0.", typ="5", pq="00"))

C("--- MAIN PROGRAM A0 ---")
C("--- MAIN PROGRAM A0 ---" if False else "PHASE 0: BUILD THE TEXT MAP. LIST X2 HOLDS THE WORD SYMBOLS T1..T%d AND LIST X3 THE MATCHING PIECE LISTS Y1..Y%d IN THE SAME ORDER. WALK BOTH IN STEP AND DO J11 ON LIST X4: ASSIGN (1) AS VALUE OF ATTRIBUTE (0) OF LIST (2), I.E. PUSH X4, THEN THE TEXT TERM, THEN THE ATTRIBUTE." % (len(vocab), len(vocab)))
I("10", "X2", "A0", c="PUSH WORD LIST X2")
I(symb="J60", c="J60: (0) = FIRST WORD CELL")
I("20", "W3", c="W3 = WORD CELL; POP")
I("10", "X3"); I(symb="J60", c="(0) = FIRST PIECE-LIST CELL")
I("20", "W6", c="W6 = PIECE-LIST CELL; POP")
I("10", "X4", "9-4", c="MAP LOOP: PUSH MAP LIST X4 = (2)")
I("11", "W6"); I(symb="J80", c="(0) = PIECE LIST (VALUE (1))")
I("11", "W3"); I(symb="J80", c="(0) = WORD SYMBOL (ATTRIBUTE (0))")
I(symb="J11", c="J11: X4[WORD] = PIECE LIST")
I("11", "W3"); I(symb="J60", c="NEXT WORD CELL")
I("70", "9-5", c="IF H5-, ALL LABELLED: GO 9-5")
I("20", "W3", c="W3 = NEXT WORD CELL")
I("11", "W6"); I(symb="J60"); I("20", "W6", link="9-4", c="NEXT TEXT CELL; LOOP")
I(symb="J8", name="9-5", c="POP LEFTOVER CELL")
C("PHASE 1: TRAIN. START AT THE HEAD CELL OF THE TEXT LIST AND STEP TO ITS FIRST CELL WITH J60 (LOCATE NEXT CELL).")
I("10", "X1", c="PUSH TEXT LIST HEAD X1")
I(symb="J60", c="J60: (0) = FIRST TEXT CELL")
I("20", "W6", c="W6 = FIRST CELL; POP")
C("READ THE WORD IN THAT CELL WITH J80 (SYMBOL IN CELL); IT IS THE PREVIOUS WORD W4. KEEP A COPY IN W7 SO THE LAST WORD CAN WRAP AROUND TO THE FIRST.")
I("11", "W6", c="PUSH CONTENTS OF W6 (THE CELL)")
I(symb="J80", c="J80: (0) = WORD IN CELL")
I("20", "W4", c="W4 = PREVIOUS WORD; POP")
I("11", "W4"); I("20", "W7", c="W7 = FIRST WORD")
C("TRAINING LOOP, LABEL 9-1. STEP TO THE NEXT TEXT CELL. J60 SETS H5+ IF THERE WAS ONE, H5- AT THE END OF THE LIST; 70 9-9 BRANCHES TO 9-9 WHEN H5-.")
I("11", "W6", "9-1", c="LOOP: PUSH CURRENT CELL")
I(symb="J60", c="J60: (0) = NEXT CELL, SET H5")
I("70", "9-9", c="IF H5-, TEXT ENDED: GO 9-9")
I("20", "W6", c="W6 = NEXT CELL; POP")
I("11", "W6"); I(symb="J80", c="(0) = WORD IN THAT CELL")
I("20", "W5", c="W5 = THIS WORD; POP")
I(symb="G2", c="G2: COUNT PAIR (W4 -> W5)")
I("11", "W5"); I("20", "W4", link="9-1", c="W4 = W5; GO BACK TO 9-1")
C("9-9: TRAINING DONE. J60 LEFT THE LAST CELL ON THE STACK WHEN IT FAILED; J8 POPS IT. THEN CLOSE THE CYCLE BY COUNTING THE PAIR (LAST WORD W4 -> FIRST WORD W7) SO NO WORD IS A DEAD END.")
I(symb="J8", name="9-9", c="POP LEFTOVER CELL")
I("11", "W7"); I("20", "W5", c="W5 = FIRST WORD")
I(symb="G2", c="G2: COUNT PAIR (W4 -> W5)")
if table:
    C("PRINT THE CONTINUATION TABLE: FOR EVERY WORD ON THE WORD LIST X2, PRINT A SEPARATOR CARD (K2), THEN CALL G3, WHICH PRINTS THE WORD AND, FOR EACH SUCCESSOR, ITS TEXT FOLLOWED BY ITS COUNT. A FINAL SEPARATOR ENDS THE TABLE.")
    I("10", "X2"); I(symb="J60"); I("20", "W3", c="W3 = FIRST WORD CELL")
    I("11", "W3", "9-6", c="TABLE LOOP: PUSH WORD CELL")
    I(symb="J80", c="(0) = WORD SYMBOL")
    I("20", "W9", c="W9 = WORD TO PRINT; POP")
    I("10", "K2"); I(symb="J152", c="PRINT SEPARATOR ****")
    I(symb="G3", c="G3: PRINT WORD + ITS SUCCESSORS")
    I("11", "W3"); I(symb="J60", c="NEXT WORD CELL")
    I("70", "9-7", c="IF H5-, TABLE DONE: GO 9-7")
    I("20", "W3", link="9-6", c="W3 = NEXT CELL; LOOP")
    I(symb="J8", name="9-7", c="POP LEFTOVER CELL")
    I("10", "K2"); I(symb="J152", c="PRINT END-OF-TABLE MARK ****")
C("PHASE 2: GENERATE. W9 = FIRST WORD; PRINT IT WITH J152 (PRINT SYMBOL).")
I("10", text[0], c="PUSH FIRST WORD"); I("20", "W9", c="W9 = CURRENT WORD; POP")
I("10", "X4"); I("11", "W9"); I(symb="J10", c="J10: PIECE LIST OF WORD"); I(symb="G4", c="G4: PRINT ITS TEXT")
C("STEP COUNTER W8 IS A FRESH COPY (J120) OF THE CONSTANT ZERO N2, SO J125 (ADD 1) DOES NOT CHANGE THE CONSTANT.")
I("10", "N2"); I(symb="J120", c="J120: COPY OF ZERO"); I("20", "W8", c="W8 = COUNTER = 0")
C("GENERATION LOOP, LABEL 9-2. J116 TESTS (0) < (1): PUSH THE LIMIT N1 FIRST, THEN THE COUNTER. 70 9-3 LEAVES THE LOOP WHEN THE TEST FAILS (H5-).")
I("10", "N1", "9-2", c="LOOP: PUSH LIMIT N1 (=(1))")
I("11", "W8", c="PUSH COUNTER (=(0))")
I(symb="J116", c="J116: H5+ IF COUNTER < LIMIT")
I("70", "9-3", c="IF H5-, DONE: GO 9-3")
I(symb="G1", c="G1: MAKE AND PRINT ONE WORD")
I("11", "W8"); I(symb="J125", c="J125: ADD 1 TO COUNTER, LEAVE (0)")
I(symb="J8", link="9-2", c="J8 POPS (0); GO BACK TO 9-2")
I(symb="J7", name="9-3", link="0", c="9-3: HALT")

L.append(card("ROUTINE HEADER. TYPE=5,Q=0.", typ="5", pq="00"))
C("--- G1: ONE GENERATION STEP ---",
  "INPUT: W9 = CURRENT WORD. OUTPUT: W9 = NEXT WORD, AND ITS TEXT (J10 ON THE MAP X4 GIVES ITS PIECE LIST, THEN G4 PRINTS IT) IS PRINTED.",
  "J16 TAKES A DESCRIBABLE LIST (THE CURRENT WORD) AND RETURNS ONE OF THE ATTRIBUTES OF ITS DESCRIPTION LIST (A SUCCESSOR WORD), CHOSEN AT RANDOM WITH PROBABILITY PROPORTIONAL TO THE INTEGER COUNT VALUE.")
I("11", "W9", "G1", c="PUSH CURRENT WORD")
I(symb="J16", c="J16: (0) = WEIGHTED RANDOM SUCCESSOR")
I("20", "W9", c="W9 = NEXT WORD; POP")
I("10", "X4"); I("11", "W9"); I(symb="J10", c="J10: PIECE LIST OF NEW WORD"); I(symb="G4", link="0", c="G4: PRINT TEXT; END OF G1")

L.append(card("ROUTINE HEADER. TYPE=5,Q=0.", typ="5", pq="00"))
C("--- G3: PRINT ONE WORD AND ITS CONTINUATIONS ---",
  "INPUT: W9 = WORD. OUTPUT (ONE CARD EACH): THE WORD'S TEXT, THEN FOR EVERY SUCCESSOR ITS TEXT AND ITS COUNT.",
  "THE WORD'S DESCRIPTION LIST IS NAMED IN THE HEAD OF THE WORD'S LIST, SO J80 ON THE WORD GIVES IT. ITS CELLS ALTERNATE ATTRIBUTE (A SUCCESSOR WORD), VALUE (ITS COUNT), ATTRIBUTE, VALUE...",
  "CELLS: W4 CURRENT DESCRIPTION-LIST CELL, W5 SUCCESSOR, W6 COUNT.")
I("10", "X4", "G3", c="PUSH MAP X4"); I("11", "W9"); I(symb="J10", c="J10: PIECE LIST OF THE WORD"); I(symb="G4", c="G4: PRINT WORD TEXT")
I("11", "W9"); I(symb="J80", c="J80: (0) = DESCRIPTION LIST NAME")
I(symb="J60", c="J60: (0) = FIRST ATTRIBUTE CELL"); I("20", "W4", c="W4 = ATTRIBUTE CELL; POP")
C("LOOP 9-3: READ THE SUCCESSOR (W5), STEP TO THE VALUE CELL AND READ THE COUNT (W6), THEN PRINT BOTH.")
I("11", "W4", "9-3", c="LOOP: PUSH ATTRIBUTE CELL"); I(symb="J80", c="(0) = SUCCESSOR SYMBOL"); I("20", "W5", c="W5 = SUCCESSOR")
I("11", "W4"); I(symb="J60", c="J60: VALUE CELL"); I("20", "W4")
I("11", "W4"); I(symb="J80", c="(0) = COUNT"); I("20", "W6", c="W6 = COUNT")
I("10", "X4"); I("11", "W5"); I(symb="J10", c="J10: PIECE LIST OF SUCCESSOR"); I(symb="G4", c="G4: PRINT SUCCESSOR TEXT")
I("11", "W6"); I(symb="J152", c="PRINT ITS COUNT")
I("11", "W4", c="ADVANCE: PUSH CELL"); I(symb="J60", c="J60: NEXT ATTRIBUTE CELL")
I("70", "9-7", c="IF H5-, NO MORE: GO 9-7")
I("20", "W4", link="9-3", c="W4 = NEXT CELL; LOOP")
I(symb="J8", name="9-7", link="0", c="POP LEFTOVER CELL; END OF G3")

L.append(card("ROUTINE HEADER. TYPE=5,Q=0.", typ="5", pq="00"))
C("--- G4: PRINT ONE WORD'S TEXT ---",
  "INPUT: (0) = THE WORD'S PIECE LIST Yn. OUTPUT: ONE CARD PER PIECE (E.G. +POND THEN -ERED). J60 STEPS THROUGH THE LIST CELLS; J80 GIVES THE PIECE (AN ALPHANUMERIC DATA TERM) IN A CELL; J152 PRINTS IT. CELL W7 HOLDS THE CURRENT LIST CELL.")
I(symb="J60", name="G4", c="J60: (0) = FIRST PIECE CELL"); I("20", "W7", c="W7 = PIECE CELL; POP")
I("11", "W7", "9-1", c="LOOP: PUSH PIECE CELL"); I(symb="J80", c="(0) = PIECE"); I(symb="J152", c="PRINT IT")
I("11", "W7"); I(symb="J60", c="NEXT PIECE CELL"); I("70", "9-2", c="IF H5-, NO MORE: GO 9-2")
I("20", "W7", link="9-1", c="W7 = NEXT CELL; LOOP")
I(symb="J8", name="9-2", link="0", c="POP LEFTOVER CELL; END OF G4")

L.append(card("ROUTINE HEADER. TYPE=5,Q=0.", typ="5", pq="00"))
C("--- G2: COUNT ONE BIGRAM ---",
  "INPUT: W4 = PREVIOUS WORD, W5 = THIS WORD. EFFECT: THE COUNT OF W5 IN W4'S DESCRIPTION LIST GOES UP BY 1; IT IS CREATED WITH COUNT 1 IF W5 WAS NOT THERE.",
  "J10 = FIND VALUE OF ATTRIBUTE (0) OF LIST (1): PUSH THE LIST W4 FIRST, THEN THE ATTRIBUTE W5. IF FOUND (H5+) THE VALUE, AN INTEGER DATA TERM, IS LEFT AS (0); IF NOT (H5-) NOTHING IS LEFT.")
I("11", "W4", "G2", c="PUSH LIST = PREVIOUS WORD")
I("11", "W5", c="PUSH ATTRIBUTE = THIS WORD")
I(symb="J10", c="J10: FIND COUNT; SET H5")
I("70", "9-5", c="IF H5- (NEW PAIR), GO 9-5")
C("FOUND: J125 ADDS 1 TO THE COUNT IN PLACE AND LEAVES IT AS (0); J8 POPS IT. THEN SKIP THE CREATE STEP.")
I(symb="J125", c="J125: COUNT = COUNT + 1")
I(symb="J8", link="9-6", c="POP COUNT; GO 9-6")
C("9-5 NEW PAIR: J11 = ASSIGN (1) AS VALUE OF ATTRIBUTE (0) OF LIST (2). PUSH LIST W4, THEN A FRESH COPY OF THE CONSTANT ONE N3 (J120 SO THE CONSTANT IS NOT SHARED), THEN THE ATTRIBUTE W5. J11 CREATES THE DESCRIPTION LIST IF IT DOES NOT EXIST YET.")
I("11", "W4", "9-5", c="PUSH LIST (2)")
I("10", "N3"); I(symb="J120", c="J120: NEW COUNT CELL = 1 (1)")
I("11", "W5", c="PUSH ATTRIBUTE (0)")
I(symb="J11", link="0", c="J11: ADD (W5 -> 1) TO W4")
I(symb="J0", name="9-6", link="0", c="9-6: END OF G2 (NO-OP)")

L.append(card("DATA HEADER. TYPE=5,Q=1.", typ="5", pq="01"))
C("DATA. CONSTANTS: N1 = NUMBER OF WORDS TO GENERATE, N2 = ZERO, N3 = ONE.")
L.append(const("N1 = STEPS", "N1", steps)); L.append(const("N2 = ZERO", "N2", 0)); L.append(const("N3 = ONE", "N3", 1))
L.append(alnum("K2", "****"))
C("TEXT PIECES: ALPHANUMERIC DATA TERMS V1..V%d (SEE RAVEN4.VOCAB FOR THE WORDS)." % len(pterms))
for n, t in pterms: L.append(alnum(n, t))
C("PIECE LISTS Y1..Y%d, ONE PER WORD IN VOCABULARY ORDER: EACH LISTS THE PIECES THAT SPELL THE WORD." % len(vocab))
for k, (w, names) in enumerate(wpieces.items(), 1):
    L.append(card("SPELLING OF " + w.upper(), name="Y%d" % k, symb="0"))
    for m, n in enumerate(names): L.append(card("", symb=n, link="0" if m == len(names) - 1 else ""))
C("LIST X3 = PIECE LISTS Y1..Y%d, LIST X2 = WORD SYMBOLS, IN THE SAME ORDER." % len(vocab))
L.append(card("PIECE-LIST LIST", name="X3", symb="0"))
for k in range(1, len(vocab) + 1): L.append(card("", symb="Y%d" % k, link="0" if k == len(vocab) else ""))
L.append(card("WORD LIST", name="X2", symb="0"))
for k, v in enumerate(vocab.values(), 1): L.append(card("", symb=v, link="0" if k == len(vocab) else ""))
C("WORD HEADS, ONE PER WORD: AN EMPTY DESCRIBABLE LIST (HEAD CELL, LINK 0) NAMED BY THE WORD SYMBOL. J11 FILLS IN THE DESCRIPTION LIST DURING TRAINING.")
for w, v in vocab.items():
    L.append(card("HEAD OF " + w.upper(), name=v, symb="0", link="0"))
C("THE MAP LIST X4: EMPTY HEAD; ITS DESCRIPTION LIST IS BUILT BY PHASE 0.")
L.append(card("MAP LIST", name="X4", symb="0", link="0"))
C("THE TEXT, AS A LIST OF WORD SYMBOLS, HEAD X1: " + " ".join(words).upper())
L.append(card("TEXT LIST", name="X1", symb="0"))
for k, t in enumerate(text):
    L.append(card("", symb=t, link="0" if k == len(text) - 1 else ""))
L.append(card("START AT A0", typ="5", symb="A0"))
open(out, "w").write("\n".join(L) + "\n")
print(len(words), "tokens,", len(vocab), "distinct,", steps, "steps ->", out, len(L), "cards")
