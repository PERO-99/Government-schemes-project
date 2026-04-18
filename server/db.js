const path = require('node:path');
const { JsonStore } = require('./store');
const { seedDb } = require('./seed');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

const store = new JsonStore({
  filePath: DB_PATH,
  defaultData: seedDb(),
});

async function getDb() {
  return store.getData();
}

async function updateDb(mutator) {
  return store.update(mutator);
}

module.exports = {
  getDb,
  updateDb,
  DB_PATH,
};
