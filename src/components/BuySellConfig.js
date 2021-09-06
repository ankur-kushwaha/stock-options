import React from 'react'

import { useRouter } from 'next/router'

function ConfigItem({
  title,onChange,
  type="text",
  value
}){


  return (<> <div className="is-size-7">
    {title}
  </div>
  <div className="field">
    <div className="control is-small">
      <input onChange={onChange} value={value} className="input is-small" type={type} />
    </div>
  </div></>)
}

export default function BuySellConfig({config,onUpdate,cleanOrders}) {
  

  const {query,push,reload} = useRouter();
  const [state,setState] = React.useState({
    ...config,
    tradingsymbol:query.tradingsymbol
  }||{});

  const handleChange = (key,type)=>(e)=>{
    let value = e.target.value;
    if(type == 'number'){
      value = Number(value)
    }

    if(e.target.type=='checkbox'){
      value = e.target.checked
    }
    setState({
      ...state,
      [key]:value
    })
  }

  function handleClickUpdate(){
    console.log(state);
    onUpdate && onUpdate(state)
  }

  const handleButtonClick = (type)=>()=>{
    setState({
      ...state,
      shouldRun:type
    })
    onUpdate && onUpdate({
      ...state,
      shouldRun:type
    })
  }    
  
  const handleCleanOrders = (type)=>()=>{
    cleanOrders && cleanOrders(type);
  }
  

  const handleSymbolChange = ()=>{
    console.log(state.tradingsymbol);
    window.location.href = `/BuySell?tradingsymbol=${state.tradingsymbol}`
    
  }

  return (
    <div>

      <ConfigItem title="Tradingsymbol" value={state.tradingsymbol} onChange={handleChange('tradingsymbol','text')}/>
      <button className="button is-small is-success" onClick={handleSymbolChange}>Reload</button>

      <ConfigItem type="number" title="Max Order" value={state.maxOrder} onChange={handleChange('maxOrder','number')}/>
      <ConfigItem type="number" title="Min Target" value={state.minTarget} onChange={handleChange('minTarget','number')}/>
      <ConfigItem type="number" title="Quantity" value={state.quantity} onChange={handleChange('quantity','number')}/>
      <div>

        <label className="checkbox">
          <input checked={state.marketOrder} type="checkbox" onChange={handleChange('marketOrder')}/>
          &nbsp;
          <span className="is-size-7">
            Trigger at Market
          </span>
        </label>
      </div>
      <br />
      
      <button className="button is-small" onClick={handleClickUpdate}>Update</button>

      <br/><br/>
      {!state.shouldRun?
        <button className="button is-small" onClick={handleButtonClick(true)}>Start</button>:
        <button className="button is-small" onClick={handleButtonClick(false)}>Stop</button>
      }

      <br /><br />
      <button className="button is-small" onClick={handleCleanOrders('ALL')}>Clean All Orders</button>
    </div>
  )
}
