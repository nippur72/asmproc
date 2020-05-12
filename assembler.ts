import { Expression } from "./nodes";

interface ICode {
   offset: number;
   label: string;
   byte: number | undefined;
}

interface Symbol {
   value: number | undefined;
   expr: Expression;
}

let symbols: Symbol[] = [];
let code: ICode[] = [];

/*
Assembler renderer:

CONST_SEGMENT:
   symbol = value

CODE_SEGMENT:
   [label:] istruction args
   label: byte

DATA_SEGMENT
   label: byte

org 
processor

*/
