// Generated automatically by nearley, version 2.16.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

function opt(x) { if(x===null) return null; else return x; }

function commalist([num, rest]) { 
   const frest = rest.map( ([comma, _, element])=>element);
   return [num, ...frest ];
}
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "main", "symbols": ["line"], "postprocess": d => d[0]},
    {"name": "line", "symbols": ["const"], "postprocess": d => ({ type: "line", line: d[0] })},
    {"name": "line", "symbols": ["float"], "postprocess": d => ({ type: "line", line: d[0] })},
    {"name": "line", "symbols": ["sprite"], "postprocess": d => ({ type: "line", line: d[0] })},
    {"name": "line", "symbols": ["bitmap"], "postprocess": d => ({ type: "line", line: d[0] })},
    {"name": "const$subexpression$1", "symbols": [/[cC]/, /[oO]/, /[nN]/, /[sS]/, /[tT]/], "postprocess": function (d) {return d.join(""); }},
    {"name": "const", "symbols": ["_", "const$subexpression$1", "__", "id", "_", {"literal":"="}, "_", "expr", "_"], "postprocess": d => ({ type: "const", id: d[3], expr: d[7] })},
    {"name": "float$ebnf$1$subexpression$1", "symbols": ["label"]},
    {"name": "float$ebnf$1", "symbols": ["float$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "float$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "float$subexpression$1", "symbols": [/[fF]/, /[lL]/, /[oO]/, /[aA]/, /[tT]/], "postprocess": function (d) {return d.join(""); }},
    {"name": "float", "symbols": ["_", "float$ebnf$1", "__", "float$subexpression$1", "__", "fnumbers", "_"], "postprocess": d => ({ type: "float", label: opt(d[1]), numbers: d[5] })},
    {"name": "sprite$ebnf$1$subexpression$1", "symbols": ["label"]},
    {"name": "sprite$ebnf$1", "symbols": ["sprite$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "sprite$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "sprite$subexpression$1", "symbols": [/[sS]/, /[pP]/, /[rR]/, /[iI]/, /[tT]/, /[eE]/], "postprocess": function (d) {return d.join(""); }},
    {"name": "sprite", "symbols": ["_", "sprite$ebnf$1", "__", "sprite$subexpression$1", "__", "expr", "_"], "postprocess": d => ({ type: "sprite", label: opt(d[1]), expr: d[5] })},
    {"name": "bitmap$ebnf$1$subexpression$1", "symbols": ["label"]},
    {"name": "bitmap$ebnf$1", "symbols": ["bitmap$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "bitmap$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "bitmap$subexpression$1", "symbols": [/[bB]/, /[iI]/, /[tT]/, /[mM]/, /[aA]/, /[pP]/], "postprocess": function (d) {return d.join(""); }},
    {"name": "bitmap", "symbols": ["_", "bitmap$ebnf$1", "__", "bitmap$subexpression$1", "__", "expr", "_"], "postprocess": d => ({ type: "bitmap", label: opt(d[1]), expr: d[5] })},
    {"name": "fnumbers$ebnf$1", "symbols": []},
    {"name": "fnumbers$ebnf$1$subexpression$1", "symbols": [{"literal":","}, "_", "fnumber"]},
    {"name": "fnumbers$ebnf$1", "symbols": ["fnumbers$ebnf$1", "fnumbers$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "fnumbers", "symbols": ["fnumber", "fnumbers$ebnf$1"], "postprocess": d => commalist(d)},
    {"name": "label$ebnf$1", "symbols": [/[:]/], "postprocess": id},
    {"name": "label$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "label", "symbols": ["id", "label$ebnf$1"], "postprocess": d => d[0]},
    {"name": "id$ebnf$1", "symbols": [/[_0-9a-zA-Z]/]},
    {"name": "id$ebnf$1", "symbols": ["id$ebnf$1", /[_0-9a-zA-Z]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "id$ebnf$2", "symbols": []},
    {"name": "id$ebnf$2", "symbols": ["id$ebnf$2", /[0-9a-zA-Z]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "id", "symbols": ["id$ebnf$1", "id$ebnf$2"], "postprocess": d => [ d[0].join(""), d[1].join("") ].join("")},
    {"name": "expr", "symbols": ["allstring"], "postprocess": d => ({ type: "expr", arg: d[0] })},
    {"name": "allstring$ebnf$1", "symbols": [/./]},
    {"name": "allstring$ebnf$1", "symbols": ["allstring$ebnf$1", /./], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "allstring", "symbols": ["allstring$ebnf$1"], "postprocess": d => d[0].join("")},
    {"name": "P", "symbols": [{"literal":"("}, "_", "AS", "_", {"literal":")"}], "postprocess": d => ({ type: "parens", ptype: "()", arg: d[2] })},
    {"name": "P", "symbols": [{"literal":"["}, "_", "AS", "_", {"literal":"]"}], "postprocess": d => ({ type: "parens", ptype: "[]", arg: d[2] })},
    {"name": "P", "symbols": ["N"], "postprocess": id},
    {"name": "E", "symbols": ["P", "_", {"literal":"^"}, "_", "E"], "postprocess": d => ({ type: "^", base: d[0], exponent: d[4] })},
    {"name": "E", "symbols": ["P"], "postprocess": id},
    {"name": "MD", "symbols": ["MD", "_", {"literal":"*"}, "_", "E"], "postprocess": d => ({ type: "*", arg1: d[0], arg2: d[4] })},
    {"name": "MD", "symbols": ["MD", "_", {"literal":"/"}, "_", "E"], "postprocess": d => ({ type: "/", arg1: d[0], arg2: d[4] })},
    {"name": "MD", "symbols": ["E"], "postprocess": id},
    {"name": "AS", "symbols": ["AS", "_", {"literal":"+"}, "_", "MD"], "postprocess": d => ({ type: "+", arg1: d[0], arg2: d[4] })},
    {"name": "AS", "symbols": ["AS", "_", {"literal":"-"}, "_", "MD"], "postprocess": d => ({ type: "-", arg1: d[0], arg2: d[4] })},
    {"name": "AS", "symbols": ["MD"], "postprocess": id},
    {"name": "N", "symbols": ["fnumber"], "postprocess": id},
    {"name": "N$subexpression$1", "symbols": [/[lL]/, /[oO]/, /[bB]/, /[yY]/, /[tT]/, /[eE]/], "postprocess": function (d) {return d.join(""); }},
    {"name": "N", "symbols": ["N$subexpression$1", "_", "P"], "postprocess": d => ({ type: "func", name: "lobyte", arg: d[2] })},
    {"name": "N$subexpression$2", "symbols": [/[hH]/, /[iI]/, /[bB]/, /[yY]/, /[tT]/, /[eE]/], "postprocess": function (d) {return d.join(""); }},
    {"name": "N", "symbols": ["N$subexpression$2", "_", "P"], "postprocess": d => ({ type: "func", name: "hibyte", arg: d[2] })},
    {"name": "N", "symbols": ["id"], "postprocess": d => ({ type: "symbol", id: d[0] })},
    {"name": "fnumber", "symbols": ["int", {"literal":"."}, "int"], "postprocess": d => ({ type: "number", num: parseFloat(d[0] + d[1] + d[2]) })},
    {"name": "fnumber", "symbols": ["int"], "postprocess": d => ({ type: "number", num: parseInt(d[0]) })},
    {"name": "int$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "int$ebnf$1", "symbols": ["int$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "int", "symbols": ["int$ebnf$1"], "postprocess": d => d[0].join("")},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null; }},
    {"name": "__$ebnf$1", "symbols": [/[\s]/]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null; }}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
