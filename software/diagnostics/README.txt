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

CU01-Mod2_General_Op_Codes.cmem
    Standard CU01 diagnostic program CMEM file from the Computer History
    Museum 1620 Jr. project, modified by Paul Kimpel for the 1620 Model
    2 CPU. This changes the branch at 09012 from 4909036 to 4909936,
    which bypasses test routines 051-055. Those routines test for
    correct lookup in the add tables, but cause false errors on the
    Model 2, because the Model 2 doesn't use add tables. The original
    file was the one Dave Babcock recovered as part of the Computer
    History Museum 1620 Jr. project.

CU01-Mod2_General_Op_Codes.pt
    Standard CU01 diagnostic program paper-tape image file modified by
    Paul Kimpel for the Model 2 as for CU01-Mod2_General_Op_Codes.cmem
    above. The original file came from the DaveW_paper_tapes folder in
    http://bitsavers.org/bits/IBM/1620/1620.zip.

CU03-1311_Indirect_Addressing.cmem
    Standard CU03 diagnostic program CMEM file from the Computer History
    Museum 1620 Jr. project, modified for the 1620s with support for the
    1311 disk drive. This changes the branch at 05196 from 05220 to
    05280, which bypasses test routine 024. That routine tests that
    indirect addressing is inhibited on the P field of Control (34),
    but 1311 systems allow indirect addressing on the P address of a
    seek (34 PPPPP x07x1). The original file was the one Dave Babcock
    recovered as part of the Computer History Museum 1620 Jr. project.

CU03-1311_Indirect_Addressing.pt
    Standard CU03 diagnostic program paper-tape image file modified by
    Paul Kimpel for system with a 1311 disk drive, as for CU01-Mod2_
    General_Op_Codes.cmem above. The original file came from the
    DaveW_paper_tapes folder in
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

