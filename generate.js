// ========== IMPORTS ==========
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const crypto = require('crypto');
const sharp = require('sharp');

// ========== CONFIGURACIÓN ==========
const NEWS_BASE_DIR = __dirname;
const OUTPUT_HTML_DIR = path.join(__dirname, 'news');
const DOMAIN = 'https://www.revistacienciasestudiantes.com';
const JOURNAL_NAME_ES = 'Revista Nacional de las Ciencias para Estudiantes';
const JOURNAL_NAME_EN = 'The National Review of Sciences for Students';
const LOGO_ES = 'https://www.revistacienciasestudiantes.com/assets/logo.png';
const LOGO_EN = 'https://www.revistacienciasestudiantes.com/logoEN.png';

// Asegurar directorios
if (!fs.existsSync(OUTPUT_HTML_DIR)) {
  fs.mkdirSync(OUTPUT_HTML_DIR, { recursive: true });
}

const IMAGES_DIR = path.join(__dirname, 'images', 'news');
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// ========== UTILIDADES ==========
function generateSlug(text) {
  if (!text) return '';
  let slug = text.toLowerCase();
  slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  slug = slug.replace(/\.(?=[a-z]|\s)/g, '-');
  slug = slug.replace(/[^a-z0-9]+/g, '-');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-+|-+$/g, '');
  return slug;
}

function generateAuthorSlug(authorName) {
  return generateSlug(authorName);
}

function formatDateEs(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('es-CL', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

function formatDateEn(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    year: 'numeric' 
  });
}

function formatLongDateEs(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('es-CL', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
}

function formatLongDateEn(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
}

function base64DecodeUnicode(str) {
  if (!str) return '';
  try {
    const binary = Buffer.from(str, 'base64').toString('binary');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  } catch (err) {
    console.error('Error decoding Base64:', err);
    return '';
  }
}

function isBase64(str) {
  if (!str) return false;
  const base64Regex = /^data:image\/(png|jpe?g|gif|webp);base64,/;
  return base64Regex.test(str);
}

async function processImages(html, slug, lang) {
  if (!html) return '';
  
  const $ = cheerio.load(html);
  const images = $('img');
  
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const src = $(img).attr('src');
    
    if (src && src.startsWith('data:image/')) {
      const base64Data = src.split(';base64,').pop();
      const buffer = Buffer.from(base64Data, 'base64');
      const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 8);
      
      const imgDir = IMAGES_DIR;
      const imgPath = path.join(imgDir, `${slug}-${hash}-${lang}.webp`);
      
      if (!fs.existsSync(imgPath)) {
        await sharp(buffer)
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(imgPath);
        console.log(`  🖼️ Imagen procesada: ${slug}-${hash}-${lang}.webp`);
      }
      
      $(img).attr('src', `/images/news/${slug}-${hash}-${lang}.webp`);
    } else if (src && !src.startsWith('http') && !src.startsWith('/')) {
      $(img).attr('src', `/images/news/${src}`);
    }
  }
  
  // CORRECCIÓN: Extraer solo el contenido del body, no todo el HTML
  return $('body').html() || $.html();
}

// ========== MAPEO DE ÁREAS ==========
const AREAS_MAP = {
  'biologia': { es: 'Biología', en: 'Biology' },
  'quimica': { es: 'Química', en: 'Chemistry' },
  'fisica': { es: 'Física', en: 'Physics' },
  'matematica': { es: 'Matemática', en: 'Mathematics' },
  'computacion': { es: 'Computación', en: 'Computer Science' },
  'astronomia': { es: 'Astronomía', en: 'Astronomy' },
  'geologia': { es: 'Geología', en: 'Geology' },
  'medicina': { es: 'Medicina', en: 'Medicine' },
  'ingenieria': { es: 'Ingeniería', en: 'Engineering' },
  'ciencias_sociales': { es: 'Ciencias Sociales', en: 'Social Sciences' },
  'medio_ambiente': { es: 'Medio Ambiente', en: 'Environment' },
  'neurociencia': { es: 'Neurociencia', en: 'Neuroscience' },
  'logros_estudiantiles': { es: 'Logros Estudiantiles', en: 'Student Achievements' }
};

const CATEGORIES_MAP = {
  'investigacion': { es: 'Investigación', en: 'Research' },
  'descubrimiento': { es: 'Descubrimiento', en: 'Discovery' },
  'evento': { es: 'Evento', en: 'Event' },
  'premio': { es: 'Premio', en: 'Award' },
  'entrevista': { es: 'Entrevista', en: 'Interview' },
  'opinion': { es: 'Opinión', en: 'Opinion' },
  'general': { es: 'General', en: 'General' }
};

// ========== SVG ICONS ==========
const oaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 53" width="24" height="36" style="vertical-align:middle; margin-right:4px;">
  <path fill="#F48120" d="M18 21.3c-8.7 0-15.8 7.1-15.8 15.8S9.3 52.9 18 52.9s15.8-7.1 15.8-15.8S26.7 21.3 18 21.3zm0 25.1c-5.1 0-9.3-4.2-9.3-9.3s4.2-9.3 9.3-9.3 9.3 4.2 9.3 9.3-4.2 9.3-9.3 9.3z"/>
  <path fill="#F48120" d="M18 0c-7.5 0-13.6 6.1-13.6 13.6V23h6.5v-9.4c0-3.9 3.2-7.1 7.1-7.1s7.1 3.2 7.1 7.1V32h6.5V13.6C31.6 6.1 25.5 0 18 0z"/>
  <circle fill="#F48120" cx="18" cy="37.1" r="4.8"/>
</svg>`;

const socialLinks = {
  instagram: 'https://www.instagram.com/revistanacionalcienciae',
  youtube: 'https://www.youtube.com/@RevistaNacionaldelasCienciaspa',
  tiktok: 'https://www.tiktok.com/@revistacienciaestudiante',
  spotify: 'https://open.spotify.com/show/6amsgUkNXgUTD219XpuqOe?si=LPzCNpusQjSLGBq_pPrVTw'
};

const socialIcons = {
  instagram: `<svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
  youtube: `<svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  tiktok: `<svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
  spotify: `<svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.508 17.308c-.221.362-.689.473-1.05.252-2.983-1.823-6.738-2.237-11.162-1.226-.411.094-.823-.162-.917-.573-.094-.412.162-.823.573-.917 4.847-1.108 8.995-.635 12.305 1.386.36.221.472.69.251 1.05zm1.47-3.255c-.278.452-.865.594-1.317.316-3.414-2.098-8.62-2.706-12.657-1.479-.508.154-1.04-.136-1.194-.644-.154-.508.136-1.04.644-1.194 4.613-1.399 10.366-.719 14.256 1.67.452.278.594.865.316 1.317zm.126-3.374C14.653 7.64 7.29 7.394 3.05 8.681c-.604.183-1.246-.166-1.429-.77-.183-.604.166-1.246.77-1.429 4.883-1.482 13.014-1.201 18.238 1.902.544.323.72 1.034.397 1.578-.323.544-1.034.72-1.578.397z"/></svg>`
};

// ========== FUNCIÓN PARA CALCULAR TIEMPO DE LECTURA ==========
function calculateReadingTime(html, wordsPerMinute = 200) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return {
    minutes,
    wordCount,
    display: minutes === 1 ? '1 minuto' : `${minutes} minutos`
  };
}

