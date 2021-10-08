This is a starter template for [Learn Next.js](https://nextjs.org/learn). 

## Update instruments
* Download instruments csv from kite docs 
https://kite.trade/docs/connect/v3/market-quotes/
https://api.kite.trade/instruments

* mongoimport --uri "mongodb+srv://ankur:ankur@cluster0.wgb6k.mongodb.net/myFirstDatabase?authSource=admin&replicaSet=atlas-12lvf6-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true" --collection allStocks --drop --file ~/Downloads/instruments.csv --type csv --headerline