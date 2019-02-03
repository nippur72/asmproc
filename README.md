# asmproc

`asmproc` is high-level Assembly language for the 6502 processor that
extends the 6502 assembly language with structured programming, typical of
high level languages like C, Pascal and Basic.

It's a super-set of the normal 6502 assembly, but you can think of it
as a language of its own. 

## INSTALLATION

From the command prompt:
```
npm i -g `asmproc`
```

## USAGE

`asmproc` does not directly produce executables; its output is instead
an .asm file that can be assembled with an external assembler (currently 
only DASM is supported). This because `asmproc` was born as a preprocess
for `.asm` files.

From the command prompt:
```
asmproc -i <inputfile> -o <destfile>
```

- `inputfile` is the source file written according 
to the `asmproc` syntax

- `destfile` is the destination file that is going 
to be compiled with DASM.

Both `inputfile` and `destfile` are plain text files.

If `asmproc` fails to compile due to an error in the source file
the `%ERRORLEVEL%` shell variable is set to `-1` so that 
the compiling script can be stopped. So `%ERRORLEVEL%` is 0 if
`asmproc` has worked correctly.

# LANGUAGE QUICK REFERENCE

## COMMENTS

C-style comments `/* */`, not nested, are permitted. 

## CASE SENSITIVITY

`asmproc` is not case sensitive. All is converted uppercase.

## STATEMENT SEPARATION
 
Statements can be separed onto a single line by a semicolon (` : `). 

Note that space character is needed before and after the semicolon (` : `) to 
allow differentiation from labels.  

Placing a semicolon in a "if-then" statement on a single line may cause confusion as 
the statement after the semicolon is not considered part of the "if-then"
branch, but a statement of its own. 

Example:
```
INX : INX : STX $FF
```

## IF-THEN 

On multiple lines:
```
if <condition> then
   <blockthen>
else
   <blockelse>
end if  /* or endif */
```
The `else` branch is optional.

On a single line:
```
if <condition> then statement
if <condition> then goto <label>
if <condition> then exit repeat
if <condition> then exit do
if <condition> then exit while
if <condition> then exit for
if <condition> then exit sub
```

Example:
```
if carry then LDA $FF
```

## REPEAT-UNTIL

Repeat a block until a condition is met.
```
repeat 
   <block>
   [exit repeat]
until <condition>
```

Example:
```
repeat   
   inx
until x<#20   
```

## DO-LOOP

Executes a loop while a condition is met. 

```
do
   <block>
   [exit do]
loop while <condition>   /* or: loop if <condition> */

do
   <block>
   [exit do]
loop until <condition>  /* loop if condition is NOT true */
```

Example:
```
do
   inx
loop until x<#20   
```

## WHILE-WEND

Executes a loop while a condition is met. 
```
while <condition>
   <block>
   [exit while]
wend
```

Example:
```
while x<#20
   inx
wend
```

## FOR-NEXT

Executes a FOR loop.
```
for <register>=<start> to <end> [step <step>]
   <block>
   [exit for]
next
```

