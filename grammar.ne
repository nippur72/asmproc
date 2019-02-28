@{%
function zeroOrMore(d) {   
   return d.map(e=>e[0]);
}
%}

# =================================================

main -> (empty_space | basic | istruction):*                          #  {% d=>({ type: "main", list: zeroOrMore(d[0]).filter(e=>e!==null) }) %}

# =================================================

istruction -> "lda #12" eol                                           #  {% ([i])=>({ type: "istruction", istruction: i}) %}

# =================================================

basic -> "basic" __ "start" eol basiclines _ "basic" __ "end" eol    #   {% (d,l) => ({ type: "basic", lines: d[4] }) %}

basiclines -> (basicline):*                                          #   {% d => zeroOrMore(d[0]) %}

basicline -> _ .:+ eol                                               #   {% (d,l) => ({ type: "basicline", text: d[1].join("") }) %}

xbasicline -> _ ("10 PRINT" | "20 GOTO 10") eol                      #   {% (d,l) => ({ type: "basicline", text: d[1].join("") }) %}

# =================================================

empty_space -> __   {% function(d) {return null; } %}       
            | eol _ {% function(d) {return null; } %}       

_ -> [\s]:*         {% function(d) {return null; } %}

__ -> [\s]:+        {% function(d) {return null; } %}

eol -> [\s]:* [\n]  {% function(d) {return null; } %}

