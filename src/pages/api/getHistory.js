let { SmartAPI } = require("smartapi-javascript");
const InstrumentHistory = require('../../models/InstrumentHistory');
import date from 'date-and-time';
import dbConnect from '../../middleware/mongodb'
import { getCandleData } from './getDayHistory-v2';
import { getHistory } from './updateHistory';


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

export function processHistory(data){


  let first = data[0];
  let prev = {
    timestamp:first[0],
    close : (first[1]+first[2]+first[4]+first[3])/4,
    open : (first[1]+first[4])/2
  }

  let history = []
  for(let item of data){
    let open = Number(((prev.open+prev.close)/2).toFixed(2));
    let close = Number(((item[1]+item[2]+item[3]+item[4])/4).toFixed(2));

    history.push({
      actual:{
        close:item[4],
        open:item[1]
      },
      timestamp:item[0],
      close,
      open,
      signal : close-open>0?'GREEN':'RED'
    })

    prev = history[history.length-1];
  }

  let dayHistory = history.reverse();
      
  let last = dayHistory[0];
  let day2 = dayHistory[1];
  let day5 = dayHistory[4];
  let day10 = dayHistory[9];

  let instrumentToken = last.instrumentToken;
  let lastReverse = dayHistory.findIndex(item=>{
    if(last.signal == 'RED'){
      return item.signal == 'GREEN'
    }else{
      return item.signal == 'RED'
    }    
  });
  if(lastReverse == -1){
    lastReverse = dayHistory.length;
  }

  let lastChange = (last.actual.close - day2.actual.close) / day2.actual.close * 100
  let day5Change = (last.actual.close - day5.actual.close) / day5.actual.close * 100
  let day10Change = (last.actual.close - day10.actual.close) / day10.actual.close * 100

  return  {
    stockPrice:last.actual.close,
    instrumentToken,
    signal: dayHistory[0].signal,
    lastChange ,
    lastReverse,
    day5Change,
    day10Change,
    lastChange
  }
  
}

export default async function handler(req, res) {
  await dbConnect()
  await smart_api.generateSession("A631449", "Kushwaha1@")
  let instruments = req.query.instruments.split(",").filter(item=>item.indexOf('BE')==-1)
  let skipCache = Boolean(req.query.skipCache);

  let today = date.format(new Date(),'YYYY-MM-DD') //2021-09-27"

  let history = {},noData=[];
  for(let instrument of instruments){
    let data = await InstrumentHistory.findOne({name:instrument,date:today}).exec();
    
    if(!data || skipCache){
      console.log('Reading from server',instrument)
      // noData.push(instrument)
      let candleData;

      try{
      
        candleData = await getCandleData({
          daysAgo:0,
          range:20,
          defaultExchange:"NSE",
          tradingsymbol:instrument,
          interval:'ONE_DAY'
        });
     
        if(candleData && candleData.data){
          history[instrument] = {
            name:instrument,
            date:today,
            ...processHistory(candleData.data)
          }

          await InstrumentHistory.remove({ name:instrument });
          await InstrumentHistory.create({
            ...history[instrument],
          })
        }else{
          console.log('history fetch failed',instrument)
        }
      }catch(e){
        console.log(1,e);
        noData.push(instrument)
      }

      
    }else{
      console.log('Reading from cache',instrument)
      history[instrument] = data;
    }
  }

  res.status(200).json({history,noData})
    
}
