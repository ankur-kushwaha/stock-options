// const fetch = require('node-fetch');


// let currentOrder = null;
// let stockCode = 'NIFTY22MAR17000CE';
// let stockExchange = 'NFO';
// let optionCode = 'NIFTY22APR17000PE'
// let optionExchange = 'NFO'
// let minProfitPct = 20;
// let quantity = 50

// let runnerInterval;
import React, { useEffect, useRef } from 'react'

export type CurrentOrder = {
  product: string,
  tradingsymbol: string,
  quantity: number,
  sellPrice: number,
  last_price: number
}


export function useRunner(config) {
  const {
    optionExchange,
    optionCode,
    quantity,
    stockExchange,
    stockCode,
  } = config;
  const [shouldRun, setShouldRun] = React.useState(false);
  const runnerInterval = React.useRef(null)
  const [counter,setCounter] = React.useState(0);
  const [currentOrder, setCurrentOrder] = React.useState<CurrentOrder>(undefined);
  // const [logs,setLogs] = React.useState([])

  async function start() {
    processTick(currentOrder, config);
    setShouldRun(true);
  }

  function stop() {
    console.log('Stopping process');

    clearInterval(runnerInterval.current);
    setShouldRun(false);
  }

  React.useEffect(() => {

    let id = setTimeout(async() => {
      try {
        if(shouldRun){
          await processTick(currentOrder, config)
        }
      } catch (e) {
        console.error(e);
      }
    }, 30000)
    return () => {
      clearTimeout(id);
    }
  }, [shouldRun, currentOrder, config,counter])

  async function processTick(currentOrder, { optionExchange,
    optionCode,
    minProfitPct }) {

    setCounter(counter+1);

    let lastTick = await getSingal()
    let optionQuote = await getQuote(optionExchange + ":" + optionCode);
    
    console.log({
      signal:lastTick.signal,
      lastTick,
      optionQuote
    });

    if(!lastTick || !optionQuote){
      return;
    }

    if (lastTick && optionQuote) {

      if (lastTick.signal == 'GREEN') {
        if (!currentOrder) {
          currentOrder = await sellOption({ tick: lastTick, optionQuote })
        } else {
          console.log('Order already placed');
        }
      } else if (lastTick.signal == 'RED') {
        if (currentOrder) {

          let optionSellPrice = currentOrder.sellPrice;
          let optionBuyPrice = optionQuote.depth.sell[0].price;

          if ((optionSellPrice - optionBuyPrice) > (optionBuyPrice * minProfitPct / 100)) {

            await buyOption({
              optionBuyPrice,
              tick: lastTick
            });
            setCurrentOrder(null)
            return;
          } else {
            console.log('Buy not triggered', {
              optionSellPrice,
              optionBuyPrice,
              diffRequired: optionBuyPrice * minProfitPct / 100,
              currDiff: optionSellPrice - optionBuyPrice
            });
          }
        } else {
          console.log('No current order');
        }
      }
    }
    if(currentOrder){
      if (optionQuote) {
        currentOrder = {
          ...currentOrder,
          last_price: optionQuote.last_price,
        }
      }
      if (lastTick) {
        currentOrder = {
          ...currentOrder,
          lastTick
        }
      }
    }
    
    setCurrentOrder({
      ...currentOrder
    });
  }

  async function sellOption({ tick, optionQuote }) {
    console.log('Selling Option', tick);

    let currentOrder = {
      product: "",
      tradingsymbol: optionCode,
      quantity: quantity,
      sellPrice: optionQuote.last_price,
      last_price: optionQuote.last_price
    }

    let { order_id: orderId } = await kiteConnect('placeOrder', ['regular', {
      transaction_type: "SELL",
      tradingsymbol: optionCode,
      product: "NRML",
      order_type: "LIMIT",
      price: optionQuote.last_price,
      quantity,
      exchange: optionExchange
    }]);
    console.log('Orderid', orderId);

    let order = await getOrder(orderId)

    while (order.status == 'OPEN' || order.status == 'AMO REQ RECEIVED') {
      console.log('order open', order);
      await timeout(10000);
      order = await getOrder(orderId);
    }

    console.log('Order closed', order);

    if (order.status != 'COMPLETE') {
      throw new Error('Order not complete nor open')
    }

    currentOrder = {
      ...currentOrder,
      product: order.product,
      sellPrice: order.average_price
    }
    console.log('currentorder', currentOrder);
    return currentOrder;
  }

  function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function buyOption({ tick, optionBuyPrice }) {
    console.log('Selling Option', tick);


    let orderId = await kiteConnect('placeOrder', ['regular', {
      transaction_type: "BUY",
      tradingsymbol: optionCode,
      product: "NRML",
      order_type: "LIMIT",
      price: optionBuyPrice,
      quantity,
      exchange: optionExchange
    }]);

    console.log('Orderid', orderId);

    let order = await getOrder(orderId)

    while (order.status == 'OPEN') {
      console.log('order open', order);
      await timeout(2000);
      order = await getOrder(orderId);
    }

    console.log('Order closed', order);

    if (order.status != 'COMPLETE') {
      throw new Error('order not open nor complete');
    }
  }

  async function getOrder(orderId) {
    let orders = await kiteConnect('getOrders');
    if (!orders) {
      return {
        status: "OPEN"
      }

    }
    let order = orders.find(order => order.order_id == orderId)
    if (!order) {
      throw new Error('Invalid orderId: ' + orderId);
    }
    return order;
  }


  async function getQuote(instrument) {
    try {
      const response = await kiteConnect('getQuote', [instrument]);
      return response[instrument]
    } catch (e) {
      console.error(e)
      return undefined;
    }
  }

  async function kiteConnect(method, args = []) {
    let url = `http://localhost:3000/api/kiteConnect?method=${method}&args=${JSON.stringify(args || [])}`
    console.log('kiteConnect', url);
    return await fetch(url).then(res => res.json());
  }

  async function getSingal() {
    try {
      const response = await fetch(`http://localhost:3000/api/getDayHistory-v2?exchange=${stockExchange}&instruments=${stockCode}&interval=ONE_MINUTE`);
      const json = await response.json();
      return json.history[json.history.length - 1]
    } catch (e) {
      console.error(e);
      return undefined
    }
  }

  return {
    start,
    stop,
    currentOrder,
    shouldRun,
    setCurrentOrder
  }
}