// ========== FUNCIÓN PRINCIPAL ==========
async function generateNews() {
  console.log('🚀 Iniciando generación de noticias científicas estáticas...');
  console.log('📁 Directorio raíz:', __dirname);
  
  try {
    const indexPath = path.join(__dirname, 'index.json');
    console.log('🔍 Buscando índice en:', indexPath);
    
    if (!fs.existsSync(indexPath)) {
      throw new Error(`No se encuentra ${indexPath}`);
    }
    
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const years = Object.keys(indexData.years || {});
    console.log(`📊 Años encontrados: ${years.length}`);
    console.log(`📋 Años disponibles: ${years.join(', ')}`);
    
    const allNews = [];
    
    for (const year of years) {
      const yearData = indexData.years[year];
      const yearJsonPath = path.join(__dirname, year, yearData.json_file);
      
      console.log(`🔍 Buscando noticias del año ${year} en: ${yearJsonPath}`);
      
      if (fs.existsSync(yearJsonPath)) {
        const yearNewsData = JSON.parse(fs.readFileSync(yearJsonPath, 'utf8'));
        const yearNews = yearNewsData.news || yearNewsData;
        
        yearNews.forEach(newsItem => {
          allNews.push({
            ...newsItem,
            year: year
          });
        });
        
        console.log(`📄 Año ${year}: ${yearNews.length} noticias cargadas`);
      } else {
        console.warn(`⚠️ No se encontró ${yearJsonPath}`);
        const alternativePaths = [
          path.join(__dirname, year, `news-${year}.json`),
          path.join(__dirname, year, 'news.json'),
          path.join(__dirname, 'data', year, `news-${year}.json`)
        ];
        
        for (const altPath of alternativePaths) {
          if (fs.existsSync(altPath)) {
            console.log(`✅ Encontrado en ruta alternativa: ${altPath}`);
            const yearNewsData = JSON.parse(fs.readFileSync(altPath, 'utf8'));
            const yearNews = yearNewsData.news || yearNewsData;
            
            yearNews.forEach(newsItem => {
              allNews.push({
                ...newsItem,
                year: year
              });
            });
            
            console.log(`📄 Año ${year}: ${yearNews.length} noticias cargadas (ruta alternativa)`);
            break;
          }
        }
      }
    }
    
    console.log(`📚 Total noticias: ${allNews.length}`);
    
    if (allNews.length === 0) {
      console.warn('⚠️ No se encontraron noticias. Verifica la estructura de carpetas.');
      return;
    }
    
    allNews.sort((a, b) => {
      const dateA = new Date(a.metadata?.createdAt || a.fecha || 0);
      const dateB = new Date(b.metadata?.createdAt || b.fecha || 0);
      return dateB - dateA;
    });

    console.log('📝 Generando HTML para cada noticia...');
    for (const newsItem of allNews) {
      await generateNewsHtml(newsItem);
    }

    console.log('📊 Generando índices...');
    generateIndexes(allNews, indexData);

    console.log('🎉 ¡Proceso completado con éxito!');
    console.log(`📁 Archivos HTML generados en: ${OUTPUT_HTML_DIR}`);
    
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

async function generateNewsHtml(item) {
  const titleEs = item.title?.es || item.titulo || '';
  const titleEn = item.title?.en || item.title || titleEs;
  const bodyEs = item.content?.es || item.cuerpo || '';
  const bodyEn = item.content?.en || item.content || bodyEs;
  const authorName = item.author?.name || 'Redacción Editorial';
  const authorSlug = generateAuthorSlug(authorName);
  const areaId = item.area_id || 'general';
  const areaInfo = AREAS_MAP[areaId] || { es: areaId, en: areaId };
  const categoryId = item.category || 'general';
  const categoryInfo = CATEGORIES_MAP[categoryId] || { es: categoryId, en: categoryId };
  const tags = item.tags || [];
  const photoUrl = item.photo || '';
  const featured = item.featured || false;
  const createdAt = item.metadata?.createdAt || item.fecha || new Date().toISOString();
  const slug = item.slug || generateSlug(`${titleEs} ${createdAt}`);
  
  console.log(`📝 Procesando: ${titleEs} (${slug})`);
  console.log(`   Autor: ${authorName} (${authorSlug})`);
  console.log(`   Área: ${areaInfo.es} | Categoría: ${categoryInfo.es}`);

  const processedBodyEs = await processImages(bodyEs, slug, 'es');
  const processedBodyEn = await processImages(bodyEn, slug, 'en');

  // ========== HTML ESPAÑOL ==========
  const headerImageHtmlEs = photoUrl
    ? `<figure class="article-hero">
         <img src="${photoUrl}" alt="${titleEs}" style="width: 100%; height: auto; display: block;">
         <figcaption>${areaInfo.es} • ${categoryInfo.es}${featured ? ' • Destacada' : ''}</figcaption>
       </figure>`
    : '';

  const htmlContentEs = generateNewsHtmlTemplate({
    lang: 'es',
    title: titleEs,
    content: processedBodyEs,
    fecha: createdAt,
    slug,
    headerImageHtml: headerImageHtmlEs,
    domain: DOMAIN,
    oaSvg,
    journalName: JOURNAL_NAME_ES,
    logo: LOGO_ES,
    authorName,
    authorSlug,
    areaInfo,
    categoryInfo,
    tags,
    featured,
    socialLinks,
    socialIcons
  });

  const filePathEs = path.join(OUTPUT_HTML_DIR, `${slug}.html`);
  fs.writeFileSync(filePathEs, htmlContentEs, 'utf8');
  console.log(`  ✅ Español: ${slug}.html`);

  // ========== HTML INGLÉS ==========
  const headerImageHtmlEn = photoUrl
    ? `<figure class="article-hero">
         <img src="${photoUrl}" alt="${titleEn}" style="width: 100%; height: auto; display: block;">
         <figcaption>${areaInfo.en} • ${categoryInfo.en}${featured ? ' • Featured' : ''}</figcaption>
       </figure>`
    : '';

  const htmlContentEn = generateNewsHtmlTemplate({
    lang: 'en',
    title: titleEn,
    content: processedBodyEn,
    fecha: createdAt,
    slug,
    headerImageHtml: headerImageHtmlEn,
    domain: DOMAIN,
    oaSvg,
    journalName: JOURNAL_NAME_EN,
    logo: LOGO_EN,
    authorName,
    authorSlug,
    areaInfo,
    categoryInfo,
    tags,
    featured,
    socialLinks,
    socialIcons
  });

  const filePathEn = path.join(OUTPUT_HTML_DIR, `${slug}.EN.html`);
  fs.writeFileSync(filePathEn, htmlContentEn, 'utf8');
  console.log(`  ✅ Inglés: ${slug}.EN.html`);
}

function generateNewsHtmlTemplate({
  lang,
  title,
  content,
  fecha,
  slug,
  headerImageHtml,
  domain,
  oaSvg,
  journalName,
  logo,
  authorName,
  authorSlug,
  areaInfo,
  categoryInfo,
  tags,
  featured,
  socialLinks,
  socialIcons
}) {
  const isSpanish = lang === 'es';
  const readingTime = calculateReadingTime(content);
  
  const texts = {
    es: {
      backToNews: 'Volver a Noticias',
      submit: 'Envíos',
      home: 'Home',
      news: 'Noticias',
      article: 'NOTICIA',
      by: 'Por',
      readingTime: 'tiempo de lectura',
      citation: 'Citación sugerida',
      tags: 'Etiquetas',
      newsletterTitle: 'Suscríbete al Boletín',
      newsletterText: 'Un resumen esencial de noticias científicas, opinión y análisis, entregado en tu bandeja de entrada.',
      newsletterPlaceholder: 'Tu correo electrónico',
      newsletterBtn: 'Suscribirse',
      listen: 'Escuchar noticia',
      stop: 'Detener',
      footerDesc: 'Publicación oficial dedicada a la divulgación e investigación científica desarrollada por estudiantes.',
      privacy: 'Política de Privacidad',
      terms: 'Términos de Uso',
      contact: 'Contacto',
      featured: 'Destacado'
    },
    en: {
      backToNews: 'Back to News',
      submit: 'Submit',
      home: 'Home',
      news: 'News',
      article: 'NEWS',
      by: 'By',
      readingTime: 'read time',
      citation: 'Suggested citation',
      tags: 'Tags',
      newsletterTitle: 'Sign up to the Briefing',
      newsletterText: 'An essential round-up of science news, opinion and analysis, delivered to your inbox.',
      newsletterPlaceholder: 'Your email address',
      newsletterBtn: 'Sign Up',
      listen: 'Listen to article',
      stop: 'Stop',
      footerDesc: 'Official publication dedicated to science outreach and research developed by students.',
      privacy: 'Privacy Policy',
      terms: 'Terms of Use',
      contact: 'Contact Us',
      featured: 'Featured'
    }
  };

  const t = texts[lang];

  // SVG elegante para destacado
  const featuredSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" style="vertical-align: middle; margin-right: 4px;">
    <path fill="#f59e0b" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <meta name="description" content="${title.substring(0, 160)}">
  <meta name="keywords" content="${tags.join(', ')}, ${isSpanish ? 'noticias, revista ciencias estudiantes, divulgación científica' : 'news, student science journal, scientific outreach'}">
  <meta name="author" content="${authorName}">
  <meta name="article:author" content="${authorName}">
  <meta name="article:section" content="${isSpanish ? areaInfo.es : areaInfo.en}">
  <meta name="article:tag" content="${tags.join(', ')}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${title.substring(0, 160)}">
  <meta property="og:url" content="${domain}/news/${slug}${isSpanish ? '' : '.EN'}.html">
  <meta property="og:type" content="article">
  <meta property="og:article:author" content="${authorName}">
  <meta property="og:article:section" content="${isSpanish ? areaInfo.es : areaInfo.en}">
  <meta property="og:article:tag" content="${tags.join(', ')}">
  <meta property="article:published_time" content="${fecha}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="language" content="${lang}">
  <title>${title} - ${isSpanish ? 'Noticias' : 'News'} - ${journalName}</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  
  <style>
    :root {
      --nyt-black: #0f172a;
      --text-main: #111111;
      --text-body: #202020;
      --text-muted: #64748b;
      --border-light: #e2e8f0;
      --border-dark: #cbd5e1;
      --border-heavy: #0f172a;
      --bg-site: #fcfcfc;
      --bg-sidebar: #f8fafc;
      --accent-color: #ea580c;
      --link-color: #0369a1;
      --open-access: #f97316;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Lora', serif;
      color: var(--text-body);
      background-color: var(--bg-site);
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    .progress-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: transparent;
      z-index: 1001;
    }
    .progress-bar {
      height: 3px;
      background: linear-gradient(90deg, var(--accent-color), #f59e0b);
      width: 0%;
      transition: width 0.1s ease;
    }

    .site-header {
      border-top: 4px solid var(--border-heavy);
      border-bottom: 1px solid var(--border-light);
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .nav-minimal {
      max-width: 1200px;
      margin: 0 auto;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: 'Inter', sans-serif;
    }
    .nav-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: var(--nyt-black);
    }
    .nav-logo-img {
      height: 32px;
      width: auto;
    }
    .nav-logo-text {
      font-weight: 800;
      font-size: 0.9rem;
      letter-spacing: -0.02em;
      border-left: 1px solid var(--border-light);
      padding-left: 12px;
    }
    .nav-links {
      display: flex;
      gap: 2rem;
      align-items: center;
    }
    .nav-link {
      text-decoration: none;
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: color 0.2s;
    }
    .nav-link:hover {
      color: var(--nyt-black);
    }

    .layout-container {
      max-width: 1200px;
      margin: 40px auto;
      padding: 0 20px;
      display: grid;
      grid-template-columns: minmax(0, 8fr) minmax(0, 4fr);
      gap: 60px;
    }
    @media (max-width: 900px) {
      .layout-container {
        grid-template-columns: 1fr;
        gap: 40px;
      }
    }

    .article-header {
      margin-bottom: 30px;
    }
    .article-breadcrumbs {
      font-family: 'Inter', sans-serif;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 25px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .article-breadcrumbs a {
      color: var(--text-muted);
      text-decoration: none;
    }
    .article-breadcrumbs a:hover {
      text-decoration: underline;
    }
    .article-kicker {
      font-family: 'Inter', sans-serif;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
      color: var(--nyt-black);
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .article-kicker time {
      color: var(--text-muted);
      font-weight: 500;
    }
    .kicker-divider {
      color: var(--border-dark);
    }
    .article-title {
      font-family: 'Merriweather', serif;
      font-size: clamp(2rem, 4vw, 3.25rem);
      line-height: 1.15;
      font-weight: 900;
      color: var(--nyt-black);
      margin-bottom: 20px;
      letter-spacing: -0.01em;
    }
    .article-author-line {
      font-family: 'Inter', sans-serif;
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 20px;
    }
    .article-author-line a {
      color: var(--link-color);
      text-decoration: none;
      font-weight: 600;
    }
    .article-author-line a:hover {
      text-decoration: underline;
    }
    .article-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-top: 1px solid var(--border-light);
      border-bottom: 1px solid var(--border-light);
      margin-bottom: 30px;
    }
    .share-group {
      display: flex;
      gap: 8px;
    }
    .share-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid var(--border-dark);
      background: #fff;
      color: var(--nyt-black);
      cursor: pointer;
      transition: all 0.2s;
    }
    .share-btn:hover {
      background: var(--bg-sidebar);
      border-color: var(--nyt-black);
    }
    .share-btn svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
    .meta-badges {
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: 'Inter', sans-serif;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .oa-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--open-access);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .article-hero {
      margin-bottom: 40px;
    }
    .article-hero img {
      width: 100%;
      height: auto;
      display: block;
      background: var(--bg-sidebar);
    }
    .article-hero figcaption {
      font-family: 'Inter', sans-serif;
      font-size: 0.8rem;
      color: var(--text-muted);
      padding: 12px 0;
      line-height: 1.5;
      border-bottom: 1px solid var(--border-light);
    }

    .article-body {
      font-size: 1.15rem;
    }
    .article-body p {
      margin-bottom: 1.75rem;
    }
    .article-body > p:first-of-type::first-letter {
      float: left;
      font-family: 'Merriweather', serif;
      font-size: 4.5rem;
      line-height: 3.5rem;
      padding-top: 4px;
      padding-right: 8px;
      font-weight: 900;
      color: var(--nyt-black);
    }
    .article-body h2 {
      font-family: 'Merriweather', serif;
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--nyt-black);
      margin: 2.5rem 0 1rem 0;
    }
    .article-body h3 {
      font-family: 'Merriweather', serif;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--nyt-black);
      margin: 2rem 0 1rem 0;
    }
    .article-body a {
      color: var(--link-color);
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 3px;
    }
    .article-body blockquote {
      margin: 2.5rem 0;
      padding: 0 0 0 1.5rem;
      border-left: 3px solid var(--nyt-black);
      font-style: italic;
      font-size: 1.25rem;
      color: #334155;
    }
    .article-body img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 2rem auto;
    }
    .article-body ul, .article-body ol {
      margin: 1.5rem 0 1.5rem 1.5rem;
    }
    .article-body li {
      margin-bottom: 0.75rem;
    }

    .sidebar-section {
      margin-bottom: 40px;
      border-top: 2px solid var(--nyt-black);
      padding-top: 15px;
    }
    .sidebar-title {
      font-family: 'Inter', sans-serif;
      font-size: 0.85rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--nyt-black);
      margin-bottom: 20px;
    }
    .subject-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .subject-tag {
      font-family: 'Inter', sans-serif;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--link-color);
      background: #f0f7ff;
      padding: 6px 12px;
      border-radius: 2px;
      text-decoration: none;
    }
    .newsletter-box {
      background: var(--bg-sidebar);
      border: 1px solid var(--border-light);
      padding: 24px;
    }
    .newsletter-box h4 {
      font-family: 'Merriweather', serif;
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--nyt-black);
      margin-bottom: 10px;
    }
    .newsletter-box p {
      font-family: 'Inter', sans-serif;
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .newsletter-input {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border-dark);
      margin-bottom: 10px;
      outline: none;
      font-family: 'Inter', sans-serif;
    }
    .newsletter-btn {
      width: 100%;
      padding: 10px;
      background: var(--nyt-black);
      color: #fff;
      border: none;
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
    }
    .newsletter-btn:hover {
      background: var(--accent-color);
    }

    .audio-player-editorial {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
      background: #fff;
      border: 1px solid var(--nyt-black);
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: 'Inter', sans-serif;
      border-radius: 4px;
    }
    .audio-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .audio-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid var(--border-dark);
      background: transparent;
      color: var(--nyt-black);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .audio-btn:hover {
      background: var(--bg-sidebar);
      border-color: var(--nyt-black);
    }
    .audio-btn svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
    .audio-info {
      display: flex;
      flex-direction: column;
    }
    .audio-status {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--nyt-black);
    }
    .audio-progress {
      width: 120px;
      height: 2px;
      background: var(--border-light);
      margin-top: 6px;
    }
    .audio-progress-bar {
      height: 100%;
      background: var(--accent-color);
      width: 0%;
      transition: width 0.1s linear;
    }

    .footer {
      border-top: 1px solid var(--border-light);
      background: #fff;
      padding: 60px 20px 40px;
      margin-top: 80px;
      font-family: 'Inter', sans-serif;
    }
    .footer-container {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      border-bottom: 1px solid var(--border-light);
      padding-bottom: 40px;
      margin-bottom: 20px;
    }
    @media (max-width: 768px) {
      .footer-container {
        grid-template-columns: 1fr;
        text-align: center;
      }
    }
    .footer-brand {
      font-family: 'Merriweather', serif;
      font-size: 1.5rem;
      font-weight: 900;
      color: var(--nyt-black);
      margin-bottom: 15px;
    }
    .footer-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
      max-width: 300px;
    }
    .footer-social {
      display: flex;
      gap: 15px;
      margin-top: 20px;
    }
    .footer-social a {
      color: var(--nyt-black);
    }
    .footer-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      max-width: 1200px;
      margin: 0 auto;
      flex-wrap: wrap;
      gap: 15px;
    }
    .footer-bottom-links {
      display: flex;
      gap: 15px;
    }
    .footer-bottom-links a {
      color: var(--text-muted);
      text-decoration: none;
    }
  </style>

  <script>
    window.MathJax = {
      tex: {
        inlineMath: [['\\\\(', '\\\\)']],
        displayMath: [['\\\\[', '\\\\]']],
        processEscapes: true
      },
      options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'] }
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js" id="MathJax-script" async></script>
</head>
<body>
  
  <div class="progress-container">
    <div class="progress-bar" id="progressBar"></div>
  </div>

  <header class="site-header">
    <nav class="nav-minimal">
      <a href="/" class="nav-logo">
        <img src="${logo}" alt="Logo" class="nav-logo-img">
        <span class="nav-logo-text">${journalName}</span>
      </a>
      <div class="nav-links">
        <a href="${isSpanish ? '/news' : '/news/index.EN.html'}" class="nav-link">${t.backToNews}</a>
        <a href="${isSpanish ? '/submit' : '/en/submit'}" class="nav-link">${t.submit}</a>
      </div>
    </nav>
  </header>

  <main class="layout-container">
    
    <article class="article-main">
      <header class="article-header">
        
        <div class="article-breadcrumbs">
          <a href="/">${t.home}</a> 
          <span>›</span> 
          <a href="${isSpanish ? '/news' : '/news/index.EN.html'}">${t.news}</a>
          <span>›</span> 
          <span>${isSpanish ? areaInfo.es : areaInfo.en}</span>
        </div>

        <div class="article-kicker">
          <span>${t.article}</span>
          <span class="kicker-divider">|</span>
          <time>${isSpanish ? formatLongDateEs(fecha) : formatLongDateEn(fecha)}</time>
        </div>

        <h1 class="article-title">${title}</h1>
        
        <div class="article-author-line">
          ${t.by} <a href="${domain}/team/${authorSlug}.html">${authorName}</a>
          ${featured ? ` • <span style="color: #f59e0b;">${featuredSvg} ${t.featured}</span>` : ''}
        </div>

        <div class="article-actions">
          <div class="share-group">
            <button class="share-btn" onclick="shareOnTwitter()" title="Twitter">
              <svg viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
            </button>
            <button class="share-btn" onclick="shareOnFacebook()" title="Facebook">
              <svg viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </button>
            <button class="share-btn" onclick="shareOnLinkedIn()" title="LinkedIn">
              <svg viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            </button>
          </div>
          
          <div class="meta-badges">
            <span class="reading-time-badge">
              ⏱ ${readingTime.display} ${t.readingTime}
            </span>
            <span class="oa-badge" title="Open Access">
              ${oaSvg} OA
            </span>
          </div>
        </div>
      </header>

      ${headerImageHtml}

      <div class="article-body" id="articleContent">
        ${content}
      </div>
      
      <div class="sidebar-section" style="margin-top: 60px;">
        <h3 class="sidebar-title">${t.citation}</h3>
        <p style="font-family: 'Inter', sans-serif; font-size: 0.85rem; color: var(--text-muted);">
          ${authorName}. (${new Date(fecha).getFullYear()}). ${title}. ${journalName}. ${domain}/news/${slug}${isSpanish ? '' : '.EN'}.html
        </p>
      </div>

    </article>

    <aside class="article-sidebar">
      
      ${tags.length > 0 ? `
      <div class="sidebar-section">
        <h3 class="sidebar-title">${t.tags}</h3>
        <div class="subject-list">
          ${tags.map(tag => `<a href="#" class="subject-tag">${tag}</a>`).join('')}
        </div>
      </div>
      ` : ''}

      <div class="sidebar-section">
        <div class="newsletter-box">
          <h4>${t.newsletterTitle}</h4>
          <p>${t.newsletterText}</p>
          <input type="email" class="newsletter-input" placeholder="${t.newsletterPlaceholder}">
          <button class="newsletter-btn">${t.newsletterBtn}</button>
        </div>
      </div>

    </aside>

  </main>

  <div class="audio-player-editorial" id="audioPlayer">
    <div class="audio-controls">
      <button class="audio-btn" id="playPauseBtn" title="${t.listen}">
        <svg id="playIcon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <button class="audio-btn" id="stopBtn" title="${t.stop}">
        <svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10"/></svg>
      </button>
    </div>
    <div class="audio-info">
      <span class="audio-status" id="statusText">${t.listen}</span>
      <div class="audio-progress">
        <div class="audio-progress-bar" id="audioProgressBar"></div>
      </div>
    </div>
  </div>

  <footer class="footer">
    <div class="footer-container">
      <div>
        <div class="footer-brand">${journalName}</div>
        <p class="footer-desc">${t.footerDesc}</p>
      </div>
      <div style="display: flex; justify-content: flex-end; align-items: flex-start;">
        <div class="footer-social">
          <a href="${socialLinks.instagram}" title="Instagram">${socialIcons.instagram}</a>
          <a href="${socialLinks.youtube}" title="YouTube">${socialIcons.youtube}</a>
          <a href="${socialLinks.tiktok}" title="TikTok">${socialIcons.tiktok}</a>
          <a href="${socialLinks.spotify}" title="Spotify">${socialIcons.spotify}</a>
        </div>
      </div>
    </div>
    
    <div class="footer-bottom">
      <div>© ${new Date().getFullYear()} ${journalName}. ISSN 3087-2839</div>
      <div class="footer-bottom-links">
        <a href="/privacy${isSpanish ? '' : 'EN'}.html">${t.privacy}</a>
        <a href="/terms${isSpanish ? '' : 'EN'}.html">${t.terms}</a>
        <a href="mailto:contact@revistacienciasestudiantes.com">${t.contact}</a>
      </div>
    </div>
  </footer>

  <script>
    window.addEventListener('scroll', () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      document.getElementById('progressBar').style.width = scrolled + '%';
    });

    function shareOnTwitter() {
      const url = encodeURIComponent(window.location.href);
      const text = encodeURIComponent(document.title);
      window.open('https://twitter.com/intent/tweet?url=' + url + '&text=' + text, '_blank');
    }
    function shareOnFacebook() {
      const url = encodeURIComponent(window.location.href);
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + url, '_blank');
    }
    function shareOnLinkedIn() {
      const url = encodeURIComponent(window.location.href);
      window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + url, '_blank');
    }

    document.addEventListener('DOMContentLoaded', function() {
      const playPauseBtn = document.getElementById('playPauseBtn');
      const stopBtn = document.getElementById('stopBtn');
      const statusText = document.getElementById('statusText');
      const playIcon = document.getElementById('playIcon');
      const audioProgressBar = document.getElementById('audioProgressBar');
      const articleContentEl = document.getElementById('articleContent');

      if (!playPauseBtn || !stopBtn || !statusText || !playIcon || !audioProgressBar || !articleContentEl) return;

      let utterance = null;
      let isPlaying = false;
      let synthesis = window.speechSynthesis;
      let currentCharIndex = 0;
      let fullText = (articleContentEl.innerText || articleContentEl.textContent || '').trim();
      const totalChars = fullText.length;
      let lang = document.documentElement.lang.substring(0, 2) || 'es';

      function stopSpeech() {
        if (synthesis) synthesis.cancel();
        utterance = null;
        isPlaying = false;
        updateUI();
      }

      function createUtterance() {
        if (!fullText || currentCharIndex >= totalChars) return null;
        const remainingText = fullText.substring(currentCharIndex);
        if (!remainingText.trim()) return null;

        const newUtterance = new SpeechSynthesisUtterance(remainingText);
        newUtterance.lang = lang === 'es' ? 'es-ES' : 'en-US';
        newUtterance.rate = 1;

        newUtterance.onstart = () => { isPlaying = true; updateUI(); };
        newUtterance.onend = () => { isPlaying = false; currentCharIndex = totalChars; updateProgress(); updateUI(); };
        newUtterance.onboundary = (e) => {
          if (e.name === 'word' || e.name === 'sentence') {
            currentCharIndex += e.charIndex + (e.name === 'word' ? e.charLength || 1 : 0);
            updateProgress();
          }
        };
        newUtterance.onerror = () => { isPlaying = false; updateUI(); };
        return newUtterance;
      }

      function playSpeech() {
        stopSpeech();
        utterance = createUtterance();
        if (utterance) { synthesis.speak(utterance); isPlaying = true; updateUI(); }
      }

      function togglePlayPause() {
        if (isPlaying) { stopSpeech(); } else { playSpeech(); }
      }

      function updateUI() {
        if (statusText) statusText.innerText = isPlaying ? (lang === 'es' ? 'Reproduciendo...' : 'Playing...') : (lang === 'es' ? 'Escuchar noticia' : 'Listen to article');
        if (playIcon) playIcon.innerHTML = isPlaying ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' : '<path d="M8 5v14l11-7z"/>';
      }

      function updateProgress() {
        if (audioProgressBar && totalChars > 0) {
          const progress = (currentCharIndex / totalChars) * 100;
          audioProgressBar.style.width = Math.min(progress, 100) + '%';
        }
      }

      playPauseBtn.addEventListener('click', () => {
        if (!synthesis) { alert(lang === 'es' ? 'Texto a voz no soportado' : 'Text-to-speech not supported'); return; }
        togglePlayPause();
      });

      stopBtn.addEventListener('click', () => {
        currentCharIndex = 0;
        stopSpeech();
        updateProgress();
      });

      window.addEventListener('beforeunload', stopSpeech);
    });
  </script>
