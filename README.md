# PouchDB Advanced Transform Library

[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Greenkeeper badge](https://badges.greenkeeper.io/snowyu/pouchdb-transform.js.svg)](https://greenkeeper.io/)
[![Travis](https://img.shields.io/travis/snowyu/pouchdb-transform.js.svg)](https://travis-ci.org/snowyu/pouchdb-transform.js)
[![Coveralls](https://img.shields.io/coveralls/snowyu/pouchdb-transform.js.svg)](https://coveralls.io/github/snowyu/pouchdb-transform.js)
[![Dev Dependencies](https://david-dm.org/snowyu/pouchdb-transform.js/dev-status.svg)](https://david-dm.org/snowyu/pouchdb-transform.js?type=dev)


Apply a *transform function* to documents before and after they are stored in the database. These functions are triggered invisibly for every `get()`, `put()`, `post()`, `bulkDocs()`, `allDocs()`, `changes()` before or after, and also to documents added via replication.

This allows you to:

* Encrypt and decrypt sensitive document fields
* Compress and uncompress large content (e.g. to avoid hitting [browser storage limits](http://pouchdb.com/faq.html#data_limits))
* Remove or modify documents before storage (e.g. to massage data from CouchDB)

Note: This plugin is modified from [transform-pouch](https://github.com/pouchdb-community/transform-pouch) to enhance it's ability:

+ add the `afterIncoming` and `beforeOutgoing` hook.
  * `incoming` is triggered before saving to database.
    * returns must be an object with `doc` attribute.
      * can pass through extra options in the object to next hook.
  * `afterIncoming` is triggered after saving.
  * `beforeOutgoing` is triggered before getting from database.
  * `outgoing` is triggered after getting from database.

**Note**: This API has not been stable yet. `beforeOutgoing` has not applied to all methods.

### Usage

```
npm install pouchdb-transform
```

And then attach it to the `PouchDB` object:

```js
import PouchDB from 'pouchdb'
import transformPlugin from 'pouchdb-transform';

PouchDB.plugin(transformPlugin)
```

API
--------

When you create a new PouchDB, you need to configure the transform functions:

```ts
var pouch = new PouchDB('mydb');
pouch.transform({
  async incoming(doc, args: IPouchDBWrapperArgs, type: TransformPouchType): ITransformIncomingResult {
    // do something to the document before storage
    return {doc, ...};
  },
  afterIncoming(result: ITransformIncomingResult, type: TransformPouchType): void {
    if (result.ok) {
      // do something to the successful document after storage
    } else {
      // the failed document to save.
    }
  },
  beforeOutgoing(docId: any, args: IPouchDBWrapperArgs, type: TransformPouchType): BeforeOutgoingReturn {
    // do something to the document before retrieval
    // it will skip retrieval and use it as doc if returns
    return this.fCache.get(docId);
  },
  async outgoing(doc: IDoc,
                 args: IPouchDBWrapperArgs,
                 type: TransformPouchType): IDoc {
    // do something to the document after retrieval
    return doc;
  }
});
```

Notes:

* You can provide an `incoming` function, an `outgoing` function, or both.
* Your transform function **must** return the document itself, or a new document (or a promise for such).
* `incoming` functions apply to `put()`, `post()`, `bulkDocs()`, and incoming replications.
* `outgoing` functions apply to `get()`, `allDocs()`, `changes()`, `query()`, and outgoing replications.
* The `incoming`/`outgoing` methods can be async or sync &ndash; just return a Promise for a doc, or the doc itself.
