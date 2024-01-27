Index of retro-1620/software/plotter:
Files for the 1627 Plotter.

The source files for PLOT, CHAR, and POINT were transcribed in December
2023 by Paul Kimpel from:
    https://www.kgs.ku.edu/Publications/Bulletins/CC/15/CompContr15.pdf.

Notes on PLOT, CHAR, and POINT are included in the plotter wiki page,
https://github.com/pkimpel/retro-1620/wiki/UsingThePlotter.

Some sketchy notes on the use of PLOT and CHAR are also available in
"Programming the IBM 1620, Second Edition", Clarence B. Germain,
Prentice-Hall, Inc., Englewood Cliffs, NY, 1965, LCCN 65-17860,
pp. 139-141.

Plot-Demo-1.card, Plot-Demo-2.card, Plot-Timing-Study-1.card, Char-
Demo-1.card, and Point-Demo-1.card all compile to disk and execute from
the compiled file. You can extract the last three cards from each of
those decks as standalone jobs to run the demos without having to
compile them each time. Each of the demos also positions the pen
automatically during its initialization.

1620-LM-042-PLOT.sps
    SPS assembly job for the FORTRAN-callable PLOT subroutine. Specifies
    the size of the plot area in inches, scales the plot area to
    specified maximum and minimum values, optionally draws axes or a
    grid, controls the pen up/down state, and moves or draws straight
    lines from one data point to another, optionally drawing a small "+"
    at each data point.

1620-LM-042-PLOT-Listing.txt
    Assembly listing for the PLOT subroutine.

Plot-Demo-1.card
    Sample FORTRAN II-D program to demonstrate the PLOT subroutine.

Plot-Demo-2.card
    Another FORTRAN II-D program for a more complicated "string art"
    plot.

Plot-Timing-Study-1.card
    A FORTRAN II-D program to assist in timing the performance of the
    plotter. It requires the PLOT subroutine. The program simply draws a
    rectangle 1080 steps on a side, for a total of 4320 steps. At 300
    steps/second, this drawing should take exactly 14.40 seconds to
    complete. The program halts before and after drawing the rectangle
    to assist in timing the plot.

1620-LM-042-CHAR.sps
    SPS assembly job for the FORTRAN-callable CHAR subroutine.
    Essentially a formatted write to the plotter using a list of values
    and a FORMAT statement that much immediately follow the call. Caller
    can secify the size of the characters in inches and the orientation
    along the X or Y axis.

1620-LM-042-CHAR-Listing.txt
    Assembly listing for the CHAR subroutine.

Char-Demo-1.card
    Sample FORTRAN II-D program to demonstrate the CHAR subroutine.

POINT.sps
    SPS assembly job for the FORTRAN-callable POINT subroutine. Draws
    one of ten available symbols centered on the current pen location.

POINT-Listing.txt
    Assembly listing for the POINT subroutine.

Point-Demo-1.card
    Sample FORTRAN II-D program to demonstrate the POINT subroutine.