</body>
</html>`;
}

// ========== GENERACIÓN DE ÍNDICES ==========
function generateIndexes(newsItems, indexData) {
  console.log('📊 Generando índices...');
  
  const newsByYear = newsItems.reduce((acc, item) => {
    const year = item.year || new Date(item.metadata?.createdAt || item.fecha || Date.now()).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(item);
    return acc;
  }, {});

  const sortedYears = Object.keys(newsByYear).sort().reverse();

  // Índice español
  const indexContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Archivo de Noticias Científicas - ${JOURNAL_NAME_ES}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Lora:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #005a7d;
      --text-main: #222222;
      --text-light: #595959;
      --border-color: #e5e7eb;
      --bg-soft: #f8f9fa;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Lora', serif;
      color: var(--text-main);
      background-color: #f5f5f5;
      line-height: 1.8;
    }
    .nav-minimal {
      background: white;
      border-bottom: 1px solid var(--border-color);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      font-family: 'Inter', sans-serif;
    }
    .nav-logo {
      font-weight: 700;
      color: var(--primary);
      text-decoration: none;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
    }
    .main-wrapper {
      max-width: 1000px;
      margin: 3rem auto;
      padding: 0 2rem;
    }
    .content-card {
      background: white;
      padding: 3rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    h1 {
      font-family: 'Playfair Display', serif;
      font-size: 3rem;
      margin: 0 0 1rem;
      line-height: 1.2;
      color: var(--primary);
    }
    .description {
      color: var(--text-light);
      margin-bottom: 3rem;
      font-size: 1.1rem;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 1rem;
    }
    .year-section {
      margin-bottom: 3rem;
    }
    .year-title {
      font-family: 'Inter', sans-serif;
      font-size: 2rem;
      color: var(--primary);
      margin: 0 0 1.5rem;
      border-left: 4px solid var(--primary);
      padding-left: 1rem;
    }
    .news-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .news-item {
      margin-bottom: 1.5rem;
      padding: 1.5rem;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      transition: all 0.2s;
    }
    .news-item:hover {
      background: var(--bg-soft);
      transform: translateX(5px);
      border-left: 4px solid var(--primary);
    }
    .news-link {
      color: var(--primary);
      text-decoration: none;
      font-size: 1.3rem;
      font-weight: 600;
      display: block;
      margin-bottom: 0.5rem;
      font-family: 'Playfair Display', serif;
    }
    .news-link:hover {
      text-decoration: underline;
    }
    .news-meta {
      color: var(--text-light);
      font-size: 0.9rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      font-family: 'Inter', sans-serif;
      align-items: center;
    }
    .author-link {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
    }
    .author-link:hover {
      text-decoration: underline;
    }
    .news-excerpt {
      margin-top: 1rem;
      color: var(--text-main);
      font-size: 1rem;
    }
    footer {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-light);
      font-size: 0.9rem;
      background: white;
      border-top: 1px solid var(--border-color);
    }
    @media (max-width: 768px) {
      .main-wrapper { padding: 0 1rem; }
      .content-card { padding: 1.5rem; }
      h1 { font-size: 2.2rem; }
      .year-title { font-size: 1.6rem; }
      .news-link { font-size: 1.1rem; }
    }
  </style>
</head>
<body>
  <nav class="nav-minimal">
    <a href="/" class="nav-logo">${JOURNAL_NAME_ES.toUpperCase()}</a>
    <div class="issn">ISSN: 3087-2839</div>
  </nav>
  <div class="main-wrapper">
    <main class="content-card">
      <h1>Archivo de Noticias Científicas</h1>
      <p class="description">Todas las noticias de divulgación científica, ordenadas por año de publicación.</p>
      
      ${sortedYears.map(year => `
      <section class="year-section">
        <h2 class="year-title">${year}</h2>
        <ul class="news-list">
          ${newsByYear[year].map(item => {
            const title = item.title?.es || item.titulo || '';
            const authorName = item.author?.name || 'Redacción Editorial';
            const authorSlug = generateAuthorSlug(authorName);
            const slug = item.slug || generateSlug(`${title} ${item.metadata?.createdAt || item.fecha}`);
            const body = item.content?.es || item.cuerpo || '';
            const excerpt = body.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
            const areaId = item.area_id || 'general';
            const areaInfo = AREAS_MAP[areaId] || { es: areaId, en: areaId };
            const dateStr = item.metadata?.createdAt || item.fecha || new Date().toISOString();
            
            return `
            <li class="news-item">
              <a href="/news/${slug}.html" class="news-link">${title}</a>
              <div class="news-meta">
                <span class="date">${formatDateEs(dateStr)}</span>
                <a href="${DOMAIN}/team/${authorSlug}.html" class="author-link">${authorName}</a>
                <span class="area">${areaInfo.es}</span>
              </div>
              <div class="news-excerpt">${excerpt}</div>
            </li>
          `;
          }).join('')}
        </ul>
      </section>
      `).join('')}
    </main>
  </div>
  <footer>
    <p>&copy; ${new Date().getFullYear()} ${JOURNAL_NAME_ES}</p>
    <p style="margin-top: 0.5rem;"><a href="/" style="color: var(--primary); text-decoration: none;">Volver al inicio</a></p>
  </footer>
</body>
</html>`;

  const indexPath = path.join(OUTPUT_HTML_DIR, 'index.html');
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log(`✅ Índice español: index.html`);

  // Índice inglés
  const indexContentEn = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scientific News Archive - ${JOURNAL_NAME_EN}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Lora:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #005a7d;
      --text-main: #222222;
      --text-light: #595959;
      --border-color: #e5e7eb;
      --bg-soft: #f8f9fa;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Lora', serif;
      color: var(--text-main);
      background-color: #f5f5f5;
      line-height: 1.8;
    }
    .nav-minimal {
      background: white;
      border-bottom: 1px solid var(--border-color);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      font-family: 'Inter', sans-serif;
    }
    .nav-logo {
      font-weight: 700;
      color: var(--primary);
      text-decoration: none;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
    }
    .main-wrapper {
      max-width: 1000px;
      margin: 3rem auto;
      padding: 0 2rem;
    }
    .content-card {
      background: white;
      padding: 3rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    h1 {
      font-family: 'Playfair Display', serif;
      font-size: 3rem;
      margin: 0 0 1rem;
      line-height: 1.2;
      color: var(--primary);
    }
    .description {
      color: var(--text-light);
      margin-bottom: 3rem;
      font-size: 1.1rem;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 1rem;
    }
    .year-section {
      margin-bottom: 3rem;
    }
    .year-title {
      font-family: 'Inter', sans-serif;
      font-size: 2rem;
      color: var(--primary);
      margin: 0 0 1.5rem;
      border-left: 4px solid var(--primary);
      padding-left: 1rem;
    }
    .news-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .news-item {
      margin-bottom: 1.5rem;
      padding: 1.5rem;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      transition: all 0.2s;
    }
    .news-item:hover {
      background: var(--bg-soft);
      transform: translateX(5px);
      border-left: 4px solid var(--primary);
    }
    .news-link {
      color: var(--primary);
      text-decoration: none;
      font-size: 1.3rem;
      font-weight: 600;
      display: block;
      margin-bottom: 0.5rem;
      font-family: 'Playfair Display', serif;
    }
    .news-link:hover {
      text-decoration: underline;
    }
    .news-meta {
      color: var(--text-light);
      font-size: 0.9rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      font-family: 'Inter', sans-serif;
      align-items: center;
    }
    .author-link {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
    }
    .author-link:hover {
      text-decoration: underline;
    }
    .news-excerpt {
      margin-top: 1rem;
      color: var(--text-main);
      font-size: 1rem;
    }
    footer {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-light);
      font-size: 0.9rem;
      background: white;
      border-top: 1px solid var(--border-color);
    }
    @media (max-width: 768px) {
      .main-wrapper { padding: 0 1rem; }
      .content-card { padding: 1.5rem; }
      h1 { font-size: 2.2rem; }
      .year-title { font-size: 1.6rem; }
      .news-link { font-size: 1.1rem; }
    }
  </style>
