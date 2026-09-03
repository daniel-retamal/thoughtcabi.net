import type { Copy } from "./copy";

export const es: Copy = {
  seed: { shelfName: "Guardados" },

  actions: {
    save: "Guardar",
    saveChanges: "Guardar cambios",
    create: "Crear",
    cancel: "Cancelar",
    close: "Cerrar",
    done: "Listo",
    keep: "Conservar",
    edit: "Editar",
    remove: "Quitar",
    rename: "Renombrar",
    delete: "Eliminar",
    open: "Abrir",
    openOriginal: "Abrir original",
    copyLink: "Copiar enlace",
    copied: "Copiado",
    download: "Descargar",
    merge: "Combinar",
    replace: "Reemplazar",
    clearSearch: "Limpiar búsqueda",
    saveALink: "Guardar un enlace",
    dismiss: "Descartar",
    back: "Atrás",
  },

  sidebar: {
    library: "Biblioteca",
    tags: "Etiquetas",
    newShelf: "Nuevo estante",
    newTag: "Nueva etiqueta",
    addATag: "Agregar una etiqueta",
    editShelf: "Editar estante",
    editTag: "Editar etiqueta",
  },

  paneBar: {
    searchPlaceholder: "Buscar...",
    searchLabel: "Buscar en tu gabinete",
    shelvesAndTags: "Estantes y etiquetas",
    narrowSidebar: "Angostar la barra",
    widenSidebar: "Ensanchar la barra",
    compose: "Guardar",
    searchResults: "Resultados de todos los estantes",
  },

  toolbar: {
    newFolder: "Nueva carpeta",
    grid: "Cuadrícula",
    gridView: "Vista de cuadrícula",
    rows: "Filas",
    rowView: "Vista de filas",
    transfer: "Tu gabinete",
    display: "Ajustes de apariencia",
  },

  sections: {
    folders: "Carpetas",
    items: "Elementos",
  },

  counts: {
    items: { one: "elemento", other: "elementos" },
    folders: { one: "carpeta", other: "carpetas" },
    shelves: { one: "estante", other: "estantes" },
    cards: { one: "tarjeta", other: "tarjetas" },
    tags: { one: "etiqueta", other: "etiquetas" },
  },

  folder: {
    empty: "Vacía",
    emptyFolder: "Carpeta vacía",
    foldersFlat: "{n} carpetas",
    itemsFlat: "{n} elementos",
  },

  card: {
    stillFetching: "aún buscando",
    noLink: "— sin enlace —",
  },

  fallback: {
    untitled: "Sin título",
    untitledFolder: "Carpeta sin título",
    untitledShelf: "Estante sin título",
  },

  categories: {
    video: "Video",
    music: "Música",
    article: "Artículo",
    forum: "Discusión",
    dev: "Código",
    research: "Estudio",
    design: "Diseño",
    link: "Enlace",
    note: "",
  },

  time: {
    justNow: "recién",
    minutes: "hace {n} min",
    hours: "hace {n} h",
    yesterday: "ayer",
    days: "hace {n} d",
    weeks: "hace {n} sem",
    months: { one: "hace {n} mes", other: "hace {n} meses" },
  },

  toasts: {
    savedTo: "Guardado en",
    deleted: "Se eliminó",
    thumbnailSetOn: "Miniatura puesta en",
    importedInto: "Importado en",
    movedTo: "Movido a",
    movedFolderTo: "Carpeta movida a",
    keptTwoVersions: "Se guardaron dos versiones en",
    savedACopy: "Se guardó una copia como",
    couldNotConnect: "No se pudo conectar con",
    view: "Ver",
    undo: "Deshacer",
  },

  empty: {
    bringItHere: "¿Ya tienes un gabinete? Tráelo aquí.",
    firstLoadTitle: "Tu gabinete está vacío.",
    firstLoadText:
      "Copia un enlace y pégalo en cualquier parte de esta página. Llega como una tarjeta con el título y la miniatura del sitio.",
    emptiedTitle: "Nada guardado.",
    emptiedText: "Pega un enlace para volver a llenar {shelf}.",
    primerShelvesTerm: "Estantes",
    primerShelvesText: "Aparecen en la barra lateral. Renombra {shelf} cuando quieras.",
    primerFoldersTerm: "Carpetas",
    primerFoldersText: "Viven dentro de un estante, se crean donde estás parado.",
    primerTagsTerm: "Etiquetas",
    primerTagsText: "Un color cada una, cruzando todos los estantes.",
    searchingTitle: "Sin resultados para “{query}”.",
    searchingText: "La búsqueda cubre títulos, notas, dominios y etiquetas.",
    taggedTitle: "Nada con la etiqueta {tag}.",
    taggedText: "Abre cualquier guardado y elige esta etiqueta en su editor.",
    inFolderTitle: "Esta carpeta está vacía.",
    inFolderText: "Arrastra guardados hacia ella, o pega un enlace mientras estás dentro.",
    shelfTitle: "Nada en {shelf} todavía.",
    shelfTextBefore: "Pega un enlace con ",
    shelfTextAfter: ", o arrastra guardados desde otro estante.",
  },

  menu: {
    pasteLink: "Pegar enlace",
    saveLink: "Guardar enlace…",
    newFolder: "Nueva carpeta",
    open: "Abrir",
    rename: "Renombrar",
    delete: "Eliminar",
    openOriginal: "Abrir original",
    copyLink: "Copiar enlace",
    edit: "Editar",
    pasteAsThumbnail: "Pegar como miniatura",
  },

  nodeActions: {
    renameFolder: "Renombrar carpeta",
    deleteFolder: "Eliminar carpeta",
  },

  deleteFace: {
    question: { one: "¿Eliminar {n} guardado?", other: "¿Eliminar {n} guardados?" },
  },

  compose: {
    kindNew: "Guardar enlace",
    kindEdit: "Editar enlace",
    headingNew: "Agregar a tu gabinete",
    headingEdit: "Editar esta entrada",
    title: "Título",
    titlePlaceholder: "¿Qué es esto?",
    link: "Enlace",
    linkPlaceholder: "https://…",
    reading: "— leyendo…",
    optional: "— opcional",
    thumbnail: "Miniatura",
    thumbnailHint: "— opcional · suelta una en cualquier parte de este cuadro",
    tag: "Etiqueta",
    description: "Descripción",
    descriptionPlaceholder: "Una línea sobre por qué guardas esto…",
    destination: "Destino",
  },

  destination: {
    savingTo: "Guardando en",
  },

  tagPicker: {
    noTagsYet: "Sin etiquetas. Empieza con",
    inspiration: "Inspiración",
    readLater: "Leer después",
    reference: "Referencia",
  },

  thumbnailField: {
    removeImage: "Quitar imagen",
    prompt: "Pega, suelta o haz clic para agregar una miniatura",
  },

  shelfEditor: {
    kindNew: "Nuevo estante",
    kindEdit: "Editar estante",
    headingNew: "Nombra tu estante",
    headingEdit: "Cambia el nombre y el icono",
    name: "Nombre",
    namePlaceholder: "ej. Inspiración",
    icon: "Icono",
    deleteEmpty: "¿Eliminar estante?",
    deleteArmed: { one: "¿Eliminar {n} guardado?", other: "¿Eliminar {n} guardados?" },
    lastShelf: "Tu gabinete conserva al menos un estante. Renombra este en su lugar.",
  },

  tagEditor: {
    kindNew: "Nueva etiqueta",
    kindEdit: "Editar etiqueta",
    headingNew: "Nombra tu etiqueta",
    headingEdit: "Cambia el nombre y el color",
    name: "Nombre",
    namePlaceholder: "ej. Por leer",
    color: "Color",
    colorHint: "— un nombre por color",
    inUse: "en uso",
    chooseColor: "elegir color",
    paletteFull: "Los {n} colores están en uso. Elimina una etiqueta para agregar otra.",
  },

  folderPrompt: {
    newKind: "Nueva carpeta",
    newHeading: "Nombra tu carpeta",
    newPlaceholder: "ej. Leer después",
    renameKind: "Renombrar",
    renameHeading: "Renombrar carpeta",
    renamePlaceholder: "Nombre de la carpeta",
  },

  detail: {
    savedPrefix: "Guardado",
    source: "Fuente",
    url: "URL",
    inFolder: "En la carpeta",
  },

  transfer: {
    heading: "Exportar e importar",
    exportLabel: "Exportar",
    importLabel: "Importar",
    exported: "exportado {when}",
    chooseAnother: "Elegir otro archivo",
    hint: "Combinar conserva lo que tienes, y un estante cuyo nombre ya usas vierte sus tarjetas en el tuyo. Reemplazar descarta este gabinete por ese.",
    drop: "Suelta un archivo de gabinete, o haz clic para elegir",
    unreadable: "Este archivo no es JSON, así que no hay nada que leer.",
    newer: "Este archivo viene de una versión más nueva de thoughtcabinet.",
    empty: "Este archivo no tiene estantes.",
  },

  sync: {
    heading: "Tu gabinete",
    places: "Dónde vive",
    placesEmpty: "En este navegador, y en ningún otro lugar todavía.",
    addPlace: "Agregar un lugar",

    download: {
      label: "Este equipo",
      detail: "un archivo que descargas",
      when: "cuando lo pidas",
    },

    roles: {
      home: "Principal",
      mirror: "Copia",
      follow: "Sólo lectura",
    },

    cadences: {
      live: "En vivo",
      hourly: "Cada hora",
      manual: "Cuando lo pidas",
    },

    connect: {
      heading: "¿Dónde debería vivir tu gabinete?",
      folder: "Una carpeta en este equipo",
      folderSub: "iCloud Drive, Dropbox, Syncthing, una unidad de red",
      github: "GitHub",
      githubSub: "Un repositorio, con historial",
      drive: "Google Drive",
      driveSub: "Un archivo en Mi unidad, en tu propia cuenta",
      webdav: "Tu propio servidor",
      webdavSub: "WebDAV: Nextcloud, Synology, rclone",
      file: "Este equipo",
      fileSub: "Un archivo que descargas y conservas",
      unavailable: "Aquí no",
      needsChromium:
        "La carpeta necesita Chrome, Edge, Brave o Arc. Safari y Firefox no traen selector de carpetas.",
      needsSetup: "Esta versión se compiló sin un acceso propio de Google.",
      soon: "Todavía no está conectado en esta versión.",
    },

    fields: {
      owner: "Dueño",
      ownerHint: "O pega la dirección del repositorio",
      repo: "Repositorio",
      token: "Token",
      tokenHint: "Un token de alcance fino con Contents: Read and write, solo en este repositorio.",
      tokenLink: "Crea uno en github.com",
      path: "Archivo",
      pathHint:
        "Dónde queda dentro del repositorio. Si lo dejas así, thoughtcabinet.json en la raíz.",
      address: "Dirección",
      addressHint:
        "La carpeta donde debería quedar tu gabinete. En Nextcloud se llama dirección WebDAV.",
      user: "Usuario",
      password: "Contraseña de aplicación",
      passwordHint:
        "Nextcloud, Synology y ownCloud emiten contraseñas de aplicación. Usa una, no la de tu cuenta.",
      connect: "Conectar",
      connecting: "Conectando…",
    },

    refused: {
      failed: "No se pudo. No quedó nada conectado.",
      cors: "Tu servidor no dejó que este navegador llegara. Tiene que enviar cabeceras CORS.",
      mixedContent: "Esa dirección no es HTTPS, así que el navegador no la abrirá.",
      github: {
        invalid: "Ahí no hay un repositorio al que llegar. Revisa el dueño y el nombre.",
        auth: "GitHub no aceptó ese token. Revísalo, o crea uno nuevo.",
        gone: "No existe un repositorio con ese nombre, o el token no lo ve.",
      },
      webdav: {
        invalid: "Esa dirección respondió, pero no como un recurso WebDAV.",
        auth: "Tu servidor no aceptó ese nombre y esa contraseña de aplicación.",
        gone: "En tu servidor no hay nada en esa dirección.",
      },
    },

    actions: {
      syncNow: "Sincronizar ahora",
      restore: "Restaurar",
      disconnect: "Desconectar",
      disconnectArmed: "Desconectar de verdad",
      resume: "Continuar",
      makeHome: "Hacerlo el principal",
    },

    states: {
      synced: "Sincronizado con {name}",
      working: "Sincronizando con {name}",
      pending: "Esperando alcanzar {name}",
      paused: "Esperando permiso para alcanzar {name}",
      conflict: "{name} tiene una pregunta para ti",
      blocked: "{name} necesita una mano",
    },

    lastSynced: "sincronizado {when}",
    never: "todavía no",
    thisBrowser: "Este navegador",
    conflictsFolder: "Conflictos",

    adopt: {
      heading: "Aquí ya hay un gabinete",
      question:
        "{name} tiene un gabinete propio. El tuyo puede tomar su lugar, o quedarse al lado con un nombre de este equipo.",
      keepMine: "Reemplazarlo por el mío",
      keepBoth: "Conservar ambos",
      labelPrompt: "¿Cómo se debería llamar este equipo?",
    },

    reconcile: {
      heading: "Dos gabinetes",
      question:
        "{name} tiene un gabinete y este navegador tiene otro. Elijas lo que elijas, el otro se guarda al lado primero.",
      keepBoth: "Conservar ambos",
      keepMine: "Conservar el mío",
      keepTheirs: "Conservar el suyo",
    },

    conflict: {
      heading: "Dos versiones",
      question:
        "Ambos lados cambiaron desde la última vez que coincidieron, y no hay una copia anterior desde donde retroceder. Elijas lo que elijas, el otro se guarda al lado primero.",
      keepBoth: "Conservar ambos",
      keepMine: "Conservar el mío",
      keepTheirs: "Conservar el suyo",
    },

    stray: {
      heading: "Apareció otra copia",
      question:
        "Tu app de sincronización dejó {name} junto a tu archivador, y se lee como un archivador propio. Al integrarla se trae lo que falta aquí, sin cambiar nada de lo que ya está.",
      keepBoth: "Integrarla",
      keepMine: "Dejarla ahí",
    },

    problems: {
      newer:
        "Una versión más nueva de thoughtcabinet escribió esto. Actualiza este navegador y sigue sola.",
      unreadable:
        "Lo que hay ahí no es un archivo de gabinete, así que no se escribió nada encima.",
      empty: "Lo que hay ahí no tiene estantes, así que no se escribió nada encima.",
      auth: "Esto necesita que inicies sesión de nuevo.",
      permission: "Esto espera un permiso que no se ha dado.",
      denied: "Este lugar rechazó el cambio.",
      offline: "Sin red. Todo sigue guardado aquí.",
      cors: "Tu servidor no permitió que este navegador lo alcanzara.",
      mixedContent: "Esa dirección no es HTTPS, así que el navegador no la abrirá.",
      tooLarge: "Ya no queda espacio ahí para el gabinete.",
      readonly: "Este lugar se puede leer pero no escribir.",
      gone: "Este lugar ya no está.",
      failed: "Eso no llegó. Lo volverá a intentar.",
    },
  },

  storage: {
    quota:
      "El almacenamiento de este navegador está lleno, así que tu último cambio no se guardó. Exporta tu gabinete para conservar una copia y luego elimina algunos elementos para hacer espacio.",
    unavailable:
      "Este navegador está bloqueando el almacenamiento local. Nada de lo que cambies aquí se guardará.",
  },

  display: {
    color: "Color",
    cards: "Tarjetas",
    cardsNote: "la superficie donde van los guardados",
    cream: "Crema",
    language: "Idioma",
    languageNote: "las palabras en pantalla",
  },

  colors: {
    blue: "Azul",
    green: "Verde",
    mono: "Mono",
    ultramarine: "Ultramar",
    cobalt: "Cobalto",
    navy: "Marino",
    midnight: "Medianoche",
    emerald: "Esmeralda",
    viridian: "Viridián",
    forest: "Bosque",
    pine: "Pino",
    paper: "Papel",
    linen: "Lino",
    graphite: "Grafito",
    onyx: "Ónix",
  },

  icons: {
    "book-open": "Libro",
    play: "Reproducir",
    "flask-conical": "Matraz",
    terminal: "Terminal",
    hash: "Numeral",
    bookmark: "Marcador",
    lightbulb: "Idea",
    star: "Estrella",
    heart: "Corazón",
    music: "Música",
    camera: "Cámara",
    palette: "Paleta",
    briefcase: "Maletín",
    "graduation-cap": "Birrete",
    coffee: "Café",
    globe: "Globo",
    "code-xml": "Código",
    "pen-tool": "Pluma",
    archive: "Archivo",
    inbox: "Bandeja",
    map: "Mapa",
    compass: "Brújula",
    sparkles: "Destellos",
    newspaper: "Diario",
    leaf: "Hoja",
    "gamepad-2": "Control",
    "shopping-bag": "Bolsa",
    plane: "Avión",
  },
};
