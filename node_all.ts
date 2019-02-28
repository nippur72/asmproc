export type Node = NodeLine 
                 | NodeConst 
                 | NodeExpression 
                 | NodeFloat 
                 | NodeBitmap
                 | NodeSprite
                 | NodeNumber;

export interface NodeLine       { type: "line", line: Node };
export interface NodeConst      { type: "const", id: String, expr: NodeExpression };
export interface NodeExpression { type: "expr", arg: string };
export interface NodeFloat      { type: "float", label: string|null, numbers: NodeNumber[] };
export interface NodeSprite     { type: "sprite", label: string|null, expr: NodeExpression };
export interface NodeBitmap     { type: "bitmap", label: string|null, expr: NodeExpression };

export interface NodeNumber     { type: "number", num: string };

export function nodeToString(N: Node) 
{
        if(N.type === "line" )  return lineToString(N);
   else if(N.type === "const")  return constToString(N);
   else if(N.type === "float")  return floatToString(N);
   else if(N.type === "bitmap") return bitmapToString(N);
   else if(N.type === "sprite") return spriteToString(N);
   else if(N.type === "expr" )  return exprToString(N);
   else if(N.type === "number") return numberToString(N);
   else throw `node type not recognized: ${(N as any).type}`;
}

function lineToString(N: NodeLine): string 
{
   return nodeToString(N.line);
}

function constToString(N: NodeConst): string 
{
   const { id, expr } = N;
   return `${id} = ${nodeToString(expr)}`;
}

function exprToString(N: NodeExpression): string
{   
   return `${N.arg}`;
}

function numberToString(N: NodeNumber): string
{   
   return `${N.num}`;
}

import { CBMFloat } from "./cbm_float";
import { BYTE } from "./cross";

function floatToString(N: NodeFloat): string
{  
   let bytes = N.numbers.map(n=>nodeToString(n))
                        .map(n=>Number(n))
                        .map(n=>CBMFloat(n).join(","));
   
   if(N.label === null) return BYTE("", ...bytes);   
   else                 return BYTE(N.label, ...bytes);   
}

import { bitmapToByte } from "./utils";

function bitmapToString(N: NodeBitmap): string
{  
   let Argomento = nodeToString(N.expr).trim();

   if(Argomento.Length()!=4 && Argomento.Length()!=8)
   {
      throw `invalid BITMAP value: "${Argomento}"`;      
   }

   let byte = String(bitmapToByte(Argomento));
   
   if(N.label === null) return BYTE("", byte);   
   else                 return BYTE(N.label, byte);   
}

function spriteToString(N: NodeSprite): string
{  
   let Argomento = nodeToString(N.expr).trim();

   if(Argomento.Length()!=4*3 && Argomento.Length()!=8*3)
   {
      throw `invalid SPRITE value: "${Argomento}"`;      
   }

   let b1, b2, b3;
   if(Argomento.Length() === 8*3)
   {
      b1 = String(bitmapToByte(Argomento.substr(0+0*8, 8)));
      b2 = String(bitmapToByte(Argomento.substr(0+1*8, 8)));
      b3 = String(bitmapToByte(Argomento.substr(0+2*8, 8)));
   }
   else 
   {
      b1 = String(bitmapToByte(Argomento.substr(0+0*4, 4)));
      b2 = String(bitmapToByte(Argomento.substr(0+1*4, 4)));
      b3 = String(bitmapToByte(Argomento.substr(0+2*4, 4)));
   }      
   
   if(N.label === null) return BYTE("", b1,b2,b3);   
   else                 return BYTE(N.label, b1,b2,b3);   
}
