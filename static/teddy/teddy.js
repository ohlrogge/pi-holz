/* Gemeinsames Grundgeruest aller Teddy-Spiele.
   Wird vor dem Spielskript geladen; die Spiele rufen nur die Funktionen auf. */

/* ---------- Kein versehentlicher Zoom ---------- */
(function(){
  function imDialog(n){
    while (n && n !== document.body){
      if (n.id === 'dlg' || n.id === 'veil' || n.id === 'modal' || n.id === 'overlay') return true;
      n = n.parentNode;
    }
    return false;
  }
  function klickZiel(n){
    while (n && n !== document.body && !n.onclick) n = n.parentNode;
    return (n && n.onclick) ? n : null;
  }
  var t0 = 0, x0 = 0, y0 = 0;
  document.addEventListener('touchend', function(e){
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    var jetzt = Date.now(), nah = Math.abs(t.clientX - x0) + Math.abs(t.clientY - y0) < 40;
    if (jetzt - t0 < 350 && nah && e.cancelable && !imDialog(e.target)){
      e.preventDefault();                       /* kein Zoom */
      var z = klickZiel(e.target);
      if (z && !z.disabled) z.onclick(e);       /* Wirkung trotzdem ausloesen */
    }
    t0 = jetzt; x0 = t.clientX; y0 = t.clientY;
  }, {passive:false});
  ['gesturestart','gesturechange','gestureend'].forEach(function(g){
    document.addEventListener(g, function(e){ if (e.cancelable) e.preventDefault(); }, {passive:false});
  });
})();

/* ---------- Spielstaende ablegen ----------
   Verweigert der Browser localStorage (privates Fenster), haelt der Speicher
   im Arbeitsspeicher die Sitzung wenigstens zusammen. */
var teddySpeicher = {};
function lsGet(k, d){
  try{ var v = localStorage.getItem(k); if (v !== null) return JSON.parse(v); }catch(e){}
  return (k in teddySpeicher) ? teddySpeicher[k] : d;
}
function lsSet(k, v){
  teddySpeicher[k] = v;
  try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){}
}
function lsDel(k){
  /* Wer einen Stand loescht, will ihn los sein - eine wartende Sicherung
     duerfte ihn sonst gleich darauf wieder hinschreiben. */
  sicherungAbbrechen();
  delete teddySpeicher[k];
  try{ localStorage.removeItem(k); }catch(e){}
}

/* ---------- Der Name des Hauptspielers ----------
   Wird in der Spieleecke eingetragen und gilt in allen Spielen. Ein Spiel
   fragt nur dann nach Namen, wenn mehrere Menschen an einem Geraet sitzen;
   die gehoeren dann zum Platz und nicht zum Geraet. */
function nameKuerzen(n){
  return String(n || '').replace(/\s+/g, ' ').trim().slice(0, 14);
}
function meinName(){
  return nameKuerzen(lsGet('teddy.name', ''));
}
function meinNameSetzen(n){
  lsSet('teddy.name', nameKuerzen(n));
}

/* Sichern gehoert nicht in den Zeichenweg. Die Spiele melden nach einem Zug
   nur an, dass sich etwas geaendert hat; geschrieben wird einmal in der
   naechsten Ruhepause - oder sofort, wenn die Seite weggeht. */
var sicherungTimer = 0;
function sicherungAbbrechen(){
  if (sicherungTimer){ clearTimeout(sicherungTimer); sicherungTimer = 0; }
}
function spaeterSichern(){
  if (sicherungTimer) return;
  sicherungTimer = setTimeout(function(){ sicherungTimer = 0; sofortSichern(); }, 400);
}
function sofortSichern(){
  sicherungAbbrechen();
  if (typeof spielSpeichern === 'function') spielSpeichern();
}

/* ---------- Neue Fassung uebernehmen ----------
   Der Service Worker zeigt beim Start die gespeicherte Seite und meldet sich,
   wenn die im Hintergrund geholte sich davon unterscheidet. Dann wird der Stand
   sofort geschrieben und neu geladen, sobald kein Dialog offen ist. Ein Spiel
   kann mit darfNeuLaden() weitere Momente ausschliessen. */
(function(){
  if (!('serviceWorker' in navigator)) return;
  var wartet = 0;

  /* getClientRects greift unabhaengig davon, wie ein Spiel seinen Dialog
     ein- und ausblendet. */
  function sichtbar(id){
    var n = document.getElementById(id);
    return !!n && n.getClientRects().length > 0;
  }
  function jetztGeht(){
    if (sichtbar('veil') || sichtbar('dlg') || sichtbar('modal') || sichtbar('overlay')) return false;
    return typeof darfNeuLaden !== 'function' || darfNeuLaden();
  }
  function versuchen(){
    if (!jetztGeht()) return;
    clearInterval(wartet);
    sofortSichern();
    location.reload();
  }
  navigator.serviceWorker.addEventListener('message', function(e){
    if (!e.data || e.data.teddy !== 'neueFassung' || wartet) return;
    wartet = setInterval(versuchen, 1000);
    versuchen();
  });
})();

