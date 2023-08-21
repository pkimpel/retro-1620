Index of retro-1620/software/diagnostics/DT0043:
IBM 1620 diagnostic routine for the 1443 line printer.

This program will perform a comprehensive test of the 1443 line printer.
See http://bitsavers.org/pdf/ibm/1620/fe/diag/2172153_DT43_Dec64.pdf.

This test reports several errors in the FORCE ERRORS section of the
program. These are expected and are due to the retro-1620 emulator's
current inability to generate and maintain invalid parity digits
intentionally forced by the diagnostic.

DT0043-1443-Printer-Test.spt
    Original transcription by Paul Kimpel in July 2023 from the
    bitsavers.org document above.

DT0043-1443-Printer-Test.sps
    Source deck for the card-based SPS assembler.

DT0043-1443-Printer-Test.lst
    Listing from assembling the .sps deck above using the card-based
    assembler.

DT0043-1443-Printer-Test-Object.card
    Bootable object card deck for the program.

DT0043-1443-Printer-Test-Object-Full.card
    Bootable full (non-condensed) object card deck for the program.

DT0043-1443-Printer-Test-Output.txt
    ASCII text extracted from the printer after running DT0043. This
    output does not show fancy formatting such as greenbar shading or
    overprinting.

DT0043-1443-Printer-Test-Output.pdf
    PDF of printer output from the test as printed by the retro-1620
    LinePrinter implementation. This shows the effect of greenbar
    shading and overprinting.

DT0043-1443-Printer-Test-Output-DEBUG.pdf
    PDF output from the test similar to that above, but includes
    additional data in the left margin of the paper showing line numbers
    within a page and codes for carriage control. These were generated
    to test correct carriage control and carriage tape operation.

    The first three digits on the line are the line number on the
    carriage tape. The next letter is either "a" or "b" for carriage
    control after or before printing. The next character is a code for
    the type of carriage control -- for spacing, 0, 1, 2, or 3; for
    skipping, A-L to indicate channels 1-12, respectively.

DT0043-1443-Printer-Test-Typeout.txt
    1620 typewriter output from running the test.

DT0043-Carriage-Control.json
    retro-1620 carriage control tape definition file for the carriage
    tape required by DT0043. This must be loaded into the printer before
    running the test.

