import "core-js/stable"
import "regenerator-runtime/runtime"

import Pouch from 'pouchdb-core'
import mapreducePlugin from 'pouchdb-mapreduce'
import replicationPlugin from 'pouchdb-replication'
import memoryPlugin from 'pouchdb-adapter-memory'
import httpPlugin from 'pouchdb-adapter-http'

import transformPlugin from "../src"


Pouch.plugin(mapreducePlugin)
Pouch.plugin(replicationPlugin)
Pouch.plugin(memoryPlugin)
Pouch.plugin(httpPlugin)
Pouch.plugin(transformPlugin as any)
// Pouch.prototype.transform = transform;


export default Pouch;
