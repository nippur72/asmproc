
main -> _ AS _ {% d => ({ type: "root", arg: d[1] }) %}

# We define each level of precedence as a nonterminal.

# Parentheses
P -> "(" _ AS _ ")" {% d => ({ type: "parens", arg: d[2] }) %}
    | N             {% id %}

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
N -> float          {% id %}
    | "sin" _ P     {% d => ({ type: "sin", arg: d[2] }) %}
    | "pi"          {% d => ({ type: "pi" }) %}

# I use `float` to basically mean a number with a decimal point in it
float ->
     int "." int   {% d => ({ type: "number", num: parseFloat(d[0] + d[1] + d[2]) }) %}
	| int           {% d => ({ type: "number", num: parseInt(d[0]) }) %}

int -> [0-9]:+     {% d => d[0].join("") %}

# Whitespace. The important thing here is that the postprocessor
# is a null-returning function. This is a memory efficiency trick.

_ -> [\s]:*     {% function(d) {return null; } %}
