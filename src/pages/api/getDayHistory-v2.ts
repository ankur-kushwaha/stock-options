import {SmartAPI } from "smartapi-javascript"
import ZerodhaInstrument from '../../models/instrument';
import dbConnect from '../../middleware/mongodb'
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

export async function getCandleData({
  daysAgo,
  range,
  defaultExchange,
  tradingsymbol,
  interval
}){
  await smart_api.generateSession("A631449", "Kushwaha1@")
  let today  = new Date();

  let toDate = date.addDays(today,-daysAgo)
  let fromDate = date.addDays(today,-daysAgo-1)
  if(range>1){
    fromDate = date.addDays(today,-range)
  }
  
  await dbConnect();
  console.log({'tradingsymbol':tradingsymbol,'exchange':defaultExchange})
  let zerodhaInstrument = await ZerodhaInstrument.findOne({'tradingsymbol':tradingsymbol,'exchange':defaultExchange});
  let token = zerodhaInstrument.toObject().exchange_token;
  let instrumentToken =  zerodhaInstrument.toObject().instrument_token;
  let exchange = zerodhaInstrument.toObject().exchange;

  // let doc = (await AngelInstrument.findOne({'token':token})).toObject();

  let params =  {
    "exchange": exchange||'NSE',
    "symboltoken": token,
    "interval": interval||"ONE_MINUTE",
    "fromdate": date.format(fromDate, 'YYYY-MM-DD 14:00'),  //"2021-02-10 09:00",
    "todate":  date.format(toDate, 'YYYY-MM-DD 15:40')//"2021-03-10 09:20"
  }
  let response;
  try{
    response = await smart_api.getCandleData(params)
  }catch(e){
    console.log('GetDayHistory',e);
  }
  if(!response || !response.data == null){
    console.log('res',response)
    
    throw new Error('No history response from server');
  }
  let data = response.data;
  // console.log('data',response,params);
  
  return {
    data,
    instrumentToken
  };
}

type Options={
  daysAgo?:number,
  interval:string,
  range?:number,
  defaultExchange:string
}

async function getDayHistory(tradingsymbol,options:Options){
  let {
    daysAgo=0,
    interval="ONE_MINUTE",
    range=1,
    defaultExchange='NFO'
  } = options;

  let {data,instrumentToken} = await getCandleData({
    daysAgo,
    interval,
    range,
    tradingsymbol,
    defaultExchange
  })

  // console.log(data);
  
  
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
    let low = Math.min(item[1],item[2],item[3],item[4])
    let high = Math.max(item[1],item[2],item[3],item[4])

    history.push({
      timestamp:item[0],
      open,
      high,
      low,
      close,
      signal : close-open>0?'GREEN':'RED',
      actual:{
        open:item[1],
        high:item[2],
        low:item[3],
        close:item[4],
      },
    })

    prev = history[history.length-1];
  }

  return {
    history,
    instrumentToken
  };
}

export default async function handler(req, res) {
  
  let {instruments, interval,exchange}  = req.query

  instruments = instruments
    .split(",")
    .filter(item=>item.indexOf('BE')==-1)
  
  let {history,instrumentToken}  =await getDayHistory(instruments[0],{
    interval,
    defaultExchange:exchange
  })
  res.status(200).json({instrumentToken,history})
}


export {
  getDayHistory
}