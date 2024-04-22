# retro-1620

_Web-based emulator and operating environment for the IBM 1620 Model-2 computer system._

The IBM 1620 was a 1960s transistorized, decimal, variable field-length, magnetic-core memory computer system designed primarily as an inexpensive solution for scientific and engineering applications. There were two models, the original Model 1 released in 1959, and the object-code compatible but significantly redesigned Model 2, released in 1962. A total of about 2,000 systems were produced, roughly half each Model-1s and Model-2s. IBM supported the system until 1970.

The 1620 used a two-address, memory-to-memory architecture. There were no software-accessible registers. Instructions were a fixed 12 digits, consisting of an operation code of two digits, a "P" (destination) address of five digits, and a "Q" (source) address or literal value of five digits. The basic memory size was 20,000 digits, expandable to 60,000 digits. Each digit contained a four-bit binary-coded decimal value, a fifth "flag" bit used for both the arithmetic sign and as a field delimiter, and an odd-parity "check" bit. All arithmetic and data movement was done digit-sequentially.

  * The Model 1 featured a memory cycle time of 20µs per two digits. Addition and multiplication were done via a lookup table in memory. Hardware division, floating-point arithmetic, and indirect addressing were optional features.

  * The Model 2 featured a memory cycle time of 10µs per two digits. Many instructions were optimized to process two digits from a single memory fetch. Addition was done in hardware, but multiplication was still done by table lookup. Hardware division and indirect addressing were standard features, with floating-point still an extra-cost option. The Model 2 had two additional options, index register address modification (with the index registers stored in memory where the Model 1 add table had resided) and support for binary (actually, octal) bit-wise operations, octal/decimal conversion, and binary paper tape I/O.

Initially, the Model 1 supported only paper-tape and typewriter input/output devices, but the 1622 card reader/punch unit (derived from the 1401's 1402 reader/punch) was made available soon after the initial release. Additional peripherals were the 1443 line printer, 1311 disk drive with removable disk packs, and 1627 plotter. The typewriter, paper tape, punched card, and printer devices supported alphanumeric data in memory as pairs of adjacent digits.

The 1620 was also used as the computing and control component of the IBM 1710 and 1720 process-control systems. When configured for this role, the 1620 supported a multi-level interrupt system.

The 1620 had a vast collection of IBM-supplied and user-written software. Most programming was done using the SPS assembler or FORTRAN II. For systems with the 1311 disk drive, there was a simple batch operating system known as "Monitor."

The main goals of this project are creation of a web browser-based emulator for the Model 2 variant of the system and recovery of as much software for the system as we are able to find.

The contents of this project are licensed under the [MIT License](http://www.opensource.org/licenses/mit-license.php).

| Related Sites | URL |
| ------------- | ----- |
| Emulator hosting site | http://www.phkimpel.us/IBM-1620/ |
| Project Wiki | https://github.com/pkimpel/retro-1620/wiki/ |
| Project Blog | https://retro-emulation.blogspot.com/ |
| 1620 Documents at bitsavers | http://bitsavers.org/pdf/ibm/1620/ |
| 1620 Software at bitsavers | httphttp://www.bitsavers.org/bits/IBM/1620/ |
| 1620 Wikipedia page | https://en.wikipedia.org/wiki/IBM_1620 |
