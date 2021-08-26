import React,{useEffect} from 'react'
import io from 'socket.io-client'

function useTickConnect({instrumentType}={}) {
  let [state, setState] = React.useState({});
  let [ticks, setTicks] = React.useState([]);

  const urlSearchParams = new URLSearchParams(global.window?.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());

  useEffect(() => {

    const socket = io()

    socket.on('connect', () => {
      console.log('connect')
 


      socket.emit('init2', {
        tradingsymbols: [params.tradingsymbol||'TATASTEEL'],
        instrumentType:instrumentType,
        expiry: params.expiry || '2021-09-30'//'2021-08-26'
      })
    })

    socket.on('ticks', data => {
      console.log('ticks', data);
      setTicks(data.ticks);
    })



    socket.on('a user connected', () => {
      console.log('a user connected')
    })

    socket.on('disconnect', () => {
      console.log('disconnect')
    })

  }, []) // Added [] as useEffect filter so it will be executed only once, when component is mounted

  React.useEffect(() => {

    if (!ticks.length) {
      return;
    }
    let stockPrice, stockName;
    let stockData = ticks.filter(item => item.instrumentType == 'STOCK')[0]
    if (stockData) {
      stockPrice = stockData.tick.last_price;
      stockName = stockData.instrument.tradingsymbol;
    } else {
      stockPrice = state.stockPrice;
      stockName = state.stockName;
    }


    let newTicks = ticks
      .filter(item => {
        return item.instrumentType == 'OPTIONS'
      })
      .reduce((a, b) => {
        a[b.instrument.instrument_token] = b;
        return a
      }, {});

    let mergedTicks = { ...state.ticks, ...newTicks };
    console.log(ticks);

    setState({
      ...state,
      ticks: mergedTicks,
      stockName,
      stockPrice
    });
  }, [ticks]);

  function handleChange(e) {
    let expiry = e.target.value;
    let url = window.location.origin + window.location.pathname + "?expiry=" + (expiry || "") + "&tradingsymbol=" + state.stockName
    window.location.href = url;
  }
    
  let tradingsymbols =  ['TCS', 'INFY', 'TECHM', 'TATASTEEL', 'COFORGE', 'MPHASIS', 'APOLLOHOSP','BAJAJFINSV', 'WIPRO','HINDUNILVR','MINDTREE']
    .sort();
    
  function handleSymbolChange(e){
    let stockName = e.target.value;
    let url = window.location.origin + window.location.pathname + "?expiry=" + (params.expiry || "") + "&tradingsymbol=" + stockName
    window.location.href = url;
  }
    
  return {
    handleChange,
    handleSymbolChange,
    tradingsymbols,
    params,
    state
  }

}

export default useTickConnect;