# Science News Generator

Generador estático de noticias de divulgación científica para la Revista Nacional de Ciencias para Estudiantes.

## 📁 Estructura del Repositorio
science/
├── index.json # Índice general de años
├── 2026/
│ ├── news-2026.json # Todas las noticias de 2026
│ ├── noticia-1-1234567890.json # Noticia individual
│ └── ...
├── 2025/
│ ├── news-2025.json
│ └── ...
├── generate.js # Generador de HTML estático
├── package.json # Dependencias
└── .github/
└── workflows/
└── deploy.yml # Workflow de GitHub Actions

text

## 🚀 Cómo funciona

1. **Subida de noticias**: Las noticias se suben mediante la Cloud Function `uploadScientificNews`
2. **Generación automática**: GitHub Actions detecta cambios en los JSON y ejecuta `generate.js`
3. **Despliegue**: Los HTML generados se publican en GitHub Pages

## 📝 Formato de Noticia

```json
{
  "id": "news-1234567890-abc123",
  "slug": "titulo-de-la-noticia-1234567890",
  "title": {
    "es": "Título en español",
    "en": "English title"
  },
  "content": {
    "es": "<p>Contenido en español</p>",
    "en": "<p>English content</p>"
  },
  "author": {
    "name": "Nombre del Autor",
    "uid": "user-id",
    "email": "email@example.com"
  },
  "area_id": "biologia",
  "category": "investigacion",
  "tags": ["tag1", "tag2"],
  "photo": "https://...",
  "featured": false,
  "metadata": {
    "createdAt": "2026-01-01T00:00:00Z",
    "createdTimestamp": 1735689600000,
    "status": "published",
    "language": "bilingual"
  }
}