import React,{useState} from 'react'
import { useRunner } from '../helpers/runner';


type Config = {
  stockCode :string,
  stockExchange :string,
  optionCode :string,
  optionExchange :string,
  minProfitPct :number,
  quantity :number,
}



export default function OptionSeller({
 
}) {


  const [isModalOpen,setModalOpen] = useState(false);

  const [positions,setPositions] = React.useState([]);

  const [config,setConfig] = useState<Config>({
    stockCode : 'NIFTY22APR17000CE',
    stockExchange : 'NFO',
    optionCode : 'NIFTY22APR17100PE',
    optionExchange : 'NFO',
    minProfitPct : 20,
    quantity : 50,
  });

  const {shouldRun,start,stop,currentOrder,setCurrentOrder} = useRunner(config);

  const handleSelect = (position)=>()=>{
    position.sellPrice = position.sell_price;
    setCurrentOrder(position);
    setModalOpen(false);
    setConfig({
      ...config,
      optionCode:position.tradingsymbol,
      quantity: Math.abs(position.quantity)
    })
  }

  React.useEffect(()=>{
    fetch('http://localhost:3000/api/kiteConnect?method=getPositions')
      .then(res=>res.json())
      .then(res=>{
        setPositions(res.net)
      }).catch(()=>{
        setPositions([])
      })
  },[])

  

  function handleInputChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name 

    // @ts-ignore
    setConfig({
      ...config,
      [name]: value
    });
  }


  return <>
    {/* {JSON.stringify(config)} */}
    <nav className="navbar mb-5" role="navigation" aria-label="main navigation">
      <div className="navbar-brand">
        <a className="navbar-item" href="https://bulma.io">
          <img src="https://bulma.io/images/bulma-logo.png" alt="Bulma: Free, open source, and modern CSS framework based on Flexbox" width="112" height="28"/>
        </a>

        <a role="button" className="navbar-burger" aria-label="menu" aria-expanded="false">
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </a>
      </div>
    </nav>
    <div className='container option-seller'>
      <div className="columns">
        <div className="column is-one-quarter">
          <div className="sidebar">
            <div className="input-item">
              <div className="columns">
                <div className="column is-one-quarter">
                  <div className="name is-size-7">
          Target Stock
                  </div></div>
                <div className="column">
          
                  <input className="input is-small" type="text" name={'stockCode'} value={config.stockCode} onChange={handleInputChange}/>
            
          
                </div>
                <div className="column">
                  <input className="input is-small" type="text" name={'stockExchange'} value={config.stockExchange} onChange={handleInputChange}/>
                </div>
              </div>
        
        
            </div>

            <div className="input-item">
              <div className="columns">
                <div className="column is-one-quarter">
                  <div className="name is-size-7" >
          Option Stock
                  </div>
                </div>
                <div className="column"><input className="input is-small" type="text" name={'optionCode'} value={config.optionCode} onChange={handleInputChange}/></div>
                <div className="column"><input className="input is-small" type="text" name={'optionExchange'} value={config.optionExchange} onChange={handleInputChange}/></div>
              </div>
        
              <div className="input-box">
          
          
              </div>
            </div>

            <div className="input-item">
              <div className="columns">
                <div className="column is-one-quarter"><div className="name is-size-7">
          Quantity
                </div></div>
                <div className="column">  <input className="input is-small" type="text" name={'quantity'} value={config.quantity} onChange={handleInputChange}/></div>
              </div>
        
        
            </div>

            <div className="input-item">
              <div className="columns">
                <div className="column is-one-quarter">
                  <div className="name is-size-7">
          Min Profit
                  </div></div>
                <div className="column"><input className="input is-small" type="text" name={'minProfitPct'} value={config.minProfitPct} onChange={handleInputChange}/></div>
              </div>
        
              <div className="input-box">
          
              </div>
            </div>


          </div>
        </div>
        <div className="column">
          <div className="main">
            <div className="header">
              {!shouldRun?<button className='button is-small is-info is-light' onClick={start}>Start</button>:
                <button className='button is-small is-info is-light' onClick={stop}>Stop</button>}
            </div>
            <div className="trades">
              Trades
              <br />
              {!currentOrder && <div>
                <button className='button is-small is-info is-light' onClick={()=>setModalOpen(true)}>Load position</button>
              </div>}
              {currentOrder &&
        <table className="table is-fullwidth">
          <thead>
            <tr>
              <th><span title="Position">Product</span></th>
              <th><span title="Position">Instrument</span></th>
              <th><span title="Position">Qty</span></th>
              <th><span title="Position">Avg</span></th>
              <th><span title="Position">LTP</span></th>
              <th><span title="Position">Profit</span></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{currentOrder.product}</td>
              <td>{currentOrder.tradingsymbol}</td>
              <td>{currentOrder.quantity}</td>
              <td>{currentOrder.sellPrice}</td>
              <td>{currentOrder.last_price}</td>
              <td>
                {((currentOrder.last_price-currentOrder.sellPrice) * currentOrder.quantity).toFixed(2)}
                ({((-currentOrder.last_price+currentOrder.sellPrice)/currentOrder.sellPrice*100).toFixed(2)})
              </td>
              
              
            </tr>
          </tbody>
        </table>}
        
            </div>
            <div className="log">
        Logs   
              {/* {logs.map(log=><div key={log}>{log}</div>)}  */}
            </div>
          </div>
        </div>
      </div>
    
      

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
                      <td><button onClick={handleSelect(position)}>
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

    </div>
  </>


}


// export async function getServerSideProps(ctx) {
  

  
//   return {
   
//   }
// }