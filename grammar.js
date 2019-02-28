// Generated automatically by nearley, version 2.16.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

function zeroOrMore(d) {   
   return d.map(e=>e[0]);
}
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "main$ebnf$1", "symbols": []},
    {"name": "main$ebnf$1$subexpression$1", "symbols": ["empty_space"]},
    {"name": "main$ebnf$1$subexpression$1", "symbols": ["basic"]},
    {"name": "main$ebnf$1$subexpression$1", "symbols": ["istruction"]},
    {"name": "main$ebnf$1", "symbols": ["main$ebnf$1", "main$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "main", "symbols": ["main$ebnf$1"]},
    {"name": "istruction$string$1", "symbols": [{"literal":"l"}, {"literal":"d"}, {"literal":"a"}, {"literal":" "}, {"literal":"#"}, {"literal":"1"}, {"literal":"2"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "istruction", "symbols": ["istruction$string$1", "eol"]},
    {"name": "basic$string$1", "symbols": [{"literal":"b"}, {"literal":"a"}, {"literal":"s"}, {"literal":"i"}, {"literal":"c"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "basic$string$2", "symbols": [{"literal":"s"}, {"literal":"t"}, {"literal":"a"}, {"literal":"r"}, {"literal":"t"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "basic$string$3", "symbols": [{"literal":"b"}, {"literal":"a"}, {"literal":"s"}, {"literal":"i"}, {"literal":"c"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "basic$string$4", "symbols": [{"literal":"e"}, {"literal":"n"}, {"literal":"d"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "basic", "symbols": ["basic$string$1", "__", "basic$string$2", "eol", "basiclines", "_", "basic$string$3", "__", "basic$string$4", "eol"]},
    {"name": "basiclines$ebnf$1", "symbols": []},
    {"name": "basiclines$ebnf$1$subexpression$1", "symbols": ["basicline"]},
    {"name": "basiclines$ebnf$1", "symbols": ["basiclines$ebnf$1", "basiclines$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "basiclines", "symbols": ["basiclines$ebnf$1"]},
    {"name": "basicline$ebnf$1", "symbols": [/./]},
    {"name": "basicline$ebnf$1", "symbols": ["basicline$ebnf$1", /./], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "basicline", "symbols": ["_", "basicline$ebnf$1", "eol"]},
    {"name": "xbasicline$subexpression$1$string$1", "symbols": [{"literal":"1"}, {"literal":"0"}, {"literal":" "}, {"literal":"P"}, {"literal":"R"}, {"literal":"I"}, {"literal":"N"}, {"literal":"T"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "xbasicline$subexpression$1", "symbols": ["xbasicline$subexpression$1$string$1"]},
    {"name": "xbasicline$subexpression$1$string$2", "symbols": [{"literal":"2"}, {"literal":"0"}, {"literal":" "}, {"literal":"G"}, {"literal":"O"}, {"literal":"T"}, {"literal":"O"}, {"literal":" "}, {"literal":"1"}, {"literal":"0"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "xbasicline$subexpression$1", "symbols": ["xbasicline$subexpression$1$string$2"]},
    {"name": "xbasicline", "symbols": ["_", "xbasicline$subexpression$1", "eol"]},
    {"name": "empty_space", "symbols": ["__"], "postprocess": function(d) {return null; }},
    {"name": "empty_space", "symbols": ["eol", "_"], "postprocess": function(d) {return null; }},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null; }},
    {"name": "__$ebnf$1", "symbols": [/[\s]/]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null; }},
    {"name": "eol$ebnf$1", "symbols": []},
    {"name": "eol$ebnf$1", "symbols": ["eol$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "eol", "symbols": ["eol$ebnf$1", /[\n]/], "postprocess": function(d) {return null; }}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
