Index of retro-1620/software/diagnostics:
Additional IBM 1620 diagnostic routines:

DT0020/
    IBM diagnostic to write standard sector addresses on a 1311 disk
    pack.

DT0021/
    IBM diagnostic to write test data on a 1311 disk pack in preparation
    for using the pack with the DT0022 diagnostic.

DT0022/
    IBM diagnostic for the 1311 disk drive and interface circuits.

DT0032/
    IBM diagnostic for the 1443 line printer and interface circuits.

XR01/
    Diagnostic written by Paul Kimpel for index register operations.

CU01-Mod2_General_Op_Codes.pt
    Standard CU01 diagnostic program paper-tape image file modified by
    Paul Kimpel for the Model 2 as for CU01-Mod2_General_Op_Codes.cmem
    above. The original file came from the DaveW_paper_tapes folder in
    http://bitsavers.org/bits/IBM/1620/1620.zip.

FP1620Math.card
    FORTRAN II-D compile deck to run under Monitor I to generate
    floating point test results from 64 selected FP values. This program
    was used to debug the emulator's floating-point implementation by
    running it twice -- once under Monitor configured with the software-
    only floating-point libraries and once with the hardware-enabled
    libraries -- and comparing the two sets of results.

Printer-Overstrike-Test.sps
    SPS assemble deck to run under Monitor I for a simple program to
    test overstrike printing on the 1443 line printer.
