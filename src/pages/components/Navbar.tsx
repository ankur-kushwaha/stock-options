import React from 'react'
import { PositionsContext } from '../positions2';



export default function Navbar(){

  const {isOrderEnabled,dispatch} = React.useContext(PositionsContext);


  return (
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
      <div className="navbar-end">
        <div className="navbar-item">
          <div className="buttons">
            { isOrderEnabled ?
              <a className="button is-primary" onClick={()=>{dispatch({type:"START_TRADING"})}}>
                <strong>Start</strong>
              </a>:
              <a className="button is-primary" onClick={()=>{dispatch({type:"STOP_TRADING"})}}>
                <strong>Start</strong>
              </a>
            }
            <a className="button is-light">
            Log in
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}
  