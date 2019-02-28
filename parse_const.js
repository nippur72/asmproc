"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var nearley_1 = __importDefault(require("nearley"));
var grammar = require("./const");
;
;
;
function test_expression(input) {
    try {
        // Make a parser and feed the input
        var parser = new nearley_1.default.Parser(grammar.ParserRules, grammar.ParserStart);
        var ans = parser.feed(input);
        // Check if there are any results
        if (ans.results.length !== 0) {
            var result = ans.results[0];
            return result;
        }
        else {
            // This means the input is incomplete.
            console.log("Error: incomplete input, parse failed.");
            return undefined;
        }
    }
    catch (e) {
        // Panic in style, by graphically pointing out the error location.
        console.log("error at " + e.offset);
        return undefined;
    }
}
if (process.argv.length !== 3) {
    console.log("specify arg");
    process.exit(0);
}
var input = process.argv[2];
console.log(input);
var parsed = test_expression(input);
if (parsed === undefined) {
    throw "err";
}
console.log(JSON.stringify(parsed));
/*
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
      * /

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

* /

function printInstruction(code: Instruction[]) {
   code.forEach(e => {
      if(e.type === "FLDFAC" || e.type === "FLDAFAC") console.log(`${e.type} ${e.arg}`);
      else console.log(`${e.type}`);
   });
}

// console.log(parsed);

let output = visittree(parsed);
// printInstruction(output);
*/
