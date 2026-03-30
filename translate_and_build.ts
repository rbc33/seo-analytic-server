import fs from 'fs';

const data = JSON.parse(fs.readFileSync('../client/src/data/raw_reports.json', 'utf8'));

// Dictionaries
const dict: Record<string, string> = {
  // Category names
  'Meta Tags': 'Etiquetas Meta',
  'Headings': 'Encabezados',
  'Content': 'Contenido',
  'Images': 'Imágenes',
  'Links': 'Enlaces',
  'Technical SEO': 'SEO Técnico',
  'Social Signals': 'Señales Sociales',
  'Backlinks': 'Backlinks',

  // Check names
  'Title tag': 'Etiqueta Title',
  'Meta description': 'Meta description',
  'Viewport meta tag': 'Etiqueta Viewport',
  'Open Graph tags': 'Etiquetas Open Graph',
  'Canonical URL': 'URL Canónica',
  'H1 tag present': 'H1 presente',
  'Single H1 tag': 'Un solo H1',
  'H2 tags present': 'H2 presentes',
  'Heading hierarchy': 'Jerarquía de encabezados',
  'Minimum content (300+ words)': 'Contenido mínimo (300+ palabras)',
  'Rich content (1000+ words)': 'Contenido rico (1000+ palabras)',
  'Text/HTML ratio >15%': 'Ratio Texto/HTML >15%',
  'Paragraph tags present': 'Etiquetas de párrafo (<p>)',
  'Images present': 'Imágenes presentes',
  'Images have alt text': 'Imágenes con texto alternativo (alt)',
  'Internal links': 'Enlaces internos',
  'External links': 'Enlaces externos',
  'No generic anchor text': 'Sin anchor text genérico',
  'HTTPS': 'HTTPS',
  'Language attribute': 'Atributo de idioma',
  'Structured data (JSON-LD)': 'Datos estructurados (JSON-LD)',
  'Not blocking search indexing': 'No bloquea indexación',
  'robots.txt accessible': 'robots.txt accesible',
  'XML Sitemap': 'Sitemap XML',
  'DOM size': 'Tamaño del DOM',
  'YouTube link': 'Enlace a YouTube',
  'X (Twitter) link': 'Enlace a X (Twitter)',
  'LinkedIn link': 'Enlace a LinkedIn',
  'Instagram link': 'Enlace a Instagram',
  'Facebook link': 'Enlace a Facebook',
  'Domain PageRank': 'PageRank del Dominio'
};

