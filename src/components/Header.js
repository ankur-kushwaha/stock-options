import React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function Header({ userProfile={},tab}) {
  let { user_name } = userProfile;
  const router = useRouter()
  let [state,setState] = React.useState({})
  tab = router.pathname.substring(1)

  function toggleMenu(){
    setState({
      isMenuOpen:!state.isMenuOpen
    })
  }

  return (

    <div>
      

      <section className="hero is-link">

        <div className="hero-head">
          <header className="navbar">
            <div className="container">
              <div className="navbar-brand">
                <a className="navbar-item">
                  
                  <h1 className="title">Smart Options</h1>
                </a>
                <span className="navbar-burger" data-target="navbarMenuHeroC" onClick={toggleMenu}>
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
              <div id="navbarMenuHeroC" className={"navbar-menu "+(state.isMenuOpen?"is-active":"")}>
                <div className="navbar-end">
                  {user_name &&
                    <a className="navbar-item is-active">
                      {user_name}
                    </a>
                  }
                  <span className="navbar-item">
                    {user_name ?
                      <a className="button is-link is-inverted" href='/api/logout'>
                        <span className="icon">
                          <i className="fab fa-github"></i>
                        </span>
                        <span>Logout</span>
                      </a> :
                      <a className="button is-link is-inverted" href='/api/login'>
                        <span className="icon">
                          <i className="fab fa-github"></i>
                        </span>
                        <span>Login</span>
                      </a>}
                  </span>
                </div>
              </div>
            </div>
          </header>
        </div>


        <div className="hero-body">
          <div className="container has-text-centered">
            <p className="title">
            </p>
          </div>
        </div>


        <div className="hero-foot">
          <nav className="tabs is-boxed">
            <div className="container">
              <ul>
                <li className={tab=='positions'?"is-active":""}> <Link href="/positions"><a >Positions</a></Link></li>
                <li className={tab=='options2'?"is-active":""}> <Link href="/options2"><a>Options</a></Link></li>
                <li className={tab=='holdings'?"is-active":""}><Link href="/holdings"><a>Holdings</a></Link></li>
              </ul>
            </div>
          </nav>
        </div>
      </section>
    </div>
  )
}