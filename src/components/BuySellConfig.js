import React from 'react'

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

export default function BuySellConfig({config,onUpdate,triggerNow}) {
  
  const [state,setState] = React.useState({
    ...config,
    
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

  const handleSymbolChange = ()=>{
    console.log(state.tradingsymbol);
    window.location.href = `/BuySell?tradingsymbol=${state.tradingsymbol}` 
  }

  return (
    <div>

      <article className={"message is-small "+(config.shouldRun?'is-success':"is-info")}>
        
        <div className="message-body">
          <div className="box">

            <div className="columns">
              <div className="column">
                {!state.shouldRun?
                  <button className="is-success is-fullwidth button " onClick={handleButtonClick(true)}>Start Trading</button>:
                  <button className="is-danger is-fullwidth button" onClick={handleButtonClick(false)}>Stop Trading</button>
                }
                <button className="is-fullwidth is-small mt-3 button " onClick={triggerNow}>Trigger Now</button>
              </div>

            </div>

          </div>


          <div className="box">
            <ConfigItem title="Tradingsymbol" value={state.tradingsymbol} onChange={handleChange('tradingsymbol','text')}/>
            <button className="button is-small is-pulled-right" onClick={handleSymbolChange}>Update Stock</button>
            <div className="is-clearfix"></div>
          </div>

          <div className="box">
            <div className="is-size-7">
    Interval
            </div>
            <div className="select is-fullwidth is-small mb-3">
              <select value={state.interval} onChange={handleChange('interval')}>
                <option>ONE_MINUTE</option>
                <option>THREE_MINUTE</option>
                <option>FIVE_MINUTE</option>
              </select>
            </div>
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
            <div>
              <label className="checkbox">
                <input checked={state.isBullish} type="checkbox" onChange={handleChange('isBullish')}/>
          &nbsp;
                <span className="is-size-7">
            Bullish Market
                </span>
              </label>
            </div>
            <div>
              <label className="checkbox">
                <input checked={state.isBearish} type="checkbox" onChange={handleChange('isBearish')}/>
          &nbsp;
                <span className="is-size-7">
            Bearish Market
                </span>
              </label>
            </div>
            <br />
      
            <button className="is-fullwidth mb-2 button is-small" onClick={handleClickUpdate}>Update Settings</button>


          </div>
     



        </div>
      </article>

     
    </div>
  )
}
