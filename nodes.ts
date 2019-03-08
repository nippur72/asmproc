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

interface BasicNode {
   type: "basic",
   lines: BasicLine[]
}

interface BasicLine {
   type: "basicline",
   num: number,
   testo: string
}

interface Expression {
   type: ""
}

interface LiteralString {
   type: "string",
   str: string
}

interface LiteralInteger {
   type: "integer"
   num: number
}

interface Parens {
   type: "()"|"[]"
   expr: ASTNode
}

interface IdNode {
   type: "id"
   name: string
   args: Expression[]|null
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

interface Operator {
   type: "||" | "&&" | "|" | "&" | "^" | "<<" | ">>" | "+" | "-" | "*" | "/" | "%" | "MOD",
   left: Expression,
   right: Expression
}

export type ASTNode = errorNode | ProgramNode | BasicNode | BasicLine;

class _Operator {
   //type: "||" | "&&" | "|" | "&" | "^" | "<<" | ">>" | "+" | "-" | "*" | "/" | "%" | "MOD";
   //left: Expression;
   //right: Expression;
   constructor(type: string, left: Expression, right: Expression);
}

