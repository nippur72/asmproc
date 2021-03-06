"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var nearley_1 = __importDefault(require("nearley"));
var grammar = require("./expressions");
;
;
;
;
;
;
;
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
var input = "(3*4)/(5-3)+sin(1+1)";
console.log(input);
var parsed = test_expression(input);
if (parsed === undefined) {
    throw "err";
}
function isterminal(node) {
    return node.type === "number";
}
function visittree(node, arg) {
    var out = [];
    if (node.type === "root") {
        out = visittree(node.arg);
        // TODO optimize last push
    }
    else if (node.type === "parens") {
        out = visittree(node.arg);
        // TODO optimize nested parens 
    }
    else if (node.type === "^") {
        out = [];
        //visittree(node.base, 1) + visittree(node.exponent, 2) + "fexp\n"; 
    }
    else if (node.type === "*") {
        var arg1part = visittree(node.arg1, 1);
        var arg2part = visittree(node.arg2, 2);
        out = __spreadArrays(arg1part, arg2part);
        if (!isterminal(node.arg1))
            out = __spreadArrays(out, [{ type: "POPFAC" }]);
        if (!isterminal(node.arg2))
            out = __spreadArrays(out, [{ type: "POPAFAC" }]);
        out = __spreadArrays(out, [{ type: "FMUL" }]);
        out = __spreadArrays(out, [{ type: "FPUSH" }]);
    }
    else if (node.type === "/") {
        var arg1part = visittree(node.arg1, 1);
        var arg2part = visittree(node.arg2, 2);
        out = __spreadArrays(arg1part, arg2part);
        if (!isterminal(node.arg1))
            out = __spreadArrays(out, [{ type: "POPFAC" }]);
        if (!isterminal(node.arg2))
            out = __spreadArrays(out, [{ type: "POPAFAC" }]);
        out = __spreadArrays(out, [{ type: "FDIV" }]);
        out = __spreadArrays(out, [{ type: "FPUSH" }]);
    }
    else if (node.type === "+") {
        var arg1part = visittree(node.arg1, 1);
        var arg2part = visittree(node.arg2, 2);
        out = __spreadArrays(arg1part, arg2part);
        if (!isterminal(node.arg1))
            out = __spreadArrays(out, [{ type: "POPFAC" }]);
        if (!isterminal(node.arg2))
            out = __spreadArrays(out, [{ type: "POPAFAC" }]);
        out = __spreadArrays(out, [{ type: "FADD" }]);
        out = __spreadArrays(out, [{ type: "FPUSH" }]);
    }
    else if (node.type === "-") {
        var arg1part = visittree(node.arg1, 1);
        var arg2part = visittree(node.arg2, 2);
        out = __spreadArrays(arg1part, arg2part);
        if (!isterminal(node.arg1))
            out = __spreadArrays(out, [{ type: "POPFAC" }]);
        if (!isterminal(node.arg2))
            out = __spreadArrays(out, [{ type: "POPAFAC" }]);
        out = __spreadArrays(out, [{ type: "FSUB" }]);
        out = __spreadArrays(out, [{ type: "FPUSH" }]);
    }
    else if (node.type === "sin") {
        /*
        let arg1part = visittree(node.arg, 1);
        let poppart = "";
        
        if(!isterminal(node.arg)) poppart += "fpop FAC\n";
        out = arg1part + poppart + "fsin\nfpush\n";
        */
        var arg1part = visittree(node.arg, 1);
        out = __spreadArrays(arg1part);
        if (!isterminal(node.arg))
            out = __spreadArrays(out, [{ type: "POPFAC" }]);
        out = __spreadArrays(out, [{ type: "FSIN" }]);
        out = __spreadArrays(out, [{ type: "FPUSH" }]);
    }
    else if (node.type === "pi") {
        if (arg === 1)
            out = [{ type: "FLDFAC", arg: "PI" }];
        else
            out = [{ type: "FLDAFAC", arg: "PI" }];
    }
    else if (node.type === "number") {
        if (arg === 1)
            out = [{ type: "FLDFAC", arg: node.num }];
        else
            out = [{ type: "FLDAFAC", arg: node.num }];
    }
    else
        throw "unrecognized node " + node.type;
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
function printInstruction(code) {
    code.forEach(function (e) {
        if (e.type === "FLDFAC" || e.type === "FLDAFAC")
            console.log(e.type + " " + e.arg);
        else
            console.log("" + e.type);
    });
}
// console.log(parsed);
var output = visittree(parsed);
// printInstruction(output);
