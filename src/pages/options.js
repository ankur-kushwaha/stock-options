import React from 'react';
import { useEffect } from 'react'
import io from 'socket.io-client'
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Table from '../components/Table';

import { postData } from '../helpers';

export default function socketIO() {

  let [state, setState] = React.useState({
    optionsData: {}
  });
  let [ticks, setTicks] = React.useState([]);

  useEffect(() => {

    const socket = io()

    socket.on('connect', () => {
      console.log('connect')

      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());

      socket.emit('init2', {
        tradingsymbols: ['TCS', 'INFY', 'TECHM', 'TATASTEEL', 'COFORGE', 'MPHASIS', 'APOLLOHOSP','BAJAJFINSV', 'WIPRO','HINDUNILVR','TATAPOWER'],
        expiry: params.expiry || '2021-09-30'//'2021-08-26'
      })
    })
    socket.on('ticks', data => {
      console.log("ticks", data);
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

    let stocks = ticks.filter(item => item.instrumentType == 'STOCK').reduce((a, b) => {
      a[b.instrument.tradingsymbol] = {
        price: b.tick.last_price
      };
      return a
    }, {});

    let newStocks = { ...state.stocks, ...stocks };

    // console.log(stocks);

    let optionsData = ticks
      .filter(item => item.instrumentType == 'OPTIONS' 
      && item.instrument.instrument_type == 'CE' 
      && item.tick.depth.sell[0].price != 0
      && item.tick.depth.sell[0].price*item.instrument.lot_size < 200000) 
      .map(item => {
        return {
          name: item.instrument.name,
          tradingsymbol: item.instrument.tradingsymbol,
          depth: item.tick.depth,
          lotSize: item.instrument.lot_size,
          strike: item.instrument.strike,
          expiry: item.instrument.expiry,
          instrumentType: item.instrument.instrument_type
        }
      }).reduce((a, b) => {
        if (a[b.name]) {
          a[b.name][b.tradingsymbol] = b;
        } else {
          a[b.name] = {
            [b.tradingsymbol]: b
          };
        }
        return a;
      }, {})

    // console.log('optionsData',optionsData,state.optionsData);

    let newOptionsData = { ...state.optionsData };
    for (let stockCode in optionsData) {
      if (!newOptionsData[stockCode]) {
        newOptionsData[stockCode] = {}
      }
      newOptionsData[stockCode] = { ...newOptionsData[stockCode], ...optionsData[stockCode] }
    }

    let bestOptions = [];
    for (let stockCode in newOptionsData) {
      let stockPrice = newStocks[stockCode].price;
      let best = {
        stockCode,
        breakevenChg:Number.POSITIVE_INFINITY,
        timeValue: 1000
      }
      let secondbest;

      for (let option of Object.values(newOptionsData[stockCode])) {
        let optionPrice = option.depth.sell[0].price;
        
        
        
        let breakeven = option.strike + optionPrice;
        let timeValue = breakeven - stockPrice;

        let breakevenChg = timeValue*100/stockPrice;

        
        if (breakevenChg < best.breakevenChg) {
          secondbest = best;
          best = {
            stockPrice,
            stockCode,
            timeValue,
            breakevenChg,
            breakeven,
            option
          }
        }
      }
      if (best.option) {
        bestOptions.push(best)
      }
      if (secondbest.option) {
        bestOptions.push(secondbest)
      }

    }

    setState({
      optionsData: newOptionsData,
      stocks: newStocks,
      bestOptions
    })

  }, [ticks])


  if (!state.bestOptions) {
    return <></>
  }

  let tableData = state.bestOptions.map(item => {
  
    let timeValue = Number(item.timeValue.toFixed(2))

    let price = (item.option.depth.sell[0].price).toFixed(2)
    return {
      stockCode: item.stockCode,
      stockPrice: item.stockPrice,
      tradingsymbol: item.option.tradingsymbol,
      expiry: item.option.expiry,
      strike: item.option.strike,
      lotSize: item.option.lotSize,
      timeValue,
      price,
      breakeven:item.breakeven,
      breakevenChg:item.breakevenChg,
      bidPrice: (item.option.depth.buy[0].price).toFixed(2),
      investment: (item.option.lotSize * item.option.depth.sell[0].price).toFixed(2)
    }
  }).sort((a,b)=>a.breakevenChg-b.breakevenChg);

  const handleClick = (item, type) => () => {
    let price = item.price, transactionType = 'BUY';

    if (type == 'SELL') {
      transactionType = 'SELL'
    } else if (type == 'AVG_BUY') {
      price = ((Number(item.price) + Number(item.bidPrice)) / 2).toFixed(1)
    }

    window.open(`/api/createOrder?tradingsymbol=${item.tradingsymbol}&quantity=${item.lotSize}&price=${price}&transactionType=${transactionType}`, "_blank");

  }

  const columns = [

    {
      name: 'tradingsymbol',
      selector: 'tradingsymbol',
      sortable: true,
      grow: 1
    },
    {
      name: 'lotSize',
      selector: 'lotSize',
      sortable: true,
      grow: 0
    },
    {
      name: 'buyPrice',
      selector: 'bidPrice',
      sortable: true,
      grow: 0
    },
    {
      name: 'sellPrice',
      selector: 'price',
      sortable: true,
      grow: 0
    },

    {
      name: 'investment',
      selector: 'investment',
      sortable: true,
      grow: 0
    },
    {
      name: 'stockCode',
      selector: 'stockCode',
      sortable: true,
      cell: row => <a target="_blank" href={"/socketio?tradingsymbol=" + row.stockCode + "&expiry=" + row.expiry} rel="noreferrer">{row.stockCode} ({row.stockPrice})</a>,
      grow: 1
    },
    {
      name: 'Breakeven',
      selector: 'timeValue',
      sortable: true,
      grow: 1,
      cell:row=><div>
        {row.breakeven} ({row.timeValue})
      </div>
    },
    {
      name: 'TimeLoss',
      selector: 'timeValue',
      sortable: true,
      grow: 1,
      cell:row=><div>
        {row.timeValue * row.lotSize }
      </div>
    },
    {
      name: 'breakevenChg',
      selector: 'breakevenChg',
      sortable: true,
      grow: 0
    },
    
    {
      name: "BUY/SELL",
      cell: item => (<div style={{ whiteSpace: "nowrap" }}>
        <button onClick={handleClick(item, 'AVG_BUY')}>BUY@AVG</button>&nbsp;
        <button onClick={handleClick(item)}>BUY</button>&nbsp;
        <button onClick={handleClick(item, 'SELL')}>SELL</button>
      </div>)
    }
  ]

  function handleChange(e) {
    let expiry = e.target.value;
    let url = window.location.origin + window.location.pathname + "?expiry=" + (expiry || "")
    window.location.href = url;
  }

  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  let { expiry } = params;


  return <>
    <Header tab="options"></Header>
    <div className="container">
    

      <p className="subtitle">
        <div className="select is-small" >
          <select value={expiry} onChange={handleChange}>
            <option>2021-10-28</option>
            <option>2021-09-30</option>
            <option>2021-08-26</option>
          </select>
        </div>
      </p>
        
      
      <div className="columns">

        <div className="column" >
          <Table columns={columns} data={tableData}></Table>
        </div>

      </div>
      


    </div></>
}