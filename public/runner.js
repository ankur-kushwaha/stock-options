// const fetch = require('node-fetch');


let currentOrder = null;
let stockCode = 'NIFTY22MAR17000CE';
let stockExchange = 'NFO';
let optionCode = 'NIFTY22APR17000PE'
let optionExchange = 'NFO'
let minProfitPct = 20;
let quantity = 50

let runnerInterval;

async function start(){
  await runner();
}

function stop(){
  clearInterval(runnerInterval)
}

async function runner(){
  await processTick()
  runnerInterval = setInterval(processTick,30000)
}

async function processTick(){
  let lastTick = await getSingal()
  
  console.log('lastTick',lastTick);
  
  if(lastTick.signal == 'GREEN'){
    if(!currentOrder){
      await sellOption({tick:lastTick})
    }else{
      console.log('Order already placed');
    }  
  }else if(lastTick.signal == 'RED'){
    if(currentOrder){
      let optionQuote = await getQuote(optionExchange+":"+optionCode);
      let optionSellPrice = currentOrder.sellPrice;
      let optionBuyPrice = optionQuote.depth.sell[0].price;
      
     

      if((optionSellPrice-optionBuyPrice) > (optionBuyPrice*minProfitPct/100)){
        
        await buyOption({
          optionQuote,
          optionBuyPrice,
          tick:lastTick
        });
        currentOrder = null;
      }else{
        console.log('Buy not triggered',{
          optionSellPrice,
          optionBuyPrice,
          diffRequired:optionBuyPrice*minProfitPct/100
        });
      }
        
    }else{
      console.log('No current order');
    }
  }
}

async function sellOption({tick}){
  console.log('Selling Option',tick);
  currentOrder = {
    tick
  }

  let optionQuote = await getQuote(optionExchange+":"+optionCode);

  let {order_id:orderId} = await kiteConnect('placeOrder',['regular',{
    transaction_type:"SELL", 
    tradingsymbol:optionCode,
    product:"NRML",
    order_type:"LIMIT",
    price:optionQuote.last_price,
    quantity,
    exchange:optionExchange
  }]);
  console.log('Orderid',orderId);

  let order = await getOrder(orderId)

  while(order.status == 'OPEN'){
    console.log('order open',order);
    await timeout(2000);
    order = await getOrder(orderId);
  }
  
  console.log('Order closed',order);

  if(order.status != 'COMPLETE'){
    throw new Error('Order not complete nor open')
  }

  currentOrder={
    tick,
    order,
    sellPrice : order.average_price
  }
  console.log('currentorder',currentOrder);
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function buyOption({tick,optionBuyPrice}){
  console.log('Selling Option',tick);


  let orderId = await kiteConnect('placeOrder',['regular',{
    transaction_type:"BUY", 
    tradingsymbol:optionCode,
    product:"NRML",
    order_type:"LIMIT",
    price:optionBuyPrice,
    quantity,
    exchange:optionExchange
  }]);

  console.log('Orderid',orderId);

  let order = await getOrder(orderId)

  while(order.status == 'OPEN'){
    console.log('order open',order);
    await timeout(2000);
    order = await getOrder(orderId);
  }
  
  console.log('Order closed',order);

  if(order.status != 'COMPLETE'){
    process.exit(1);
  }

  currentOrder= null;
}

async function getOrder(orderId){
  let orders = await kiteConnect('getOrders');
  if(!orders){
    return {
      status:"OPEN"
    }

  }
  let order = orders.find(order=>order.order_id == orderId)
  if(!order){
    throw new Error('Invalid orderId: '+ orderId);
  }
  return order;
}


async function getQuote(instrument){
  const response = await kiteConnect('getQuote',[instrument]);
  return response[instrument]
}

async function kiteConnect(method,args){
  let url = `http://localhost:3000/api/kiteConnect?method=${method}&args=${JSON.stringify(args||[])}`
  console.log('kiteConnect',url);
  return await fetch(url).then(res=>res.json());
}

async function getSingal(){
  const response = await fetch(`http://localhost:3000/api/getDayHistory-v2?exchange=${stockExchange}&instruments=${stockCode}&interval=ONE_MINUTE`);
  const json = await response.json();
  return json.history[json.history.length-1]
}

