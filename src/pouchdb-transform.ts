import "regenerator-runtime/runtime"
import immediate from 'immediate';
import wrappers from 'pouchdb-wrappers';

/**
 * the key whether not an internal key.
 * @param key the id string.
 * @returns true if it's not an internal key.
 */
function isntInternalKey(key: string): boolean {
  return key[0] !== '_';
}

/**
 * the key whether a local id.
 * @param id the id string
 * @returns true if it's a local key.
 */
function isLocalId(id: string): boolean {
  return /^_local/.test(id);
}

function isUntransformable(doc): boolean {
  const isLocal = typeof doc._id === 'string' && isLocalId(doc._id);
  return isLocal
    ? true
    : doc._deleted
    ? Object.keys(doc).filter(isntInternalKey).length === 0
    : false;
}

export interface ITransformIncomingResult extends IDocReturnResult {
  doc: any;
  args?: IPouchDBWrapperArgs;
  isUntransformable?: boolean;
  [name: string]: any;
}

type TransformIncomingReturn =
  | ITransformIncomingResult
  | Promise<ITransformIncomingResult>;
type BeforeOutgoingReturn =
  | IDoc
  | undefined
  | null
  | Promise<IDoc | undefined | null>;

export interface IDocReturnResult {
  ok?: boolean;
  /** Document ID */
  id?: any;
  /** New document revision token. Available if document has saved without errors. Optional */
  rev?: string;
  /** Error type. Optional */
  error?: string;
  /** Error reason. Optional */
  reason?: string;
}

export interface IDoc {
  _id: any;
  _rev?: any;
  _revisions?: any;
  [name: string]: any;
}

export type TransformPouchType =
  | 'get'
  | 'query'
  | 'bulkDocs'
  | 'put'
  | 'allDocs'
  | 'bulkGet'
  | 'changes';
export interface ITransformPouchConfig {
  incoming?: (
    doc: IDoc,
    args: IPouchDBWrapperArgs,
    type: TransformPouchType
  ) => TransformIncomingReturn;
  afterIncoming?: (
    doc: ITransformIncomingResult,
    type: TransformPouchType
  ) => void | Promise<void>;
  // only for get
  beforeOutgoing?: (
    docId: any,
    args: IPouchDBWrapperArgs,
    type: TransformPouchType
  ) => BeforeOutgoingReturn;
  outgoing?: (
    doc: IDoc,
    args: IPouchDBWrapperArgs,
    type: TransformPouchType
  ) => IDoc | Promise<any>;
}

export interface IPouchDBWrapperArgs {
  base: any; // PouchDB instance
  db?: any; // = base for backwards compatibility
  // tslint:disable-next-line: ban-types
  callback: Function;
  docs: any[];
  docId?: any; // get
  // tslint:disable-next-line: ban-types
  fun?: any;
  options: any;
  [name: string]: any;
}

/**
 * transform the read/write operation of the pouchdb
 * @param config the pouch transform config
 */