</head>
<body>
  <nav class="nav-minimal">
    <a href="/" class="nav-logo">${JOURNAL_NAME_EN.toUpperCase()}</a>
    <div class="issn">ISSN: 3087-2839</div>
  </nav>
  <div class="main-wrapper">
    <main class="content-card">
      <h1>Scientific News Archive</h1>
      <p class="description">All scientific outreach news, sorted by year of publication.</p>
      
      ${sortedYears.map(year => `
      <section class="year-section">
        <h2 class="year-title">${year}</h2>
        <ul class="news-list">
          ${newsByYear[year].map(item => {
            const title = item.title?.en || item.title || '';
            const authorName = item.author?.name || 'Editorial Staff';
            const authorSlug = generateAuthorSlug(authorName);
            const slug = item.slug || generateSlug(`${title} ${item.metadata?.createdAt || item.fecha}`);
            const body = item.content?.en || item.content || '';
            const excerpt = body.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
            const areaId = item.area_id || 'general';
            const areaInfo = AREAS_MAP[areaId] || { es: areaId, en: areaId };
            const dateStr = item.metadata?.createdAt || item.fecha || new Date().toISOString();
            
            return `
            <li class="news-item">
              <a href="/news/${slug}.EN.html" class="news-link">${title}</a>
              <div class="news-meta">
                <span class="date">${formatDateEn(dateStr)}</span>
                <a href="${DOMAIN}/team/${authorSlug}.html" class="author-link">${authorName}</a>
                <span class="area">${areaInfo.en}</span>
              </div>
              <div class="news-excerpt">${excerpt}</div>
            </li>
          `;
          }).join('')}
        </ul>
      </section>
      `).join('')}
    </main>
  </div>
  <footer>
    <p>&copy; ${new Date().getFullYear()} ${JOURNAL_NAME_EN}</p>
    <p style="margin-top: 0.5rem;"><a href="/" style="color: var(--primary); text-decoration: none;">Back to home</a></p>
  </footer>
