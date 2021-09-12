import { getDayHistory } from "./getDayHistory-v2";

export default async function handler(req, res) {
  // await smart_api.generateSession("A631449", "Kushwaha1@")
  let {daysAgo,tradingsymbol}  = req.query

  let history = await getDayHistory(tradingsymbol,{
    daysAgo
  });
  

  let profit=0;
  let profitArr=[];
  let tradeCount = 0;

  let prevTrend;
  let orders = [];
  let maxOrder = Number(req.query.maxOrder)||10;
  let quantity = Number(req.query.quantity)||200;
  let minChange = Number(req.query.minChange)||10;

  let trySelling = false;

  for(let item of history){
    let currTrend = item.signal == 'GREEN'?"UP":"DOWN";

    if(prevTrend != undefined && currTrend != prevTrend){
    

      if(currTrend == 'UP'){
        //trigger BUY
        if(orders.length < maxOrder){
          orders.push(item);
          tradeCount++;
          item.trigger="BUY"
        }

      }else{
        //trigger SELL
        let remainingOrders = [];
        let maxProfit = Number.NEGATIVE_INFINITY;
        let maxProfitOrderTimestamp;
        for(let order of orders){
          if((item.actual.close - order.actual.close) > (minChange * order.actual.close/100)){
            let currProfit = (item.actual.close - order.actual.close) * quantity;
            order.profit = currProfit;
            profit += currProfit;
            profitArr.push(currProfit);
            item.trigger="SELL"
          }else{
            console.log('SELL BLOCKED','actual',item.actual.close - order.actual.close,'expected',minChange *order.actual.close/100)
            remainingOrders.push(order);
            
            let currProfit = (item.actual.close - order.actual.close) * quantity;

            if(trySelling){
              if(currProfit>maxProfit){
                maxProfit = currProfit;
                maxProfitOrderTimestamp = order.timestamp;
              }
            }
          }
        }

        if(trySelling){
          if(remainingOrders.length != 0 && (remainingOrders.length == orders.length) && orders.length == maxOrder){

            //sell order with maxProfit;
            let orderToDelete = orders.filter(item=>item.timestamp == maxProfitOrderTimestamp)[0];
            let currProfit = (item.actual.close - orderToDelete.actual.close) * quantity;
            profit += currProfit;
            profitArr.push(currProfit);

            remainingOrders = orders.filter(item=>item.timestamp != maxProfitOrderTimestamp);
            
          }
        }

        orders = remainingOrders;

      }
      
    }

    prevTrend = currTrend;

  }

  let pendingOrders={
    profit:0,
    profitArr:[]
  }

  // sell the remaining orders
  let item = history[history.length-1];
  for(let order of orders){
    if(!order.isClosed){
      let currProfit = (item.actual.close - order.actual.close) * quantity;
      order.profit = currProfit;
      pendingOrders.profit += currProfit;
      pendingOrders.profitArr.push(currProfit);
    }
  }

  // console.log(history);

  let openOrders =  orders.filter(item=>!item.isClosed)
  // let closedOrders =  orders.filter(item=>item.isClosed)

  let buyAverage = (orders.map(item=>!item.isClosed).reduce((a,b)=>a+b,0))/orders.length;
  let closePrice = history[0].close;

  let minInvestment = quantity * closePrice * maxOrder;

  res.status(200).json({
    minInvestment,
    query:req.query,
    profit,
    profitPct:profit/minInvestment,
    tradeCount,
    orders:{
      buyAverage,
      closePrice
    },
    profitArr,
    pendingOrders,
    history
  });
    
}
