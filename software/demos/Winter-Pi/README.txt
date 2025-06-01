Index of retro-1620/software/demos/Winter-Pi:
Program to calculate digits of Pi.

Winter-Pi is a version of Dik Winter's 800-digits-of-Pi program
rewritten for the IBM-1620. On a 60000-digit system it can generate up
to 1856 digits of Pi. This is a "spigot" algorithm -- it spits out four
digits of Pi at a time as it calculates them. For more information on
the algorithm, see https://crypto.stanford.edu/pbc/notes/pi/code.html.

The number of digits generated is determined by the amount of memory you
give the program to use, as specified in locations 00402-00406 of the
program. The number of digits is determined by
    (((memory - 1500)/9)/14)*4
where all divisions truncate to the next lowest integer value. The 1500
is the amount of memory reserved for the program. At the halt after
loading the program from cards or paper tape, you can specify the amount
of memory by pressing INSERT on the console and entering a sequence like
this on the typewriter:
               _
        1600406300004900540 [Release/Start]

This example will set the memory size to 30000 digits. Don't forget the
flag over the high-order digit of the Q immediate operand. The memory
size defaults to 60000 digits. Generating the full 1856 digits with a
60000-digit memory takes about three hours on a 1620 Model 2 system.
Generating 584 digits with a 20000-digit memory takes about 20 minutes.

This program was written for the Model 2, but it should run on a Model 1
if you change the BSIA (60) instruction at the label START (location
00540) to a NOOP (41).

Winter-Pi.sps
    Source deck for the card-based SPS assembler.

Winter-Pi-Listing.txt
    Assembly listing and typewriter output for the program.

Winter-Pi-Object.card
    Bootable object card deck for the program.

Winter-Pi-Object-Full.card
    Full (non-condensed) bootable object card deck for the program.

Winter-Pi-Object.pt
    Bootable binary paper tape image for the program. Load by pressing
    INSERT and entering 360000000300 on the typewriter.

Winter-Pi-Object.pt.txt
    Bootable ASCII paper tape image for the program. Load by pressing
    INSERT and entering 360000000300 on the typewriter.

Winter-Pi-Output.txt
    Typewriter output from the program for 1856 digits of Pi.