</body>
</html>`;

  const indexPathEn = path.join(OUTPUT_HTML_DIR, 'index.EN.html');
  fs.writeFileSync(indexPathEn, indexContentEn, 'utf8');
  console.log(`✅ Índice inglés: index.EN.html`);
}


// ========== GENERACIÓN DE ÍNDICES ==========
function generateIndexes(newsItems, indexData) {
  console.log('📊 Generando índices...');
  
  // Agrupar por año
  const newsByYear = newsItems.reduce((acc, item) => {
    const year = item.year || new Date(item.metadata?.createdAt || item.fecha || Date.now()).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(item);
    return acc;
  }, {});

  // Ordenar años descendente
  const sortedYears = Object.keys(newsByYear).sort().reverse();

  // ========== ÍNDICE ESPAÑOL ==========
  const indexContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Archivo de Noticias Científicas - ${JOURNAL_NAME_ES}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Lora:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #005a7d;
      --text-main: #222222;
      --text-light: #595959;
      --border-color: #e5e7eb;
      --bg-soft: #f8f9fa;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Lora', serif;
      color: var(--text-main);
      background-color: #f5f5f5;
      line-height: 1.8;
    }
    .nav-minimal {
      background: white;
      border-bottom: 1px solid var(--border-color);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      font-family: 'Inter', sans-serif;
    }
    .nav-logo {
      font-weight: 700;
      color: var(--primary);
      text-decoration: none;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
    }
    .main-wrapper {
      max-width: 1000px;
      margin: 3rem auto;
      padding: 0 2rem;
    }
    .content-card {
      background: white;
      padding: 3rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    h1 {
      font-family: 'Playfair Display', serif;
      font-size: 3rem;
      margin: 0 0 1rem;
      line-height: 1.2;
      color: var(--primary);
    }
    .description {
      color: var(--text-light);
      margin-bottom: 3rem;
      font-size: 1.1rem;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 1rem;
    }
    .year-section {
      margin-bottom: 3rem;
    }
    .year-title {
      font-family: 'Inter', sans-serif;
      font-size: 2rem;
      color: var(--primary);
      margin: 0 0 1.5rem;
      border-left: 4px solid var(--primary);
      padding-left: 1rem;
    }
    .news-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .news-item {
      margin-bottom: 1.5rem;
      padding: 1.5rem;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      transition: all 0.2s;
    }
    .news-item:hover {
      background: var(--bg-soft);
      transform: translateX(5px);
      border-left: 4px solid var(--primary);
    }
    .news-link {
      color: var(--primary);
      text-decoration: none;
      font-size: 1.3rem;
      font-weight: 600;
      display: block;
      margin-bottom: 0.5rem;
      font-family: 'Playfair Display', serif;
    }
    .news-link:hover {
      text-decoration: underline;
    }
    .news-meta {
      color: var(--text-light);
      font-size: 0.9rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      font-family: 'Inter', sans-serif;
      align-items: center;
    }
    .author-link {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
    }
    .author-link:hover {
      text-decoration: underline;
    }
    .news-excerpt {
      margin-top: 1rem;
      color: var(--text-main);
      font-size: 1rem;
    }
    footer {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-light);
      font-size: 0.9rem;
      background: white;
      border-top: 1px solid var(--border-color);
    }
    @media (max-width: 768px) {
      .main-wrapper { padding: 0 1rem; }
      .content-card { padding: 1.5rem; }
      h1 { font-size: 2.2rem; }
      .year-title { font-size: 1.6rem; }
      .news-link { font-size: 1.1rem; }
    }
  </style>
</head>
<body>
  <nav class="nav-minimal">
    <a href="/" class="nav-logo">${JOURNAL_NAME_ES.toUpperCase()}</a>
    <div class="issn">ISSN: 3087-2839</div>
  </nav>
  <div class="main-wrapper">
    <main class="content-card">
      <h1>Archivo de Noticias Científicas</h1>
      <p class="description">Todas las noticias de divulgación científica, ordenadas por año de publicación.</p>
      
      ${sortedYears.map(year => `
      <section class="year-section">
        <h2 class="year-title">${year}</h2>
        <ul class="news-list">
          ${newsByYear[year].map(item => {
            const title = item.title?.es || item.titulo || '';
            const authorName = item.author?.name || 'Redacción Editorial';
            const authorSlug = generateAuthorSlug(authorName);
            const slug = item.slug || generateSlug(`${title} ${item.metadata?.createdAt || item.fecha}`);
            const body = item.content?.es || item.cuerpo || '';
            const excerpt = body.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
            const areaId = item.area_id || 'general';
            const areaInfo = AREAS_MAP[areaId] || { es: areaId, en: areaId };
            const dateStr = item.metadata?.createdAt || item.fecha || new Date().toISOString();
            
            return `
            <li class="news-item">
              <a href="/news/${slug}.html" class="news-link">${title}</a>
              <div class="news-meta">
                <span class="date">${formatDateEs(dateStr)}</span>
                <a href="${DOMAIN}/team/${authorSlug}.html" class="author-link">${authorName}</a>
                <span class="area">${areaInfo.es}</span>
              </div>
              <div class="news-excerpt">${excerpt}</div>
            </li>
          `;
          }).join('')}
        </ul>
      </section>
      `).join('')}
    </main>
  </div>
  <footer>
    <p>&copy; ${new Date().getFullYear()} ${JOURNAL_NAME_ES}</p>
    <p style="margin-top: 0.5rem;"><a href="/" style="color: var(--primary); text-decoration: none;">Volver al inicio</a></p>
  </footer>
</body>
</html>`;

  const indexPath = path.join(OUTPUT_HTML_DIR, 'index.html');
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log(`✅ Índice español: index.html`);

  // ========== ÍNDICE INGLÉS ==========
  const indexContentEn = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scientific News Archive - ${JOURNAL_NAME_EN}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Lora:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #005a7d;
      --text-main: #222222;
      --text-light: #595959;
      --border-color: #e5e7eb;
      --bg-soft: #f8f9fa;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Lora', serif;
      color: var(--text-main);
      background-color: #f5f5f5;
      line-height: 1.8;
    }
    .nav-minimal {
      background: white;
      border-bottom: 1px solid var(--border-color);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      font-family: 'Inter', sans-serif;
    }
    .nav-logo {
      font-weight: 700;
      color: var(--primary);
      text-decoration: none;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
    }
    .main-wrapper {
      max-width: 1000px;
      margin: 3rem auto;
      padding: 0 2rem;
    }
    .content-card {
      background: white;
      padding: 3rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    h1 {
      font-family: 'Playfair Display', serif;
      font-size: 3rem;
      margin: 0 0 1rem;
      line-height: 1.2;
      color: var(--primary);
    }
    .description {
      color: var(--text-light);
      margin-bottom: 3rem;
      font-size: 1.1rem;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 1rem;
    }
    .year-section {
      margin-bottom: 3rem;
    }
    .year-title {
      font-family: 'Inter', sans-serif;
      font-size: 2rem;
      color: var(--primary);
      margin: 0 0 1.5rem;
      border-left: 4px solid var(--primary);
      padding-left: 1rem;
    }
    .news-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .news-item {
      margin-bottom: 1.5rem;
      padding: 1.5rem;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      transition: all 0.2s;
    }
    .news-item:hover {
      background: var(--bg-soft);
      transform: translateX(5px);
      border-left: 4px solid var(--primary);
    }
    .news-link {
      color: var(--primary);
      text-decoration: none;
      font-size: 1.3rem;
      font-weight: 600;
      display: block;
      margin-bottom: 0.5rem;
      font-family: 'Playfair Display', serif;
    }
    .news-link:hover {
      text-decoration: underline;
    }
    .news-meta {
      color: var(--text-light);
      font-size: 0.9rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      font-family: 'Inter', sans-serif;
      align-items: center;
    }
    .author-link {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
    }
    .author-link:hover {
      text-decoration: underline;
    }
    .news-excerpt {
      margin-top: 1rem;
      color: var(--text-main);
      font-size: 1rem;
    }
    footer {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-light);
      font-size: 0.9rem;
      background: white;
      border-top: 1px solid var(--border-color);
    }
    @media (max-width: 768px) {
      .main-wrapper { padding: 0 1rem; }
      .content-card { padding: 1.5rem; }
      h1 { font-size: 2.2rem; }
      .year-title { font-size: 1.6rem; }
      .news-link { font-size: 1.1rem; }
    }
  </style>
