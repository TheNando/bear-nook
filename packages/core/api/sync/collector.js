import { CURRENT_DATABASE_VERSION } from "../../common";
import Database from "../index";
var tfun = require("transfun/transfun.js").tfun;
if (!tfun) {
  tfun = global.tfun;
}

class Collector {
  /**
   *
   * @param {Database} db
   */
  constructor(db) {
    this._db = db;

    this._map = async (i) => {
      const item = { ...i };
      // in case of resolved content
      delete item.resolved;
      // turn the migrated flag off so we don't keep syncing this item repeated
      delete item.migrated;

      return {
        id: item.id,
        v: CURRENT_DATABASE_VERSION,
        ...(await this._serialize(item)),
      };
    };
  }

  shouldCompress(itemType) {
    return itemType === "tiny";
  }

  async collect(lastSyncedTimestamp, force) {
    this._lastSyncedTimestamp = lastSyncedTimestamp;
    this.key = await this._db.user.getEncryptionKey();
    this.force = force;
    return {
      notes: await this._collect(this._db.notes.raw),
      notebooks: await this._collect(this._db.notebooks.raw),
      content: await this._collect(await this._db.content.all()),
      trash: await this._collect(this._db.trash.raw),
      settings: await this._collect([this._db.settings.raw]),
      vaultKey: await this._serialize(await this._db.vault._getKey()),
    };
  }

  _serialize(item) {
    if (!item) return;
    return this._db.context.encrypt(
      this.key,
      JSON.stringify(item),
      this.shouldCompress(item.type)
    );
  }

  _collect(array) {
    if (this.force) {
      return Promise.all(tfun.map(this._map)(array));
    }
    return Promise.all(
      tfun
        .filter(
          (item) => item.dateEdited > this._lastSyncedTimestamp || item.migrated
        )
        .map(this._map)(array)
    );
  }
}
export default Collector;
