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


## Alfa 0.5 — rapidez y referencias de calidad

- Muestra IA rápida de **128×128** y muestra detallada de **256×256**, ambas con inferencia neuronal, no simples filtros.
- Se reutiliza el modelo neuronal mientras permanezca abierta la pestaña; cambiar de factor 2× a 4× reemplaza la instancia en memoria.
- Inferencia por parches de 64 px con padding 2 px para disminuir el número de pasos. El rendimiento depende de la GPU/navegador y puede seguir siendo lento en equipos sin aceleración compatible.
- **Referencias de producto:** experiencia de edición fiel de imágenes similar a la que el usuario valora en ChatGPT, y animación de imágenes con movimiento fluido similar a la que valora en Grok. Estos son objetivos de calidad, **no integraciones con sus modelos**.
- La generación de video por IA todavía no está incluida.


## Alfa 0.6 — honestidad de calidad y protección frente a esperas

Las pruebas reales aportadas por el usuario mostraron que ESRGAN Slim casi no generaba mejora perceptible. Se desactiva la ejecución automática de este modelo en respuesta a instrucciones genéricas como «mejora la calidad». Se conserva únicamente bajo un apartado experimental y con confirmación previa para la ampliación completa. La integración de un motor generativo fotográfico de mayor calidad queda pendiente; el proyecto no debe afirmar que ya ofrece esa restauración ni prometer prestaciones o costes no verificados.


## Alfa 0.7 — Laboratorio gratuito de edición generativa

Se añade una pestaña «IA gratis · Prueba» que incorpora como iframe la demostración **Qwen-Image-Edit-2511-Fast** alojada en Hugging Face ZeroGPU. Permite probar un modelo externo de edición con el propio cargador y formulario del proveedor, sin instalar GPU local. Incluye enlace alternativo, instrucciones copiables y una advertencia explícita: las fotografías se transfieren a terceros cuando se suben en el iframe. Esta es una **prueba de integración visual**, no un API nativo. Puede tener cuotas, colas y límites; no existe promesa de rapidez ni gratuidad ilimitada. El usuario decidirá si el resultado cumple su estándar antes de integrarlo por API.


## Alfa 0.8 — segunda ronda tras resultados de calidad insuficiente

Se sustituyeron los demos rápidos de baja calidad visual por Qwen-Image 2.1 (Space oficial con 40 pasos y opciones 1024/2048), FLUX 3 Image Klein (Space oficial) y un Space comunitario alternativo de Qwen-Image 2.1. Los tres son proveedores externos con cuota/colas. Su interfaz se muestra embebida; las fotografías se cargan al proveedor elegido, y todavía no existe una integración programática con el editor. Se debe efectuar una comparación real con una imagen antes de afirmar mejora de calidad o velocidad.


## Alfa 0.9 — Editor por zonas A+B+C
Nueva pestaña «Editor A+B+C»: importa fotografía local, pincel/eraser con máscara visible, exporta copia de imagen y máscara PNG del mismo tamaño, genera un prompt adaptado al cambio de prenda/postura/fondo/restauración con casillas de preservación, y permite importar un resultado para compararlo con el original. El archivo fuente no se sobrescribe. Las dimensiones se ajustan a un máximo de 2560 px por lado / 7 MP para preparar la pareja imagen-máscara. La máscara exportada usa píxeles transparentes para la zona a modificar y blancos opacos para las zonas a conservar; los proveedores solo la usan si admiten máscaras compatibles. **No se afirma que los cambios generativos se ejecuten localmente:** deben realizarse mediante un servicio generativo compatible, y los proveedores conservan sus límites y políticas. 


## Alfa 1.0 — aplicación de cambios locales dentro de Editor IA
El editor A+B+C permite aplicar correcciones **reales, no generativas** directamente sobre la fotografía. Se usan Canvas2D y máscaras pintadas para limitar efectos de luz, contraste, saturación, suavizado, gris o tono cálido a una zona; también pueden aplicarse a la imagen completa. El resultado aparece en el comparador antes/después y puede descargarse sin salir de la app. El procesamiento se limita a 4 megapíxeles para evitar cargas excesivas, preservando el original. Esta función **no cambia ropa ni posturas mediante IA**; eso requiere un proveedor generativo real, cuyo despliegue y credenciales no están disponibles en esta fase.


## Alfa 1.1: edición generativa experimental dentro de Editor IA

La pantalla principal se simplificó para fotos, selección, instrucción y botón **Aplicar edición con IA**. Se añadió un cliente Gradio del Space oficial `Qwen/Qwen-Image-2.1`, con dos fases de API y filtros de seguridad del proveedor. El envío exige consentimiento explícito por cada sesión; no se suben fotos simplemente al abrir el editor. Se recibe un PNG y, cuando hay selección, el navegador combina el resultado conservando el original fuera de la máscara. Se puede comparar y descargar desde la app. El funcionamiento real depende de la disponibilidad externa; **las pruebas de GitHub validan código, no la calidad ni una generación real en GPU**. Sin garantía de uso gratuito ilimitado ni calidad idéntica a ChatGPT.


## Alfa 1.2 — corrección de formato Gallery e información de errores

Se detectó que la API del Space oficial Qwen-Image-2.1 utiliza Gradio Gallery, que exige una lista de objetos `{image: FileData, caption: null}`. Editor IA enviaba `[FileData]`, formato incorrecto. La app ahora serializa la fotografía con el esquema de Gallery, verifica el estado de la primera etapa y distingue errores de conexión, preparación, generación y descarga. Se añadieron pruebas unitarias de dicho contrato. **La publicación solo valida el código; no demuestra inferencia exitosa sobre el servidor externo**. La disponibilidad gratuita, cuota, filtros de seguridad y respuestas del proveedor siguen fuera de nuestro control.
