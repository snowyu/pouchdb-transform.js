import Pouch from './setup'

declare const emit: (key, value?) => void;

export function basicTests(dbName, dbType) {
  describe(dbType + ': basic tests', function() {
    jest.setTimeout(30000);

    let db;

    beforeEach(() => {
      db = new Pouch(dbName);
      return db;
    });
    afterEach(() => {
      return db.destroy();
    });

    test('transforms on PUT', () => {
      db.transform({
        incoming: function (doc) {
          doc.foo = 'baz';
          return { doc };
        }
      });
      return db.put({_id: 'foo'}).then(function () {
        return db.get('foo');
      }).then(function (doc) {
        expect(doc._id).toBe('foo');
        expect(doc.foo).toBe('baz');
      });
    });

    test('transforms on PUT, with a promise', () => {
      db.transform({
        incoming: function (doc) {
          doc.foo = 'baz';
          return Promise.resolve({doc});
        }
      });
      return db.put({_id: 'foo'}).then(function () {
        return db.get('foo');
      }).then(function (doc) {
        expect(doc._id).toBe('foo');
        expect(doc.foo).toBe('baz');
      });
    });

    test('transforms on POST', () => {
      db.transform({
        incoming: function (doc) {
          doc.foo = 'baz';
          return {doc};
        }
      });
      return db.post({}).then(function (res) {
        return db.get(res.id);
      }).then(function (doc) {
        expect(doc._id).toEqual(expect.any(String));
        expect(doc.foo).toBe('baz');
      });
    });

    test('transforms on POST, with a promise', () => {
      db.transform({
        incoming: function (doc) {
          doc.foo = 'baz';
          return Promise.resolve({doc});
        }
      });
      return db.post({}).then(function (res) {
        return db.get(res.id);
      }).then(function (doc) {
        expect(doc._id).toEqual(expect.any(String));
        expect(doc.foo).toBe('baz');
      });
    });

    test('transforms on GET', () => {
      db.transform({
        outgoing: function (doc) {
          doc.foo = 'baz';
          return doc;
        }
      });
      return db.put({_id: 'foo'}).then(function () {
        return db.get('foo');
      }).then(function (doc) {
        expect(doc._id).toBe('foo');
        expect(doc.foo).toBe('baz');
      });
    });

    test('transforms on GET, with a promise', () => {
      db.transform({
        outgoing: function (doc) {
          doc.foo = 'baz';
          return Promise.resolve(doc);
        }
      });
      return db.put({_id: 'foo'}).then(function () {
        return db.get('foo');
      }).then(function (doc) {
        expect(doc._id).toBe('foo');
        expect(doc.foo).toBe('baz');
      });
    });

    test('skips local docs', () => {
      db.transform({
        outgoing: function (doc) {
          doc.foo = 'baz';
          return doc;
        }
      });
      return db.put({_id: '_local/foo'}).then(function () {
        return db.get('_local/foo');
      }).then(function (doc) {
        expect(doc._id).toBe('_local/foo');
        expect(doc.foo).toBeFalsy();
      });
    });

    test('skips local docs, incoming', () => {
      db.transform({
        incoming: function (doc) {
          doc.foo = 'baz';
          return {doc};
        }
      });
      return db.put({_id: '_local/foo'}).then(function () {
        return db.get('_local/foo');
      }).then(function (doc) {
        expect(doc._id).toBe('_local/foo');
        expect(doc.foo).toBeFalsy();
      });
    });

    test('skips local docs, post', () => {
      db.transform({
        outgoing: function (doc) {
          doc.foo = 'baz';
          return doc;
        }
      });
      return db.post({_id: '_local/foo'}).then(function () {
        return db.get('_local/foo');
      }).then(function (doc) {
        expect(doc._id).toBe('_local/foo');
        expect(doc.foo).toBeFalsy();
      });
    });

    test('skips local docs, bulkDocs', () => {
      db.transform({
        outgoing: function (doc) {
          doc.foo = 'baz';
          return doc;
        }
      });
      return db.bulkDocs([{_id: '_local/foo'}]).then(function () {
        return db.get('_local/foo');
      }).then(function (doc) {
        expect(doc._id).toBe('_local/foo');
        expect(doc.foo).toBeFalsy();
      });
    });

    test('skips deleted docs', () => {
      let doc: any = {_id: 'foo', foo: {}};
      return db.put(doc).then(function (res) {
        doc._rev = res.rev;
        return db.get('foo');
      }).then(function (doc) {
        let transformCalledOnDelete = false;
        db.transform({
          incoming: function (doc) {
            transformCalledOnDelete = true;
            return {doc};
          }
        });

        return db.remove(doc).then(function () {
          expect(transformCalledOnDelete).toBe(false);
        });
      });
    });

    test('transforms deleted docs with custom properties', () => {
      let doc: any = {_id: 'foo', foo: {}};
      return db.put(doc).then(function (res) {
        doc._rev = res.rev;
        return db.get('foo');
      }).then(function (doc) {
        let transformCalledOnDelete = false;
        db.transform({
          incoming: function (doc) {
            transformCalledOnDelete = true;
            return {doc};
          }
        });

        doc.foo = 'baz';
        doc._deleted = true;
        return db.put(doc).then(function () {
          expect(transformCalledOnDelete).toBe(true);
        });
      });
    });

    test('handles sync errors', () => {
      db.transform({
        incoming: function (doc) {
          doc.foo.baz = 'baz';
          return {doc};
        }
      });
      let doc = {_id: 'foo'};
      return db.put(doc).then(function (res) {
        expect(res).toBeFalsy();
      }).catch(function (err) {
        expect(err).toBeDefined();
      });
    });

    test('handles async errors', () => {
      db.transform({
        incoming: function () {
          return Promise.reject(new Error('flunking you'));
        }
      });
      let doc = {_id: 'foo'};
      return db.put(doc).then(function (res) {
        expect(res).toBeFalsy();
      }).catch(function (err) {
        expect(err).toBeDefined();
      });
    });

    test('handles cancel', () => {
        db.transform();
        let syncHandler = db.sync('my_gateway', {});
        return syncHandler.cancel();
    });

    test('transforms on GET with options', () => {
      db.transform({
        outgoing: function (doc) {
          doc.foo = 'baz';
          return doc;
        }
      });
      return db.put({_id: 'foo'}).then(function () {
        return db.get('foo', {});
      }).then(function (doc) {
        expect(doc._id).toBe('foo');
        expect(doc.foo).toBe('baz');
      });
    });

    test('transforms on GET with missing open_revs', () => {
      db.transform({
        outgoing: function (doc) {
          doc.foo = 'baz';
          return doc;
        }
      });
      return db.put({_id: 'foo'}).then(function () {
        return db.get('foo', {revs: true, open_revs: ['1-DNE']});
      }).then(function (docs) {
        expect(docs).toHaveLength(1);
        expect(docs[0].missing).toBe('1-DNE');
      });
    });

    test('transforms on GET with missing and non-missing open_revs', () => {
      db.transform({
        outgoing: function (doc) {
          doc.foo = 'baz';
          return doc;
        }
      });
      let rev;
      return db.put({_id: 'foo'}).then(function (res) {
        rev = res.rev;
        return db.get('foo', {revs: true, open_revs: ['1-DNE', rev]});
      }).then(function (docs) {
        expect(docs).toHaveLength(2);
        let okRes = docs[0].ok ? docs[0] : docs[1];
        let missingRes = docs[0].ok ? docs[1] : docs[0];
        expect(missingRes.missing).toBe('1-DNE');
        expect(okRes.ok._rev).toBe(rev);
      });
    });

    test('transforms on GET, not found', () => {
      db.transform({
        outgoing: function (doc) {
          doc.foo = 'baz';
          return doc;
        }
      });
      return db.put({_id: 'foo'}).then(function () {
        return db.get('quux');
      }).then(function (doc) {
        expect(doc).toBeFalsy();
      }).catch(function (err) {
        expect(err).toBeDefined();
      });
    });

    test('transforms on bulk_docs', () => {
      db.transform({
        incoming: function (doc) {
          doc.foo = doc._id + '_baz';
          return {doc};
        }
      });
      return db.bulkDocs([{_id: 'toto'}, {_id: 'lala'}]).then(function (res) {
        return db.get(res[0].id).then(function (doc) {
          expect(doc.foo).toBe('toto_baz');
        }).then(function () {
          return db.get(res[1].id);
        }).then(function (doc) {
          expect(doc.foo).toBe('lala_baz');
        });
      });
    });

    test('transforms on bulk_docs, new_edits=false 1', () => {
      db.transform({
        incoming: function (doc) {
          doc.foo = doc._id + '_baz';
          return {doc};
        }
      });
      let docsA =  [{
        "_id": "selenium-global",
        "_rev": "5-3b6e1f9846c7aa2ae80ba871cd8bf084",
        "_deleted": true,
        "_revisions": {
          "start": 5,
          "ids": [
            "3b6e1f9846c7aa2ae80ba871cd8bf084",
            "84870906995eb23f6375900296226df6"
          ]
        }
      }];
      let docsB = [{
        "_id": "selenium-global",
        "_rev": "4-84870906995eb23f6375900296226df6",
        "_revisions": {
          "start": 4,
          "ids": [
            "84870906995eb23f6375900296226df6",
            "941073451900f1d92a9a39dde8938339"
          ]
        }
      }];
      let docsC = [
        {
          "_id": "selenium-global",
          "_rev": "3-8b3a09799ad70999277f0859f0aa1add",
          "_revisions": {
            "start": 3,
            "ids": [
              "8b3a09799ad70999277f0859f0aa1add",
              "10ade0f791a6b0dab76dde12d3ffce74"
            ]
          }
        },
        {
          "_id": "selenium-global",
          "_rev": "2-61cb022c4e5f3a702a969e6ac17fea79",
          "_revisions": {
            "start": 2,
            "ids": [
              "61cb022c4e5f3a702a969e6ac17fea79",
              "54f0c85a4a6329bd8885470aef5104d7"
            ]
          }
        },
        {
          "_id": "selenium-global",
          "_rev": "12-787d8aa4043f18d8a8747708afcce370",
          "_revisions": {
            "start": 12,
            "ids": [
              "787d8aa4043f18d8a8747708afcce370",
              "9d02f7a6634530eafdcc36df0cab54ff",
              "328c111479b9aae37cb0c6c38545059b",
              "c9902a757278d99e60dd1571113687c5",
              "7c8b0e3a8c6191317664ffafe2a6f40a",
              "e3f4590f30f77ecfafa638235a4d4e24",
              "80a589649d8c86e7408d1745edac0484",
              "f7893b80dbeef9566a99c2d879477cf7",
              "67b0eb503ba35fd34c5acab77cf9552e",
              "5b6eeae4b4edf20a2e5b87a333cb9c5c",
              "2913efa5e4a43a53dca80b66bba9b7dc",
              "1c0833f56ec15a816a8b2901b7a48176"
            ]
          }
        }
      ];
      return db.bulkDocs({docs: docsA, new_edits: false}).then(function (results) {
        results.forEach(function (result) {
          expect(result.error).toBeFalsy();
        });
      }).then(function () {
        return db.bulkDocs({docs: docsB, new_edits: false});
      }).then(function (results) {
        results.forEach(function (result) {
          expect(result.error).toBeFalsy();
        });
      }).then(function () {
        return db.bulkDocs({docs: docsC, new_edits: false});
      }).then(function (results) {
        results.forEach(function (result) {
          expect(result.error).toBeFalsy();
        });
      });
    });

    test('transforms on bulk_docs, new_edits=false 2', () => {
      db.transform({
        incoming: function (doc) {
          doc.foo = doc._id + '_baz';
          return {doc};
        }
      });
      let docsA =  [{
        "_id": "selenium-global",
        "_rev": "5-3b6e1f9846c7aa2ae80ba871cd8bf084",
        "_deleted": true,
        "_revisions": {
          "start": 5,
          "ids": [
            "3b6e1f9846c7aa2ae80ba871cd8bf084",
            "84870906995eb23f6375900296226df6"
          ]
        }
      }];
      let docsB = [{
        "_id": "selenium-global",
        "_rev": "4-84870906995eb23f6375900296226df6",
        "_revisions": {
          "start": 4,
          "ids": [
            "84870906995eb23f6375900296226df6",
            "941073451900f1d92a9a39dde8938339"
          ]
        }
      }];
      let docsC = [
        {
          "_id": "selenium-global",
          "_rev": "3-8b3a09799ad70999277f0859f0aa1add",
          "_revisions": {
            "start": 3,
            "ids": [
              "8b3a09799ad70999277f0859f0aa1add",
              "10ade0f791a6b0dab76dde12d3ffce74"
            ]
          }
        },
        {
          "_id": "selenium-global",
          "_rev": "2-61cb022c4e5f3a702a969e6ac17fea79",
          "_revisions": {
            "start": 2,
            "ids": [
              "61cb022c4e5f3a702a969e6ac17fea79",
              "54f0c85a4a6329bd8885470aef5104d7"
            ]
          }
        },
        {
          "_id": "selenium-global",
          "_rev": "12-787d8aa4043f18d8a8747708afcce370",
          "_revisions": {
            "start": 12,
            "ids": [
              "787d8aa4043f18d8a8747708afcce370",
              "9d02f7a6634530eafdcc36df0cab54ff",
              "328c111479b9aae37cb0c6c38545059b",
              "c9902a757278d99e60dd1571113687c5",
              "7c8b0e3a8c6191317664ffafe2a6f40a",
              "e3f4590f30f77ecfafa638235a4d4e24",
              "80a589649d8c86e7408d1745edac0484",
              "f7893b80dbeef9566a99c2d879477cf7",
              "67b0eb503ba35fd34c5acab77cf9552e",
              "5b6eeae4b4edf20a2e5b87a333cb9c5c",
              "2913efa5e4a43a53dca80b66bba9b7dc",
              "1c0833f56ec15a816a8b2901b7a48176"
            ]
          }
        }
      ];
      return db.bulkDocs(docsA, {new_edits: false}).then(function (results) {
        results.forEach(function (result) {
          expect(result.error).toBeFalsy();
        });
      }).then(function () {
        return db.bulkDocs(docsB, {new_edits: false});
      }).then(function (results) {
        results.forEach(function (result) {
          expect(result.error).toBeFalsy();
        });
      }).then(function () {
        return db.bulkDocs(docsC, {new_edits: false});
      }).then(function (results) {
        results.forEach(function (result) {
          expect(result.error).toBeFalsy();
        });
      });
    });

    test('transforms on bulk_docs, object style', () => {
      db.transform({
        incoming: function (doc) {
          doc.foo = doc._id + '_baz';
          return {doc};
        }
      });
      return db.bulkDocs({docs: [{_id: 'toto'}, {_id: 'lala'}]}).then(function (res) {
        return db.get(res[0].id).then(function (doc) {
          expect(doc.foo).toBe('toto_baz');
        }).then(function () {
          return db.get(res[1].id);
        }).then(function (doc) {
          expect(doc.foo).toBe('lala_baz');
        });
      });
    });

    test('transforms on all_docs, incoming', () => {
      db.transform({
        incoming: function (doc) {
          doc.foo = doc._id + '_baz';
          return {doc};
        }
      });
      return db.bulkDocs({docs: [{_id: 'toto'}, {_id: 'lala'}]}).then(function () {
        return db.allDocs({include_docs: true}).then(function (res) {
          expect(res.rows).toHaveLength(2);
          expect(res.rows[0].doc.foo).toBe('lala_baz');
          expect(res.rows[1].doc.foo).toBe('toto_baz');
        });
      });
    });

    test('transforms on all_docs, outgoing', () => {
      db.transform({
        outgoing: function (doc) {
          doc.foo = doc._id + '_baz';
          return doc;
        }
      });
      return db.bulkDocs({docs: [{_id: 'toto'}, {_id: 'lala'}]}).then(function () {
        return db.allDocs({include_docs: true}).then(function (res) {
          expect(res.rows).toHaveLength(2);
          expect(res.rows[0].doc.foo).toBe('lala_baz');
          expect(res.rows[1].doc.foo).toBe('toto_baz');
        });
      });
    });

    test('transforms on all_docs no opts, outgoing', () => {
      db.transform({
        outgoing: function (doc) {
          doc.foo = doc._id + '_baz';
          return doc;
        }
      });
      return db.bulkDocs({docs: [{_id: 'toto'}, {_id: 'lala'}]}).then(function () {
        return db.allDocs().then(function (res) {
          expect(res.rows).toHaveLength(2);
          expect(res.rows[0].doc).toBeFalsy();
          expect(res.rows[1].doc).toBeFalsy();
        });
      });
    });

    // Temporary views are not supported in CouchDB v2.0
    test.skip('transforms on query, incoming', () => {
      db.transform({
        incoming: function (doc) {
          doc.foo = doc._id + '_baz';
          return {doc};
        }
      });
      let mapFun = {
        map: function (doc) {
          emit(doc._id);
        }
      };
      return db.bulkDocs({docs: [{_id: 'toto'}, {_id: 'lala'}]}).then(function () {
        return db.query(mapFun, {include_docs: true}).then(function (res) {
          expect(res.rows).toHaveLength(2);
          expect(res.rows[0].doc.foo).toBe('lala_baz');
          expect(res.rows[1].doc.foo).toBe('toto_baz');
        });
      });
    });

    test.skip('transforms on query, outgoing', () => {
      db.transform({
        outgoing: function (doc) {
          doc.foo = doc._id + '_baz';
          return doc;
        }
      });
      let mapFun = {
        map: function (doc) {
          emit(doc._id);
        }
      };
      return db.bulkDocs({docs: [{_id: 'toto'}, {_id: 'lala'}]}).then(function () {
        return db.query(mapFun, {include_docs: true}).then(function (res) {
          expect(res.rows).toHaveLength(2);
          expect(res.rows[0].doc.foo).toBe('lala_baz');
          expect(res.rows[1].doc.foo).toBe('toto_baz');
        });
      });
    });

    test.skip('transforms on query no opts, outgoing', () => {
      db.transform({
        outgoing: function (doc) {
          doc.foo = doc._id + '_baz';
          return doc;
        }
      });
      let mapFun = {
        map: function (doc) {
          emit(doc._id);
        }
      };
      return db.bulkDocs({docs: [{_id: 'toto'}, {_id: 'lala'}]}).then(function () {
        return db.query(mapFun).then(function (res) {
          expect(res.rows).toHaveLength(2);
          expect(res.rows[0].doc).toBeFalsy();
          expect(res.rows[1].doc).toBeFalsy();
        });
      });
    });

    test('transforms ingoing and outgoing', () => {
      db.transform({
        ingoing: function (doc) {
          doc.foo = doc.foo.toUpperCase();
          return doc;
        },
        outgoing: function (doc) {
          doc.foo = doc.foo.toLowerCase();
          return doc;
        }
      });
      return db.put({_id: 'doc', foo: 'bar'}).then(function () {
        return db.get('doc');
      }).then(function (doc) {
        expect(doc.foo).toBe('bar');
      });
    });
  });
}
