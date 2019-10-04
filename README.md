# PouchDB Advanced Transform Library

[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Greenkeeper badge](https://badges.greenkeeper.io/snowyu/pouchdb-transform.js.svg)](https://greenkeeper.io/)
[![Travis](https://img.shields.io/travis/snowyu/pouchdb-transform.js.svg)](https://travis-ci.org/snowyu/pouchdb-transform.js)
[![Coveralls](https://img.shields.io/coveralls/snowyu/pouchdb-transform.js.svg)](https://coveralls.io/github/snowyu/pouchdb-transform.js)
[![Dev Dependencies](https://david-dm.org/snowyu/pouchdb-transform.js/dev-status.svg)](https://david-dm.org/snowyu/pouchdb-transform.js?type=dev)


Apply a *transform function* to documents before and after they are stored in the database. These functions are triggered invisibly for every `get()`, `put()`, `post()`, `bulkDocs()`, `allDocs()`, `changes()`, and also to documents added via replication.

This allows you to:

* Encrypt and decrypt sensitive document fields
* Compress and uncompress large content (e.g. to avoid hitting [browser storage limits](http://pouchdb.com/faq.html#data_limits))
* Remove or modify documents before storage (e.g. to massage data from CouchDB)

Note: This plugin is come from transform-pouch, but was renamed to be less confusing. The filter() API is still supported, but deprecated.

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

```js
var pouch = new PouchDB('mydb');
pouch.transform({
  incoming: function (doc) {
    // do something to the document before storage
    return doc;
  },
  outgoing: function (doc) {
    // do something to the document after retrieval
    return doc;
  }
});
```

You can also use Promises:

```js
var pouch = new PouchDB('mydb');
pouch.transform({
  incoming: function (doc) {
    return Promise.resolve(doc);
  },
  outgoing: function (doc) {
    return Promise.resolve(doc);
  }
});
```

Notes:

* You can provide an `incoming` function, an `outgoing` function, or both.
* Your transform function **must** return the document itself, or a new document (or a promise for such).
* `incoming` functions apply to `put()`, `post()`, `bulkDocs()`, and incoming replications.
* `outgoing` functions apply to `get()`, `allDocs()`, `changes()`, `query()`, and outgoing replications.
* The `incoming`/`outgoing` methods can be async or sync &ndash; just return a Promise for a doc, or the doc itself.