- `<register>` can be `A`,`X`,`Y` or a memory location.
- `<start>` can be a costant or memory location.
- `<end>` is a fixed constant
- `<step>` constant from `#-4` to `#4` (because internally it's translated with `INC`s and `DEC`s).

When using a memory location the value in A register is lost because it's used in
the loop initialization/compare. 

Example:
```
FOR X=#1 TO #20
   TXA
NEXT
```
        
## EXPRESSING CONDITIONS

All `<conditions>` expressed in control and looping statements can be one of these:

Flags:
```
   Z=1, ZERO, EQUAL  
   Z=0, NOT ZERO, NOT EQUAL
   C=1, CARRY
   C=0, NOT CARRY
   N=1, NEGATIVE
   N=0, NOT NEGATIVE
   V=1, OVERFLOW
   V=0, NOT OVERFLOW
```
Registers:
```
   A <operator> <value>
   X <operator> <value>
   Y <operator> <value>
```
Memory:
```
   <memory> <operator> <value>
   <memory> IS [NOT] ZERO
   <memory> IS [NOT] NEGATIVE
```

`<operator>` can be: `<`, `>`, `<=`, `>=`, `<>`, `!=`, `==`, `=`,

`<memory>` specifies a memory location and the needed compare
operation is done via the accumulator unless specified
with one of predicates `(using x)` or `(using y)`. 

The `IS` syntax allows to avoid a CMP istruction.

Compare operation is always unsigned unless the predicate `(signed)` is specified.     

Examples:

```
if ZERO then rts        ; return if zero flag
if Z=1 then rts         ; return if zero flag
if A IS ZERO then rts   ; return if A is zero
if A=#0 then rts        ; return if A is zero
if A>#15 then rts       ; return if A is > 15
if (signed) X < #-5     ; return if X is less than -5, with X meant as a signed value
```
 
## SUBROUTINES

Subroutines
```
sub <Name>[()]
   <block>
   [exit sub]
end sub         /* rts is added automatically*/
```

Example
```
SUB mysub()
   lda $03
   if a<#10 then exit sub
   lda #$ff
END SUB
```

## BITMAP CHARACTER COSTANTS

Define bitmap values, e.g. for sprite or character redefinition.

```    
bitmap <code>
```

For single-color `<code>` is 8-character wide
```
- "." or "-" or "0" equals to bit 0
- any other character equals to bit 1
```

For multicolor `<code>` is 4-character wide
```
- "." or "-" or "0" equals to bits 00  background color
- "A" or "1"        equals to bits 01  border color
- "B" or "2"        equals to bits 10  foreground color
- "F" or "3"        equals to bits 11  auxiliary color (36878's high nibble)
```

Example: 
```
  bitmap  ...XX...
  bitmap  ..XXXX..
  bitmap  .XX..XX.
  bitmap  .XXXXXX.
  bitmap  .XX..XX.
  bitmap  .XX..XX.
  bitmap  .XX..XX.
  bitmap  ........
```

## FLOATING POINT COSTANTS

Defines a floating point costant in CBM format (5 bytes).

```
[label] float value[,value...]
```

Example:
```
PI: float 3.14
```
    
## MACROS

```
macro <macroname> <parameter>,<parameter>,...
   <body>
end macro
```

`<parameter>` can be:

- `const` - meaning a costant value (6502's immediate mode '#')
- `mem` - meaning a memory location (6502's absolute or zero page mode)
- `indirect` - pointer deference (6502's indirect mode, enclosed in ())
- `"quoted value"` - any literal value enclosed in quotes

When defining the body of the macro parameters can be referenced
with `{1}`, `{2}`, ...

Macros are polymorhpic, that is, more macros with the same name 
but with different parameter specification can be defined.

Example: 
```
macro poke mem, const
   lda #{2}   
   sta {1}
end macro

poke 32768, #128

macro ldx indirect, "a"
   tay
   lda ({1}), y
   txa   
end macro

ldx ($ff), a
```

## INLINE BASIC

```
basic start [compact]
   <basic v2.0 text here>    
basic end   
```

Allows to enter BASIC programs directly from the assembler source.

If you put machine language code after the basic code, it will be hidden to LIST command. 

Enclosing an assembler symbol (e.g. a label) in `"{}"` causes the corresponding 
4-digit decimal number to be entered in the basic text as tokens. It is thus allowed 
to basic to call assembler subroutines. 

Quoted string text can contain `{codes}` for special characters, in
the format `{shift k}` or `{cbm k}` (substitute "k" with the actual key).

The following special codes are also supported:
```
{pi} {left arrow} {run stop} {return} 

{up} {down} {left} {right} {clr} {home} {inst} {del} {rvs on} {rvs off}

{blk} {wht} {cyn} {red} {pur} {grn} {blu} {yel}  

{rev a} {rev b} {rev d}  {rev f} {rev g} {rev h} {rev i}
{rev j} {rev k} {rev l}  {rev n} {rev o} {rev p} {rev u} 
{rev v} {rev w}  {rev x} {rev y} {rev z} {rev [} 

{rev shift *} {rev shift a} {rev shift b} {rev shift c} {rev shift d}
{rev shift m} {rev shift n} {rev shift o} {rev shift u} {rev shift v}
{rev shift w} {rev shift x} {rev shift y} {rev shift z} {rev shift +}

{f1} to {f8}

{160} {224}
```

Example:
```
basic start
   10 print "{clr}hello world"
   20 sys {main}
basic end

main:   
   RTS
```

## REDEFINED DASM KEYWORDS

Because `IF`, `ELSE`, `ENDIF` have a new meaning in `asmproc`, the corresponding DASM 
keywords are accessible with the `#` prefix:
```
#if      translates into  IF
#else    translates into  ELSE
#endif   translates into  ENDIF
```

The following two keywords are also available for convenience:
```
#ifdef   translates into  IFCONST
#ifndef  translates into  IFNCONST
```

also, `#IFDEF`/`#IFNDEF` have a single-line syntax:
```
#ifdef  <symbol> then <statement>
#ifndef <symbol> then <statement>
```

## LICENSE

`asmproc` was written in 2006 (C) 2006-2007 by Antonino Porcino 
(Nippur72) and is MIT licensed. 


## CHANGELOG

- v0.0.1, 03-feb-2019: JavaScript port and Github/NPM publish.

- v0: from 2006 to 2019 `asmproc` was an internal tool I used only 
for my personal projects. It was written in C++ for Windows (Borland Compiler). 
In 2019 I converted it to JavaScript and released as an open source (MIT license).

