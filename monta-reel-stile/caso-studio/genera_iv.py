import re
p='/home/user/-bacheca-cliente/reel/7/progetto3/sorgenti/template.html'
t=open(p).read()
R=lambda f:open('/tmp/claude-0/-home-user--bacheca-cliente/415b1aef-fbbd-55df-8dfa-1e810678e622/scratchpad/'+f).read()
t=t.replace('</style>', R('css_iv.txt')+'\n</style>',1)
anchor='  <section class="clip" id="subs"'
t=t.replace(anchor, '  <section class="clip" id="fs" data-start="0" data-duration="__DUR__" data-track-index="4">\n'+R('fs_iv.txt')+'\n  </section>\n\n'+anchor,1)
t=re.sub(r'(<section class="clip" id="g"[^>]*>)(\s*<!-- SCHEDE[^>]*-->)?', lambda m:m.group(1)+'\n'+R('g_iv.txt'), t, count=1)
t=t.replace('  // TIMELINE: animazioni delle schede\n','  // TIMELINE: animazioni delle schede\n'+R('js_iv.txt')+'\n',1)
open(p,'w').write(t); print('ok')
