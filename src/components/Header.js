import React from 'react'
import { useRouter } from 'next/router'

export default function Header({ userProfile={},tab}) {
  let { user_name } = userProfile;
  const router = useRouter()
  let [state,setState] = React.useState({})
  tab = router.pathname.substring(1)

  if(!user_name){
    router.location = '/'
  }

  function toggleMenu(){
    setState({
      isMenuOpen:!state.isMenuOpen
    })
  }

  return (

    <div>

      

      
      <header className="navbar">
        <div className="container">
          <div className="navbar-brand">
            <a className="navbar-item">
              <h1 className="is-size-5">Smart Options</h1>
            </a>
            <span className="navbar-burger" data-target="navbarMenuHeroC" onClick={toggleMenu}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
              
          <div id="navbarMenuHeroC" className={"navbar-menu "+(state.isMenuOpen?"is-active":"")}>

            

            <div className="navbar-end">
              <a className={"navbar-item is-size-7 "+(tab=='positions'?'is-active':"")} href="/BuySell?tradingsymbol=NIFTY2190917200CE">
        AutoTrade
              </a>
              <a className={"navbar-item is-size-7 "+(tab=='positions'?'is-active':"")} href="/positions">
        Position
              </a>

              <a className={"navbar-item is-size-7 "+(tab=='options2'?'is-active':"")} href="/options2">
        Options Finder
              </a>
              <a className={"navbar-item is-size-7 "} href="/holdings" rel="noreferrer">
        Holdings
              </a>
              {user_name &&
                    <a className="navbar-item is-size-7">
                      {user_name}
                    </a>
              }
              <span className="navbar-item is-size-6">
                {user_name ?
                  <a className="button is-small is-inverted" href='/api/logout'>
                    
                    <span>Logout</span>
                  </a> :
                  <a className="button is-small is-inverted" href='/api/login'>
                
                    <span>Login</span>
                  </a>}
              </span>
            </div>
          </div>
        </div>
      </header>
        


       


      <div className="hero-foot">
        <nav className="tabs is-boxed">
           
        </nav>
      </div>
    </div>
      
  )
}