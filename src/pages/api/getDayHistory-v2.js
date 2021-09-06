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
  await smart_api.generateSession("A631449", "Kushwaha1@")
  let {exchange,instruments}  = req.query

  instruments = instruments.split(",").filter(item=>item.indexOf('BE')==-1)
  
  let toDate = new Date()
  const fromDate = new Date();

  let query;
  if(exchange == 'NFO'){
    query = { symbol : instruments[0],exch_seg:'NFO'}
  }else{
    query = { symbol : instruments[0],exch_seg:'NSE'}
  }
  console.log(query)
  let doc = await AngelInstrument.findOne(query);

  let params = {
    "exchange": exchange||'NSE',
    "symboltoken": doc.token,
    "interval": "ONE_MINUTE",
    "fromdate": date.format(fromDate, 'YYYY-MM-DD 09:15'),  //"2021-02-10 09:00",
    "todate":  date.format(toDate, 'YYYY-MM-DD 15:15')//"2021-03-10 09:20"
  }
  let response = await smart_api.getCandleData(params)
  let data = response.data;
  

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

  // let profit=0;
  // let profitArr=[];
  // let tradeCount = 0;

  // let currTrend = history[0].signal=='GREEN'?"UP":"DOWN";
  // let orders = [];
  // let maxOrder = 5;
  // for(let item of history){
  //   if(currTrend == 'UP' && item.signal == 'RED'){
  //     //sell signal
  //     //sell all whose price is less than buy price;

  //     item.order=[];
  //     for(let order of orders){
  //       if(!order.isClosed && (item.close - order.close) > (0.2 * order.close)){
  //         item.order.push(order.close);
  //         order.isClosed = true;
  //         order.closedTick = item;
  //         let currProfit = item.actual.close - order.actual.close;
  //         order.profit = currProfit;
  //         profit += currProfit;
  //         profitArr.push(currProfit);
  //       }
  //     }
  //   } 

  //   if(currTrend == 'DOWN' && item.signal == 'GREEN'){
  //     //Buy signal
  //     if(orders.filter(item=>!item.isClosed).length < maxOrder){
  //       orders.push(item);
  //       tradeCount++;
  //       item.order='BUY'
  //     }
      
  //   } 

  //   currTrend = item.signal=='GREEN'?"UP":"DOWN";
  // }

  // //sell the remaining orders
  // let item = history[history.length-1];
  // for(let order of orders){
  //   if(!order.isClosed){
  //     // item.order.push(order.close);
  //     order.isClosed = true;
  //     order.closedTick = item;
  //     let currProfit = item.actual.close - order.actual.close;
  //     order.profit = currProfit;
  //     profit += currProfit;
  //     profitArr.push(currProfit);
  //   }
  // }

  // // console.log(history);

  // let openOrders =  orders.filter(item=>!item.isClosed)
  // let closedOrders =  orders.filter(item=>item.isClosed)

  // let buyAverage = (orders.map(item=>!item.isClosed).reduce((a,b)=>a+b,0))/orders.length;
  // let closePrice = history[0].close;
  

  // res.status(200).json({profit,tradeCount,orders:{
  //   buyAverage,
  //   closePrice
  // },
  // profitArr,
  // openOrders,
  // closedOrders
  // });
    
  res.status(200).json({history})
}