/* ---------- Spielstaende: Schluessel und Fassung ----------
   Alle Schluessel liegen unter teddy.<spiel>., damit kein Spiel
   versehentlich den Stand eines anderen ueberschreibt. Jeder Spielstand
   traegt seine Fassung; passt sie nicht, faengt das Spiel neu an, statt
   ueber einem alten Format abzustuerzen. */
var SPIELSTAND_FASSUNG = 1;

function standSpeichern(schluessel, daten){
  daten.v = SPIELSTAND_FASSUNG;
  lsSet(schluessel, daten);
}
function standLaden(schluessel){
  var d = lsGet(schluessel, null);
  return (d && d.v === SPIELSTAND_FASSUNG) ? d : null;
}

/* Umzug der Schluessel aus der Zeit vor dem teddy.-Praefix. Laeuft auf jeder
   Seite und tut nach dem ersten Mal nichts mehr; kann weg, sobald niemand
   mehr mit einem alten Browserspeicher ankommt. */
(function(){
  var einzeln = [
    ['teddi.cfg',              'teddy.kub.cfg'],
    ['teddi.spiel',            'teddy.kub.spiel'],
    ['teddi.karte',            'teddy.kub.karte'],
    ['sud.cfg',                'teddy.doku.cfg'],
    ['sud.users',              'teddy.doku.benutzer'],
    ['sud.spiel',              'teddy.doku.spiel'],
    ['clicko.cfg',             'teddy.mania.cfg'],
    ['clicko.spiel',           'teddy.mania.spiel'],
    ['clicko.name',            'teddy.mania.name'],
    ['teddyversi.cfg',         'teddy.versi.cfg'],
    ['teddyversi.spiel',       'teddy.versi.spiel'],
    ['teddyversi.bilanz',      'teddy.versi.bilanz'],
    ['teddyversi.bilanzZweit', 'teddy.versi.bilanzZweit']
  ];
  var praefixe = [
    ['sud.times.',  'teddy.doku.zeiten.'],
    ['clicko.hs.',  'teddy.mania.bestenliste.']
  ];
  function umziehen(alt, neu){
    try{
      if (localStorage.getItem(neu) !== null) { localStorage.removeItem(alt); return; }
      var roh = localStorage.getItem(alt);
      if (roh === null) return;
      /* Nur Spielstaende bekommen eine Fassung aufgepraegt - alte kennen
         noch keine und sind Fassung 1. Einstellungen fuehren ihre eigene. */
      if (neu.slice(-6) === '.spiel'){
        var d = JSON.parse(roh);
        if (d && typeof d === 'object' && !(d instanceof Array) && d.v === undefined) d.v = 1;
        roh = JSON.stringify(d);
      }
      localStorage.setItem(neu, roh);
      localStorage.removeItem(alt);
    }catch(e){}
  }
  try{
    var i;
    for (i = 0; i < einzeln.length; i++) umziehen(einzeln[i][0], einzeln[i][1]);
    for (i = 0; i < praefixe.length; i++){
      var alt = praefixe[i][0], neu = praefixe[i][1], treffer = [], k;
      for (var n = 0; n < localStorage.length; n++){
        k = localStorage.key(n);
        if (k && k.indexOf(alt) === 0) treffer.push(k);
      }
      for (var t = 0; t < treffer.length; t++)
        umziehen(treffer[t], neu + treffer[t].slice(alt.length));
    }
  }catch(e){}
})();

/* ---------- Zurueck in die Spieleecke ---------- */
function zurSpieleecke(){
  sofortSichern();
  location.href = './';
}
/* Der Spielstand muss auch dann sitzen, wenn die Seite ohne Klick verschwindet.
   Auf iOS ist pagehide das einzige Ereignis, das beim Wegwischen einer
   Web-App noch kommt; unload und beforeunload bleiben dort aus. */
(function(){
  document.addEventListener('visibilitychange', function(){ if (document.hidden) sofortSichern(); });
  window.addEventListener('pagehide', sofortSichern);
})();

function eckeKnopf(){
  return '<button class="btn" data-act="ecke"><span class="ico">'+
         '<img class="ecke-ico" src="favicon.svg" alt=""></span>Spieleecke</button>';
}

