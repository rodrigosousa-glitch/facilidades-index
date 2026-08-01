/* Rodrigo Facilidades — Assistente Blip (remote widget)
 * Host this file next to index.html on GitHub Pages.
 * Bump ?v= in the panel loader after updates to bust cache.
 */
(function () {
  'use strict';

    var D=document, W=window, PREFIX='RF_SYNC_V2:', MKEY='rf_macros_blip_db_v2', UKEY='rf_macro_uses_blip_v1', TKEY='rf_widget_theme_v1';
    var state={ query:'', editor:null, position:null }, drop=null, options=[], choice=0, cleanup=[], live=true;

    var THEMES={
      lime:{
        accent:'#89f336', accentMuted:'#64748b', bg:'#111827', bgHead:'#0b0f19', bgInput:'#070b12', bgBtn:'#0b0f19',
        border:'rgba(255,255,255,0.08)', borderSoft:'rgba(255,255,255,0.06)', text:'#f1f5f9', muted:'#64748b',
        noteBg:'#89f336', noteColor:'#0a0f08', dropBg:'#111827', dropBorder:'rgba(255,255,255,0.1)', dropHover:'#1a2336',
        radius:'12px'
      },
      classic:{
        accent:'#22d3ee', accentMuted:'#94a3b8', bg:'#0f172a', bgHead:'#0c1220', bgInput:'#070b14', bgBtn:'#0c1220',
        border:'rgba(148,163,184,0.18)', borderSoft:'rgba(148,163,184,0.12)', text:'#f1f5f9', muted:'#94a3b8',
        noteBg:'#10b981', noteColor:'#052e20', dropBg:'#0f172a', dropBorder:'rgba(148,163,184,0.22)', dropHover:'#1a2740',
        radius:'14px'
      }
    };

    function getThemeName(){
      try{ var t=W.localStorage.getItem(TKEY); return (t==='classic'||t==='lime')?t:'lime'; }catch(e){ return 'lime'; }
    }
    function setThemeName(t){ try{ W.localStorage.setItem(TKEY,t); }catch(e){} }
    function T(){ return THEMES[getThemeName()]||THEMES.lime; }

    if(W.__RF_ASSISTANT_CLEANUP__) W.__RF_ASSISTANT_CLEANUP__();
    function stop() {
      live=false; cleanup.forEach(function(f){f();}); cleanup=[];
      var w=D.getElementById('rf-assistant-widget'); if(w) w.remove();
      var d=D.getElementById('rf-assistant-dropdown'); if(d) d.remove();
      var n=D.getElementById('rf-assistant-note'); if(n) n.remove();
      if(W.__RF_ASSISTANT_CLEANUP__===stop) delete W.__RF_ASSISTANT_CLEANUP__;
    }
    W.__RF_ASSISTANT_CLEANUP__=stop;

    function listen(t,e,h,o){ t.addEventListener(e,h,o); cleanup.push(function(){ try{t.removeEventListener(e,h,o);}catch(x){} }); }
    function read(k,f){ try{ var v=JSON.parse(W.localStorage.getItem(k)); return v==null?f:v; }catch(e){ return f; } }
    function write(k,v){ try{ W.localStorage.setItem(k,JSON.stringify(v)); return true; }catch(e){ return false; } }
    function macroList(){ var data=read(MKEY,[]); return Array.isArray(data)?data:[]; }

    function showNote(msg,color){
      var th=T();
      var note=D.getElementById('rf-assistant-note');
      if(!note){
        note=D.createElement('div'); note.id='rf-assistant-note';
        note.style.cssText='position:fixed;right:20px;bottom:20px;z-index:2147483647;padding:10px 14px;border-radius:8px;font:600 13px Inter,system-ui;box-shadow:0 6px 20px #0009;transition:all 0.3s';
        D.body.appendChild(note);
      }
      note.textContent=msg;
      note.style.background=color||th.noteBg;
      note.style.color=th.noteColor;
      setTimeout(function(){ if(note) note.remove(); }, 3000);
    }

    function applySync(text){
      if(!text || text.indexOf(PREFIX)!==0) return false;
      try {
        var data=JSON.parse(text.slice(PREFIX.length));
        if(data&&Array.isArray(data.macros)){ write(MKEY,data.macros); widget(); return true; }
      } catch(e){}
      return false;
    }

    function doSyncRefresh(){
      function handleText(t){
        if(t && t.indexOf(PREFIX)===0){
          if(applySync(t)){
            showNote('Macros sincronizadas com sucesso!');
            return true;
          }
        }
        return false;
      }
      function promptFallback(){
        var val = prompt('Cole aqui o texto de sincronização copiado do painel (RF_SYNC_V2:...):');
        if(val){
          if(handleText(val.trim())){
            // sucesso
          } else {
            alert('Texto de sincronização inválido.');
          }
        }
      }
      if(navigator.clipboard && navigator.clipboard.readText){
        navigator.clipboard.readText().then(function(t){
          if(!handleText(t)) promptFallback();
        }).catch(function(){ promptFallback(); });
      } else {
        promptFallback();
      }
    }

    function roots(root,seen,out){
      seen=seen||new WeakSet(); out=out||[]; if(!root||seen.has(root)) return out; seen.add(root); out.push(root);
      var all=root.querySelectorAll?root.querySelectorAll('*'):[];
      for(var i=0;i<all.length;i++){
        var n=all[i]; if(n.shadowRoot) roots(n.shadowRoot,seen,out);
        if(n.tagName==='IFRAME'||n.tagName==='FRAME'){ try{roots(n.contentDocument,seen,out);}catch(e){} }
      }
      return out;
    }

    function isEditor(n){ return !!(n&&!(n.closest&&n.closest('#rf-assistant-widget'))&&(n.tagName==='TEXTAREA'||n.tagName==='INPUT'||n.isContentEditable||(n.getAttribute&&(n.getAttribute('contenteditable')==='true'||n.getAttribute('role')==='textbox')))); }
    function activeEditor(){
      var n=D.activeElement;
      while(n){
        if(n.shadowRoot&&n.shadowRoot.activeElement) n=n.shadowRoot.activeElement;
        else if(n.contentDocument&&n.contentDocument.activeElement) n=n.contentDocument.activeElement;
        else break;
      }
      return isEditor(n)?n:null;
    }
    function eventEditor(e){ if(isEditor(e.target)) return e.target; var p=e.composedPath?e.composedPath():[]; for(var i=0;i<p.length;i++) if(isEditor(p[i])) return p[i]; return activeEditor(); }

    function beforeCaret(n){
      if(n.tagName==='TEXTAREA'||n.tagName==='INPUT'){ var v=n.value||'', p=n.selectionStart==null?v.length:n.selectionStart; return v.slice(0,p); }
      var sel=(n.ownerDocument.defaultView||W).getSelection();
      if(sel&&sel.rangeCount){ var r=sel.getRangeAt(0).cloneRange(); r.collapse(true); try{ r.setStart(n,0); return r.toString(); }catch(x){} }
      return n.textContent||'';
    }

    function ticket(){
      var selectors=['#ticket-sequential-id','[data-testid="ticket-number"]','[data-testid*="ticket"]','.ticket-number','[id*="ticket"]'], all=roots(D);
      for(var i=0;i<all.length;i++) for(var j=0;j<selectors.length;j++){
        var el=all[i].querySelector&&all[i].querySelector(selectors[j]);
        if(el&&el.textContent){ var val=el.textContent.replace(/[^0-9A-Za-z]/g,''); if(val) return val; }
      }
      return 'N/A';
    }
    function nowDate(){ var d=new Date(); return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); }
    function nowTime(){ var d=new Date(); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
    function expand(val){ return val.replace(/\{ticket\}/gi,ticket()).replace(/\{data\}/gi,nowDate()).replace(/\{hora\}/gi,nowTime()); }

    function nativeValue(n,val){
      var proto=n.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype, desc=Object.getOwnPropertyDescriptor(proto,'value');
      if(desc&&desc.set) desc.set.call(n,val); else n.value=val;
    }

    function insert(text,node,removeShortcut){
      node=node||activeEditor()||state.editor; text=expand(text); if(!node) return;
      if(node.tagName==='TEXTAREA'||node.tagName==='INPUT'){
        var v=node.value||'', pos=node.selectionStart==null?v.length:node.selectionStart, start=pos;
        if(removeShortcut){ var slash=v.lastIndexOf('/',pos-1); if(slash>=0) start=slash; }
        nativeValue(node,v.slice(0,start)+text+v.slice(pos)); node.focus();
        if(node.setSelectionRange) node.setSelectionRange(start+text.length,start+text.length);
      } else {
        node.focus(); var sel=(node.ownerDocument.defaultView||W).getSelection();
        if(sel&&sel.rangeCount){
          var r=sel.getRangeAt(0);
          if(removeShortcut){ var typed=beforeCaret(node), m=typed.match(/\/[^\s]*$/); if(m){ try{ r.setStart(r.startContainer,Math.max(0,r.startOffset-m[0].length)); r.deleteContents(); }catch(x){} } }
          r.insertNode(node.ownerDocument.createTextNode(text)); r.collapse(false); sel.removeAllRanges(); sel.addRange(r);
        } else node.appendChild(node.ownerDocument.createTextNode(text));
      }
      try{ node.dispatchEvent(new InputEvent('input',{bubbles:true,composed:true})); }catch(x){}
      closeDrop();
    }

    function uses(){ return read(UKEY,{}); }
    function useMacro(m,node,removeShortcut){
      var u=uses(); u[m.id]=(Number(u[m.id])||0)+1; write(UKEY,u);
      insert(m.content,node,removeShortcut); widget();
    }

    function closeDrop(){ if(drop) drop.remove(); drop=null; options=[]; choice=0; }
    function paint(){
      if(!drop) return;
      var th=T();
      for(var i=0;i<drop.children.length;i++){ drop.children[i].style.background=i===choice?th.dropHover:'transparent'; }
      var sel=drop.children[choice];
      if(sel&&sel.scrollIntoView) sel.scrollIntoView({block:'nearest'});
    }
    
    function menu(list,node){
      closeDrop(); if(!list.length) return; options=list;
      var th=T();
      drop=D.createElement('div'); drop.id='rf-assistant-dropdown';
      drop.style.cssText='position:fixed;z-index:2147483647;width:min(340px,calc(100vw - 16px));max-height:200px;overflow:auto;padding:4px 0;border:1px solid '+th.dropBorder+';border-radius:10px;background:'+th.dropBg+';color:'+th.text+';box-shadow:0 8px 28px #000b;font:13px Inter,system-ui';
      list.forEach(function(m,i){
        var r=D.createElement('div'); r.style.cssText='padding:8px 12px;cursor:pointer;display:flex;gap:8px;align-items:center';
        var k=D.createElement('b'), p=D.createElement('span');
        k.textContent=m.shortcut; k.style.cssText='color:'+th.accent+';font-family:monospace';
        p.textContent=m.content; p.style.cssText='overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:'+th.muted;
        r.appendChild(k); r.appendChild(p);
        r.onmousedown=function(e){ e.preventDefault(); useMacro(m,node,true); };
        drop.appendChild(r);
      });
      D.body.appendChild(drop);
      var rect=node.getBoundingClientRect(), top=rect.top-drop.offsetHeight-8;
      if(top<8) top=Math.min(W.innerHeight-drop.offsetHeight-8,rect.bottom+8);
      drop.style.left=Math.max(8,Math.min(rect.left,W.innerWidth-drop.offsetWidth-8))+'px';
      drop.style.top=Math.max(8,top)+'px'; paint();
    }

    function inspect(node){
      if(!node) return closeDrop(); state.editor=node;
      var m=beforeCaret(node).match(/\/([\wÀ-ÿ-]*)$/u); if(!m) return closeDrop();
      var q=m[1].toLowerCase();
      menu(macroList().filter(function(x){ return x.shortcut.toLowerCase().indexOf('/'+q)!==-1; }),node);
    }

    function widget(){
      var th=T();
      var old=D.getElementById('rf-assistant-widget'); if(old) old.remove();
      var box=D.createElement('section'); box.id='rf-assistant-widget';
      box.style.cssText='position:fixed;right:20px;bottom:20px;z-index:2147483646;width:320px;border:1px solid '+th.border+';border-radius:'+th.radius+';background:'+th.bg+';color:'+th.text+';box-shadow:0 10px 32px #000b;overflow:hidden;font:13px Inter,system-ui';
      if(state.position){ box.style.right='auto'; box.style.bottom='auto'; box.style.left=state.position.left+'px'; box.style.top=state.position.top+'px'; }

      var head=D.createElement('div'); head.style.cssText='padding:10px 14px;background:'+th.bgHead+';display:flex;align-items:center;justify-content:space-between;cursor:move;border-bottom:1px solid '+th.borderSoft;
      head.innerHTML='<strong style="display:flex;align-items:center;gap:6px;color:'+th.accent+'">Assistente</strong>';
      
      var actionsDiv=D.createElement('div'); actionsDiv.style.cssText='display:flex;align-items:center;gap:6px';

      var btnTheme=D.createElement('button');
      btnTheme.type='button';
      btnTheme.textContent=getThemeName()==='classic'?'Tema Azul':'Tema Verde';
      btnTheme.title=getThemeName()==='classic'?'Mudar para tema Verde':'Mudar para tema ET';
      btnTheme.style.cssText='border:1px solid '+th.border+';background:transparent;color:'+th.accent+';font:600 10px Inter,system-ui;cursor:pointer;padding:2px 7px;border-radius:999px;letter-spacing:0.02em';
      btnTheme.onclick=function(e){
        e.stopPropagation();
        setThemeName(getThemeName()==='classic'?'lime':'classic');
        widget();
      };

      var btnRefresh=D.createElement('button'); btnRefresh.textContent='↻'; btnRefresh.title='Sincronizar macros';
      btnRefresh.style.cssText='border:0;background:transparent;color:'+th.accent+';font:700 16px system-ui;cursor:pointer;padding:0 2px;transition:transform 0.3s';
      btnRefresh.onclick=function(e){ e.stopPropagation(); doSyncRefresh(); };

      var btnClose=D.createElement('button'); btnClose.textContent='×'; btnClose.style.cssText='border:0;background:transparent;color:'+th.muted+';font:700 18px system-ui;cursor:pointer';
      btnClose.onclick=stop;

      actionsDiv.appendChild(btnTheme);
      actionsDiv.appendChild(btnRefresh);
      actionsDiv.appendChild(btnClose);
      head.appendChild(actionsDiv); box.appendChild(head);

      var body=D.createElement('div'); body.style.cssText='padding:10px';
      var input=D.createElement('input'); input.type='search'; input.placeholder='Pesquisar macro...'; input.value=state.query;
      input.style.cssText='width:100%;padding:7px 10px;border:1px solid '+th.border+';border-radius:6px;background:'+th.bgInput+';color:'+th.text+';font:12px Inter,system-ui;outline:none';
      
      var list=D.createElement('div'); list.style.cssText='max-height:260px;overflow:auto;margin-top:8px';

      function fill(){
        list.innerHTML='';
        var th2=T();
        var q=state.query.toLowerCase(), u=uses();
        var all=macroList().filter(function(m){ return !q || m.shortcut.toLowerCase().indexOf(q)!==-1 || m.content.toLowerCase().indexOf(q)!==-1; })
                           .sort(function(a,b){ return Number(b.favorite)-Number(a.favorite)||(Number(u[b.id])||0)-(Number(u[a.id])||0); });

        if(!all.length){ list.innerHTML='<p style="color:'+th2.muted+';margin:8px 0;font-size:12px">Nenhuma macro encontrada.</p>'; return; }
        all.forEach(function(m){
          var btn=D.createElement('button'); btn.type='button';
          btn.textContent=(m.favorite?'★ ':'')+m.shortcut; btn.title=m.content;
          btn.style.cssText='display:block;width:100%;margin:4px 0;padding:8px;border:1px solid '+th2.borderSoft+';border-radius:6px;background:'+th2.bgBtn+';color:'+th2.accent+';text-align:left;cursor:pointer;font:600 12px monospace';
          btn.onclick=function(){ useMacro(m); };
          list.appendChild(btn);
        });
      }

      input.oninput=function(){ state.query=input.value; fill(); };
      body.appendChild(input); body.appendChild(list); box.appendChild(body);
      D.body.appendChild(box);

      var moving=false, dx=0, dy=0;
      listen(head,'mousedown',function(e){
        if(e.target.tagName==='BUTTON') return; moving=true; var rect=box.getBoundingClientRect();
        dx=e.clientX-rect.left; dy=e.clientY-rect.top; box.style.right='auto'; box.style.bottom='auto';
      });
      listen(D,'mousemove',function(e){ if(moving){ var l=Math.max(0,e.clientX-dx), t=Math.max(0,e.clientY-dy); state.position={left:l,top:t}; box.style.left=l+'px'; box.style.top=t+'px'; } });
      listen(D,'mouseup',function(){ moving=false; });
      fill();
    }

    function attach(){
      roots(D).forEach(function(r){
        if(r.__rfBound) return; r.__rfBound=true;
        listen(r,'input',function(e){ var n=eventEditor(e); if(n) inspect(n); },true);
        listen(r,'keydown',function(e){
          var n=eventEditor(e); if(n) state.editor=n;
          if(!drop) return;
          if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); choice=(choice+(e.key==='ArrowDown'?1:options.length-1))%options.length; paint(); }
          else if((e.key==='Enter'||e.key==='Tab')&&options[choice]){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); useMacro(options[choice],state.editor,true); }
          else if(e.key==='Escape') closeDrop();
        },true);
      });
    }

    attach(); widget();
    if(navigator.clipboard&&navigator.clipboard.readText){
      navigator.clipboard.readText().then(function(t){ if(t&&t.indexOf(PREFIX)===0) applySync(t); }).catch(function(){});
    }
})();
