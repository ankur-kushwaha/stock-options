// db.ts
import Dexie, { Table } from 'dexie';

export interface Instrument {
  token?: string
  symbol: string
  name: string
  expiry: string
  strike: string
  lotsize: string
  instrumenttype: string
  exch_seg: string
  tick_size: string
}


export class MySubClassedDexie extends Dexie {
  // 'friends' is added by dexie when declaring the stores()
  // We just tell the typing system this is the case
  instruments!: Table<Instrument>; 

  constructor() {
    super('instruments');
    this.version(1).stores({
      instruments: '++symbol, token, name,exch_seg' // Primary key and indexed props
    });
  }
}

export const db = new MySubClassedDexie();