/* Drehen meldet die neue Groesse auf iOS erst kurz nach dem Ereignis. */
function beiGroessenwechsel(fn){
  window.addEventListener('resize', fn);
  window.addEventListener('orientationchange', function(){ setTimeout(fn, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fn);
}

/* ---------- Teddi und Teddy zeichnen ---------- */
function lockenKranz(cx, cy, r, n){
  /* Ein Kreis, dessen Rand aus n nach aussen gewoelbten Boegen besteht -
     das ist die Abkuerzung fuer "lockiges Fell". */
  var d = '', i, a, x, y, x2, y2;
  var bogen = (r * Math.sin(Math.PI / n) * 1.04).toFixed(2);
  for (i=0;i<n;i++){
    a  = (i/n)*Math.PI*2 - Math.PI/2;
    x  = cx + Math.cos(a)*r;  y  = cy + Math.sin(a)*r;
    a  = ((i+1)/n)*Math.PI*2 - Math.PI/2;
    x2 = cx + Math.cos(a)*r;  y2 = cy + Math.sin(a)*r;
    if (i === 0) d = 'M' + x.toFixed(1) + ' ' + y.toFixed(1);
    d += 'A' + bogen + ' ' + bogen + ' 0 0 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1);
  }
  return d + 'Z';
}
function teddiMarke(){
  /* Teddi als flache Marke: lockiger Kopf, lockige Schlappohren,
     helles Bartfeld, Nase, zwei Augen. Wenige Formen, damit er auf einem
     30 px breiten Stein noch als Hund lesbar bleibt. */
  return '<svg viewBox="0 0 100 104" xmlns="http://www.w3.org/2000/svg">'+
    '<path d="'+lockenKranz(19,57,15,7)+'" fill="#4b3421"/>'+
    '<path d="'+lockenKranz(81,57,15,7)+'" fill="#4b3421"/>'+
    '<path d="'+lockenKranz(50,44,29,11)+'" fill="#75523a"/>'+
    '<path d="'+lockenKranz(50,73,21,9)+'" fill="#efe7da"/>'+
    '<path d="M40 64 C44 59 56 59 60 64 C62 69 56 74 50 74 C44 74 38 69 40 64 Z" fill="#2b1d15"/>'+
    '<path d="M50 74 L50 79 M50 79 C45 86 39 85 37 80 M50 79 C55 86 61 85 63 80"'+
      ' stroke="#2b1d15" stroke-width="3.4" fill="none" stroke-linecap="round"/>'+
    '<circle cx="36" cy="43" r="5.2" fill="#2b1d15"/>'+
    '<circle cx="64" cy="43" r="5.2" fill="#2b1d15"/>'+
    '</svg>';
}
/* Der grosse Teddy als Bauteilsatz.
   eyes: normal | closed | wide | lupe, mouth: neutral | smile | tongue.
   Der Doktorhut kommt nur mit hut:true - nur Teddydoku setzt ihn auf. */
function teddyKopf(o){
  o = o || {};
  var eyes = o.eyes || 'normal', mouth = o.mouth || 'neutral', s = '';

  s += '<path d="M34 50 C19 54 13 72 15 87 C17 99 27 104 34 98 C29 84 28 66 34 54 Z" fill="#57402f"/>'+
       '<path d="M86 50 C101 54 107 72 105 87 C103 99 93 104 86 98 C91 84 92 66 86 54 Z" fill="#57402f"/>'+
       '<path d="M31 58 C22 64 19 76 21 86" stroke="#4a3527" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>'+
       '<path d="M89 58 C98 64 101 76 99 86" stroke="#4a3527" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>'+
       '<path d="M60 28 C79 28 91 41 92 57 C93 73 84 88 60 91 C36 88 27 73 28 57 C29 41 41 28 60 28 Z" fill="#6b4d36"/>'+
       '<path d="M36 44 C44 33 58 30 68 34 C60 38 50 42 44 50 Z" fill="#7a5b42" opacity=".85"/>'+
       '<path d="M84 52 C88 62 87 74 81 82 C84 70 84 60 80 52 Z" fill="#7a5b42" opacity=".7"/>'+
       '<path d="M33 60 C31 70 33 80 39 86 C34 76 34 68 36 60 Z" fill="#5b4130" opacity=".8"/>'+
       '<path d="M52 33 C60 31 70 33 76 38 C68 37 60 37 52 39 Z" fill="#5b4130" opacity=".6"/>'+
       '<path d="M42 70 C46 86 74 86 78 70 C81 82 73 92 60 93 C47 92 39 82 42 70 Z" fill="#cdc5b6"/>'+
       '<ellipse cx="60" cy="72" rx="13" ry="9.5" fill="#ddd6c9"/>';
  if (mouth === 'tongue')
    s += '<path d="M54 79 C54 90 66 90 66 79 C64 84 56 84 54 79 Z" fill="#d98a8a"/>';
  s += '<path d="M53 67 C56 63.5 64 63.5 67 67 C68.4 70.4 64.4 73.6 60 73.6 C55.6 73.6 51.6 70.4 53 67 Z" fill="#2e2019"/>'+
       '<ellipse cx="57.4" cy="66.8" rx="2" ry="1.2" fill="#5a4a41" opacity=".8"/>';
  if (mouth === 'smile' || mouth === 'tongue')
    s += '<path d="M60 74 L60 77 M60 77 C55.5 83 50 82 48 78.5 M60 77 C64.5 83 70 82 72 78.5"'+
         ' stroke="#3a2b21" stroke-width="2.1" fill="none" stroke-linecap="round"/>';
  else
    s += '<path d="M60 74 L60 77.5 M60 77.5 C56.5 82 51.5 81.5 49.5 78.5 M60 77.5 C63.5 82 68.5 81.5 70.5 78.5"'+
         ' stroke="#3a2b21" stroke-width="2.1" fill="none" stroke-linecap="round"/>';
  if (eyes === 'closed'){
    s += '<path d="M42 57 C46 53 52 53 55 57 M65 57 C68 53 74 53 78 57" stroke="#291b13"'+
         ' stroke-width="2.6" fill="none" stroke-linecap="round"/>';
  } else if (eyes === 'wide'){
    s += '<ellipse cx="47.5" cy="56" rx="5.4" ry="5.8" fill="#291b13"/>'+
         '<ellipse cx="72.5" cy="56" rx="5.4" ry="5.8" fill="#291b13"/>'+
         '<ellipse cx="49" cy="54" rx="1.6" ry="1.4" fill="#fff" opacity=".7"/>'+
         '<ellipse cx="74" cy="54" rx="1.6" ry="1.4" fill="#fff" opacity=".7"/>';
  } else if (eyes === 'lupe'){
    s += '<ellipse cx="47.5" cy="56.5" rx="4.1" ry="4.4" fill="#291b13"/>'+
         '<ellipse cx="48.8" cy="55" rx="1.2" ry="1.1" fill="#fff" opacity=".65"/>'+
         '<ellipse cx="74" cy="57" rx="6.6" ry="7" fill="#291b13"/>'+
         '<ellipse cx="76" cy="54.6" rx="2" ry="1.8" fill="#fff" opacity=".7"/>';
  } else {
    s += '<ellipse cx="47.5" cy="56.5" rx="4.1" ry="4.4" fill="#291b13"/>'+
         '<ellipse cx="72.5" cy="56.5" rx="4.1" ry="4.4" fill="#291b13"/>'+
         '<ellipse cx="48.8" cy="55" rx="1.2" ry="1.1" fill="#fff" opacity=".65"/>'+
         '<ellipse cx="73.8" cy="55" rx="1.2" ry="1.1" fill="#fff" opacity=".65"/>';
  }
  s += '<path d="M40 51 C45 47 53 47 56 51 C50 49.5 45 49.5 40 51 Z" fill="#5b4130"/>'+
       '<path d="M64 51 C67 47 75 47 80 51 C75 49.5 70 49.5 64 51 Z" fill="#5b4130"/>';
  if (o.hut){
    var neigung = o.hutNeigung ? ' transform="rotate('+o.hutNeigung+' 60 24)"' : '';
    s += '<g'+neigung+'>'+
      '<path d="M44 24 C50 15 70 15 76 24 L79 33 C68 27 52 27 41 33 Z" fill="#20222a"/>'+
      '<polygon points="60,6 106,21 60,36 14,21" fill="#282b35" stroke="#171922" stroke-width="1.6" stroke-linejoin="round"/>'+
      '<polygon points="60,6 106,21 60,26 14,21" fill="#31343f" opacity=".7"/>'+
      '<circle cx="60" cy="21" r="3.6" fill="#c9a13c"/>'+
      '<path d="M101 23 C103 32 99 38 97.5 43" stroke="#c9a13c" stroke-width="2.6" fill="none" stroke-linecap="round"/>'+
      '<path d="M97.5 43 C95 47 96 51 99 51 C102 51 103 47 100.5 43 Z" fill="#c9a13c"/>'+
      '</g>';
  }
  return s;
}

function teddyKonfetti(){
  var bits=[[10,18,'#e8412c',18],[104,40,'#2f8f30',-24],[22,96,'#2079d8',36],[100,96,'#f6a021',-12],
            [42,8,'#8b3fbf',12],[76,2,'#00a6a6',-30],[2,58,'#f6a021',-40],[112,72,'#e8412c',22],
            [30,120,'#2f8f30',28],[92,124,'#8b3fbf',-18],[118,52,'#2079d8',44],[0,96,'#e8412c',-34],
            [58,124,'#f6a021',8],[16,4,'#2079d8',-16]];
  var s='';
  bits.forEach(function(b){
    s += '<rect x="'+b[0]+'" y="'+b[1]+'" width="9" height="6" rx="1.5" fill="'+b[2]+
         '" transform="rotate('+b[3]+' '+(b[0]+4)+' '+(b[1]+3)+')"/>';
  });
  s += '<circle cx="16" cy="40" r="3.4" fill="#ffd23a"/><circle cx="108" cy="18" r="3" fill="#e8412c"/>'+
       '<circle cx="88" cy="118" r="3.2" fill="#2079d8"/>';
  return s;
}

function teddyLupe(){
  return '<g transform="rotate(12 78 58)">'+
    '<path d="M92 76 L112 100" stroke="#6d5136" stroke-width="9" stroke-linecap="round"/>'+
    '<path d="M92 76 L112 100" stroke="#8a6942" stroke-width="5" stroke-linecap="round"/>'+
    '<circle cx="76" cy="57" r="22" fill="#cfe8f6" opacity=".38"/>'+
    '<circle cx="76" cy="57" r="22" fill="none" stroke="#33465c" stroke-width="5"/>'+
    '<circle cx="76" cy="57" r="22" fill="none" stroke="#8fb4cd" stroke-width="1.6"/>'+
    '<path d="M64 46 C68 42 74 40 79 41" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".65"/>'+
    '</g>';
}

function svgWrap(inner, cls){
  return '<svg'+(cls ? ' class="'+cls+'"' : '')+' viewBox="-8 -8 136 136" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+inner+'</svg>';
}
function teddyJubel(){
  return svgWrap(teddyKonfetti() +
    '<g transform="rotate(-4 60 64)">'+teddyKopf({eyes:'closed', mouth:'tongue'})+'</g>', 'teddy-jubel');
}
function teddyRuhig(){ return svgWrap(teddyKopf({mouth:'smile'})); }
function teddyStaunt(){ return svgWrap(teddyKopf({eyes:'wide', mouth:'smile'})); }

/* ---------- Feiern am Spielende ----------
   Gewinnt ein Teddy, fängt er im Ergebnisbild einen Knochen (teddyKnochen)
   und ein paar kleine Knochen rieseln. Gewinnt ein Mensch, kommt zufällig
   eine von fünf Feiern. Alles liegt in einer eigenen Ebene ohne Klicks,
   räumt sich selbst weg und endet beim ersten Tippen. */
(function(){
  var css =
  '.feier{position:fixed; inset:0; z-index:9999; pointer-events:none; overflow:hidden; transition:opacity .45s;}'+
  '.feier.aus{opacity:0;}'+
  '.feier > *{position:absolute;}'+
  '.feier svg{display:block; overflow:visible;}'+
  /* Konfetti: aus der Mitte hochgeschossen, dann herunter */
  '.fk{left:50%; top:42%; width:10px; height:6px; border-radius:1.5px;'+
  '  animation:fk-flug var(--t) both; animation-delay:var(--d);}'+
  '@keyframes fk-flug{'+
  '  0%{transform:translate(0,0) rotate(0) scale(.3); animation-timing-function:cubic-bezier(.2,.7,.4,1);}'+
  '  28%{transform:translate(var(--dx),var(--dy)) rotate(calc(var(--r)*.4)) scale(1); animation-timing-function:cubic-bezier(.5,0,.9,.6);}'+
  '  100%{transform:translate(calc(var(--dx)*1.5),calc(var(--dy) + 110vh)) rotate(var(--r)) scale(1);}}'+
  /* Ballons steigen auf und schaukeln */
  '.fb{top:100%; animation:fb-steigen var(--t) cubic-bezier(.35,.1,.7,1) both; animation-delay:var(--d);}'+
  '.fb > svg{transform-origin:50% 0; animation:fb-schaukeln 1.3s ease-in-out infinite alternate; animation-delay:var(--s);}'+
  '@keyframes fb-steigen{to{transform:translateY(calc(-100vh - 160px));}}'+
  '@keyframes fb-schaukeln{from{transform:rotate(-7deg);} to{transform:rotate(7deg);}}'+
  /* Herzchen steigen auf, pulsieren, verblassen */
  '.fh{left:50%; top:74%; animation:fh-steigen var(--t) ease-out both; animation-delay:var(--d);}'+
  '.fh > svg{animation:fh-puls .45s ease-in-out infinite alternate;}'+
  '@keyframes fh-steigen{0%{transform:translate(0,0) scale(.2); opacity:0;} 15%{opacity:1;}'+
  '  70%{opacity:1;} 100%{transform:translate(var(--dx),-55vh) scale(1); opacity:0;}}'+
  '@keyframes fh-puls{to{scale:1.18;}}'+
  /* Disko und Laser: kurz das Licht runter */
  '.fd-dunkel{inset:0; background:rgba(12,4,40,.42); animation:fd-dunkel var(--t) ease both;}'+
  '@keyframes fd-dunkel{0%{opacity:0;} 15%,80%{opacity:1;} 100%{opacity:0;}}'+
  '.fd-kugel{left:50%; top:0; margin-left:-38px; animation:fd-runter .7s cubic-bezier(.3,1.4,.6,1) both;}'+
  '@keyframes fd-runter{from{transform:translateY(-200px);}}'+
  '.fd-facetten{animation:fd-drehen 2.2s linear infinite;}'+
  '@keyframes fd-drehen{to{transform:translateX(-40px);}}'+
  '.fd-arm{left:50%; top:96px; width:0; height:0; animation:fd-kreisen var(--u) linear infinite; animation-delay:var(--d);}'+
  '.fd-arm > i{position:absolute; left:var(--r); top:0; width:var(--g); height:var(--g); margin:calc(var(--g)/-2);'+
  '  border-radius:50%; background:radial-gradient(circle, var(--f) 0, var(--f) 35%, transparent 70%);'+
  '  mix-blend-mode:screen; opacity:.85; animation:fd-funkeln .5s ease-in-out infinite alternate;}'+
  '@keyframes fd-kreisen{from{transform:rotate(var(--a));} to{transform:rotate(calc(var(--a) + 360deg));}}'+
  '@keyframes fd-funkeln{to{opacity:.45;}}'+
  '.fl{bottom:-10px; width:5px; height:150vh; margin-left:-2.5px; transform-origin:50% 100%; border-radius:3px;'+
  '  background:linear-gradient(to top, var(--f), transparent 85%);'+
  '  box-shadow:0 0 10px 2px var(--f); mix-blend-mode:screen;'+
  '  animation:fl-schwenk var(--u) ease-in-out infinite alternate, fl-an var(--t) ease both;}'+
  '@keyframes fl-schwenk{from{transform:rotate(var(--a));} to{transform:rotate(var(--b));}}'+
  '@keyframes fl-an{0%{opacity:0;} 15%,82%{opacity:.7;} 100%{opacity:0;}}'+
  '.fl-nebel{left:0; right:0; bottom:0; height:45vh;'+
  '  background:radial-gradient(ellipse at 50% 100%, rgba(120,90,255,.35), transparent 70%);'+
  '  animation:fd-dunkel var(--t) ease both;}'+
  /* Kleine Knochen rieseln, wenn ein Teddy gewinnt */
  '.fn{top:-40px; animation:fn-fallen var(--t) cubic-bezier(.45,0,.8,.6) both; animation-delay:var(--d);}'+
  '@keyframes fn-fallen{to{transform:translate(var(--dx), calc(100vh + 80px)) rotate(var(--r));}}'+
  /* Der Teddy im Ergebnisbild */
  '.teddy-jubel{overflow:visible;}'+
  '.feier-huepfen .teddy-jubel{animation:tj-huepfen .32s ease-in-out 8 alternate;}'+
  '.feier-wippen .teddy-jubel{animation:tj-wippen .24s ease-in-out 14 alternate;}'+
  '@keyframes tj-huepfen{from{transform:translateY(0);} to{transform:translateY(-9px) rotate(3deg);}}'+
  '@keyframes tj-wippen{from{transform:rotate(-6deg);} to{transform:rotate(6deg) translateY(-4px);}}'+
  '.teddy-knochen{overflow:visible;}'+
  '.tk-wartet{animation:tk-weg 1.15s steps(1) both;}'+
  '.tk-hat{animation:tk-da 1.15s steps(1) both;}'+
  '@keyframes tk-weg{0%{opacity:1;} 100%{opacity:0;}}'+
  '@keyframes tk-da{0%{opacity:0;} 100%{opacity:1;}}'+
  '.tk-kopf{transform-box:view-box; transform-origin:60px 96px;'+
  '  animation:tk-schnapp .25s ease-out 1.1s both, tk-wackeln .3s ease-in-out 1.35s 6 alternate;}'+
  '@keyframes tk-schnapp{0%{transform:scale(1);} 40%{transform:scale(1.07,.93);} 100%{transform:scale(1);}}'+
  '@keyframes tk-wackeln{from{transform:rotate(-7deg);} to{transform:rotate(7deg);}}'+
  '.tk-flug{transform-box:fill-box; transform-origin:center; animation:tk-flug .85s linear .25s both;}'+
  '@keyframes tk-flug{'+
  '  0%{transform:translate(-150px,30px) rotate(-640deg); opacity:0;}'+
  '  8%{opacity:1;}'+
  '  50%{transform:translate(-75px,-60px) rotate(-320deg);}'+
  '  100%{transform:translate(0,0) rotate(0);}}'+
  '@media (prefers-reduced-motion: reduce){'+
  '  .feier{display:none !important;}'+
  '  .teddy-jubel, .tk-wartet, .tk-hat, .tk-kopf, .tk-flug{animation:none !important;}}';
  var st = document.createElement('style');
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
})();

function knochenForm(farbe, rand){
  /* Erst die Umrisse breit in der Randfarbe, dann die Flaeche darueber -
     so bleibt nur der Aussenrand sichtbar. */
  function teile(f, extra){
    return '<circle cx="-13" cy="-4.5" r="5.5"'+f+extra+'/><circle cx="-13" cy="4.5" r="5.5"'+f+extra+'/>'+
           '<circle cx="13" cy="-4.5" r="5.5"'+f+extra+'/><circle cx="13" cy="4.5" r="5.5"'+f+extra+'/>'+
           '<rect x="-13" y="-3.6" width="26" height="7.2"'+f+extra+'/>';
  }
  return teile(' fill="'+rand+'"', ' stroke="'+rand+'" stroke-width="3.2"') +
         teile(' fill="'+farbe+'"', '');
}
function teddyKnochen(){
  /* Teddy schaut, der Knochen fliegt im Bogen heran, er schnappt zu und
     wackelt zufrieden mit dem Kopf. Ohne Bewegung bleibt nur das Endbild. */
  return '<svg class="teddy-knochen" viewBox="-8 -8 136 136" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
    '<g class="tk-kopf">'+
      '<g class="tk-wartet">'+teddyKopf({eyes:'wide', mouth:'neutral'})+'</g>'+
      '<g class="tk-hat">'+teddyKopf({eyes:'closed', mouth:'smile'})+'</g>'+
      '<g transform="translate(60 81) rotate(-8) scale(1.25)"><g class="tk-flug">'+knochenForm('#f6eedd', '#b9a888')+'</g></g>'+
    '</g></svg>';
}

var feierLetzte = '';
var feierEnde = null;
function feiern(art){
  if (feierEnde) feierEnde(true);
  if (art !== 'teddy' && art !== 'mensch') return;
  try{ if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; }catch(e){}

  var ebene = document.createElement('div'), body = document.body, dauer, klasse = '';
  ebene.className = 'feier';
  function zufall(a, b){ return a + Math.random()*(b - a); }
  function teil(cls, stil, inhalt){
    var n = document.createElement('div');
    n.className = cls;
    n.style.cssText = stil;
    if (inhalt) n.innerHTML = inhalt;
    ebene.appendChild(n);
    return n;
  }
  var bunt = ['#e8412c','#f6a021','#ffd23a','#2f8f30','#2079d8','#8b3fbf','#00a6a6','#ff6fa8'];
  var i, wahl = art;

  if (art === 'mensch'){
    /* Diskokugel und Laser etwas seltener, damit sie etwas Besonderes bleiben,
       und nie zweimal dieselbe Feier hintereinander. */
    var topf = ['konfetti','konfetti','konfetti','ballons','ballons','ballons','herzen','herzen','herzen',
                'disko','disko','laser','laser'];
    feierLetzte = feierLetzte || lsGet('teddy.feier.letzte', '');
    topf = topf.filter(function(x){ return x !== feierLetzte; });
    wahl = topf[Math.floor(Math.random()*topf.length)];
    feierLetzte = wahl;
    lsSet('teddy.feier.letzte', wahl);
  }

  if (wahl === 'konfetti'){
    dauer = 3800; klasse = 'feier-huepfen';
    for (i=0;i<70;i++){
      var w = zufall(-50, 50);
      teil('fk', '--dx:'+(Math.sin(w*Math.PI/180)*zufall(80, 260)).toFixed(0)+'px;'+
        '--dy:'+(-zufall(140, 340)).toFixed(0)+'px;--r:'+zufall(-900, 900).toFixed(0)+'deg;'+
        '--t:'+zufall(2.4, 3.3).toFixed(2)+'s;--d:'+zufall(0, .25).toFixed(2)+'s;'+
        'background:'+bunt[i % bunt.length]+';'+(i % 3 === 0 ? 'width:7px;height:7px;border-radius:50%;' : ''));
    }
  } else if (wahl === 'ballons'){
    dauer = 5600; klasse = 'feier-huepfen';
    for (i=0;i<9;i++){
      var f = bunt[(i*3) % bunt.length], g = 46 + Math.round(zufall(0, 18));
      teil('fb', 'left:'+(4 + i*10.5 + zufall(-3, 3)).toFixed(1)+'%;--t:'+zufall(3.6, 4.8).toFixed(2)+'s;'+
        '--d:'+zufall(0, .9).toFixed(2)+'s;--s:'+zufall(-1.3, 0).toFixed(2)+'s;',
        '<svg width="'+g+'" height="'+Math.round(g*2.4)+'" viewBox="0 0 50 120">'+
        '<path d="M25 58 C22 72 30 84 24 98 C19 108 27 114 25 120" stroke="#7a6a5a" stroke-width="1.4" fill="none"/>'+
        '<ellipse cx="25" cy="28" rx="22" ry="27" fill="'+f+'"/>'+
        '<path d="M21 56 L29 56 L25 61 Z" fill="'+f+'"/>'+
        '<ellipse cx="17" cy="17" rx="5" ry="8" fill="#fff" opacity=".35" transform="rotate(-25 17 17)"/></svg>');
    }
  } else if (wahl === 'herzen'){
    dauer = 3900; klasse = 'feier-huepfen';
    var rot = ['#e8412c','#ff6fa8','#d6336c','#ff8fab'];
    for (i=0;i<22;i++){
      var h = Math.round(zufall(18, 40));
      teil('fh', 'margin-left:'+(-h/2 + zufall(-150, 150)).toFixed(0)+'px;--dx:'+zufall(-170, 170).toFixed(0)+'px;'+
        '--t:'+zufall(2.2, 3).toFixed(2)+'s;--d:'+zufall(0, 1.1).toFixed(2)+'s;',
        '<svg width="'+h+'" height="'+h+'" viewBox="0 0 32 30">'+
        '<path d="M16 29 C6 21 0 15 0 8.5 C0 3.5 4 0 8.6 0 C11.8 0 14.4 1.8 16 4.4 C17.6 1.8 20.2 0 23.4 0'+
        ' C28 0 32 3.5 32 8.5 C32 15 26 21 16 29 Z" fill="'+rot[i % rot.length]+'"/>'+
        '<ellipse cx="9" cy="8" rx="3" ry="4.5" fill="#fff" opacity=".35" transform="rotate(-30 9 8)"/></svg>');
    }
  } else if (wahl === 'disko'){
    dauer = 4600; klasse = 'feier-wippen';
    teil('fd-dunkel', '--t:'+dauer+'ms;');
    for (i=0;i<24;i++){
      var gr = Math.round(zufall(30, 70));
      teil('fd-arm', '--u:'+zufall(3.5, 6).toFixed(2)+'s;--a:'+Math.round(zufall(0, 360))+'deg;'+
        '--d:'+zufall(-.5, 0).toFixed(2)+'s;'+(i % 2 ? 'animation-direction:reverse;' : ''),
        '').innerHTML = '<i style="--r:'+Math.round(zufall(90, 520))+'px;--g:'+gr+'px;--f:'+bunt[i % bunt.length]+';"></i>';
    }
    var facetten = '';
    for (var y=-40;y<40;y+=8) for (var x=-56;x<96;x+=8)
      facetten += '<rect x="'+(x + ((y/8) % 2 ? 4 : 0))+'" y="'+y+'" width="7" height="7" fill="'+
        ['#e9eef5','#b8c2cf','#ffffff','#8e9aab','#d3dae4'][Math.abs((x*7 + y*3)/8) % 5]+'"/>';
    teil('fd-kugel', '',
      '<svg width="76" height="134" viewBox="-38 -96 76 134">'+
      '<line x1="0" y1="-96" x2="0" y2="-34" stroke="#ccc" stroke-width="2"/>'+
      '<rect x="-6" y="-40" width="12" height="7" rx="1.5" fill="#888"/>'+
      '<defs><clipPath id="fd-rund"><circle r="34"/></clipPath>'+
      '<radialGradient id="fd-glanz" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/>'+
      '<stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#223" stop-opacity=".45"/></radialGradient></defs>'+
      '<g clip-path="url(#fd-rund)"><circle r="34" fill="#9aa6b6"/><g class="fd-facetten">'+facetten+'</g>'+
      '<circle r="34" fill="url(#fd-glanz)"/></g></svg>');
  } else if (wahl === 'laser'){
    dauer = 4200; klasse = 'feier-wippen';
    teil('fd-dunkel', '--t:'+dauer+'ms;');
    teil('fl-nebel', '--t:'+dauer+'ms;');
    var strahlen = [
      ['6%', '#ff2d6f', 10, 55], ['6%', '#2dff9a', 25, 70], ['94%', '#2dc8ff', -10, -55],
      ['94%', '#ffe12d', -25, -70], ['50%', '#b02dff', -35, 35]
    ];
    strahlen.forEach(function(s, k){
      teil('fl', 'left:'+s[0]+';--f:'+s[1]+';--a:'+s[2]+'deg;--b:'+s[3]+'deg;'+
        '--u:'+(0.7 + k*0.13).toFixed(2)+'s;--t:'+dauer+'ms;');
    });
  } else {
    /* Ein Teddy hat gewonnen: Er fängt im Bild seinen Knochen, hier
       rieseln danach noch ein paar kleine herunter. */
    dauer = 4300;
    for (i=0;i<12;i++){
      var gk = Math.round(zufall(26, 44));
      teil('fn', 'left:'+zufall(3, 93).toFixed(1)+'%;--dx:'+zufall(-40, 40).toFixed(0)+'px;'+
        '--r:'+zufall(-540, 540).toFixed(0)+'deg;--t:'+zufall(2, 2.9).toFixed(2)+'s;'+
        '--d:'+zufall(1.1, 2).toFixed(2)+'s;',
        '<svg width="'+gk+'" height="'+Math.round(gk*.6)+'" viewBox="-20 -12 40 24">'+
        knochenForm('#f6eedd', '#b9a888')+'</svg>');
    }
  }

  body.appendChild(ebene);
  if (klasse) body.classList.add(klasse);

  var weg = 0;
  function ende(sofort){
    if (feierEnde !== ende) return;
    feierEnde = null;
    clearTimeout(weg);
    document.removeEventListener('pointerdown', tippen, true);
    if (klasse) body.classList.remove(klasse);
    if (sofort){ if (ebene.parentNode) ebene.parentNode.removeChild(ebene); return; }
    ebene.classList.add('aus');
    setTimeout(function(){ if (ebene.parentNode) ebene.parentNode.removeChild(ebene); }, 500);
  }
  function tippen(){ ende(false); }
  feierEnde = ende;
  weg = setTimeout(function(){ ende(false); }, dauer);
  /* Erst ein wenig später lauschen, sonst beendet der Tipp, der das Spiel
     beendet hat, die Feier gleich wieder. */
  setTimeout(function(){
    if (feierEnde === ende) document.addEventListener('pointerdown', tippen, true);
  }, 600);
}