const regexDict: Array<[RegExp, string]> = [
  [/Missing title tag/ig, 'Falta la etiqueta de título'],
  [/Title is too short \((.*?)\)\. Aim for (.*?) characters that clearly describe the page\./ig, 'El título es demasiado corto ($1). Intenta usar de $2 caracteres para describir la página clara.'],
  [/Title is too long \((.*?)\)\. Trim it to under (.*?) characters/ig, 'El título es muy largo ($1). Recórtalo a menos de $2 caracteres'],
  [/Add a \<title\> tag/ig, 'Añade una etiqueta <title>'],
  [/Missing meta description/ig, 'Falta la meta description'],
  [/Add <meta name="description" content="…">/ig, 'Añade <meta name="description" content="…">'],
  [/Description is too short \((.*?)\)/ig, 'La descripción es muy corta ($1)'],
  [/Description is too long \((.*?)\)/ig, 'La descripción es muy larga ($1)'],
  [/Missing or incorrect viewport tag/ig, 'Falta la etiqueta viewport o es incorrecta'],
  [/Add <meta name="viewport"/ig, 'Añade <meta name="viewport"'],
  [/Found (.*?)\/3 OG tags/ig, 'Encontramos $1/3 etiquetas OG'],
  [/No Open Graph tags found/ig, 'No se encontraron etiquetas Open Graph'],
  [/Add Open Graph meta tags/ig, 'Agrega etiquetas meta de Open Graph para redes sociales'],
  [/No canonical URL specified/ig, 'No hay URL canónica especificada'],
  [/Add <link rel="canonical"/ig, 'Agrega <link rel="canonical"'],
  [/No H1 tag found/ig, 'No se encontró etiqueta H1'],
  [/No H1 found/ig, 'No se encontró H1'],
  [/Exactly one H1 tag/ig, 'Exactamente una etiqueta H1'],
  [/Multiple H1 tags found/ig, 'Múltiples etiquetas H1 encontradas'],
  [/(.*?) H2 tag\(s\) found/ig, '$1 etiqueta(s) H2 encontradas'],
  [/No H2 tags found/ig, 'No se encontraron etiquetas H2'],
  [/Heading levels follow proper order/ig, 'Jerarquía correcta de encabezados'],
  [/Heading levels skip ranks/ig, 'Los niveles de encabezado se saltan rangos'],
  [/(.*?) words detected/ig, '$1 palabras detectadas'],
  [/(.*?) words \(1000\+ recommended for in-depth content\)/ig, '$1 palabras (1000+ recomendado)'],
  [/(.*?)% text-to-HTML ratio/ig, 'Ratio texto/HTML de $1%'],
  [/(.*?) <p> tag\(s\) found/ig, '$1 etiquetas <p> encontradas'],
  [/(.*?) image\(s\) found/ig, '$1 imágenes encontradas'],
  [/No images found/ig, 'No se encontraron imágenes'],
  [/All (.*?) images have alt text/ig, 'Todas las $1 imágenes tienen atributo alt'],
  [/(.*?)\/(.*?) images have alt text/ig, '$1 de $2 imágenes tienen atributo alt'],
  [/(.*?) internal link\(s\)/ig, '$1 enlaces internos'],
  [/(.*?) external link\(s\)/ig, '$1 enlaces externos'],
  [/No generic anchor text found/ig, 'No se encontró texto ancla genérico (ej. "clic aquí")'],
  [/(.*?) generic anchor text\(s\) found/ig, '$1 textos ancla genéricos encontrados'],
  [/Site uses HTTPS/ig, 'El sitio usa HTTPS'],
  [/Site does not use HTTPS/ig, 'El sitio no usa HTTPS'],
  [/No lang attribute on \<html\>/ig, 'No hay atributo lang en la etiqueta <html>'],
  [/(.*?) JSON-LD block\(s\) found/ig, '$1 bloques JSON-LD encontrados'],
  [/No JSON-LD structured data found/ig, 'No hay datos estructurados (JSON-LD)'],
  [/Page is blocking search indexing \(noindex\)/ig, 'La página bloquea indexación (noindex)'],
  [/No indexing restrictions found/ig, 'No hay restricciones de indexación'],
  [/robots\.txt found and accessible/ig, 'Archivo robots.txt accesible'],
  [/robots\.txt not found or not accessible/ig, 'Archivo robots.txt inaccesible'],
  [/XML sitemap found(.*)/ig, 'Sitemap XML encontrado'],
  [/No XML sitemap found/ig, 'Sitemap XML no encontrado'],
  [/(.*?) DOM elements \(recommended(.*)\)/ig, '$1 elementos DOM (menos de 1500 recomendado)'],
  [/(.*?) link found/ig, 'Enlace a red social encontrado'],
  [/No (.*?) link found/ig, 'No se encontraron enlaces para $1'],
  [/Could not retrieve PageRank/ig, 'No logramos recuperar datos de PageRank']
];

function translate(text: string): string {
  if (!text) return text;
  let translated = dict[text] || text;
  
  if (translated === text) {
    for (const [regex, replacement] of regexDict) {
      if (regex.test(translated)) {
        translated = translated.replace(regex, replacement);
        break;
      }
    }
  }
  return translated;
}

// Convert
const reportsEn = JSON.parse(JSON.stringify(data));
const reportsEs = JSON.parse(JSON.stringify(data));

reportsEs.forEach((report: any) => {
  report.categories.forEach((cat: any) => {
    cat.name = dict[cat.name] || cat.name;
    cat.checks.forEach((chk: any) => {
      chk.name = dict[chk.name] || chk.name;
      chk.details = translate(chk.details);
      chk.howToFix = translate(chk.howToFix);
    });
  });
});

const fileStr = `import { SEOResult } from '../types';
import { Lang } from '../i18n';

export const predefinedReports: Record<Lang, SEOResult[]> = {
  en: ${JSON.stringify(reportsEn, null, 2)},
  es: ${JSON.stringify(reportsEs, null, 2)}
};
`;

fs.writeFileSync('../client/src/data/reports.ts', fileStr);
console.log('Done!');
