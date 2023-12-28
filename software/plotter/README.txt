Index of retro-1620/software/plotter:
Files for the 1627 Plotter.

The source files for PLOT, CHAR, and POINT were transcribed in December
2023 by Paul Kimpel from:
    https://www.kgs.ku.edu/Publications/Bulletins/CC/15/CompContr15.pdf.

Some sketchy notes on the use of PLOT and CHAR are available in
"Programming the IBM 1620, Second Edition", Clarence B. Germain,
Prentice-Hall, Inc., Englewood Cliffs, NY, 1965, LCCN 65-17860,
pp. 139-141.

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

1620-LM-042-CHAR.sps
    SPS assembly job for the FORTRAN-callable CHAR subroutine.
    Essentially a formatted write to the plotter using a list of values
    and a FORMAT statement that much immediately follow the call. Caller
    can secify the size of the characters in inches and the orientation
    along the X or Y axis.

1620-LM-042-CHAR-Listing.txt
    Assembly listing for the CHAR subroutine.

Char-Demo-1.card
    Sample FORTRAN II-D program to demonstrate the Char subroutine.

1620-LM-042-POINT.sps
    SPS assembly job for the FORTRAN-callable POINT subroutine. Draws
    one of ten available symbols centered on the current pen location.

1620-LM-042-POINT-Listing.txt
    Assembly listing for the POINT subroutine.

Point-Demo-1.card
    Sample FORTRAN II-D program to demonstrate the POINT subroutine.

