# PATCHED

Experimento personal de catálogo, seguimiento de series y reproducción con React, Vite y Tailwind. No aloja películas ni archivos de video.

## Desarrollo local

Requiere Node.js 22.

```bash
npm ci
npm run dev
```

Para catálogo en vivo, añade tu propia clave TMDB v3 en **Configuración**. Sin clave, se muestra el catálogo de demostración. La clave se almacena únicamente en ese navegador; **no la subas al repositorio**. La configuración y el historial no se sincronizan entre dispositivos.

## Comprobaciones

```bash
npm test
npm run lint
npm run build
```

## Publicar en GitHub Pages

1. Crea un repositorio nuevo llamado `patched`, sin README inicial.
2. Extrae el ZIP en Windows y ejecuta `SUBIR_A_GITHUB.cmd`. Este paso requiere Git para Windows y puede pedirte iniciar sesión. No ejecutarlo como administrador.
3. En **Settings → Pages**, selecciona **GitHub Actions** como fuente.
4. En **Actions**, selecciona **PATCHED - Publicar GitHub Pages (manual)** y pulsa **Run workflow** en `main`.
5. Abre `https://TU_USUARIO.github.io/patched/`.

La acción prueba y compila antes de desplegar, con `PATCHED_BASE_PATH=/patched/` calculado desde el nombre real del repositorio. Las rutas internas de React son compatibles con este prefijo. No necesitas dejar tu PC encendida.

El sitio de GitHub Pages **será públicamente accesible**. No incluye acceso por email ni control privado. Para restringir visitantes se necesitará un sistema de protección del alojamiento o autenticación en un backend.

## Limitaciones

- El catálogo depende de TMDB y cada navegador necesita configurar su clave.
- La reproducción depende de servicios externos, de sus condiciones de uso, permisos y disponibilidad territorial. No están certificadas todas las películas ni todos los idiomas.
- Las salas compartidas precisan un backend Cloudflare Workers independiente (`server/`); GitHub Pages no lo proporciona.
- Los cambios automáticos de fuente ocurren solo ante señales de error verificadas o cuando el iframe no llega a cargar, nunca por silencio del video interno.
- Un sitio publicado no proporciona por sí solo derechos sobre contenido de terceros.

## Atribuciones

Conserva los avisos de copyright del código original en `LICENSE`. Este producto utiliza la API de TMDB pero no está avalado ni certificado por TMDB.
