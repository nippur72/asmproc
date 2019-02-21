import nearley from "nearley";
const grammar = require("./expressions");

interface NodeExpression { type: "root", arg: Node  };
interface NodeParens { type: "parens", arg: Node  };
interface NodeExponent { type: "^", base: Node, exponent: Node  };
interface NodeMul { type: "*", arg1: Node, arg2: Node  };
interface NodeDiv { type: "/", arg1: Node, arg2: Node  };
interface NodePlus { type: "+", arg1: Node, arg2: Node  };
interface NodeMinus { type: "-", arg1: Node, arg2: Node  };
interface NodeSin { type: "sin", arg: Node  };
interface NodePi { type: "pi" };
interface NodeNumber { type: "number", num: string };

type Node = NodeExpression | NodeParens | NodeExponent | NodeMul | NodeDiv | NodePlus | NodeMinus | NodeSin | NodePi | NodeNumber;

interface Instruction {
   type: string;
   arg?: string;
}

function test_expression(input: string): Node | undefined 
{
   try 
   {
      // Make a parser and feed the input
      let parser = new nearley.Parser(grammar.ParserRules, grammar.ParserStart)
      
      let ans = parser.feed(input);
      
      // Check if there are any results
      if(ans.results.length !== 0) 
      {         
         let result = ans.results[0];         
         return result;
      } 
      else 
      {
         // This means the input is incomplete.
         console.log("Error: incomplete input, parse failed.");
         return undefined;         
      }
   } 
   catch(e) 
   {
      // Panic in style, by graphically pointing out the error location.
      console.log(`error at ${e.offset}`);
      return undefined;
   }     
}

let input = "(3*4)/(5-3)+sin(1+1)";
console.log(input);
let parsed = test_expression(input);

if(parsed === undefined)
{   
   throw "err";
}

function isterminal(node: Node): boolean
{
   return node.type === "number";
}

function visittree(node: Node, arg?: number): Instruction[]
{
   let out: Instruction[] = [];

   if(node.type === "root") 
   { 
      out = visittree(node.arg);   
      // TODO optimize last push
   }
   else if(node.type === "parens") 
   { 
      out = visittree(node.arg); 
      // TODO optimize nested parens 
   }
   else if(node.type === "^")      
   {       
      out = [];
      //visittree(node.base, 1) + visittree(node.exponent, 2) + "fexp\n"; 
   }
   else if(node.type === "*")      
   {       
      let arg1part = visittree(node.arg1, 1);
      let arg2part = visittree(node.arg2, 2);
      
      out = [...arg1part, ...arg2part];
      
      if(!isterminal(node.arg1)) out = [ ...out, { type: "POPFAC" }];
      if(!isterminal(node.arg2)) out = [ ...out, { type: "POPAFAC" }];
      out = [ ...out, { type: "FMUL" }];
      out = [ ...out, { type: "FPUSH" }];      
   }
   else if(node.type === "/")      
   { 
      let arg1part = visittree(node.arg1, 1);
      let arg2part = visittree(node.arg2, 2);
      
      out = [...arg1part, ...arg2part];
      
      if(!isterminal(node.arg1)) out = [ ...out, { type: "POPFAC" }];
      if(!isterminal(node.arg2)) out = [ ...out, { type: "POPAFAC" }];
      out = [ ...out, { type: "FDIV" }];
      out = [ ...out, { type: "FPUSH" }];      
   }
   else if(node.type === "+")      
   { 
      let arg1part = visittree(node.arg1, 1);
      let arg2part = visittree(node.arg2, 2);
      
      out = [...arg1part, ...arg2part];
      
      if(!isterminal(node.arg1)) out = [ ...out, { type: "POPFAC" }];
      if(!isterminal(node.arg2)) out = [ ...out, { type: "POPAFAC" }];
      out = [ ...out, { type: "FADD" }];
      out = [ ...out, { type: "FPUSH" }];      
   }
   else if(node.type === "-")      
   { 
      let arg1part = visittree(node.arg1, 1);
      let arg2part = visittree(node.arg2, 2);
      
      out = [...arg1part, ...arg2part];
      
      if(!isterminal(node.arg1)) out = [ ...out, { type: "POPFAC" }];
      if(!isterminal(node.arg2)) out = [ ...out, { type: "POPAFAC" }];
      out = [ ...out, { type: "FSUB" }];
      out = [ ...out, { type: "FPUSH" }];      
   }
   else if(node.type === "sin")    
   { 
      /*
      let arg1part = visittree(node.arg, 1);      
      let poppart = "";
      
      if(!isterminal(node.arg)) poppart += "fpop FAC\n";      
      out = arg1part + poppart + "fsin\nfpush\n";       
      */

      let arg1part = visittree(node.arg, 1);
      
      out = [...arg1part];
      
      if(!isterminal(node.arg)) out = [ ...out, { type: "POPFAC" }];

      out = [ ...out, { type: "FSIN" }];
      out = [ ...out, { type: "FPUSH" }];      
   }
   else if(node.type === "pi")     
   { 
      if(arg === 1) out = [{ type: "FLDFAC", arg: "PI" }]; 
      else          out = [{ type: "FLDAFAC", arg: "PI" }]; 
   }
   else if(node.type === "number") 
   { 
      if(arg === 1) out = [{ type: "FLDFAC", arg: node.num }]; 
      else          out = [{ type: "FLDAFAC", arg: node.num }]; 
   }
   else throw `unrecognized node ${(node as any).type}`;
   return out;
}

/*
3*3
3 * exp
exp * 3   => no fpop fac
exp * exp => no fpop fac, only fop afac

(3+4*2)*(2+1)

  fld fac, 4
  fld fac1, 2
  fmul
  fpush fac
  
  fld fac, 3
  fpop fac1
  fsum
  fpush fac

  fld fac, 2 
  fld fac1, 1
  fsum
  fpush fac

  fpop fac1
  fpop fac
  fmul

*/

function printInstruction(code: Instruction[]) {
   code.forEach(e => {
      if(e.type === "FLDFAC" || e.type === "FLDAFAC") console.log(`${e.type} ${e.arg}`);
      else console.log(`${e.type}`);
   });
}

// console.log(parsed);

let output = visittree(parsed);
// printInstruction(output);
