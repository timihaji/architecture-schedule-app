// Lazy custom-font loader for pdfmake.
//
// pdfmake ships with Roboto only. To render the 9 themed PDF directions
// at high visual fidelity we register additional families into
// pdfMake.fonts at runtime, with the raw TTF bytes living in
// pdfMake.vfs (base64).
//
// SOURCE: direct fonts.gstatic.com URLs. @fontsource (npm) only ships
// WOFF/WOFF2 nowadays — pdfmake's underlying pdfkit only consumes TTF,
// so we go straight to the upstream. The URLs include version-hashed
// filenames and rarely change (years between bumps). CORS is open
// (Access-Control-Allow-Origin: *).
//
// Each theme declares which families it needs. On generate the wizard
// calls ensureFonts(theme.fonts) — returns a Promise that resolves once
// the requested families are registered. Already-loaded families are
// cached in-memory; the network is only hit once per family per page
// load.
//
// To refresh URLs (Google bumps a font's version):
//   curl -L -H "User-Agent: Mozilla/4.0" "https://fonts.googleapis.com/css?family=…"
// then copy the .ttf URLs from the @font-face src declarations. The
// IE-like User-Agent triggers the legacy TTF-serving codepath.

(function () {
  if (typeof window === 'undefined') return;

  // ── Family definitions ────────────────────────────────────────────
  // Each family maps the four pdfmake slots (normal/bold/italics/
  // bolditalics) to a unique vfs filename and the upstream TTF URL.
  // Where a family ships no italic (Inter Tight variable), italic
  // slots fall back to the regular weight and pdfmake synthesises an
  // oblique slant in-place — not perfect, but readable.

  const FAMILIES = {
    // Editorial serif — D1, D4, D5, D10
    Cormorant: {
      normal:      { file: 'Cormorant-Regular.ttf',      url: 'https://fonts.gstatic.com/s/cormorantgaramond/v21/co3smX5slCNuHLi8bLeY9MK7whWMhyjYrGFEsdtdc62E6zd58jD-iNM5.ttf' },
      bold:        { file: 'Cormorant-Medium.ttf',       url: 'https://fonts.gstatic.com/s/cormorantgaramond/v21/co3smX5slCNuHLi8bLeY9MK7whWMhyjYrGFEsdtdc62E6zd5wDD-iNM5.ttf' },
      italics:     { file: 'Cormorant-Italic.ttf',       url: 'https://fonts.gstatic.com/s/cormorantgaramond/v21/co3umX5slCNuHLi8bLeY9MK7whWMhyjypVO7abI26QOD_v86KnTOjw.ttf' },
      bolditalics: { file: 'Cormorant-MediumItalic.ttf', url: 'https://fonts.gstatic.com/s/cormorantgaramond/v21/co3umX5slCNuHLi8bLeY9MK7whWMhyjypVO7abI26QOD_s06KnTOjw.ttf' },
    },
    // Workhorse sans — almost every theme touches it. Inter's variable
    // file has no italic axis; both italic slots reuse the upright.
    Inter: {
      normal:      { file: 'Inter-Regular.ttf',  url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf' },
      bold:        { file: 'Inter-SemiBold.ttf', url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.ttf' },
      italics:     { file: 'Inter-Regular.ttf',  url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf' },
      bolditalics: { file: 'Inter-SemiBold.ttf', url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.ttf' },
    },
    // Mono for code-y treatments — D1, D2, D6
    JetBrainsMono: {
      normal:      { file: 'JetBrainsMono-Regular.ttf',      url: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDba2o-flEEny0FZhsfKu5WU4xD-IQ-PuZJJXxfpAO-LfmOXmac.ttf' },
      bold:        { file: 'JetBrainsMono-Medium.ttf',       url: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDba2o-flEEny0FZhsfKu5WU4xD-IQ-PuZJJXxfpAO-5fmOXmac.ttf' },
      italics:     { file: 'JetBrainsMono-Italic.ttf',       url: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxTOlOQ.ttf' },
      bolditalics: { file: 'JetBrainsMono-MediumItalic.ttf', url: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8-qxTOlOQ.ttf' },
    },
    // Didone for D8 Broadsheet — masthead, drop cap, large display
    Playfair: {
      normal:      { file: 'Playfair-Regular.ttf',     url: 'https://fonts.gstatic.com/s/playfairdisplay/v40/nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_qiTXtHA_A.ttf' },
      bold:        { file: 'Playfair-Black.ttf',       url: 'https://fonts.gstatic.com/s/playfairdisplay/v40/nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_gGUXtHA_A.ttf' },
      italics:     { file: 'Playfair-Italic.ttf',      url: 'https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtY.ttf' },
      bolditalics: { file: 'Playfair-BlackItalic.ttf', url: 'https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKfsunDXbtY.ttf' },
    },
  };

  // ── In-memory cache: family-name → Promise<true> once registered ──
  const familyState = {};

  function fetchBase64(url) {
    return fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`Font fetch failed: ${r.status} ${url}`);
        return r.arrayBuffer();
      })
      .then(buf => {
        // ArrayBuffer → binary string → btoa. Done in chunks to stay
        // off the call-stack limit on large TTFs.
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
      });
  }

  function loadFamily(name) {
    if (familyState[name]) return familyState[name];
    const def = FAMILIES[name];
    if (!def) {
      console.warn(`[expFonts] unknown family: ${name}`);
      return Promise.resolve(false);
    }
    if (!window.pdfMake) {
      return Promise.reject(new Error('pdfMake not loaded — call ensurePdfMake first'));
    }

    // Collect unique files (some families dedupe italics → normal).
    const uniqFiles = {};
    Object.values(def).forEach(slot => { uniqFiles[slot.file] = slot.url; });

    familyState[name] = Promise.all(
      Object.entries(uniqFiles).map(([file, url]) =>
        fetchBase64(url).then(b64 => {
          window.pdfMake.vfs = window.pdfMake.vfs || {};
          window.pdfMake.vfs[file] = b64;
        })
      )
    ).then(() => {
      // Register the family with pdfmake. Note pdfMake.fonts may have
      // been pre-populated by vfs_fonts.js with the default Roboto
      // entry — we merge into it.
      window.pdfMake.fonts = window.pdfMake.fonts || {};
      window.pdfMake.fonts[name] = {
        normal:      def.normal.file,
        bold:        def.bold.file,
        italics:     def.italics.file,
        bolditalics: def.bolditalics.file,
      };
      // Roboto must remain registered for any docDef that doesn't
      // pick a font (pdfmake defaults to it). vfs_fonts.js handles
      // that on first load.
      return true;
    }).catch(err => {
      // On failure, drop the cached promise so a retry can succeed.
      delete familyState[name];
      console.error(`[expFonts] failed to load ${name}:`, err);
      throw err;
    });

    return familyState[name];
  }

  // Public API: ensure a list of family names is registered with
  // pdfmake. Resolves once every requested family is ready (or has
  // failed — partial success is treated as a hard error so the
  // wizard surfaces it).
  function ensureFonts(names) {
    if (!names || !names.length) return Promise.resolve();
    return Promise.all(names.map(loadFamily)).then(() => undefined);
  }

  // For diagnostics
  function isLoaded(name) {
    return !!(window.pdfMake && window.pdfMake.fonts && window.pdfMake.fonts[name]);
  }

  window.expFonts = {
    ensureFonts,
    isLoaded,
    FAMILIES,
  };
})();
