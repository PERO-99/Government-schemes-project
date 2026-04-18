const fs = require('node:fs/promises');
const path = require('node:path');

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath, defaultValue) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) {
      return deepClone(defaultValue);
    }
    throw e;
  }
}

async function writeJsonAtomic(filePath, value) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  const tmpPath = `${filePath}.${Date.now()}.tmp`;
  const payload = JSON.stringify(value, null, 2);
  await fs.writeFile(tmpPath, payload, 'utf8');
  await fs.rename(tmpPath, filePath);
}

class JsonStore {
  constructor({ filePath, defaultData }) {
    this.filePath = filePath;
    this.defaultData = defaultData;
    this._cache = null;
    this._writeQueue = Promise.resolve();
  }

  async load() {
    if (this._cache) return this._cache;
    this._cache = await readJson(this.filePath, this.defaultData);
    return this._cache;
  }

  async getData() {
    return deepClone(await this.load());
  }

  async update(mutator) {
    const run = async () => {
      const data = await this.load();
      await mutator(data);
      await writeJsonAtomic(this.filePath, data);
      return deepClone(data);
    };

    this._writeQueue = this._writeQueue.then(run, run);
    return this._writeQueue;
  }
}

module.exports = {
  JsonStore,
};
