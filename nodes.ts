interface errorNode {
   type: "error";
   error: { 
      message: string, 
      location: {
         start: { line: number, column: number, offset: number }, 
         end: { line: number, column: number, offset: number }
      },
      expected: any
   };
}

interface ProgramNode {
   type: "program",
   items: ASTNode[]
}

export interface BasicNode {
   type: "basic",
   lines: BasicLine[]
}

export interface BasicLine {
   type: "basicline",
   num: number,
   testo: string
}

export type Expression = 
   IdExpression | 
   StringLiteral | 
   IntegerLiteral |
   RoundParens |
   SquareParens |
   UnaryMinus |
   UnaryPlus |
   LogicalNot |
   BitwiseNot |
   Operator;

interface IdExpression {
   type: "id"
   id: string
   args: Expression[]|undefined
}

interface StringLiteral {
   type: "string";
   str: string;
}

interface IntegerLiteral {
   type: "integer";
   num: number;
}

interface RoundParens {
   type: "()";
   expr: Expression
}

interface SquareParens {
   type: "[]";
   expr: Expression
}

// .dot not implemented yet

interface UnaryPlus {
   type: "unaryplus", 
   expr: Expression
}

interface UnaryMinus {
   type: "unaryminus", 
   expr: Expression
}

interface LogicalNot {
   type: "!", 
   expr: Expression
}

interface BitwiseNot {
   type: "~", 
   expr: Expression
}

type Operators = "||" | "&&" | "|" | "&" | "^" | "<<" | ">>" | "+" | "-" | "*" | "/" | "%" | "MOD";

interface Operator {
   type: Operators,
   left: Expression,
   right: Expression
}

class _Operator {   
   type: Operators;
   left: Expression;
   right: Expression;
   constructor(type: Operators, left: Expression, right: Expression) {
      this.type = type;
      this.left = left;
      this.right = right;
   }
}

export interface ByteNode {
   type: "byte";
   bytetype: "byte" | "word"; // TODO defw defb
   list: Expression[];
}

interface Instruction {
   type: "instruction"
   opcode: {
      type: "opcode";
      opcode: string;
   }
   args: OpExpression[];   
}

type OpExpression = ImmediateExpression | Expression;

interface ImmediateExpression {
   type: "immediate";
   expr: Expression;
}

interface Dim {
   type: "dim";
   id: string;
   size: "byte" | "word" | "char" | "integer";
   spec: {
      absolute?: Expression
      zeropage?: boolean
      init?: Expression
   }
}

interface Const {
   type: "const";
   id: string;
   value: Expression
}

export type ASTNode = 
   errorNode | 
   ProgramNode | 
   BasicNode | 
   BasicLine | 
   ByteNode |
   Expression |
   Instruction | 
   OpExpression |
   Dim |
   Const
   ;

export function nodeToString(N: ASTNode): string 
{
   console.log(N);
        if(N.type === "error" )     return errorToString(N);
   else if(N.type === "program")    return programToString(N);
   else if(N.type === "basic")      return basicToString(N);
   else if(N.type === "basicline")  return basicLineToString(N);
   else if(N.type === "string")     return stringToString(N);
   else if(N.type === "integer")    return integerToString(N);
   else if(N.type === "()")         return roundParensToString(N);
   else if(N.type === "[]")         return squareParensToString(N);
   else if(N.type === "id")         return idToString(N);   
   else if(N.type === "||")         return orToString(N);
   else if(N.type === "&&")         return andToString(N);
   else if(N.type === "|")          return bitwiseOrToString(N);
   else if(N.type === "&")          return bitwiseAndToString(N);
   else if(N.type === "^")          return xorToString(N);
   else if(N.type === "<<")         return shiftleftToString(N);
   else if(N.type === ">>")         return shiftrightToString(N);
   else if(N.type === "+")          return plusToString(N);
   else if(N.type === "-")          return minusToString(N);
   else if(N.type === "!")          return logicalNotToString(N);
   else if(N.type === "~")          return bitwiseNotToString(N);
   else if(N.type === "*")          return multiplicationToString(N);
   else if(N.type === "/")          return divisionToString(N);
   else if(N.type === "%" || N.type === "MOD") return modToString(N);
   else if(N.type === "unaryplus")   return unaryplusToString(N);
   else if(N.type === "unaryminus")  return unaryminusToString(N);
   else if(N.type === "instruction") return instructionToString(N);   
   else if(N.type === "immediate")   return immediateToString(N);  
   else if(N.type === "byte")        return byteToString(N);
   else if(N.type === "dim")         return dimToString(N);
   else if(N.type === "const")       return constToString(N);

   /*
   else if(N.type === "bitmap")    return bitmapToString(N);
   else if(N.type === "sprite")    return spriteToString(N);
   else if(N.type === "expr" )     return exprToString(N);
   else if(N.type === "number")    return numberToString(N);
   */
   else throw `node type not recognized: ${(N as any).type}`;
}