</head>
<body>
  <nav class="nav-minimal">
    <a href="/" class="nav-logo">${JOURNAL_NAME_EN.toUpperCase()}</a>
    <div class="issn">ISSN: 3087-2839</div>
  </nav>
  <div class="main-wrapper">
    <main class="content-card">
      <h1>Scientific News Archive</h1>
      <p class="description">All scientific outreach news, sorted by year of publication.</p>
      
      ${sortedYears.map(year => `
      <section class="year-section">
        <h2 class="year-title">${year}</h2>
        <ul class="news-list">
          ${newsByYear[year].map(item => {
            const title = item.title?.en || item.title || '';
            const authorName = item.author?.name || 'Editorial Staff';
            const authorSlug = generateAuthorSlug(authorName);
            const slug = item.slug || generateSlug(`${title} ${item.metadata?.createdAt || item.fecha}`);
            const body = item.content?.en || item.content || '';
            const excerpt = body.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
            const areaId = item.area_id || 'general';
            const areaInfo = AREAS_MAP[areaId] || { es: areaId, en: areaId };
            const dateStr = item.metadata?.createdAt || item.fecha || new Date().toISOString();
            
            return `
            <li class="news-item">
              <a href="/news/${slug}.EN.html" class="news-link">${title}</a>
              <div class="news-meta">
                <span class="date">${formatDateEn(dateStr)}</span>
                <a href="${DOMAIN}/team/${authorSlug}.html" class="author-link">${authorName}</a>
                <span class="area">${areaInfo.en}</span>
              </div>
              <div class="news-excerpt">${excerpt}</div>
            </li>
          `;
          }).join('')}
        </ul>
      </section>
      `).join('')}
    </main>
  </div>
  <footer>
    <p>&copy; ${new Date().getFullYear()} ${JOURNAL_NAME_EN}</p>
    <p style="margin-top: 0.5rem;"><a href="/" style="color: var(--primary); text-decoration: none;">Back to home</a></p>
  </footer>
