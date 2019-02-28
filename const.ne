@{%
function opt(x) { if(x===null) return null; else return x; }

function commalist([num, rest]) { 
   const frest = rest.map( ([comma, _, element])=>element);
   return [num, ...frest ];
}
%}

main -> line                              {% d => d[0] %}

line -> const                             {% d => ({ type: "line", line: d[0] }) %}
     |  float                             {% d => ({ type: "line", line: d[0] }) %}
     |  sprite                            {% d => ({ type: "line", line: d[0] }) %}
     |  bitmap                            {% d => ({ type: "line", line: d[0] }) %}

const  -> _ "const"i __ id _ "=" _ expr _        {% d => ({ type: "const", id: d[3], expr: d[7] }) %}

float  -> _ (label):? __ "float"i  __ fnumbers _ {% d => ({ type: "float", label: opt(d[1]), numbers: d[5] }) %}

sprite -> _ (label):? __ "sprite"i __ expr _     {% d => ({ type: "sprite", label: opt(d[1]), expr: d[5] }) %}

bitmap -> _ (label):? __ "bitmap"i __ expr _     {% d => ({ type: "bitmap", label: opt(d[1]), expr: d[5] }) %}

# ==============================================================================

# ==============================================================================

fnumbers -> fnumber ("," _  fnumber):*         {% d => commalist(d) %}

# ==============================================================================

label -> id [:]:?                         {% d => d[0] %}

id -> [_0-9a-zA-Z]:+ [0-9a-zA-Z]:*        {% d => [ d[0].join(""), d[1].join("") ].join("") %}

expr -> allstring                         {% d => ({ type: "expr", arg: d[0] }) %}

allstring -> .:+                          {% d => d[0].join("") %}

# We define each level of precedence as a nonterminal.

# Parentheses
P -> "(" _ AS _ ")"  {% d => ({ type: "parens", ptype: "()", arg: d[2] }) %}
    | "[" _ AS _ "]" {% d => ({ type: "parens", ptype: "[]", arg: d[2] }) %}
    | N              {% id %}

# Exponents
E -> P _ "^" _ E    {% d => ({ type: "^", base: d[0], exponent: d[4] }) %}
    | P             {% id %}

# Multiplication and division
MD -> MD _ "*" _ E  {% d => ({ type: "*", arg1: d[0], arg2: d[4] }) %}
    | MD _ "/" _ E  {% d => ({ type: "/", arg1: d[0], arg2: d[4] }) %}
    | E             {% id %}

# Addition and subtraction
AS -> AS _ "+" _ MD {% d => ({ type: "+", arg1: d[0], arg2: d[4] }) %}
    | AS _ "-" _ MD {% d => ({ type: "-", arg1: d[0], arg2: d[4] }) %}
    | MD            {% id %}

# A number or a function of a number
N -> fnumber           {% id %}
    | "lobyte"i _ P    {% d => ({ type: "func", name: "lobyte", arg: d[2] }) %}
    | "hibyte"i _ P    {% d => ({ type: "func", name: "hibyte", arg: d[2] }) %}
    | id               {% d => ({ type: "symbol", id: d[0] }) %}

# I use `float` to basically mean a number with a decimal point in it
fnumber ->
     int "." int   {% d => ({ type: "number", num: parseFloat(d[0] + d[1] + d[2]) }) %}
	| int           {% d => ({ type: "number", num: parseInt(d[0]) }) %}

int -> [0-9]:+     {% d => d[0].join("") %}

# Whitespace. The important thing here is that the postprocessor
# is a null-returning function. This is a memory efficiency trick.

_ -> [\s]:*      {% function(d) {return null; } %}

__ -> [\s]:+     {% function(d) {return null; } %}

eol -> [\n]      {% function(d) {return null; } %}