function errorToString(N: errorNode) {
   return N.error.message;
}

function programToString(N: ProgramNode): string {
   return N.items.map(e=>nodeToString(e)).join("\n");
}

function basicToString(N: BasicNode): string {
   const lines = N.lines.map(e=>nodeToString(e));
   return lines.join("\n");
}

function basicLineToString(N: BasicLine): string {
   throw "not implemented";   
}

// ========== expressions 
function stringToString(N: StringLiteral) { 
   return `"${N.str}"`;
}

function integerToString(N: IntegerLiteral) {
   return String(N.num);
}

function roundParensToString(N: RoundParens) {
   return `(${nodeToString(N.expr)})`;   // TODO use cross
}

function squareParensToString(N: SquareParens) {
   return `[${nodeToString(N.expr)}]`;   // TODO use cross
}

function idToString(N: IdExpression) {
   console.log(N);
   // simple identifier
   if(N.args === undefined) return N.id;

   // function call
   const args = N.args.map(e=>nodeToString(e)).join(",");
   return `${N.id}(${args})`;
}

function orToString(N: Operator)             { return `${nodeToString(N.left)} || ${nodeToString(N.right)} `}
function andToString(N: Operator)            { return `${nodeToString(N.left)} && ${nodeToString(N.right)} `}
function bitwiseOrToString(N: Operator)      { return `${nodeToString(N.left)} |  ${nodeToString(N.right)} `}
function bitwiseAndToString(N: Operator)     { return `${nodeToString(N.left)} &  ${nodeToString(N.right)} `}
function xorToString(N: Operator)            { return `${nodeToString(N.left)} ^  ${nodeToString(N.right)} `}
function shiftleftToString(N: Operator)      { return `${nodeToString(N.left)} << ${nodeToString(N.right)} `}
function shiftrightToString(N: Operator)     { return `${nodeToString(N.left)} >> ${nodeToString(N.right)} `}
function plusToString(N: Operator)           { return `${nodeToString(N.left)} +  ${nodeToString(N.right)} `}
function minusToString(N: Operator)          { return `${nodeToString(N.left)} -  ${nodeToString(N.right)} `}
function multiplicationToString(N: Operator) { return `${nodeToString(N.left)} *  ${nodeToString(N.right)} `}
function divisionToString(N: Operator)       { return `${nodeToString(N.left)} /  ${nodeToString(N.right)} `}
function modToString(N: Operator)            { return `${nodeToString(N.left)} %  ${nodeToString(N.right)} `}
function unaryplusToString(N: UnaryPlus)     { return `+${nodeToString(N.expr)}`}
function unaryminusToString(N: UnaryMinus)   { return `-${nodeToString(N.expr)}`}
function logicalNotToString(N: LogicalNot)   { return `!${nodeToString(N.expr)}`}
function bitwiseNotToString(N: BitwiseNot)   { return `~${nodeToString(N.expr)}`}

// ======================

function instructionToString(N: Instruction): string {
   const args = N.args.map(e=>nodeToString(e)).join(",");
   return `${N.opcode.opcode} ${args}`;
}

function immediateToString(N: ImmediateExpression): string {
   return `#${nodeToString(N.expr)}`;
}

function byteToString(N: ByteNode) {   
   const list = N.list.map(e=>nodeToString(e));
   return `${N.bytetype} ${list}`;
}

function dimToString(N: Dim) {   
   if(N.spec.absolute !== undefined) {
      return `${N.id} = ${nodeToString(N.spec.absolute)}`;
   }
   if(N.spec.zeropage) {
      throw "not implemented";
   }
   const zero = { type: "integer", num: 0 } as Expression;
   const init = N.spec.init === undefined ? zero : N.spec.init;
   
   return `${N.id} ${N.size} ${nodeToString(init)}`;
}

function constToString(N: Const) {   
   return `${N.id} = ${nodeToString(N.value)}`;
}

// Cond

