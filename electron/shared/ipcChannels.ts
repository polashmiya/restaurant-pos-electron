/**
 * Explicit IPC channel names. The preload exposes one method per channel and
 * the main process registers exactly these handlers — nothing else is
 * reachable from the renderer.
 */
export const IPC_CHANNELS = {
  store: {
    get: 'store:get',
    set: 'store:set',
    delete: 'store:delete',
    setMany: 'store:setMany',
    append: 'store:append',
    getAll: 'store:getAll',
    reset: 'store:reset',
  },
  print: {
    receipt: 'print:receipt',
    kot: 'print:kot',
    savePdf: 'print:savePdf',
    getPrinters: 'print:getPrinters',
  },
  data: {
    export: 'data:export',
    pickImport: 'data:pickImport',
    applyImport: 'data:applyImport',
    saveCsv: 'data:saveCsv',
  },
  app: {
    getVersion: 'app:getVersion',
    getInfo: 'app:getInfo',
    setNativeTheme: 'app:setNativeTheme',
    openDataFolder: 'app:openDataFolder',
  },
} as const;
