export const en = {
  seed: { shelfName: "Saved" },

  actions: {
    save: "Save",
    saveChanges: "Save changes",
    create: "Create",
    cancel: "Cancel",
    close: "Close",
    done: "Done",
    keep: "Keep",
    edit: "Edit",
    remove: "Remove",
    rename: "Rename",
    delete: "Delete",
    open: "Open",
    openOriginal: "Open original",
    copyLink: "Copy link",
    copied: "Copied",
    download: "Download",
    merge: "Merge",
    replace: "Replace",
    clearSearch: "Clear search",
    saveALink: "Save a link",
    dismiss: "Dismiss",
    back: "Back",
  },

  sidebar: {
    library: "Library",
    tags: "Tags",
    newShelf: "New shelf",
    newTag: "New tag",
    addATag: "Add a tag",
    editShelf: "Edit shelf",
    editTag: "Edit tag",
  },

  paneBar: {
    searchPlaceholder: "Search...",
    searchLabel: "Search your cabinet",
    shelvesAndTags: "Shelves and tags",
    narrowSidebar: "Narrow sidebar",
    widenSidebar: "Widen sidebar",
    compose: "Save",
    searchResults: "Results across all shelves",
  },

  toolbar: {
    newFolder: "New folder",
    grid: "Grid",
    gridView: "Grid view",
    rows: "Rows",
    rowView: "Row view",
    transfer: "Your cabinet",
    display: "Display settings",
  },

  sections: {
    folders: "Folders",
    items: "Items",
  },

  counts: {
    items: { one: "item", other: "items" },
    folders: { one: "folder", other: "folders" },
    shelves: { one: "shelf", other: "shelves" },
    cards: { one: "card", other: "cards" },
    tags: { one: "tag", other: "tags" },
  },

  folder: {
    empty: "Empty",
    emptyFolder: "Empty folder",
    foldersFlat: "{n} folders",
    itemsFlat: "{n} items",
  },

  card: {
    stillFetching: "still fetching",
    noLink: "— no link —",
  },

  fallback: {
    untitled: "Untitled",
    untitledFolder: "Untitled folder",
    untitledShelf: "Untitled shelf",
  },

  categories: {
    video: "Video",
    music: "Music",
    article: "Article",
    forum: "Discussion",
    dev: "Code",
    research: "Paper",
    design: "Design",
    link: "Link",
    note: "",
  },

  time: {
    justNow: "just now",
    minutes: "{n}m ago",
    hours: "{n}h ago",
    yesterday: "yesterday",
    days: "{n}d ago",
    weeks: "{n}w ago",
    months: { one: "{n}mo ago", other: "{n}mo ago" },
  },

  toasts: {
    savedTo: "Saved to",
    deleted: "Deleted",
    thumbnailSetOn: "Thumbnail set on",
    importedInto: "Imported into",
    movedTo: "Moved to",
    movedFolderTo: "Moved folder to",
    keptTwoVersions: "Kept two versions in",
    savedACopy: "Saved a copy as",
    view: "View",
    undo: "Undo",
  },

  empty: {
    bringItHere: "Already have a cabinet? Bring it here.",
    firstLoadTitle: "Your cabinet is empty.",
    firstLoadText:
      "Copy a link, then paste it anywhere on this page. It arrives as a card with the site's title and thumbnail.",
    emptiedTitle: "Nothing saved.",
    emptiedText: "Paste a link to start filling {shelf} again.",
    primerShelvesTerm: "Shelves",
    primerShelvesText: "Listed in the sidebar. Rename {shelf} whenever you like.",
    primerFoldersTerm: "Folders",
    primerFoldersText: "Live inside a shelf, made where you are standing.",
    primerTagsTerm: "Tags",
    primerTagsText: "One color each, cutting across every shelf.",
    searchingTitle: "No matches for “{query}”.",
    searchingText: "Search covers titles, notes, domains and tags.",
    taggedTitle: "Nothing tagged {tag}.",
    taggedText: "Open any save and pick this tag in its editor.",
    inFolderTitle: "This folder is empty.",
    inFolderText: "Drag saves into it, or paste a link while you're inside.",
    shelfTitle: "Nothing in {shelf} yet.",
    shelfTextBefore: "Paste a link with ",
    shelfTextAfter: ", or drag saves in from another shelf.",
  },

  menu: {
    pasteLink: "Paste link",
    saveLink: "Save link…",
    newFolder: "New folder",
    open: "Open",
    rename: "Rename",
    delete: "Delete",
    openOriginal: "Open original",
    copyLink: "Copy link",
    edit: "Edit",
    pasteAsThumbnail: "Paste as thumbnail",
  },

  nodeActions: {
    renameFolder: "Rename folder",
    deleteFolder: "Delete folder",
  },

  deleteFace: {
    question: { one: "Delete {n} save?", other: "Delete {n} saves?" },
  },

  compose: {
    kindNew: "Save link",
    kindEdit: "Edit link",
    headingNew: "Add to your cabinet",
    headingEdit: "Edit this entry",
    title: "Title",
    titlePlaceholder: "What is this?",
    link: "Link",
    linkPlaceholder: "https://…",
    reading: "— reading…",
    optional: "— optional",
    thumbnail: "Thumbnail",
    thumbnailHint: "— optional · drop one anywhere in this dialog",
    tag: "Tag",
    description: "Description",
    descriptionPlaceholder: "A line about why you're keeping this…",
    destination: "Destination",
  },

  destination: {
    savingTo: "Saving to",
  },

  tagPicker: {
    noTagsYet: "No tags yet. Start with",
    inspiration: "Inspiration",
    readLater: "Read later",
    reference: "Reference",
  },

  thumbnailField: {
    removeImage: "Remove image",
    prompt: "Paste, drop, or click to add a thumbnail",
  },

  shelfEditor: {
    kindNew: "New shelf",
    kindEdit: "Edit shelf",
    headingNew: "Name your shelf",
    headingEdit: "Rename & restyle",
    name: "Name",
    namePlaceholder: "e.g. Inspiration",
    icon: "Icon",
    deleteEmpty: "Delete shelf?",
    deleteArmed: { one: "Delete {n} save?", other: "Delete {n} saves?" },
    lastShelf: "Your cabinet keeps at least one shelf. Rename this one instead.",
  },

  tagEditor: {
    kindNew: "New tag",
    kindEdit: "Edit tag",
    headingNew: "Name your tag",
    headingEdit: "Rename & recolor",
    name: "Name",
    namePlaceholder: "e.g. To read",
    color: "Color",
    colorHint: "— one name per color",
    inUse: "in use",
    chooseColor: "choose color",
    paletteFull: "All {n} colors are in use. Delete a tag to add another.",
  },

  folderPrompt: {
    newKind: "New folder",
    newHeading: "Name your folder",
    newPlaceholder: "e.g. Read later",
    renameKind: "Rename",
    renameHeading: "Rename folder",
    renamePlaceholder: "Folder name",
  },

  detail: {
    savedPrefix: "Saved",
    source: "Source",
    url: "URL",
    inFolder: "In folder",
  },

  transfer: {
    heading: "Export & import",
    exportLabel: "Export",
    importLabel: "Import",
    exported: "exported {when}",
    chooseAnother: "Choose another file",
    hint: "Merging keeps what you have, a shelf whose name you already use pours its cards into yours. Replacing discards this cabinet for that one.",
    drop: "Drop a cabinet file, or click to choose",
    unreadable: "This file is not JSON, so there is nothing to read.",
    newer: "This file comes from a newer version of thoughtcabinet.",
    empty: "This file has no shelves in it.",
  },

  sync: {
    heading: "Your cabinet",
    places: "Where it lives",
    placesEmpty: "In this browser, and nowhere else yet.",
    addPlace: "Add a place",

    download: {
      label: "This computer",
      detail: "a file you download",
      when: "when you ask",
    },

    roles: {
      home: "Home",
      mirror: "Copy",
      follow: "Read only",
    },

    cadences: {
      live: "Live",
      hourly: "Hourly",
      manual: "When you ask",
    },

    connect: {
      heading: "Where should your cabinet live?",
      folder: "A folder on this computer",
      folderSub: "iCloud Drive, Dropbox, Syncthing, a network drive",
      github: "GitHub",
      githubSub: "A repository, with a history",
      drive: "Google Drive",
      onedrive: "OneDrive",
      webdav: "Your own server",
      webdavSub: "WebDAV: Nextcloud, Synology, rclone",
      file: "This computer",
      fileSub: "A file you download and keep",
      unavailable: "Not here",
      needsChromium:
        "The folder needs Chrome, Edge, Brave or Arc. Safari and Firefox ship no folder picker.",
      soon: "Not wired up in this version yet.",
    },

    fields: {
      owner: "Owner",
      ownerHint: "Or paste the repository's address",
      repo: "Repository",
      token: "Token",
      tokenHint: "A fine grained token with Contents: Read and write, on this repository alone.",
      tokenLink: "Make one on github.com",
      path: "File",
      pathHint: "Where in the repository it goes. Left alone, thoughtcabinet.json at the root.",
      connect: "Connect",
      connecting: "Connecting…",
    },

    refused: {
      invalid: "That is not a repository this can reach. Check the owner and the name.",
      auth: "GitHub would not take that token. Check it, or make a new one.",
      gone: "No repository by that name, or the token cannot see it.",
      failed: "That did not go through. Nothing has been connected.",
    },

    actions: {
      syncNow: "Sync now",
      restore: "Restore",
      disconnect: "Disconnect",
      disconnectArmed: "Disconnect for real",
      resume: "Continue",
      makeHome: "Make this the home",
    },

    states: {
      synced: "Synced with {name}",
      working: "Syncing with {name}",
      pending: "Waiting to reach {name}",
      paused: "Waiting for permission to reach {name}",
      conflict: "{name} is holding a question for you",
      blocked: "{name} needs a hand",
    },

    lastSynced: "synced {when}",
    never: "not yet",
    thisBrowser: "This browser",
    conflictsFolder: "Conflicts",

    adopt: {
      heading: "There is already a cabinet here",
      question:
        "{name} holds a cabinet of its own. Yours can take its place, or sit beside it under a name of this machine.",
      keepMine: "Replace it with mine",
      keepBoth: "Keep both",
      labelPrompt: "What should this machine be called?",
    },

    reconcile: {
      heading: "Two cabinets",
      question:
        "{name} holds one cabinet and this browser holds another. Whichever you pick, the other is saved beside it first.",
      keepBoth: "Keep both",
      keepMine: "Keep mine",
      keepTheirs: "Keep theirs",
    },

    conflict: {
      heading: "Two versions",
      question:
        "Both sides moved since they last agreed, and there is no earlier copy to work back from. Whichever you pick, the other is saved beside it first.",
      keepBoth: "Keep both",
      keepMine: "Keep mine",
      keepTheirs: "Keep theirs",
    },

    stray: {
      heading: "Another copy turned up",
      question:
        "Your sync app left {name} beside your cabinet, and it reads as a cabinet of its own. Merging brings in whatever it holds that is missing here, and changes nothing that is not.",
      keepBoth: "Merge it in",
      keepMine: "Leave it there",
    },

    problems: {
      newer: "A newer version of thoughtcabinet wrote this. Update this browser and it carries on.",
      unreadable: "What is there is not a cabinet file, so nothing has been written over it.",
      empty: "What is there has no shelves in it, so nothing has been written over it.",
      auth: "This needs you to sign in again.",
      permission: "This is waiting on permission that has not been given.",
      denied: "This place refused the change.",
      offline: "No network. Everything is still saved here.",
      cors: "Your server did not allow this browser to reach it.",
      mixedContent: "That address is not HTTPS, so the browser will not open it.",
      tooLarge: "There is no room left there for the cabinet.",
      readonly: "This place can be read but not written to.",
      gone: "This place is not there any more.",
      failed: "That did not go through. It will try again.",
    },
  },

  storage: {
    quota:
      "This browser's storage is full, so your most recent change was not saved. Export your cabinet to keep a copy, then delete a few items to make room.",
    unavailable: "This browser is blocking local storage. Nothing you change here will be saved.",
  },

  display: {
    color: "Color",
    cards: "Cards",
    cardsNote: "the surface saves sit on",
    cream: "Cream",
    language: "Language",
    languageNote: "the words on screen",
  },

  colors: {
    blue: "Blue",
    green: "Green",
    mono: "Mono",
    ultramarine: "Ultramarine",
    cobalt: "Cobalt",
    navy: "Navy",
    midnight: "Midnight",
    emerald: "Emerald",
    viridian: "Viridian",
    forest: "Forest",
    pine: "Pine",
    paper: "Paper",
    linen: "Linen",
    graphite: "Graphite",
    onyx: "Onyx",
  },

  icons: {
    "book-open": "Book",
    play: "Play",
    "flask-conical": "Flask",
    terminal: "Terminal",
    hash: "Hash",
    bookmark: "Bookmark",
    lightbulb: "Lightbulb",
    star: "Star",
    heart: "Heart",
    music: "Music",
    camera: "Camera",
    palette: "Palette",
    briefcase: "Briefcase",
    "graduation-cap": "Graduation cap",
    coffee: "Coffee",
    globe: "Globe",
    "code-xml": "Code",
    "pen-tool": "Pen",
    archive: "Archive",
    inbox: "Inbox",
    map: "Map",
    compass: "Compass",
    sparkles: "Sparkles",
    newspaper: "Newspaper",
    leaf: "Leaf",
    "gamepad-2": "Controller",
    "shopping-bag": "Shopping bag",
    plane: "Plane",
  },
};
