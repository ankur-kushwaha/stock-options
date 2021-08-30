import React from 'react'
import { useRouter } from 'next/router'

export default function Sidebar({defaults, onFiltersUpdate}) {

  // const router = useRouter();
  
  let [selectedStocks,setSelectedStocks] = React.useState(defaults.selectedStocks);
  let [state,setState] = React.useState(defaults);
  

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
  

  function handleUpdate(){
    onFiltersUpdate({
      ...state,
      selectedStocks
    })
  }

  const handleInputChange = (key)=> (e)=>{
    setState({
      ...state,
      [key]:e.target.value
    })
  }

  function uncheckAll(){
    setSelectedStocks([]);
  }
  function checkAll(){
    setSelectedStocks(defaults.selectedStocks);
  }

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
          <div className="is-size-7">
            Min Investment
          </div>
          <input onChange={handleInputChange('minInvestment')} value={state.minInvestment} className="input is-small" type="number" placeholder="Min Investment"/>
        </div>
      </div>
      <div className="filter-item">
        <div className="control">
          <div className="is-size-7">
            Max Investment
          </div>
          <input onChange={handleInputChange('maxInvestment')} value={state.maxInvestment} className="input is-small" type="number" placeholder="Max Investment"/>
        </div>
      </div>
      <div className="filter-item">
        <div className="control">
          <div className="is-size-7">
        Breakeven Threshold
          </div>
          <input onChange={handleInputChange('breakevenThreshold')} value={state.breakevenThreshold} className="input is-small" type="number" placeholder="Breakeven Threshold"/>
        </div>
      </div>

      <div className="filter-item">
        <div className="control">
          <div className="is-size-7">
        Max Timeloss
          </div>
          <input onChange={handleInputChange('maxTimeloss')} value={state.maxTimeloss} className="input is-small" type="number" placeholder="Max Timeloss"/>
        </div>
      </div>
      <div className="filter-item">
        <div className="is-size-7">
          Stocks
        </div>
        
        {defaults.stocks.map(item=>(<div key={item}>
          <label className="checkbox is-size-7">
            <input checked={selectedStocks.includes(item)} onChange={onChangeStocks} value={item} type="checkbox"/>&nbsp;{item}
          </label>
        </div>))}
      </div>
      
      <button onClick={checkAll} className="is-small button is-primary">
        Check All
      </button> 
      &nbsp;
      <button onClick={uncheckAll} className="is-small button is-primary">
        Uncheck All
      </button> 
      <br />
      <br />
      <button onClick={handleUpdate} className="is-small button is-primary">
        Update
      </button>
    </div>
  )
}
