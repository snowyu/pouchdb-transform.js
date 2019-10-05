import { basicTests } from './basic-transform';

const dbs = 'testdb,http://localhost:5984/testdb';

dbs.split(',').forEach(function (db) {
  const dbType = /^http/.test(db) ? 'http' : 'local';
  basicTests(db, dbType);
});
