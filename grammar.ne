@{%
function zeroOrMore(d) {   
   return d.map(e=>e[0]);
}
%}

# =================================================

program -> (global_item):*                                           {% d=>({ type: "program", list: zeroOrMore(d[0]).filter(e=>e!==null) }) %}

global_item -> empty_space                                           {% d=>d[0] %}  
            | basic                                                  {% d=>d[0] %}  
            | istruction                                             {% d=>d[0] %}  
            | label                                                  {% d=>d[0] %}  

# =================================================

istruction -> "lda #12" eol                                          {% ([i])=>({ type: "istruction", istruction: i}) %}

label -> id ":" eol

# =================================================

basic -> "basic" __ "start" eol basiclines _ "basic" __ "end" eol    {% (d,l) => ({ type: "basic", lines: d[4] }) %}

basiclines -> (basicline):*                                          {% d => zeroOrMore(d[0]) %}

basicline ->  [^\n]:+ [\n]                                           {% (d,l) => ({ type: "basicline", text: d[0].join("") }) %}

# =================================================

id -> [_a-zA-Z0-9]:+ [_a-zA-Z0-9^\:]:* #{% d => d.join() %} 

empty_space -> __   {% function(d) {return null; } %}       
            | eol _ {% function(d) {return null; } %}       

_ -> [\s]:*         {% function(d) {return null; } %}

__ -> [\s]:+        {% function(d) {return null; } %}

eol -> [\s]:* [\n]  {% function(d) {return null; } %}


/*
program 
  = (global_item)*

global_item 
  = basic
  / label
  
label
  = _ name:id ":" eol     { return { type: "label", label: name } }
  
id = 
  [_a-zA-Z]+ [_a-zA-Z0-9]* { return text() }

_ "whitespace"
  = [ \t]*

__ "mandatoryspace"
  = [ \t]+

basic 
  = _ "basic" __ "start" eol 
        basiclines 
    _ "basic" __ "end" eol

basiclines
  = basicline eol

basicline
  = _ [^\n]*

eol
  = _ [\n]
  
  
// Simple Arithmetics Grammar
// ==========================
//
// Accepts expressions like "2 * (3 + 4)" and computes their value.

Expression
  = head:Term tail:(_ ("+" / "-") _ Term)* {
      return tail.reduce(function(result, element) {
        if (element[1] === "+") { return result + element[3]; }
        if (element[1] === "-") { return result - element[3]; }
      }, head);
    }

Term
  = head:Factor tail:(_ ("*" / "/") _ Factor)* {
      return tail.reduce(function(result, element) {
        if (element[1] === "*") { return result * element[3]; }
        if (element[1] === "/") { return result / element[3]; }
      }, head);
    }

Factor
  = "(" _ expr:Expression _ ")" { return expr; }
  / Integer

Integer "integer"
  = _ [0-9]+ { return parseInt(text(), 10); }
*/