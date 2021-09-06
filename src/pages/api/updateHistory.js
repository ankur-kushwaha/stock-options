import { getKiteClient } from "../../helpers/kiteConnect";
let { SmartAPI, WebSocket } = require("smartapi-javascript");
const AngelInstrument = require('../../models/angelInstruments');
const InstrumentHistory = require('../../models/InstrumentHistory');
import date from 'date-and-time';


let smart_api = new SmartAPI({
  api_key: "bMhFOYF3",    // PROVIDE YOUR API KEY HERE
  // OPTIONAL : If user has valid access token and refresh token then it can be directly passed to the constructor. 
  access_token: "eyJhbGciOiJIUzUxMiJ9.eyJ1c2VybmFtZSI6IkE2MzE0NDkiLCJyb2xlcyI6MCwidXNlcnR5cGUiOiJVU0VSIiwiaWF0IjoxNjMwNTk5NDcwLCJleHAiOjE3MTY5OTk0NzB9.rUqZRJPamffC6lnhbnDamhcOBIIuipvDr0c2Talrk8_MZZX-r2nk4UJ6m9X-rIKupRhPPzjcHjv5TWKp2xMCEg",
  refresh_token: "eyJhbGciOiJIUzUxMiJ9.eyJ0b2tlbiI6IlJFRlJFU0gtVE9LRU4iLCJpYXQiOjE2MzA1OTk0NzB9.vLt-o0u0cf-5LY2oxIGRjNlatqiSbzsRjA1Qtn5TVHorTDMRv_rtQOcCxH493Wvv8ZNQ8OgXqV1PUWkKoas0sw"
});


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}   

export default async function handler(req, res) {

  let kt = await getKiteClient(req.cookies);
  let holdings = await kt.getHoldings();
  
  let instruments = holdings.map(item=>item.tradingsymbol);

  await smart_api.generateSession("A631449", "Kushwaha1@")
  
  
  console.log(instruments)
  //   instruments.length=5;
  let docs = await AngelInstrument.find({name:{$in:instruments},exch_seg:'NSE',symbol:{ $not: /BL/ }});

  // console.log(docs);

  // let profile =  await smart_api.getProfile();
  const toDate = new Date();
  const fromDate = date.addDays(toDate, -10);

  await InstrumentHistory.remove({});

  let out=[];

  for(let doc of docs){
    let params = {
      "exchange": "NSE",
      "symboltoken": doc.token,
      "interval": "ONE_DAY",
      "fromdate": date.format(fromDate, 'YYYY-MM-DD 09:00'),  //"2021-02-10 09:00",
      "todate":  date.format(toDate, 'YYYY-MM-DD 15:00')//"2021-03-10 09:20"
    }
    let data = (await smart_api.getCandleData(params)).data;
    
    let first = data[0];
    let prev = {
      timestamp:first.timestamp,
      close : (first[1]+first[2]+first[4]+first[3])/4,
      open : (first[1]+first[4])/2
    }

    let history = []
    for(let item of data){
      history.push({
        timestamp:item[0].timestamp,
        close:(item[1]+item[2]+item[3]+item[4])/4,
        open : (prev.open+prev.close)/2
      })
      prev = history[history.length-1];
    }

    out.push({
      ...(doc.toObject()),
      timestamp:history[0].timestamp,
      change:0,
      trendCount:0,
      trend:0,
      history
    })

    await sleep(300);
  } 

  await InstrumentHistory.create(out)

  res.status(200).json({docs,out})
    
}
