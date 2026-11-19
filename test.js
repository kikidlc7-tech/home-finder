// Pruebas: node test.js
const fs=require('fs');const {calcularEtiquetasPrecio}=require('./price-tags.js');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const PROPS=eval(html.match(/var PROPERTIES = (\[[\s\S]*?\n  \]);/)[1]);
const r=calcularEtiquetasPrecio(PROPS);
PROPS.forEach(p=>{const e=r[p.id];console.log(`#${p.id} ${p.titulo} (${p.zona}) | $/m2=${e.precioM2?Math.round(e.precioM2):'-'} | prom=${e.promedioComparables?Math.round(e.promedioComparables):'-'} | n=${e.numComparables} | ${e.diferenciaPct===null?'':e.diferenciaPct+'% |'} ${e.etiqueta||'(sin etiqueta) '+e.motivo}`)});
