import React from 'react'
import useZerodha from '../helpers/useZerodha';

export default function Header({ userProfile={},tab }) {
  let { user_name } = userProfile;

  let { login, logout } = useZerodha();

  return (

    <div>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.3/css/bulma.min.css" />
      {/* <nav className="navbar" role="navigation" aria-label="main navigation">
        <div className="navbar-brand">
          <a className="navbar-item" href="https://bulma.io">
            <b>Smart Options</b>
          </a>

          <a role="button" className="navbar-burger" aria-label="menu" aria-expanded="false" data-target="navbarBasicExample">
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </a>
        </div>

        <div id="navbarBasicExample" className="navbar-menu">
          <div className="navbar-start">
            <a className="navbar-item" href="/socketio2">
        Options
            </a>

            <a className="navbar-item" href="/positions">
        Positions
            </a>

            
          </div></div>
      </nav>
    </div> */}

      <section className="hero is-success">

        <div className="hero-head">
          <header className="navbar">
            <div className="container">
              <div className="navbar-brand">
                <a className="navbar-item">
                  
                  <h1 class="title">Smart Options</h1>
                </a>
                <span className="navbar-burger" data-target="navbarMenuHeroC">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
              <div id="navbarMenuHeroC" className="navbar-menu">
                <div className="navbar-end">
                  {user_name &&
                    <a className="navbar-item is-active">
                      {user_name}
                    </a>
                  }
                  <span className="navbar-item">
                    {user_name ?
                      <a className="button is-success is-inverted" href='/api/logout'>
                        <span className="icon">
                          <i className="fab fa-github"></i>
                        </span>
                        <span>Logout</span>
                      </a> :
                      <a className="button is-success is-inverted" href='/api/login'>
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
          <nav className="tabs is-boxed is-fullwidth">
            <div className="container">
              <ul>
                <li className={tab=='positions'?"is-active":""}><a href="/positions">Positions</a></li>
                <li className={tab=='options'?"is-active":""}><a href="/options">Options</a></li>
              </ul>
            </div>
          </nav>
        </div>
      </section>
    </div>
  )
}
