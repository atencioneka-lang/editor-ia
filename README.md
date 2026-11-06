# Editor IA Alfa 0.3 — modo web actualizable

Esta entrega añade **publicación automática en GitHub Pages**, comprobación de nuevas versiones y el botón «Nueva versión · Actualizar». También conserva el editor de imágenes y la prueba de superresolución neuronal 2×/4× de la versión 0.2.

## Lo importante

**F5 no actualiza el código de `localhost:1420`** cuando yo preparo versiones en otro sitio. `localhost` solo recarga lo que tienes en la computadora. Para usar actualizaciones sin ZIP y sin ejecutar `npm install` repetidamente, necesitas **publicar una vez el proyecto en una web**; a partir de ese momento visitas la dirección publicada, no localhost.

Después de publicarlo, un cambio que se suba a la rama `main` activará un despliegue automático. Cuando termine, recargar la dirección del sitio (F5) obtendrá la versión publicada. Puede haber un pequeño retraso por la caché del navegador/CDN. La aplicación también muestra aviso de nueva versión al volver a la pestaña o mediante una comprobación periódica (cada 90 segundos).

## Preparación inicial en GitHub (solo una vez)

1. Crea una cuenta de GitHub si no tienes una, y un repositorio **público** llamado `editor-ia` (GitHub Pages gratis para repositorios públicos).
2. Sube los **archivos de código** de esta carpeta al repositorio, incluida la carpeta `.github` y su workflow. **No subas tus fotografías, videos o claves personales**.
3. Abre tu repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. El flujo «Publicar Editor IA automáticamente» compila y publica tras recibir un cambio en `main`.
5. Abre la dirección que GitHub indique; normalmente será `https://TU_USUARIO.github.io/editor-ia/`. Esa será tu dirección permanente.
6. Cada nueva versión debe subirse al repositorio; la actualización no ocurre sola por hablar conmigo. Para futuras versiones, los cambios deben llegar al repositorio mediante una operación de publicación (por ejemplo, mediante GitHub conectado en un entorno que permita escribir en el repositorio). Conectar GitHub a ChatGPT no publica automáticamente los cambios por sí solo.

Si eliges un nombre de repositorio distinto, Vite lo detecta durante la compilación desde `GITHUB_REPOSITORY`.

## Uso de la app web

- No necesitas instalar Node.js para **usar** el sitio publicado.
- Las imágenes abiertas en el navegador se procesan localmente por el editor. El modelo IA se descarga desde una fuente pública la primera vez.
- La aplicación web publicada por GitHub Pages no trae servidor Python/FastAPI. Las herramientas generativas avanzadas y exportación MP4 todavía no están implementadas.
- Antes de actualizar o pulsar F5, exporta tus ediciones sin guardar: el estado de la sesión puede perderse.

## Para probar localmente mientras se desarrolla

```sh
npm install
npm run dev
```

> Este comando local **no es necesario** una vez que uses el sitio publicado.

## Estado de pruebas

Se han preparado el pipeline de publicación y el control de versiones. La compilación remota y publicación real deben comprobarse cuando el proyecto esté conectado a un repositorio GitHub.

## Referencias oficiales

- https://vite.dev/guide/static-deploy
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
