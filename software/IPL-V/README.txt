IBM-1620 IPL-V Interpreter.

IPL -- the "Information Processing Language" -- was a programming
language created in the mid 1950s by Allan Newell, Herb Simon, and Cliff
Shaw at RAND and Carnegie Tech (now CMU). IPL was the first programming
language developed specifically for AI and cognitive simulation. Like
Lisp, IPL is specialized for working with symbols and lists. In fact, it
was a direct predecessor of Lisp, and was made extinct by Lisp the 1970s
because Lisp does the exact same work as IPL, but Lisp uses a much more
elegant syntax. However, in the second half of the 1950s and through the
mid 1960s, IPL was the language in which the most important AI and
cognitive models were written, including The Logic Theorist, considered
to be the first true AI, and GPS, the General Problem Solver.

IPL-V is described in the book:
    "Information Processing Language-V, Second Edition", Allen Newell,
    Fred M. Tonge, Edward A. Feigenbaum, Bert F. Green, Jr., George H.
    Mealy (the RAND Corporation), Prentice-Hall, 1964.
    https://stacks.stanford.edu/file/druid:yz379pw9306/yz379pw9306.pdf

This video gives a brief introduction to IPL-V:
    https://www.youtube.com/watch?v=Q6e8XQEdOFY

This IPL-V interpreter for the IBM 1620  was written by Wendell Terry
Beyer and John D. MacDonald at the University of Oregon in 1963. The
interpreter is described by Beyer in a paper included in:

1620 Users Group Western Region Minutes, Denver, 1964-06, "1620 IPL-V A
Non-numeric Problem Solving Tool", Wendell Terry Beyer, p.147
    https://bitsavers.org/pdf/ibm/common/1620_Users_Group_Western_Region
    _196406.pdf

A scanned PDF of the program listing was found in the Feigenbaum
collection of the Stanford Digital Repository by David Moews:

IPL-V SPS Listing PDF
    https://stacks.stanford.edu/file/hj487fn0811/hj487fn0811.pdf
    Call Number: SC0340, Accession: 1986-052, Box: 46, Folder: 52,
    Title: IPL-V

David reported this find to Jeff Shrager, who discovered the existence
of the retro-1620 emulator and contacted its author, Paul Kimpel, for
assistance in getting the program to run in the emulator.

The scanned PDF listing was transcribed by Rupert Lane using his
"gridlock" OCR system.
    https://github.com/rupertl/gridlock/

OCR transcription results.
    https://github.com/rupertl/iplv-listings/

SPS assembly source code was extracted manually from the transcription
and assembled using the IBM 1620 SPS II card-based assembler. A listing
of the assembled program was obtained as a text file and compared back
to the transcription output to validate the transcription. Any OCR mis-
reads (largely confusion between letter "O" and digit "0") were then
corrected manually and the source assembled again, repeating the process
until the transcription and assembler listing matched.

In making this IPL-V interpreter work, two small updates, identified as
Modification Letters 3 and 4, were applied to the source. Presumably
Letters 1 and 2 existed, and perhaps even later updates, but we have not
been able to find any of these. Despite the possibility of the changes
in Letters 3 and 4 having dependencies on earlier updates, they have
been applied to the source code derived from the scanned PDF listing, as
discussed for the update "diff" files below. Modification Letter 4 is
necessary in order for the interpreter to run on the 1620 Model 2, which
is the model that retro-1620 emulates. Apparently the program was able
to run without this update on at least some versions of the 1620 Model
1.

Modification Letter 3
    https://purl.stanford.edu/bk072pk3345

Modification Letter 4
    https://purl.stanford.edu/qg281jn8061

Running the program:

With the retro-1620 emulator in a halted state (i.e., the MANUAL lamp on
the 1620 control panel is on and the AUTOMATIC lamp is off), load the
following card-image files into the emulator's card reader in the
following exact order:

    1. IPL-V-Interpreter-Deck-1.card
    2. Your program's own IPL-V source card images (e.g. Ackermann.ipl).
       If desired, multiple source files can be loaded, which will be
       concatenated in the reader's buffer and treated as one unified
       source file.
    3. IPL-V-Subroutines.card
    4. IPL-V-Interpreter-Deck-2.card

    Apparently it was possible to include custom machine-language
    subroutines as well, for which there is no known documentation, but
    which we believe would have been inserted between items 2 and 3
    above.

Once these decks are loaded, press the LOAD button on the card reader
panel. This will boot Deck-1, which will process and load the remaining
files. When the load completes, the 1620 will halt. Press START on the
1620 control panel to run the assembled IPL-V program.

Most of the output will be written to the emulator's card punch. Once
the IPL-V run has ended, the contents of the card punch can be printed
or saved as a text file to your local system. Error and informational
messages are written to the emulator's typewriter.

Diagnostic output is controlled by the four Program Switches on the 1620
Control Panel and written to the card punch. The switches operate
independently and can be turned on or off in any combination.

    Switch 1: when on, a trace of IPL-V instruction execution will be
    written for all routines for which tracing has been enabled.

    Switch 2: similar to Switch 1, but the instruction trace is
    unconditional, and not just for the routines for which it has been
    enabled.

    Switch 3: when on, the memory addresses and internal descriptions of
    system storage cells and "J" intrinsic subroutines used by the
    program will be listed.

    Switch 4: when on, the card images of the source program will be
    listed, with some assembly information included on the right of each
    lines. This information consists of the memory address where the
    assembled list cell is located and the 12-digit internal
    representation of the cell.


