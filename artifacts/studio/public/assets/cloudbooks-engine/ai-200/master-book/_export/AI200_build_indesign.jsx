/************************************************************************************************
 * AI-200 Master Book — constructor de InDesign (ExtendScript / .jsx)
 * ---------------------------------------------------------------------------------------------
 * QUE HACE: crea un documento InDesign 6x9.3in, define estilos de parrafo/caracter, y AUTOFLUYE
 * todo el contenido del libro (33 capitulos) desde AI200_blocks.json aplicando estilos, colocando
 * las figuras inline y arrancando cada capitulo en pagina nueva.
 *
 * COMO USARLO:
 *   1) Abri InDesign. NO necesitas un documento abierto (lo crea el script).
 *   2) Verifica que 'AI200_blocks.json' este en la MISMA carpeta que este .jsx (ya lo esta).
 *   3) Menu: File > Scripts > Scripts panel > (arrastra este .jsx a la carpeta de scripts, o)
 *      usa "Scripts" panel > doble clic. O bien: pega la ruta en la consola de ExtendScript Toolkit.
 *   4) Corre el script. Tarda segun la cantidad de figuras (coloca 51 imagenes).
 *
 * NOTA: es una v1 pensada para iterar. Si algo falla (fuente faltante, ruta de figura, overflow),
 * ajustamos. Las fuentes usadas ("Georgia","Segoe UI","Consolas") deben existir en el sistema.
 ************************************************************************************************/
