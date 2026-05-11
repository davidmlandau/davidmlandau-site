/* ============================================================
   article-visuals.js — Lightweight food-tech animations
   Each visual stays ingredient / food industry focused.
   ============================================================ */

(function () {
  function visual(type, variant, inner) {
    return '<div class="food-visual food-visual--' + variant + ' food-visual--' + type + '" aria-hidden="true">' + inner + '</div>';
  }

  function retail(variant) {
    return visual('retail', variant,
      '<span class="fv-shelf fv-shelf--top"></span>' +
      '<span class="fv-shelf fv-shelf--mid"></span>' +
      '<span class="fv-pack fv-pack--preserve"></span>' +
      '<span class="fv-pack fv-pack--colour"></span>' +
      '<span class="fv-pack fv-pack--aroma"></span>' +
      '<span class="fv-grain fv-grain--1"></span>' +
      '<span class="fv-grain fv-grain--2"></span>' +
      '<span class="fv-grain fv-grain--3"></span>' +
      '<span class="fv-orbit"></span>'
    );
  }

  function fermentation(variant) {
    return visual('fermentation', variant,
      '<span class="fv-jar"></span>' +
      '<span class="fv-liquid"></span>' +
      '<span class="fv-bubble fv-bubble--1"></span>' +
      '<span class="fv-bubble fv-bubble--2"></span>' +
      '<span class="fv-bubble fv-bubble--3"></span>' +
      '<span class="fv-bubble fv-bubble--4"></span>' +
      '<span class="fv-cell fv-cell--1"></span>' +
      '<span class="fv-cell fv-cell--2"></span>' +
      '<span class="fv-cell fv-cell--3"></span>' +
      '<span class="fv-sparkline"></span>'
    );
  }

  function masking(variant) {
    return visual('masking', variant,
      '<span class="fv-wave fv-wave--bitter"></span>' +
      '<span class="fv-wave fv-wave--aroma"></span>' +
      '<span class="fv-wave fv-wave--soft"></span>' +
      '<span class="fv-note fv-note--1"></span>' +
      '<span class="fv-note fv-note--2"></span>' +
      '<span class="fv-note fv-note--3"></span>' +
      '<span class="fv-mask-ring"></span>' +
      '<span class="fv-droplet fv-droplet--1"></span>' +
      '<span class="fv-droplet fv-droplet--2"></span>'
    );
  }

  function coatings(variant) {
    return visual('coatings', variant,
      '<span class="fv-fry fv-fry--1"></span>' +
      '<span class="fv-fry fv-fry--2"></span>' +
      '<span class="fv-fry fv-fry--3"></span>' +
      '<span class="fv-coating-stream"></span>' +
      '<span class="fv-oil-dot fv-oil-dot--1"></span>' +
      '<span class="fv-oil-dot fv-oil-dot--2"></span>' +
      '<span class="fv-oil-dot fv-oil-dot--3"></span>' +
      '<span class="fv-crisp fv-crisp--1"></span>' +
      '<span class="fv-crisp fv-crisp--2"></span>'
    );
  }

  function inquisition(variant) {
    return visual('inquisition', variant,
      '<span class="fv-echip fv-echip--1">E300</span>' +
      '<span class="fv-echip fv-echip--2">E322</span>' +
      '<span class="fv-echip fv-echip--3">E500</span>' +
      '<span class="fv-scale"></span>' +
      '<span class="fv-pillar fv-pillar--dose"></span>' +
      '<span class="fv-pillar fv-pillar--function"></span>' +
      '<span class="fv-pillar fv-pillar--science"></span>' +
      '<span class="fv-molecule fv-molecule--1"></span>' +
      '<span class="fv-molecule fv-molecule--2"></span>'
    );
  }

  const map = {
    'retail-discreet-allies': retail,
    'natural-preservation-fermentation': fermentation,
    'masking-agents-sensory-performance': masking,
    'coatings-21st-century': coatings,
    'new-inquisitors-e-numbers': inquisition
  };

  window.dlArticleVisual = function (id, variant) {
    const maker = map[id] || retail;
    return maker(variant === 'mini' ? 'mini' : 'hero');
  };
})();
