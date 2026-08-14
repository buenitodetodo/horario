# Mi Horario

Horario semanal y agenda con recordatorios. Un archivo, sin dependencias,
sin servidor. Todo se guarda en el aparato de quien la usa.

## Publicar

Sube estos archivos tal cual a la rama que sirva el sitio. En GitHub Pages:
**Settings → Pages → Source: Deploy from a branch**. Funciona igual en la
raíz del dominio que en un subdirectorio, porque todas las rutas son
relativas.

```
index.html          la app entera
manifest.json       para instalarla en la pantalla de inicio
sw.js               caché para que abra sin internet
iconos/             iconos de la app
```

Tiene que servirse por **https** (GitHub Pages ya lo hace). Sin https el
navegador no registra el trabajador de servicio y se pierde el modo sin
conexión. En pruebas locales, `localhost` también cuenta:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

Abrir `index.html` con doble clic (`file://`) **no** sirve para probar el
modo sin conexión ni la instalación. La app sí abre y guarda, pero el
trabajador de servicio no se registra.

## Publicar una versión nueva

Tres cambios, siempre los tres:

1. En `index.html`, la constante `APP`:
   ```js
   const APP={n:6,label:"6.0",date:"3 sep 2026"};
   ```
2. En `index.html`, una entrada nueva **arriba** de `CHANGELOG`:
   ```js
   {v:"6.0",d:"3 sep 2026",items:["Lo que cambió."]},
   ```
3. En `sw.js`, la constante `VERSION`:
   ```js
   const VERSION = "6.0";
   ```

El tercero es el que importa: si no cambia, el caché viejo sigue vivo y a
quien ya tiene la app instalada no le llega nada.

Al abrir, quien ya la tenga verá una barra abajo con **Recargar**, y
después el aviso con la lista de cambios.

## Dónde se guardan los datos

En `localStorage`, bajo dos llaves:

| Llave              | Qué guarda                                   |
|--------------------|----------------------------------------------|
| `mihorario:v3`     | horario fijo, semanas, agenda, líneas        |
| `mihorario:prefs`  | avisos de versión y clave de API             |

Nada sale del aparato. No hay cuentas, ni servidor, ni analítica.

Se borra si la persona limpia los datos del sitio o desinstala la app. Por
eso conviene exportar un respaldo `.json` de vez en cuando, desde la barra
de arriba.

## Lo que no hace

- **Los recordatorios solo suenan con la app abierta.** Es una página web,
  no hay servidor que mande notificaciones push. Para algo que suene con el
  teléfono guardado, exporta a `.ics` y déjalo en el calendario del sistema.
- **Leer horarios desde una foto necesita una clave de API de Anthropic.**
  Cada persona pone la suya en *Acerca de → Poner mi clave*; se guarda en su
  navegador. No pongas la tuya en el código: quedaría pública y cualquiera
  podría gastarla.