Repository files:

IPL-V-Samples/
    A directory containing set of sample IPL-V programs and their
    output. See the README.txt file in the directory for more
    information.

IPL-V-Interpreter.sps
    SPS assembly source deck extracted from the corrected IPL-V-
    Interpreter-Xscript.sp2 file after OCR corrections were applied. The
    changes specified by Modification Letters 3 and 4 have been
    incorporated into this file as indicated by files IPL-V-Interpreter-
    Mod-3.diff and IPL-V-Interpreter-Mod-4.diff.

    Note, however, that Modification Letter 4 specified changes to the
    program as patches to the original object code decks. The changes in
    -Mod-4.diff move the location of the D5 and D6 symbols, which affect
    addresses in every instruction that used those symbols -- many more
    than the changes to the object code decks did -- but the resulting
    program behavior should be equivalent.

IPL-V-Interpreter-Deck-1.card
    The first half of the 1620 load deck, containing the object code for
    the IPL-V assembler/loader. This file was created by extracting the
    cards ending in ]0000 through ]0292 from IPL-V-Interpreter-Object-
    card. The IPL-V source program and file of J-subroutines must be
    inserted between Deck-1 and Deck-2 when running the interpreter.

IPL-V-Interpreter-Deck-2.card
    The second half of the 1620 load deck, containing the object code
    for the IPL-V interpreter and J-subroutine primitives. This deck was
    created by extracting cards from IPL-V-Interpreter-Object.card and
    arranging them in the following sequence:

      1. Cards ending in ]0448 through ]0626, comprising the relocatable
         J-subroutine primitives; followed by:
      2. A special delimiter card to indicate the end of the primitives.
         This must have 12 zeroes in columns 1-12 and the digits
         "0]1]0000]0012" in columns 62-74. All all other columns,
         including the card sequence number in columns 76-80 may be
         anything. See IPL-V-Primitives-Terminator-Card.card below. This
         card is followed by:
      3. Cards ending in ]0293 through ]0447; followed by:
      4. Cards ending in ]0627 through ]0633, the end of the object code
         file.

IPL-V-Interpreter-label-index.txt
    A cross-reference of assembler labels by their card-sequence numbers
    (SPS columns 1-5). This was included in the PDF scan of the listing
    downloaded from stacks.stanford.edu, but how it was originally
    generated is unknown. This was transcribed to text as part of Lane's
    gridlock OCR process. Note that this file does not reflect the
    changes from Modification Letters 3 and 4.

IPL-V-Interpreter-Listing.lst
    Assembly listing of the complete IPL-V program (assembler plus
    interpreter) from the source deck IPL-V-Interpreter.sps. This was
    generated by reformatting the "uncompressed" load deck below.

IPL-V-Interpreter-Mod-3.diff
    Unix unified diff file for the changes from Modification Letter 3 to
    the interpreter SPS source file above.

    There is an additional change to this file not included in Letter 3.
    The IPL-V J-subroutine primitives written in SPS are prefixed by a
    12-digit header that consists of "51" followed by the five-digit J-
    routine number, followed by the five-digit length of the routine in
    digits, excluding the length of the header. Letter 3 added a CF
    instruction to the routine (card-sequence 31425) but did not add a
    corresponding adjustment to the header. Therefore, this patch
    modifies card-sequence 31350 to change the routine length from 108
    to 120.

IPL-V-Interpreter.Mod-4.diff
    Unix unified diff file for the changes from Modification Letter 4 to
    the interpreter SPS source file above.

IPL-V-Interpreter-Object.card
    The compressed object deck produced from assembling IPL-V-
    Interpreter.sps. This file was split at the point between the
    assembler and interpreter code as described above to create Deck-1
    and Deck-2 above. This and IPL-V-Interpreter-Object-
    UNCOMPRESSED.card were assembled using the IBM card-based SPS II
    assembler dated 1/1/1962.

IPL-V-Interpreter-Object-UNCOMPRESSED.card
    The "uncompressed" object deck produced from assembling IPL-V-
    Interpreter.sps. This was reformatted to produce the assembly
    listing above using the script software/retro-1620-Utilities/SPS-
    Object-Deck-Lister-LHCode.wsf in this repository.

IPL-V-Interpreter-SPS-Symbol-List.txt
    The list of assembler labels and their assigned addresses generated
    by the SPS assembler from IPL-V-Interpreter.sps.

IPL-V-Interpreter-Xscript.sp2
    The transcript of the program from the scanned PDF of its assembly
    listing downloaded from stacks.stanford.edu. This was transcribed to
    text as part of Lane's gridlock OCR process. This file was matched
    to IPL-V-Interpreter-Listing.lst to verify the OCR transcription and
    to correct OCR errors. This file matches the assembly listing of the
    program before Modification Letters 3 and 4 were applied.

IPL-V-Primitives-Terminator-Card.card
    The delimiter card that signals to the assembler/loader phase that
    it has reached the end of loading the machine language primitives.
    This card gets inserted into Deck-2 after the cards for the
    primitives and before the SPS bootstrap card for the rest of the
    interpreter phase, as described above.

IPL-V-Subroutines.card
    Compressed standard IPL-V J-subroutines. This was transcribed to
    text as part of Lane's gridlock OCR process. It should be placed
    after the source program and immediately before Deck-2 in the card
    reader.

