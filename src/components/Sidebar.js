import React from 'react'
import { useRouter } from 'next/router'

export default function Sidebar({ onChange,hideSymbol }) {

  // const router = useRouter();
  let [selectedStocks,setSelectedStocks] = React.useState([]);
  

  function handleChange(e) {
    openUrl({
      newExpiry: e.target.value
    }) 

  }

  function openUrl({ newSymbol, newExpiry }) {
        
    let url = window.location.origin + window.location.pathname + "?tradingsymbol=" + (newSymbol || tradingsymbol) + "&expiry=" + (newExpiry || expiry||"")
    window.location.href = url;
  }

  function handleSymbolChange(e) {
    openUrl({
      newSymbol: e.target.value
    })
  }

  let expiryData=[{
    month:"Sep",
    expiry:"2021-08-26"
  },{
    month:"Oct",
    expiry:"2021-09-30"
  }]

  function onChangeExpiry(e){
    let expiry = expiryData.filter(item=>item.month == e.target.value);
    openUrl({
      newExpiry:expiry
    })
  }

  let stocks = ['TCS', 'INFY', 'TECHM', 'TATASTEEL', 'COFORGE', 'MPHASIS', 'APOLLOHOSP','BAJAJFINSV', 'WIPRO','HINDUNILVR','TATAPOWER'];

  function onChangeStocks(e){
    if(e.target.checked){
      setSelectedStocks(Array.from(new Set([
        ...selectedStocks,
        e.target.value
      ])))
    }else{
      
      setSelectedStocks( selectedStocks.filter(item=>item != e.target.value))
      
    }
    
  }
  console.log(selectedStocks);

  return (
    <div className="sidebar">
      <div className="is-text-5">
            Filters
      </div>
      <div className="filter-item">
        <div className="select is-small">
          <select onChange={onChangeExpiry}>
            <option>Select Expiry</option>
            {expiryData.map(item=><option key={item.month}>{item.month}</option>)}
          </select>
        </div>
      </div>
      <div className="filter-item">
        <div className="control">
          <input className="input is-small" type="number" placeholder="Min Investment"/>
        </div>
      </div>
      <div className="filter-item">
        <div className="control">
          <input className="input is-small" type="number" placeholder="Breakeven Threshold"/>
        </div>
      </div>

      <div className="filter-item">
        <div className="control">
          <input className="input is-small" type="number" placeholder="Max Timeloss"/>
        </div>
      </div>
      <div className="filter-item">
        <div className="is-size-7">
          Stocks
        </div>
        
        {stocks.map(item=>(<div key={item}>
          <label className="checkbox is-small">
            <input onChange={onChangeStocks} value={item} type="checkbox"/>&nbsp;{item}
          </label>
        </div>))}
      </div>
      
    </div>
  )
}
