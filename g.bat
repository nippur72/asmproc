call pegjs --trace grammar.pegjs
call tsc 
rem node parse_grammar
node asmproc2 -i test\test1.lm -o test\test1.asm


