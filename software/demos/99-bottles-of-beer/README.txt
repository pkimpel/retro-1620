Index of retro-1620/software/demos/99-bottles-of-beer:
99 Bottles of Beer program for the 1620.

Written by Chuck Guzis in 2005 and available at
http://99-bottles-of-beer.net/language-ibm-1620-sps-916.html.
Modified slightly by Paul Kimpel to assemble on the retro-1620 Model 2
emulator under Monitor I.

99-bottles-916.txt
    Original code downloaded from the link above.

99-bottles-of-beer.sps
    SPS source deck reformatted from 99-bottles-916.txt. Modified to
    assemble under Monitor I, remove characters invalid for the 1622
    card reader, correct a typo on line DBEERS+4 ("DBEERS4" should be
    "BEERS4", and fix several DAC declaratives so that they don't end in
    spaces. Note that when assembling under Monitor I, the default (and
    minimum) starting address for a program is 2402, not 402.

99-bottles-of-beer.sps2
    SPS source deck reformatted from 99-bottles-916.txt with
    modifications to allow it to assemble under the card-based SPS
    assembler.

99-bottles-of-beer.lst
    Assembly listing for 99-bottles-of-beer.sps as generated under
    Monitor I.

99-bottles-of-beer-Object.card
    Bootable object code deck from assembling 99-bottles-of-beer.sps.

99-bottles-of-beer-Output.txt
    Typewriter from assembling and running 99-bottles-of-beer.sps.

99-bottles-of-beer-Delta.html
    Side-by-side comparison of 99-bottles-of-beer.lst and a version of
    99-bottles-914.txt reformatted to allow a reasonable comparison.


