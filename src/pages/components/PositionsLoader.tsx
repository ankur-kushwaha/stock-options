import React, { useContext, useEffect } from 'react'
import { Actions, PositionsContext } from '../positions2'

type Position={
  exchange:string,
  quantity:number,
  tradingsymbol:string,
  last_price:number,
  average_price:number,
  pnl:number
}

type PositionsTableProps= {
    positions:Position[],
    targets:{
      [key:string]:{
        targetPct:number,
        stoplossPct:number,
        trailingStep:number
      }
    },
    onTargetChange:(state:any)=>void
}

export const PositionsTable = React.memo<PositionsTableProps>(({positions=[],targets,onTargetChange})=>{

  const {dispatch} = useContext(PositionsContext);
  
  const [state,setState] = React.useState(
    targets
  )

  function setTarget(key,tradingsymbol,value): void{      
    dispatch({
      payload:{
        key,tradingsymbol,value
      },
      action:Actions.SET_TARGET
    })
  }

  function handleSave(){
    onTargetChange(state)
  }

  return <>
    <table className="table is-fullwidth">
      <thead>
        <tr>
          <th>Tradingsymbol</th>
          <th>Qty</th>
          <th>Average</th>
          <th>LTP</th>
          <th>P&L</th>
          <th>Change</th>
          <th>Target</th>
          <th>Stoploss</th>
          <th>Trailing Step</th>
        </tr>
      </thead>
      <tbody>
        {positions
          .filter(item=>item.exchange=='NFO' && item.quantity < 0)
          .map(position=> <tr key={position.tradingsymbol}>
            <td>{position.tradingsymbol}</td>
            <td>{position.quantity}</td>
            <td>{position.average_price}</td>
            <td>{position.last_price}</td>
            <td>{position.pnl}</td>
            <td>{(((position.average_price-position.last_price)/position.average_price)*100).toFixed(2)}%</td>
            <td>
              <div className='control has-icons-right'>
                <input className='input is-small' type="number" size={10} value={targets[position.tradingsymbol]?.targetPct}  onChange={(e)=>setTarget('targetPct',position.tradingsymbol,e.target.value)}/>
                <span className="icon is-small is-right">
                  <i className="fas fa-percent"></i>
                </span>
              </div>
            </td>
            <td>
              <div className='control has-icons-right'>
                <input className='input is-small' type="number" size={10} value={targets[position.tradingsymbol]?.stoplossPct}  onChange={(e)=>setTarget('stoplossPct',position.tradingsymbol,e.target.value)}/>
                <span className="icon is-small is-right">
                  <i className="fas fa-percent"></i>
                </span>
              </div>
            </td>
            <td>
              <input className='input is-small' type="number" size={10} value={targets[position.tradingsymbol]?.trailingStep}  onChange={(e)=>setTarget('trailingStep',position.tradingsymbol,e.target.value)}/>
            </td>
          </tr>)}
      </tbody>
    </table>
    <button onClick={handleSave} className='button'>Save</button>
  </>
})

export default function PositionLoader({
  onSelection
}){
  
  const [isModalOpen,setModalOpen] = React.useState(false);
  const [positions,setPositions] = React.useState([]);
  React.useEffect(()=>{
    fetch('http://localhost:3000/api/kiteConnect?method=getPositions')
      .then(res=>res.json())
      .then(res=>{
        setPositions(res.net)
      }).catch(()=>{
        setPositions([])
      })
  },[]);
  
  function handleSelect(selectedPosition){
    onSelection(selectedPosition);
    setModalOpen(false);
  }
  
  
  return <>
    <div className={"modal "+(isModalOpen?'is-active':'')}>
      <div className="modal-background"></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Select Position</p>
          <button className="delete" onClick={()=>setModalOpen(false)} aria-label="close"></button>
        </header>
        <section className="modal-card-body">
       
          <div className="table-container">
            <table className="table is-fullwidth">
              <thead>
                <tr>
                  <th><abbr title="Position">Tradingsymbol</abbr></th>
                  <th><abbr title="Position">Quantity</abbr></th>
                  <th><abbr title="Position">Select</abbr></th>
                </tr>
              </thead>
              <tbody>
                {positions
                  .filter(item=>item.exchange=='NFO' && item.quantity < 0)
                  .map(position=> <tr key={position.tradingsymbol}>
                    <td>{position.tradingsymbol}</td>
                    <td>{position.quantity}</td>
                    <td><button onClick={()=>handleSelect(position)}>
                      Select
                    </button></td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </section>
        <footer className="modal-card-foot">
          <button className="button is-success" onClick={()=>setModalOpen(false)}>Save changes</button>
          <button className="button" onClick={()=>setModalOpen(false)}>Cancel</button>
        </footer>
      </div>
    </div>
  
    <button onClick={()=>setModalOpen(true)}>Load</button>
  </>
}