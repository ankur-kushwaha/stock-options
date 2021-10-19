import React from 'react'
import { getKiteClient } from '../helpers/kiteConnect';
// import getTicks from '../helpers/getTicks';
import Table, { Column } from '../components/Table';
import Header from '../components/Header';
import { useRouter } from 'next/router';
import Price from '../components/Price';

export default function Holdings({holdings,profile}) {

  // let instruments = holdings.map(item=>item.instrument_token);
  // let [marketDepth, setMarketDepth] = React.useState();
  let [history, setHistory] = React.useState({});
  let {push, query} = useRouter()

  let [filters,setFilters] = React.useState({
    signal:query.signal||"",
    ...query
  });
  
  
  async function getHistory(instruments){
    return fetch('/api/getHistory?instruments='+instruments.join(",")).then(res=>res.json());
  }

  React.useEffect(async ()=>{
    // getTicks(instruments,function(ticks){
    //   setMarketDepth(ticks);
    // });

    let historyData = await getHistory(holdings.map(item=>item.tradingsymbol));
    let out = historyData.history
    console.log(out)
    setHistory(out);
    
  },[]);

  let data = holdings
    .map(item=>{
      if(history){
        let itemHistory = history[item.tradingsymbol];
      
        if(itemHistory){
          item = {...item,...itemHistory}
        }
      }
      let value = item.average_price * item.quantity;
      return {
        ...item,
        value
      };
    })
    .filter(item=>item.signal==filters.signal||filters.signal=='');

  const onChangeFilters=(key)=>(e)=>{
    setFilters({
      ...filters,
      [key]:e.target.value
    });

    push({
      pathname: '/holdings',
      query: { 
        ...query,
        [key]:e.target.value
      },
    })
  }

  return (
    <>
      <Header userProfile = {profile}></Header>
      <div className="container mt-6">
        <div className="columns">
          <div className="column is-12">
            <div className="filter-item box">
              <div className="is-size-7">
                Trend
              </div>
              <div className="select is-small">
                <select value={filters.signal} onChange={onChangeFilters('signal')}>
                  <option value="">Select</option>
                  <option>GREEN</option>
                  <option>RED</option>
                </select>
              </div>
            </div>
          </div>        
        </div>

        <Table data={data}>
          <Column selector="tradingsymbol" name="Tradingsymbol">
            {row=><a target="_blank" href={`https://kite.zerodha.com/chart/web/ciq/${row.exchange}/${row.tradingsymbol}/${row.instrument_token}`} rel="noreferrer">{row.tradingsymbol}</a>}
          </Column>
          <Column selector="quantity" name="Quantity"></Column>
          <Column selector="average_price" name="BuyPrice"></Column>
          <Column selector="last_price" name="LTP"></Column>
          <Column selector="value" name="Investment"></Column>
          <Column selector="pnl" name="PnL">{row=><Price>{row.pnl}</Price>}</Column>
          <Column selector="signal" name="Signal"></Column>
          <Column selector="lastReverse"></Column>
          <Column selector="day_change">{row=><Price>{row.day_change_percentage}</Price>}</Column>
          <Column selector="day5Change">{row=><Price threshold={5}>{row.day5Change}</Price>}</Column>
          <Column selector="day10Change">{row=><Price threshold={10}>{row.day10Change}</Price>}</Column>
        </Table>
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
