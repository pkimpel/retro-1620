/***********************************************************************
* retro-1620/emulator Envir.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* Centrally-referenced properties and methods for the 1620 emulator.
* This object provides throttling for the Processor and properties for
* the Processor and other objects that need to reference a common set
* of properties.
************************************************************************
* 2022-11-05  P.Kimpel
*   Original version, from retro-g15 Util.js.
* 2023-01-19  P.Kimpel
*   Reformat to use newer JavaScript static and public field definitions.
***********************************************************************/

export {Envir};

import {Timer} from "./Timer.js";


class Envir {

    // Static properties

    static maxMemorySize = 60000;       // maximum allowable memory on a 1620 Mod 2, digits
    static tickTime = 0.0005;           // 1620 clock period, ms (0.5µs period, 2Mhz frequency)
    static cycleTime = 0.010;           // 1620 memory cycle time, ms (10µs period)
    static minSliceTime = 10;           // minimum time slice before throttling, ms

    // Table to translate 1620 digits to binary values. Ignores the C and F bits.
    // For "undigits" (BCD values > 9), converts to an 8 or 9 by treating the 2 and 4
    // bits as if they were zero.
    static bcdBinary = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 9, 8, 9, 8, 9,
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 9, 8, 9, 8, 9,
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 9, 8, 9, 8, 9,
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 9, 8, 9, 8, 9];

    // Table of 6-bit codes with parity computed over the low-order 5 bits.
    // Having the table include all 64 possible codes for six bits means that
    // indexing with a 6-bit code having bad parity will return the corresponding
    // code with good parity.
    static oddParity5 = [
        0b100000, 0b000001, 0b000010, 0b100011, 0b000100, 0b100101, 0b100110, 0b000111,     // 0-7
        0b001000, 0b101001, 0b101010, 0b001011, 0b101100, 0b001101, 0b001110, 0b101111,     // 8-15
        0b010000, 0b110001, 0b110010, 0b010011, 0b110100, 0b010101, 0b010110, 0b110111,     // 16-23
        0b111000, 0b011001, 0b011010, 0b111011, 0b011100, 0b111101, 0b111110, 0b011111,     // 24-31
        0b100000, 0b000001, 0b000010, 0b100011, 0b000100, 0b100101, 0b100110, 0b000111,     // 32-30
        0b001000, 0b101001, 0b101010, 0b001011, 0b101100, 0b001101, 0b001110, 0b101111,     // 40-47
        0b010000, 0b110001, 0b110010, 0b010011, 0b110100, 0b010101, 0b010110, 0b110111,     // 48-55
        0b111000, 0b011001, 0b011010, 0b111011, 0b011100, 0b111101, 0b111110, 0b011111];    // 56-63

    // Table of 8-bit codes with parity computed over the low-order 7 bits.
    // Having the table include all 256 possible codes for eight bits means that
    // indexing with an 8-bit code having bad parity will return the corresponding
    // code with good parity.
    static oddParity7 = [
        0b10000000, 0b00000001, 0b00000010, 0b10000011, 0b00000100, 0b10000101, 0b10000110, 0b00000111, // 0-7
        0b00001000, 0b10001001, 0b10001010, 0b00001011, 0b10001100, 0b00001101, 0b00001110, 0b10001111, // 8-15
        0b00010000, 0b10010001, 0b10010010, 0b00010011, 0b10010100, 0b00010101, 0b00010110, 0b10010111, // 16-23
        0b10011000, 0b00011001, 0b00011010, 0b10011011, 0b00011100, 0b10011101, 0b10011110, 0b00011111, // 24-31
        0b00100000, 0b10100001, 0b10100010, 0b00100011, 0b10100100, 0b00100101, 0b00100110, 0b10100111, // 32-39
        0b10101000, 0b00101001, 0b00101010, 0b10101011, 0b00101100, 0b10101101, 0b10101110, 0b00101111, // 40-47
        0b10110000, 0b00110001, 0b00110010, 0b10110011, 0b00110100, 0b10110101, 0b10110110, 0b00110111, // 48-55
        0b00111000, 0b10111001, 0b10111010, 0b00111011, 0b10111100, 0b00111101, 0b00111110, 0b10111111, // 56-63
        0b01000000, 0b11000001, 0b11000010, 0b01000011, 0b11000100, 0b01000101, 0b01000110, 0b11000111, // 64-71
        0b11001000, 0b01001001, 0b01001010, 0b11001011, 0b01001100, 0b11001101, 0b11001110, 0b01001111, // 72-79
        0b11010000, 0b01010001, 0b01010010, 0b11010011, 0b01010100, 0b11010101, 0b11010110, 0b01010111, // 80-87
        0b01011000, 0b11011001, 0b11011010, 0b01011011, 0b11011100, 0b01011101, 0b01011110, 0b11011111, // 88-95
        0b11100000, 0b01100001, 0b01100010, 0b11100011, 0b01100100, 0b11100101, 0b11100110, 0b01100111, // 96-103
        0b01101000, 0b11101001, 0b11101010, 0b01101011, 0b11101100, 0b01101101, 0b01101110, 0b11101111, // 104-111
        0b01110000, 0b11110001, 0b11110010, 0b01110011, 0b11110100, 0b01110101, 0b01110110, 0b11110111, // 112-119
        0b11111000, 0b01111001, 0b01111010, 0b11111011, 0b01111100, 0b11111101, 0b11111110, 0b01111111, // 120-127
        0b10000000, 0b00000001, 0b00000010, 0b10000011, 0b00000100, 0b10000101, 0b10000110, 0b00000111, // 128-135
        0b00001000, 0b10001001, 0b10001010, 0b00001011, 0b10001100, 0b00001101, 0b00001110, 0b10001111, // 136-143
        0b00010000, 0b10010001, 0b10010010, 0b00010011, 0b10010100, 0b00010101, 0b00010110, 0b10010111, // 144-151
        0b10011000, 0b00011001, 0b00011010, 0b10011011, 0b00011100, 0b10011101, 0b10011110, 0b00011111, // 152-159
        0b00100000, 0b10100001, 0b10100010, 0b00100011, 0b10100100, 0b00100101, 0b00100110, 0b10100111, // 160-167
        0b10101000, 0b00101001, 0b00101010, 0b10101011, 0b00101100, 0b10101101, 0b10101110, 0b00101111, // 168-175
        0b10110000, 0b00110001, 0b00110010, 0b10110011, 0b00110100, 0b10110101, 0b10110110, 0b00110111, // 176-183
        0b00111000, 0b10111001, 0b10111010, 0b00111011, 0b10111100, 0b00111101, 0b00111110, 0b10111111, // 184-191
        0b01000000, 0b11000001, 0b11000010, 0b01000011, 0b11000100, 0b01000101, 0b01000110, 0b11000111, // 192-199
        0b11001000, 0b01001001, 0b01001010, 0b11001011, 0b01001100, 0b11001101, 0b11001110, 0b01001111, // 200-207
        0b11010000, 0b01010001, 0b01010010, 0b11010011, 0b01010100, 0b11010101, 0b11010110, 0b01010111, // 208-215
        0b01011000, 0b11011001, 0b11011010, 0b01011011, 0b11011100, 0b01011101, 0b01011110, 0b11011111, // 216-223
        0b11100000, 0b01100001, 0b01100010, 0b11100011, 0b01100100, 0b11100101, 0b11100110, 0b01100111, // 224-231
        0b01101000, 0b11101001, 0b11101010, 0b01101011, 0b11101100, 0b01101101, 0b01101110, 0b11101111, // 232-239
        0b01110000, 0b11110001, 0b11110010, 0b01110011, 0b11110100, 0b01110101, 0b01110110, 0b11110111, // 240-247
        0b11111000, 0b01111001, 0b01111010, 0b11111011, 0b01111100, 0b11111101, 0b11111110, 0b01111111];// 248-255

    // Undigit codes
    static numRecMark =      0xA;
    static numBlank =        0xC;
    static numGroupMark =    0xF;

    // Unicode codepoints for special 1620 characters
    static glyphPillow = "\u25AE";
    static glyphRecMark = "\u2021";
    static glyphGroupMark = "\u2262";


    // Translate memory digits numerically to 1620 character glyphs.
    static numericGlyphs = [     // indexed by F8421 bits
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "|", "=", " ", "_", "_", "}",         // 00-0F
        "]", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "!", "$", "-", "_", "_", "\""];       // 10-1F

    // Translate memory digit pairs alphanumerically to 1620 character glyphs.
    static alphaGlyphs = [      // indexed as (zone 8421 bits)*16 + (numeric 8421 bits)
        " ", "_", "_", ".", ")", "_", "_", "_", "_", "_", "|", "_", "_", "_", "_", "}",         // 00-0F
        "+", "_", "_", "$", "*", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_",         // 10-1F
        "-", "/", "|", ",", "(", "_", "^", "_", "_", "_", "_", "_", "_", "_", "_", "_",         // 20-2F
        "_", "_", "_", "=", "@", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_",         // 30-3F
        "_", "A", "B", "C", "D", "E", "F", "G", "H", "I", "_", "_", "_", "_", "_", "_",         // 40-4F
        "]", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "!", "_", "_", "_", "_", "\"",        // 50-5F
        "_", "_", "S", "T", "U", "V", "W", "X", "Y", "Z", "_", "_", "_", "_", "_", "_",         // 60-6F
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "_", "_", "_", "_", "_", "_",         // 70-7F
        "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_",         // 80-8F
        "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_",         // 90-9F
        "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_",         // A0-AF
        "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_",         // B0-BF
        "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_",         // C0-CF
        "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_",         // D0-DF
        "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_",         // E0-EF
        "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_", "_"];        // F0-FF

    // Translate paper-tape code numerically to memory digits. Negative values
    // indicate paper-tape codes with invalid odd parity. This table implements
    // the behavior when reading alphanumeric data numerically.
    static xlateInNumeric = [   // indexed by paper-tape code
               0,               // ........
        0b000001,               // .......1   '1' -> '1'
        0b000010,               // ......2.   '2' -> '2'
               0,               // ......21
        0b000100,               // .....4..   '4' -> '4'
               0,               // .....4.1
               0,               // .....42.
        0b000111,               // .....421   '7' -> '7'
        0b001000,               // ....8...   '8' -> '8'
               0,               // ....8..1
               0,               // ....8.2.
        0b001011,               // ....8.21   '=' -> '='
               0,               // ....84..
        0b100000,               // ....84.1   '_' -> '0'   unassigned
        0b101110,               // ....842.                DC1 => 842 punch, End Card 1, causes MBR error
               0,               // ....8421
        0b100000,               // ...C....   ' ' -> '0'
               0,               // ...C...1
               0,               // ...C..2.
        0b100011,               // ...C..21   '3' -> '3'
               0,               // ...C.4..
        0b100101,               // ...C.4.1   '5' -> '5'
        0b100110,               // ...C.42.   '6' -> '6'
               0,               // ...C.421
               0,               // ...C8...
        0b101001,               // ...C8..1   '9' -> '9'
        0b101010,               // ...C8.2.   '_' -> '|'   unassigned
               0,               // ...C8.21
        0b101100,               // ...C84..   '@' -> ' '
               0,               // ...C84.1
               0,               // ...C842.
        0b101111,               // ...C8421   '_' -> '}'   unassigned
        0b100000,               // ..0.....   '0' -> '0'
               0,               // ..0....1
               0,               // ..0...2.
        0b100011,               // ..0...21   'T' -> '3'
               0,               // ..0..4..
        0b100101,               // ..0..4.1   'V' -> '5'
        0b100110,               // ..0..42.   'W' -> '6'
               0,               // ..0..421
               0,               // ..0.8...
        0b101001,               // ..0.8..1   'Z' -> '9'
        0b101010,               // ..0.8.2.   '|' -> '|'
               0,               // ..0.8.21
        0b101100,               // ..0.84..   '(' -> ' '
               0,               // ..0.84.1
               0,               // ..0.842.
        0b101111,               // ..0.8421   '}' -> '}'
               0,               // ..0C....
        0b000001,               // ..0C...1   '/' -> '1'
        0b000010,               // ..0C..2.   'S' -> '2'
               0,               // ..0C..21
        0b000100,               // ..0C.4..   'U' -> '4'
               0,               // ..0C.4.1
               0,               // ..0C.42.
        0b000111,               // ..0C.421   'X' -> '7'
        0b001000,               // ..0C8...   'Y' -> '8'
               0,               // ..0C8..1
               0,               // ..0C8.2.
        0b001011,               // ..0C8.21   ',' -> '='
               0,               // ..0C84..
        0b100000,               // ..0C84.1   '_' -> '0'   unassigned
               0,               // ..0C842.   '^' -> '_'   "special char" - paper-tape output only?
               0,               // ..0C8421
        0b010000,               // .X......   '-' -> ']'
               0,               // .X.....1
               0,               // .X....2.
        0b010011,               // .X....21   'L' -> 'L'
               0,               // .X...4..
        0b010101,               // .X...4.1   'N' -> 'N'
        0b010110,               // .X...42.   'O' -> 'O'
               0,               // .X...421
               0,               // .X..8...
        0b011001,               // .X..8..1   'R' -> 'R'
        0b011010,               // .X..8.2.   '!' -> '!'
               0,               // .X..8.21
        0b011100,               // .X..84..   '*' -> '-'
               0,               // .X..84.1
               0,               // .X..842.
        0b011111,               // .X..8421   '"' -> '"'
               0,               // .X.C....
        0b110001,               // .X.C...1   'J' -> 'J'
        0b110010,               // .X.C..2.   'K' -> 'K'
               0,               // .X.C..21
        0b110100,               // .X.C.4..   'M' -> 'M'
               0,               // .X.C.4.1
               0,               // .X.C.42.
        0b110111,               // .X.C.421   'P' -> 'P'
        0b111000,               // .X.C8...   'Q' -> 'Q'
               0,               // .X.C8..1
               0,               // .X.C8.2.                CR  => XC842 punch, Carriage Return, causes MBR error
        0b111011,               // .X.C8.21   '$' -> '$'
               0,               // .X.C84..
        0b010000,               // .X.C84.1   '-' -> ']'
        0b111110,               // .X.C842.                unassigned
               0,               // .X.C8421
               0,               // .X0.....
        0b000001,               // .X0....1   'A' -> '1'
        0b000010,               // .X0...2.   'B' -> '2'
               0,               // .X0...21
        0b000100,               // .X0..4..   'D' -> '4'
               0,               // .X0..4.1
               0,               // .X0..42.
        0b000111,               // .X0..421   'G' -> '7'
        0b001000,               // .X0.8...   'H' -> '8'
               0,               // .X0.8..1
               0,               // .X0.8.2.
        0b001011,               // .X0.8.21   '.' -> '='
               0,               // .X0.84..
        0b100000,               // .X0.84.1   '_' -> '0'   unassigned
        0b111110,               // .X0.842.                unassigned
               0,               // .X0.8421
        0b010000,               // .X0C....   '+' -> ']'
               0,               // .X0C...1
               0,               // .X0C..2.
        0b100011,               // .X0C..21   'C' -> '3'
               0,               // .X0C.4..
        0b100101,               // .X0C.4.1   'E' -> '5'
        0b100110,               // .X0C.42.   'F' -> '6'
               0,               // .X0C.421
               0,               // .X0C8...
        0b101001,               // .X0C8..1   'I' -> '9'
        0b011010,               // .X0C8.2.   '!' -> '!'   alternate for flagged record mark
               0,               // .X0C8.21
        0b101100,               // .X0C84..   ')' -> ' '
               0,               // .X0C84.1
               0,               // .X0C842.
        0b011111];              // .X0C8421   '_' -> '"'   unassigned

    // Translate paper-tape code alphanumerically to memory digits. Negative
    // values indicate paper-tape codes with invalid odd parity.
    static xlateInAlpha = [     // indexed by paper-tape code
                      0,        // ........
        0b000111_000001,        // .......1   '1' -> '1'
        0b000111_000010,        // ......2.   '2' -> '2'
                      0,        // ......21
        0b000111_000100,        // .....4..   '4' -> '4'
                      0,        // .....4.1
                      0,        // .....42.
        0b000111_000111,        // .....421   '7' -> '7'
        0b000111_001000,        // ....8...   '8' -> '8'
                      0,        // ....8..1
                      0,        // ....8.2.
        0b100011_100011,        // ....8.21   '=' -> '='
                      0,        // ....84..
        0b000111_100000,        // ....84.1   '_' -> '0'    unassigned
        0b100000_101110,        // ....842.                 DC1 => 842 punch, End Card 1, causes MBR error
                      0,        // ....8421
        0b100000_100000,        // ...C....   ' ' -> ' '
                      0,        // ...C...1
                      0,        // ...C..2.
        0b000111_100011,        // ...C..21   '3' -> '3'
                      0,        // ...C.4..
        0b000111_100101,        // ...C.4.1   '5' -> '5'
        0b000111_100110,        // ...C.42.   '6' -> '6'
                      0,        // ...C.421
                      0,        // ...C8...
        0b000111_101001,        // ...C8..1   '9' -> '9'
        0b100000_101010,        // ...C8.2.   '_' -> '|'    unassigned
                      0,        // ...C8.21
        0b100011_000100,        // ...C84..   '@' -> '@'
                      0,        // ...C84.1
                      0,        // ...C842.
        0b100000_101111,        // ...C8421   '_' -> '}'    unassigned
        0b000111_100000,        // ..0.....   '0' -> '0'
                      0,        // ..0....1
                      0,        // ..0...2.
        0b100110_100011,        // ..0...21   'T' -> 'T'
                      0,        // ..0..4..
        0b100110_100101,        // ..0..4.1   'V' -> 'V'
        0b100110_100110,        // ..0..42.   'W' -> 'W'
                      0,        // ..0..421
                      0,        // ..0.8...
        0b100110_101001,        // ..0.8..1   'Z' -> 'Z'
        0b100000_101010,        // ..0.8.2.   '|' -> '|'
                      0,        // ..0.8.21
        0b000010_000100,        // ..0.84..   '(' -> '('
                      0,        // ..0.84.1
                      0,        // ..0.842.
        0b100000_101111,        // ..0.8421   '}' -> '}'
                      0,        // ..0C....
        0b000010_000001,        // ..0C...1   '/' -> '/'
        0b100110_000010,        // ..0C..2.   'S' -> 'S'
                      0,        // ..0C..21
        0b100110_000100,        // ..0C.4..   'U' -> 'U'
                      0,        // ..0C.4.1
                      0,        // ..0C.42.
        0b100110_000111,        // ..0C.421   'X' -> 'X'
        0b100110_001000,        // ..0C8...   'Y' -> 'Y'
                      0,        // ..0C8..1
                      0,        // ..0C8.2.
        0b000010_100011,        // ..0C8.21   ',' -> ','
                      0,        // ..0C84..
        0b100110_100000,        // ..0C84.1
                      0,        // ..0C842.   '^' -> '_'    "special char" - paper-tape output only?
                      0,        // ..0C8421
        0b000010_100000,        // .X......   '-' -> '-'
                      0,        // .X.....1
                      0,        // .X....2.
        0b100101_100011,        // .X....21   'L' -> 'L'
                      0,        // .X...4..
        0b100101_100101,        // .X...4.1   'N' -> 'N'
        0b100101_100110,        // .X...42.   'O' -> 'O'
                      0,        // .X...421
                      0,        // .X..8...
        0b100101_101001,        // .X..8..1   'R' -> 'R'
        0b100101_101010,        // .X..8.2.   '!' -> '|'
                      0,        // .X..8.21
        0b000001_000100,        // .X..84..   '*' -> '*'
                      0,        // .X..84.1
                      0,        // .X..842.
        0b100101_101111,        // .X..8421   '"' -> '}'
                      0,        // .X.C....
        0b100101_000001,        // .X.C...1   'J' -> 'J'
        0b100101_000010,        // .X.C..2.   'K' -> 'K'
                      0,        // .X.C..21
        0b100101_000100,        // .X.C.4..   'M' -> 'M'
                      0,        // .X.C.4.1
                      0,        // .X.C.42.
        0b100101_000111,        // .X.C.421   'P' -> 'P'
        0b100101_001000,        // .X.C8...   'Q' -> 'Q'
                      0,        // .X.C8..1
                      0,        // .X.C8.2.
        0b000001_100011,        // .X.C8.21   '$' -> '$'
                      0,        // .X.C84..
        0b100101_100000,        // .X.C84.1   '-' -> ']'
        0b100000_101110,        // .X.C842.                 CR  => XC842 punch, Carriage Return, causes MBR error
                      0,        // .X.C8421
                      0,        // .X0.....
        0b000100_000001,        // .X0....1   'A' -> 'A'
        0b000100_000010,        // .X0...2.   'B' -> 'B'
                      0,        // .X0...21
        0b000100_000100,        // .X0..4..   'D' -> 'D'
                      0,        // .X0..4.1
                      0,        // .X0..42.
        0b000100_000111,        // .X0..421   'G' -> 'G'
        0b000100_001000,        // .X0.8...   'H' -> 'H'
                      0,        // .X0.8..1
                      0,        // .X0.8.2.
        0b100000_100011,        // .X0.8.21   '.' -> '.'
                      0,        // .X0.84..
        0b000100_100000,        // .X0.84.1                 unassigned
        0b100000_001110,        // .X0.842.                 unassigned
                      0,        // .X0.8421
        0b000001_100000,        // .X0C....   '+' -> '+'
                      0,        // .X0C...1
                      0,        // .X0C..2.
        0b000100_100011,        // .X0C..21   'C' -> 'C'
                      0,        // .X0C.4..
        0b000100_100101,        // .X0C.4.1   'E' -> 'E'
        0b000100_100110,        // .X0C.42.   'F' -> 'F'
                      0,        // .X0C.421
                      0,        // .X0C8...
        0b000100_101001,        // .X0C8..1   'I' -> 'I'
        0b100000_101010,        // .X0C8.2.   '!' -> '|'    alternate for flagged Record Mark
                      0,        // .X0C8.21
        0b100000_000100,        // .X0C84..   ')' -> ')'
                      0,        // .X0C84.1
                      0,        // .X0C842.
        0b100000_101111];       // .X0C8421   '_' -> '}'

    // Translate memory digits numerically to paper-tape code.
    static xlateOutNumeric = [  // indexed by the F8421 bits of a digit
        0b00100000,     0b00000001,     0b00000010,     0b00010011,     // 0-3
        0b00000100,     0b00010101,     0b00010110,     0b00000111,     // 4-7
        0b00001000,     0b00011001,     0b00101010,              0,     // 8-9, RM, ?
        0b00011100,              0,              0,     0b00101111,     // NB, ?, ?, GM

        0b01000000,     0b01010001,     0b01010010,     0b01000011,     // 0-3 (flagged)
        0b01010100,     0b01000101,     0b01000110,     0b01010111,     // 4-7 (flagged)
        0b01011000,     0b01001001,     0b01001010,              0,     // 8-9, RM, ? (flagged)
                 0,              0,              0,     0b01001111];    // NB, ?, ?, GM (flagged)

    // Translate memory digit pairs alphanumerically to paper-tape code.
    static xlateOutAlpha = [    // indexed by [(zone 8421)*16 + (numeric 8421)]
        0b00010000,              0,              0,     0b01101011,     // 00
        0b01111100,              0,              0,              0,     // 04
                 0,              0,     0b00101010,              0,     // 08
                 0,              0,              0,     0b00101111,     // 0C
        0b01110000,              0,              0,     0b01011011,     // 10
        0b01001100,              0,              0,              0,     // 14
                 0,              0,              0,              0,     // 18
                 0,              0,              0,              0,     // 1C
        0b01000000,     0b00110001,     0b00101010,     0b00111011,     // 20
        0b00101100,              0,     0b00111110,              0,     // 24
                 0,              0,              0,              0,     // 28
                 0,              0,              0,              0,     // 2C
                 0,              0,              0,     0b00001011,     // 30
        0b00011100,              0,              0,              0,     // 34
                 0,              0,              0,              0,     // 38
                 0,              0,              0,              0,     // 3C
                 0,     0b01100001,     0b01100010,     0b01110011,     // 40
        0b01100100,     0b01110101,     0b01110110,     0b01100111,     // 44
        0b01101000,     0b01111001,              0,              0,     // 48
                 0,              0,              0,              0,     // 4C
        0b01011101,     0b01010001,     0b01010010,     0b01000011,     // 50
        0b01010100,     0b01000101,     0b01000110,     0b01010111,     // 54
        0b01011000,     0b01001001,     0b01001010,              0,     // 58
                 0,              0,              0,     0b01001111,     // 5C
                 0,              0,     0b00110010,     0b00100011,     // 60
        0b00110100,     0b00100101,     0b00100110,     0b00110111,     // 64
        0b00111000,     0b00101001,              0,              0,     // 68
                 0,              0,              0,              0,     // 6C
        0b00100000,     0b00000001,     0b00000010,     0b00010011,     // 70
        0b00000100,     0b00010101,     0b00010110,     0b00000111,     // 74
        0b00001000,     0b00011001,              0,              0,     // 78
                 0,              0,              0,              0,     // 7C
                 0,              0,              0,              0,     // 80
                 0,              0,              0,              0,     // 84
                 0,              0,              0,              0,     // 88
                 0,              0,              0,              0,     // 8C
                 0,              0,              0,              0,     // 90
                 0,              0,              0,              0,     // 94
                 0,              0,              0,              0,     // 98
                 0,              0,              0,              0,     // 9C
                 0,              0,              0,              0,     // A0
                 0,              0,              0,              0,     // A4
                 0,              0,              0,              0,     // A8
                 0,              0,              0,              0,     // AC
                 0,              0,              0,              0,     // B0
                 0,              0,              0,              0,     // B4
                 0,              0,              0,              0,     // B8
                 0,              0,              0,              0,     // BC
                 0,              0,              0,              0,     // C0
                 0,              0,              0,              0,     // C4
                 0,              0,              0,              0,     // C8
                 0,              0,              0,              0,     // CC
                 0,              0,              0,              0,     // D0
                 0,              0,              0,              0,     // D4
                 0,              0,              0,              0,     // D8
                 0,              0,              0,              0,     // DC
                 0,              0,              0,              0,     // E0
                 0,              0,              0,              0,     // E4
                 0,              0,              0,              0,     // E8
                 0,              0,              0,              0,     // EC
                 0,              0,              0,              0,     // F0
                 0,              0,              0,              0,     // F4
                 0,              0,              0,              0,     // F8
                 0,              0,              0,              0];    // FC

    // Translate ASCII characters to paper-tape code.
    static xlateASCIIToPTCode = {
           //  EX0C8421 tape channels
        "0": 0b00100000,
        "1": 0b00000001,
        "2": 0b00000010,
        "3": 0b00010011,
        "4": 0b00000100,
        "5": 0b00010101,
        "6": 0b00010110,
        "7": 0b00000111,
        "8": 0b00001000,
        "9": 0b00011001,
        "A": 0b01100001,
        "B": 0b01100010,
        "C": 0b01110011,
        "D": 0b01100100,
        "E": 0b01110101,
        "F": 0b01110110,
        "G": 0b01100111,
        "H": 0b01101000,
        "I": 0b01111001,
        "J": 0b01010001,
        "K": 0b01010010,
        "L": 0b01000011,
        "M": 0b01010100,
        "N": 0b01000101,
        "O": 0b01000110,
        "P": 0b01010111,
        "Q": 0b01011000,
        "R": 0b01001001,
        "S": 0b00110010,
        "T": 0b00100011,
        "U": 0b00110100,
        "V": 0b00100101,
        "W": 0b00100110,
        "X": 0b00110111,
        "Y": 0b00111000,
        "Z": 0b00101001,
        ".": 0b01101011,
        ")": 0b01111100,
        "*": 0b01001100,
        "$": 0b01011011,
        "(": 0b00101100,
        ",": 0b00111011,
        "|": 0b00101010,        // Record Mark
        "!": 0b01001010,        // flagged Record Mark
        "=": 0b00001011,
        "@": 0b00011100,
        "+": 0b01110000,
        "-": 0b01000000,
        " ": 0b00010000,
        "/": 0b00110001,
        "}": 0b00101111,        // Group Mark
        "\"":0b01001111,        // flagged Group Mark
     // Codes that cause a CPU MBR parity error when read, per Germain, page 32.
     // "#": 0b00001110,        // DC1 ("\x11") => 842 punch, End Card 1
     // "%": 0b01011110,        // CR  ("\x0D") => XC842 punch, Carriage Return
     // Codes requiring special handling (see initialization code at end)
     // "]": 0b01011101,        // alternate for flagged zero (-0, 1622 only)
     // "!": 0b01111010,        // alternate for flagged Record Mark
     // "^": 0b00111110,        // "special" char: paper-tape output only, handled as special case
     // "<": 0b10000000,        // EOL (never read into memory)
     // "_": 0b01111111,        // tape-feed (ignored during non-binary read)
    };

    static ptSpaceCode = Envir.xlateASCIIToPTCode[" "];
    static ptSpecialCode = 0b00111110;

    // Translate binary hole patterns to ASCII.
    static xlatePTCodeToASCII = Array(256);     // initialized at end of module

    static {
        // Build the xlatePTCodeToASCII table from xlateASCIIToPTCode.
        Envir.xlatePTCodeToASCII.fill(null);
        for (let char in Envir.xlateASCIIToPTCode) {
            Envir.xlatePTCodeToASCII[Envir.xlateASCIIToPTCode[char]] = char;
        }

        // Special/alternate hole patterns.
        Envir.xlatePTCodeToASCII[0b01111010] = "!";     // alternate for flagged Record Mark
        Envir.xlatePTCodeToASCII[0b01110000] = "-";     // alternate for -0 (paper tape only)
        Envir.xlatePTCodeToASCII[0b01011101] = "-";     // alternate for -0 (card punch)
        Envir.xlatePTCodeToASCII[0b00111110] = "^";     // "special" character, paper-tape output only
        Envir.xlatePTCodeToASCII[0b01111111] = "_";     // tape-feed (ignored during non-binary read)
        Envir.xlatePTCodeToASCII[0b10000000] = "<";     // EOL (never read into memory)
    }


    // Public Instance Properties

    eTime = 0;                          // current emulation time, ms
    eTimeSliceEnd = 0;                  // current emulation time slice end time, ms
    governor = new Timer();             // throttling delay timer
    memorySize = 20000;                 // configured core memory size, digits
    setIndicator = null;                // reference to Processor's setIndicator() method


    /**************************************/
    startTiming() {
        /* Initializes the emulation timing to real-world time and starts a
        new throttling timeslice */

        this.eTime = performance.now();
        this.eTimeSliceEnd = this.eTime + Envir.minSliceTime;
    }

    /**************************************/
    restartTiming() {
        /* Synchronizes the emulation timing to real-world time without starting
        a new timeslice */

        this.eTime = performance.now();
    }

    /**************************************/
    tick() {
        /* Increments the emulation clock by one memory cycle time. Returns true
        if the time slice has expired */

        this.eTime += Envir.cycleTime;
        return (this.eTime >= this.eTimeSliceEnd);
    }

    /**************************************/
    throttle() {
        /* Returns a promise that unconditionally resolves after a delay to
        allow browser real time to catch up with the emulation clock, this.eTime.
        Since most browsers will force a nested setTimeout() to wait for a
        minimum of 4ms, Timer.delayUntil() will not delay if the difference
        between real time (as reported by performance.now()) and emulation time
        is less than Timer.minTimeout. Also advances the time slice next ending
        time if the current time slice has ended */

        if (this.eTime >= this.eTimeSliceEnd) {
            this.eTimeSliceEnd += Envir.minSliceTime;
        }

        return this.governor.delayUntil(this.eTime);
    }

} // class Envir