</body>
</html>`;

  const indexPathEn = path.join(OUTPUT_HTML_DIR, 'index.EN.html');
  fs.writeFileSync(indexPathEn, indexContentEn, 'utf8');
  console.log(`✅ Índice inglés: index.EN.html`);

  // ========== RSS FEED ==========
  generateRssFeed(newsItems);
}

function generateRssFeed(newsItems) {
  const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${JOURNAL_NAME_ES} - Noticias Científicas</title>
    <link>${DOMAIN}/news/</link>
    <description>Últimas noticias de divulgación científica de la revista académica estudiantil</description>
    <language>es-cl</language>
    <atom:link href="${DOMAIN}/news/feed.xml" rel="self" type="application/rss+xml"/>
    ${newsItems.slice(0, 20).map(item => {
      const title = item.title?.es || item.titulo || '';
      const authorName = item.author?.name || 'Redacción Editorial';
      const slug = item.slug || generateSlug(`${title} ${item.metadata?.createdAt || item.fecha}`);
      const body = item.content?.es || item.cuerpo || '';
      const description = body.replace(/<[^>]*>/g, '').substring(0, 500);
      const dateStr = item.metadata?.createdAt || item.fecha || new Date().toISOString();
      
      return `
    <item>
      <title><![CDATA[${title}]]></title>
      <link>${DOMAIN}/news/${slug}.html</link>
      <guid>${DOMAIN}/news/${slug}.html</guid>
      <dc:creator><![CDATA[${authorName}]]></dc:creator>
      <pubDate>${new Date(dateStr).toUTCString()}</pubDate>
      <description><![CDATA[${description}]]></description>
    </item>`;
    }).join('')}
  </channel>
</rss>`;

  const rssPath = path.join(OUTPUT_HTML_DIR, 'feed.xml');
  fs.writeFileSync(rssPath, rssContent, 'utf8');
  console.log(`✅ RSS feed generado`);
}

// ========== EJECUCIÓN ==========
generateNews();