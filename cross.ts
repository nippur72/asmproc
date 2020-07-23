export const target = {
   dasm: true,
   ca65: false,
   z80asm: false,
   cpu6502: true,
   cpuz80: false   
};

let JMP: string;

export function WORD(label: string, ...list: string[])
{
   let keyword;
   let wordString = list.join(",");

        if(target.dasm)   return `${label}: word ${wordString}`;
   else if(target.ca65)   return `${label}: .word ${wordString}`;
   else if(target.z80asm) return `${label} defw ${wordString}`;
   else throw "unknown target";
}

export function BYTE(label: string, ...list: string[])
{
   let keyword;
   let byteString = list.join(",");

        if(target.dasm)   return `${label}: byte ${byteString}`;
   else if(target.ca65)   return `${label}: .byte ${byteString}`;
   else if(target.z80asm) return `${label} defb ${byteString}`;
   else throw "unknown target";
}

export function BYTESPACE(label: string, size: string, value: string)
{
        if(target.dasm)   return `${label}: DS ${size}, ${value}`;
   else if(target.ca65)   return `${label}: .res ${size}, ${value}`;
   else if(target.z80asm) return `${label} defs ${size}, ${value}`;
   else throw "unknown target";
}

export function WORDSPACE(label: string, size: string, value: string)
{
        if(target.dasm)   return `${label}: DS (${size})*2, ${value}`;
   else if(target.ca65)   return `${label}: .res (${size})*2, ${value}`;
   else if(target.z80asm) return `${label} defs (${size})*2, ${value}`;
   else throw "unknown target";
}

export function Jump(dest: string)
{
   if(target.cpu6502) return `JMP ${dest}`;   // TODO jump relative for 6502
   else               return `JR ${dest}`;
}

export function MOD(left: string, right: string)
{
   if(target.dasm)   return left + " % " + right;     
   if(target.ca65)   return left + " .MOD " + right;
   if(target.z80asm) return left + " % " + right;
   throw "";    
}

export function mod(value: string, div: string) {
        if(target.dasm)   return `${value}%${div}`;
   else if(target.ca65)   return `${value} .MOD ${div}`;
   else if(target.z80asm) return `${value}%${div}`;
   throw "";
}

export function parens(s: string) {
        if(target.dasm)   return `[${s}]`;
   else if(target.ca65)   return `(${s})`;
   else if(target.z80asm) return `[${s}]`;
   throw "";   
}

export function notequal(a: string, b: string){
        if(target.dasm)   return `${a}!=${b}`;
   else if(target.ca65)   return `${a}<>${b}`;
   else if(target.z80asm) return `${a}<>${b}`;
   throw "";   
}

export function hibyte(byte: string) {
        if(target.dasm)   return `${byte}/256`;
   else if(target.ca65)   return `.HIBYTE(${byte})`;
   else if(target.z80asm) return `${byte}/256`;
   throw "";   
}

export function lobyte(byte: string) {
        if(target.dasm)   return `${byte}%256`;
   else if(target.ca65)   return `.LOBYTE(${byte})`;
   else if(target.z80asm) return `${byte}%256`;
   throw "";
}

export function define(id: string, val: string) {
        if(target.dasm)   return `${id} EQU ${val}`;
   else if(target.ca65)   return `${id} = ${val}`;
   else if(target.z80asm) return `${id} EQU ${val}`; 
   throw "";
}
