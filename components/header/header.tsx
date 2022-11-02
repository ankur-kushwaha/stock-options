import { Button, Navbar, ToggleSwitch } from "flowbite-react";
import Settings from "../settings/settings";

/* eslint-disable-next-line */
export interface HeaderProps { }

export function Header(props: HeaderProps) {

  let path = ''
  if(typeof window != undefined){
    path = global.window?.location.pathname.substring(1);
  }
  
  

  function handleLoginClick() {
    // https://kite.zerodha.com/connect/login?v=3&api_key=xxx
    window.location.href = `https://kite.zerodha.com/connect/login?v=3&api_key=ab8oz67ryftv7gx9`;
  }

  return (
    <div className="drop-shadow-xl">
      <Navbar
        fluid={true}
        rounded={true}
      >
        <Navbar.Brand href="https://flowbite.com/">
          <img
            src="https://flowbite.com/docs/images/logo.svg"
            className="mr-3 h-6 sm:h-9"
            alt="Flowbite Logo"
          />
          <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
            Stock Options
          </span>
        </Navbar.Brand>

        <div className="flex md:order-2">
          <div className="mr-2">
            <a href="/login"><Button>Login</Button></a>
          </div>
          <div>
            <Settings />
          </div>
          <Navbar.Toggle />
        </div>
        <Navbar.Collapse>
          <Navbar.Link active={path == ''}
            href="/navbars"
          >
            Home
          </Navbar.Link>
          <Navbar.Link href="/positions">
            Positions
          </Navbar.Link>
          <Navbar.Link href="/holdings">
            Holdings
          </Navbar.Link>
          <Navbar.Link href="/instruments">
            Instruments
          </Navbar.Link>
        </Navbar.Collapse>
      </Navbar>

    </div>
  );
}

export default Header;