export function transform(config: ITransformPouchConfig) {
  const db = this;

  const incoming = function(
    doc,
    args: IPouchDBWrapperArgs,
    type: TransformPouchType
  ): TransformIncomingReturn {
    if (!isUntransformable(doc) && config.incoming) {
      return config.incoming(doc, args, type);
    }
    return { doc, isUntransformable: true };
  };

  const afterIncoming = function(
    doc: ITransformIncomingResult,
    args: IPouchDBWrapperArgs,
    result: IDocReturnResult | undefined,
    type: TransformPouchType
  ) {
    if (!isUntransformable(doc) && config.afterIncoming) {
      if (result) {
        Object.assign(doc, result);
      }
      doc.args = args;
      return config.afterIncoming(doc, type);
    }
  };

  const beforeOutgoing = function(
    docId: any,
    args: IPouchDBWrapperArgs,
    type: TransformPouchType
  ): BeforeOutgoingReturn {
    const options = args.options;
    if (
      !isLocalId(docId) &&
      config.beforeOutgoing &&
      (!options ||
        !(
          options.rev ||
          options.revs ||
          options.revs_info ||
          options.open_revs
        ))
    ) {
      return config.beforeOutgoing(docId, args, type);
    }
  };

  const outgoing = function(
    doc: IDoc,
    args: IPouchDBWrapperArgs,
    type: TransformPouchType
  ) {
    if (!isUntransformable(doc) && config.outgoing) {
      return config.outgoing(doc, args, type);
    }
    return doc;
  };

  const handlers: any = {};

  if (db.type() === 'http') {
    handlers.query = function(orig, args: IPouchDBWrapperArgs) {
      const none = {};
      return orig().then(function(res) {
        return Promise.all(
          res.rows.map(function(row) {
            if (row.doc) {
              return outgoing(row.doc, args, 'query');
            }
            return none;
          })
        ).then(function(resp) {
          resp.forEach(function(doc, i) {
            if (doc === none) {
              return;
            }
            res.rows[i].doc = doc;
          });
          return res;
        });
      });
    };
  }

  handlers.get = function(orig, args: IPouchDBWrapperArgs) {
    return Promise.resolve(beforeOutgoing(args.docId, args, 'get'))
      .then(function(doc) {
        return doc || orig();
      })
      .then(function(res) {
        if (Array.isArray(res)) {
          const none = {};
          // open_revs style, it's a list of docs
          return Promise.all(
            res.map(function(row) {
              if (row.ok) {
                return outgoing(row.ok, args, 'get');
              }
              return none;
            })
          ).then(function(resp) {
            resp.forEach(function(doc, i) {
              if (doc === none) {
                return;
              }
              res[i].ok = doc;
            });
            return res;
          });
        } else {
          return outgoing(res, args, 'get');
        }
      });
  };

  handlers.bulkDocs = async function(orig, args: IPouchDBWrapperArgs) {
    for (let i = 0; i < args.docs.length; i++) {
      args.docs[i] = incoming(args.docs[i], args, 'bulkDocs');
    }

    return Promise.all(args.docs)
      .then(function(docs: ITransformIncomingResult[] | any) {
        args.docs = docs.map(item => item.doc);

        return Promise.all([docs, orig()]);
      })
      .then(function([docs, results]) {
        // docs = docs.filter(item => !item.isUntransformable);
        docs = docs
          .map((item, i: number) => {
            const r: IDocReturnResult | undefined = results.filter(
              result => result.id === item.doc._id)[0] || results[i];
            return afterIncoming(item, args, r, 'bulkDocs');
            // // fix[#5775](https://github.com/pouchdb/pouchdb/issues/5775)
            // // bulkDocs with new_edits: false always returns empty array
            // // Yeh its a little weird, but that is what CouchDB returns and
            // // we certainly arent deviating from compatibility here, its the core of the replicator
            // // But this make my afterIncoming error!!!
            // // 这个bug只要在pouchdb-core中 _bulkDocs 注释掉filter即可，模仿couchdb连错误都要模仿，真可以。
            // // fix: issue#5775 这是因为 builkDocs 当new_edits=false 没有错误总是返回空数组[]的bug导致。
            // else if (!results.length) {
            //   r = {ok: true, id: item.doc._id};
            // } else r = undefined;
            // return Promise.resolve().then(() => {
            //   // 同样是上面的错误引起
            //   if (r && r.ok && !r.rev) return db.get(r.id);
            // }).then( aDoc => {

            //   if (aDoc) r.rev = aDoc._rev;

            // }).then(() => afterIncoming(item, args, r, 'bulkDocs'));
          })
          .filter(Boolean);
        return Promise.all(docs).then(() => results);
        // return results;
      });
  };

  handlers.put = function(orig, args: IPouchDBWrapperArgs) {
    if (args.base._put) {
      // Not all adapters have a dedicated put implementation. such as 'http'
      // Some reuse the bulkDocs API for that. Unfortunately not all.
      // Therefore only adapters with a specific PUT implementation
      // are overwritten here. Others are already handled through the
      // bulkDocs overwrite.
      return Promise.resolve()
        .then(function() {
          return incoming(args.doc, args, 'put');
        })
        .then(function(transformedDocument) {
          args.doc = transformedDocument.doc;
          return Promise.all([transformedDocument, orig()]);
        })
        .then(function([transformedDocument, result]) {
          return Promise.resolve(
            afterIncoming(transformedDocument, args, result, 'put')
          ).then(() => result);
        });
    } else {
      return orig();
    }
  };

  handlers.allDocs = function(orig, args: IPouchDBWrapperArgs) {
    return orig().then(function(res) {
      const none = {};
      return Promise.all(
        res.rows.map(function(row) {
          if (row.doc) {
            return outgoing(row.doc, args, 'allDocs');
          }
          return none;
        })
      ).then(function(resp) {
        resp.forEach(function(doc, i) {
          if (doc === none) {
            return;
          }
          res.rows[i].doc = doc;
        });
        return res;
      });
    });
  };

  handlers.bulkGet = function(orig, args: IPouchDBWrapperArgs) {
    return orig().then(function(res) {
      const none = {};
      return Promise.all(
        res.results.map(function(result) {
          if (result.id && result.docs && Array.isArray(result.docs)) {
            return {
              docs: result.docs.map(function(doc) {
                if (doc.ok) {
                  return { ok: outgoing(doc.ok, args, 'bulkGet') };
                } else {
                  return doc;
                }
              }),
              id: result.id
            };
          } else {
            return none;
          }
        })
      ).then(function(results) {
        return { results };
      });
    });
  };

  handlers.changes = function(orig, args: IPouchDBWrapperArgs) {
    function modifyChange(change) {
      if (change.doc) {
        return Promise.resolve(outgoing(change.doc, args, 'changes')).then(
          function(doc) {
            change.doc = doc;
            return change;
          }
        );
      }
      return Promise.resolve(change);
    }

    function modifyChanges(res) {
      if (res.results) {
        return Promise.all(res.results.map(modifyChange)).then(function(
          results
        ) {
          res.results = results;
          return res;
        });
      }
      return Promise.resolve(res);
    }

    const changes = orig();
    // override some events
    const origOn = changes.on;
    changes.on = function(event, listener) {
      if (event === 'change') {
        return origOn.apply(changes, [
          event,
          function(change) {
            modifyChange(change).then(function(resp) {
              immediate(function() {
                listener(resp);
              });
            });
          }
        ]);
      } else if (event === 'complete') {
        return origOn.apply(changes, [
          event,
          function(res) {
            modifyChanges(res).then(function(resp) {
              immediate(function() {
                listener(resp);
              });
            });
          }
        ]);
      }
      return origOn.apply(changes, [event, listener]);
    };

    const origThen = changes.then;
    changes.then = function(resolve, reject) {
      return origThen.apply(changes, [
        function(res) {
          return modifyChanges(res).then(resolve, reject);
        },
        reject
      ]);
    };
    return changes;
  };
  wrappers.installWrapperMethods(db, handlers);
}
