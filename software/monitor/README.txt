Index of retro-1620/software/monitor:
Files for the 1620 Monitor I operating system.

1620-Monitor-I-Image.zip
    Zip archive containing a retro-1620 disk image for the Monitor I
    operating system with libraries configured for systems with
    floating-point hardware.

1620-Monitor-I-No-FP-Image.zip
    Zip archive containing a retro-1620 disk image for the Monitor I
    operating system with libraries configured for systems that doe not
    have floating-point hardware.

Boot-Monitor-I.card
    Boot card for Monitor I on Model-2 1620 systems. This card enables
    indirect addressing and disables index register selection.

SPSLIB-Load-Model2-Op-Codes.card
    Monitor I job deck to add most Model 2 op codes for the index
    register and binary capabilities features. To make room in the SPS
    table, it also deletes the op codes for the IBM 1710/1720 variant of
    the 1620. This deck can be run redundantly without harm.

SPSLIB-List-Op-Codes.txt
    Output from runs of the Monitor I SPSLIB utility showing the
    original SPS op code mnemonics and the results of running the
    SPSLIB-Load-Model2-Op-Codes.card job.

