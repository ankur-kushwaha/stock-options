import React from 'react'
import { getKiteClient } from '../helpers/kiteConnect';
// import getTicks from '../helpers/getTicks';

import Table from '../components/Table';
import Header from '../components/Header';
import Price from '../components/Price';
import schedule from 'node-schedule';


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}   


export default function Holdings({holdings,profile,quotes}) {

  let instruments = holdings.map(item=>item.instrument_token);
  // let [marketDepth, setMarketDepth] = React.useState();
  let [history, setHistory] = React.useState({});
  let [filters,setFilters] = React.useState({});

  
  // console.log(holdings)
  async function getHistory(instruments){
    return fetch('/api/getHistory?instruments='+instruments.join(",")).then(res=>res.json());
  }

  React.useEffect(async ()=>{
    // getTicks(instruments,function(ticks){
    //   setMarketDepth(ticks);
    // });
    console.log(profile)

    let historyData = await getHistory(holdings.map(item=>item.tradingsymbol));
    let out = historyData.history
    console.log(out)
    setHistory(out);
    
  },[])

  // if(marketDepth){
  //   for(let holding of holdings){

  //     holding.last_price = marketDepth[holding.instrument_token].last_price
  //     holding.day_change_percentage = marketDepth[holding.instrument_token].change

  //   }
  // }

  let data = holdings.map(item=>{
    if(history){
      let itemHistory = history[item.tradingsymbol];
      if(itemHistory){
        item = {...item,...itemHistory}
      }
    }
    return item;
  }).filter(item=>{
    if(filters.signal){
      return item.signal == filters.signal
    }
    return item.signal
  })

  let columns = [
    {
      name: 'tradingsymbol',
      selector: 'tradingsymbol',
      cell:row=><a target="_blank" className="has-link-text" href={`https://kite.zerodha.com/chart/web/ciq/NSE/${row.tradingsymbol}/${row.instrument_token}`} rel="noreferrer">{row.tradingsymbol}</a>
    },
    {
      name: 'trend',
      selector: 'signal',
    },
    {
      name: 'Reversed',
      selector: 'lastReverse',
    },
    {
      name: 'Day Change',
      selector: 'day_change_percentage',
      cell:row=><Price>{row.day_change_percentage}</Price>
    },
    {
      name: '5D Change',
      selector: 'day5Change',
      cell:row=><Price>{row.day5Change}</Price>
    },
    {
      name: '10D Change',
      selector: 'day10Change',
      cell:row=><Price>{row.day10Change}</Price>
    },
    {
      name: 'Quantity',
      selector: 'quantity',
    },
    
    {
      name: 'Buy Avg',
      selector: 'average_price',
      cell:row=><>{row.average_price?.toFixed(2)}</>
    },
    {
      name: 'LTP',
      selector: 'last_price',
    },
    {
      name: 'PnL',
      selector: 'pnl',
      cell:row=><Price>{row.pnl}</Price>
    }]
    .map(item=>{
      item.sortable =true;
      return item;
    })

  const onChangeFilters=(key)=>(e)=>{
    setFilters({
      ...filters,
      [key]:e.target.value
    })
  }

  return (
    <>
      <Header userProfile = {profile}></Header>
      <div className="container mt-6">
        <div className="columns">
          <div className="column is-3">
            <div className="filter-item box">
              <div className="is-size-7">
                Trend
              </div>
              <div className="select is-small">
                <select onChange={onChangeFilters('signal')}>
                  <option value="">Select</option>
                  <option>GREEN</option>
                  <option>RED</option>
                </select>
              </div>
            </div>
          </div>
          <div className="column">
            <Table data={data} columns ={columns}></Table>
          </div>
        
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps(ctx) {
  let { req } = ctx;
  let kt = await getKiteClient(req.cookies);
  let profile = await kt.getProfile();
  let holdings = await kt.getHoldings();
  
  return {
    props:{
      holdings,
      profile
    }
    
  }
}