#target "indesign"
(function () {
  // ---- cargar JSON (misma carpeta que el script) ----
  var here = File($.fileName).parent;
  var jf = File(here + "/AI200_blocks.json");
  if (!jf.exists) { alert("No encuentro AI200_blocks.json junto al script."); return; }
  jf.encoding = "UTF-8"; jf.open("r"); var raw = jf.read(); jf.close();
  var data;
  try { data = (typeof JSON !== "undefined" && JSON.parse) ? JSON.parse(raw) : eval("(" + raw + ")"); }
  catch (e) { alert("JSON invalido: " + e); return; }

  // ---- documento ----
  var doc = app.documents.add();
  with (doc.documentPreferences) { pageWidth = "6in"; pageHeight = "9.3in"; facingPages = false; }
  with (doc.marginPreferences) { top = "0.7in"; bottom = "0.7in"; left = "0.7in"; right = "0.7in"; }

  // ---- colores (swatches) ----
  function color(name, r, g, b) {
    var c = doc.colors.itemByName(name);
    if (c.isValid) return c;
    return doc.colors.add({ name: name, model: ColorModel.PROCESS, space: ColorSpace.RGB, colorValue: [r, g, b] });
  }
  var NAVY = color("cb-navy", 2, 28, 56), GREEN = color("cb-green", 14, 138, 110),
      INK = color("cb-ink", 42, 51, 64), GREY = color("cb-grey", 90, 100, 114), CODEINK = color("cb-codeink", 38, 48, 63);

  function font(name) { var f = app.fonts.itemByName(name); return f.isValid ? name : app.fonts[0].name; }
  var SERIF = font("Georgia"), SANS = font("Segoe UI"), MONO = font("Consolas");

  // ---- estilos de parrafo ----
  function ps(name, o) {
    var s = doc.paragraphStyles.itemByName(name); if (!s.isValid) s = doc.paragraphStyles.add({ name: name });
    for (var k in o) { try { s[k] = o[k]; } catch (e) {} } return s;
  }
  var J = Justification.LEFT_JUSTIFIED, L = Justification.LEFT_ALIGN, C = Justification.CENTER_ALIGN;
  ps("Titulo-Capitulo", { appliedFont: SANS, fontStyle: "Bold", pointSize: 22, leading: 24, fillColor: NAVY, justification: L, spaceAfter: 10, keepWithNext: 3, startParagraph: StartParagraph.NEXT_PAGE });
  ps("Titulo-Seccion", { appliedFont: SANS, fontStyle: "Bold", pointSize: 14, fillColor: NAVY, justification: L, spaceBefore: 12, spaceAfter: 5, keepWithNext: 3 });
  ps("Rotulo", { appliedFont: SANS, fontStyle: "Bold", pointSize: 9, tracking: 120, fillColor: GREEN, justification: L, spaceBefore: 10, spaceAfter: 2, keepWithNext: 2 });
  ps("Cuerpo", { appliedFont: SERIF, pointSize: 10.5, leading: 15, fillColor: INK, justification: J, hyphenation: true, spaceAfter: 6 });
  ps("Lead", { appliedFont: SERIF, fontStyle: "Italic", pointSize: 10.5, fillColor: GREY, justification: L, spaceAfter: 3 });
  ps("Lista", { appliedFont: SERIF, pointSize: 10.5, leading: 14, fillColor: INK, justification: J, leftIndent: "12pt", firstLineIndent: "-12pt", spaceAfter: 2 });
  ps("Codigo", { appliedFont: MONO, pointSize: 9, leading: 13, fillColor: CODEINK, justification: L, leftIndent: "8pt", rightIndent: "8pt", spaceBefore: 6, spaceAfter: 6, paragraphShadingOn: true, paragraphShadingColor: color("cb-codebg", 246, 248, 251) });
  ps("Prerrequisito", { appliedFont: SERIF, pointSize: 10, fillColor: INK, justification: L, spaceAfter: 8 });
  ps("Callout-Trampa", { appliedFont: SERIF, pointSize: 10, fillColor: color("cb-red", 138, 42, 36), justification: L, leftIndent: "10pt", spaceBefore: 6, spaceAfter: 6 });
  ps("Callout-Tip", { appliedFont: SERIF, pointSize: 10, fillColor: color("cb-tip", 14, 90, 74), justification: L, leftIndent: "10pt", spaceBefore: 6, spaceAfter: 6 });
  ps("Figura-Leyenda", { appliedFont: SANS, fontStyle: "Italic", pointSize: 8, fillColor: GREY, justification: C, spaceBefore: 2, spaceAfter: 10 });
  ps("Practica-Escenario", { appliedFont: SERIF, fontStyle: "Bold", pointSize: 11, fillColor: NAVY, justification: L, spaceBefore: 8, spaceAfter: 3, keepWithNext: 2 });
  ps("Practica-Opcion", { appliedFont: SERIF, pointSize: 10.5, fillColor: INK, justification: L, leftIndent: "14pt", firstLineIndent: "-14pt", spaceAfter: 1 });
  ps("Practica-Respuesta", { appliedFont: SERIF, pointSize: 10, fillColor: INK, justification: L, spaceBefore: 3, spaceAfter: 8 });
  ps("Punto-Clave", { appliedFont: SERIF, pointSize: 10.5, leading: 14, fillColor: INK, justification: J, leftIndent: "12pt", firstLineIndent: "-12pt", spaceAfter: 2 });

  // ---- estilo de caracter: codigo inline ----
  var csCode = doc.characterStyles.itemByName("Codigo-Inline");
  if (!csCode.isValid) csCode = doc.characterStyles.add({ name: "Codigo-Inline", appliedFont: MONO, fillColor: GREEN });

  // ---- marco de texto encadenado + autoflow ----
  var page0 = doc.pages[0];
  var tf = page0.textFrames.add({ geometricBounds: ["0.7in", "0.7in", "8.6in", "5.3in"] });
  var story = tf.parentStory;
  var CONTENT_W = 4.6 * 72; // pt (6in - 2*0.7in)

  function newPara(styleName) {
    if (story.characters.length > 0) story.insertionPoints[-1].contents = "\r";
    story.paragraphs[-1].appliedParagraphStyle = doc.paragraphStyles.itemByName(styleName);
  }
  function addRuns(runs) {
    for (var i = 0; i < runs.length; i++) {
      var r = runs[i]; if (!r.t) continue;
      var a = story.insertionPoints[-1].index;
      story.insertionPoints[-1].contents = r.t;
      var b = story.insertionPoints[-1].index;
      if (r.s && b > a) {
        var rng = story.characters.itemByRange(a, b - 1);
        if (r.s === "code") rng.appliedCharacterStyle = csCode;
        else if (r.s === "bold") rng.fontStyle = "Bold";
        else if (r.s === "italic") rng.fontStyle = "Italic";
      }
    }
  }
  function addText(t) { story.insertionPoints[-1].contents = t; }
  function placeFigure(src, caption) {
    // figura inline: se ancla en el flujo, centrada, escalada al ancho de contenido
    newPara("Figura-Leyenda");
    var ip = story.insertionPoints[-1];
    try {
      var placed = ip.place(File(src))[0];
      var g = placed.parent; // rectangle/graphic
      g.fit(FitOptions.PROPORTIONALLY);
      // escalar el objeto anclado a ~4.4in de ancho
      var gb = g.geometricBounds, w = gb[3] - gb[1];
      if (w > 0) { var k = (4.4 * 72) / w; g.absoluteHorizontalScale *= k; g.absoluteVerticalScale *= k; }
    } catch (e) {}
    newPara("Figura-Leyenda"); addText(caption || "");
  }

  // ---- volcar el contenido ----
  var chs = data.chapters || [];
  for (var ci = 0; ci < chs.length; ci++) {
    var ch = chs[ci], B = ch.blocks || [];
    // titulo del capitulo (arranca en pagina nueva por el estilo)
    newPara("Titulo-Capitulo");
    addText((ch.isCapstone ? ch.kicker : ("Capítulo " + ch.num)) + " · " + ch.title);
    for (var bi = 0; bi < B.length; bi++) {
      var bl = B[bi], k = bl.k;
      if (k === "body") { newPara("Cuerpo"); addRuns(bl.runs || []); }
      else if (k === "h2") { newPara("Titulo-Seccion"); addText(bl.t || ""); }
      else if (k === "rotulo") { newPara("Rotulo"); addText(bl.t || ""); }
      else if (k === "lead") { newPara("Lead"); addText(bl.t || ""); }
      else if (k === "prereq") { newPara("Prerrequisito"); addRuns(bl.runs || []); }
      else if (k === "list") { newPara("Lista"); addText("› "); addRuns(bl.runs || []); }
      else if (k === "key") { newPara("Punto-Clave"); addText("› "); addRuns(bl.runs || []); }
      else if (k === "code") {
        newPara("Codigo");
        var lines = bl.lines || [];
        for (var li = 0; li < lines.length; li++) { if (li) addText("\n"); addText(lines[li]); }
      }
      else if (k === "callout") { newPara(bl.kind === "trap" ? "Callout-Trampa" : "Callout-Tip"); addRuns(bl.runs || []); }
      else if (k === "figure") { placeFigure(bl.src, bl.caption); }
      else if (k === "pq") { newPara("Practica-Escenario"); addText(bl.t || ""); }
      else if (k === "popt") { newPara("Practica-Opcion"); addText(bl.t || ""); }
      else if (k === "pa") { newPara("Practica-Respuesta"); addText(bl.lead || ""); addRuns(bl.runs || []); }
    }
  }

  // ---- autoflow: encadenar marcos hasta que no haya overflow ----
  var guard = 0, cur = tf;
  while (cur.overflows && guard < 4000) {
    var np = doc.pages.add();
    var nf = np.textFrames.add({ geometricBounds: ["0.7in", "0.7in", "8.6in", "5.3in"] });
    cur.nextTextFrame = nf; cur = nf; guard++;
  }

  try { app.activeWindow.zoomPercentage = 60; } catch (e) {}
  alert("Master Book AI-200 armado: " + chs.length + " capitulos, " + doc.pages.length + " paginas.\n" +
        "Estilos de parrafo/caracter creados. Ahora podes maquetar libre (master pages para portadillas/abre-partes, etc.).");
})();
