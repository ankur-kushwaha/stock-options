import { getKiteClient } from "../../helpers/kiteConnect";
let { SmartAPI, WebSocket } = require("smartapi-javascript");
const AngelInstrument = require('../../models/angelInstruments');
const InstrumentHistory = require('../../models/InstrumentHistory');
import date from 'date-and-time';
import { getCandleData } from "./getDayHistory-v2";


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
  let out=[];
  for(let instrument of instruments){
    let history = await getCandleData({
      daysAgo:0,
      range:10,
      defaultExchange:"NSE",
      tradingsymbol:instrument,
      interval:'ONE_DAY'
    })
    out.push(history);
    await sleep(500);
  }

  await InstrumentHistory.create(out)

  res.status(200).json({out})
    
}
