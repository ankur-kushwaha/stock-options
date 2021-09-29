import { getDayHistory } from "./getDayHistory-v2";
import date from 'date-and-time';
const InstrumentHistory = require('../../models/InstrumentHistory');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}   

async function getCachedResponse(today){
  let cache = await InstrumentHistory.find({today})
  cache = cache.reduce((a,b)=>{
    a[b.stock] = b;
    return a;
  },{})
  // console.log(2,cache);
  return cache;
}


async function saveHistory(stock,date,history){
    
  return await InstrumentHistory.create({
    date,
    ...history
  })
}



const ioHandler = async (req, res) => {

  let cacheBurst = true;
    
  let stocks = ['INFY', 'TCS','WIPRO','HINDALCO','TATASTEEL','VEDL','MINDTREE', 'COFORGE', 'SRF', 'TATAPOWER'];
    
  let today = date.format(new Date(), 'YYYY-MM-DD');
  let cache = await getCachedResponse(today);



  let out = []  ;

  for (let stock of stocks) {
    let history;
    if(!cacheBurst && cache[stock]){
      console.log('Fetching from cache',stock);
      history = cache[stock]
    } else {
      console.log('Fetching from api',stock);
      let dayHistory
      try{
        dayHistory = await getDayHistory(stock, {
          interval: 'ONE_DAY',
          range: 30
        })
      }catch(e){
        continue;
      }

      //   console.log(2,dayHistory)

      dayHistory = dayHistory.reverse();
      
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
  
      let lastChange = (last.actual.close - day2.actual.close) / day2.actual.close * 100
      let day5Change = (last.actual.close - day5.actual.close) / day5.actual.close * 100
      let day10Change = (last.actual.close - day10.actual.close) / day10.actual.close * 100
  
      history = {
        stockPrice:last.actual.close,
        instrumentToken,
        stock,
        signal: dayHistory[0].signal,
        lastChange ,
        lastReverse,
        day5Change,
        day10Change,
        lastChange
      }

      await saveHistory(stock,today,history)
      await sleep(500);
    }
   
    out.push(history)
    
  }

  res.status(200).json({
    out
  })
}

export default ioHandler;