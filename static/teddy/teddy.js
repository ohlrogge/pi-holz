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
  delete teddySpeicher[k];
  try{ localStorage.removeItem(k); }catch(e){}
}

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
  if (typeof spielSpeichern === 'function') spielSpeichern();
  location.href = './';
}
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

function svgWrap(inner){
  return '<svg viewBox="-8 -8 136 136" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+inner+'</svg>';
}
function teddyJubel(){
  return svgWrap(teddyKonfetti() +
    '<g transform="rotate(-4 60 64)">'+teddyKopf({eyes:'closed', mouth:'tongue'})+'</g>');
}
function teddyRuhig(){ return svgWrap(teddyKopf({mouth:'smile'})); }
function teddyStaunt(){ return svgWrap(teddyKopf({eyes:'wide', mouth:'smile'})); }
