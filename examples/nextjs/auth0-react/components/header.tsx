import React from "react";
import Link from "next/link";
import { useAuth0 } from "@auth0/auth0-react";

const Header = (): React.ReactElement => {
  let { user, loginWithRedirect, logout } = useAuth0();

  return (
    <header>
      <nav>
        <ul>
          <li>
            <Link href="/">
              <a data-testid="home">Home</a>
            </Link>
          </li>
          {user ? (
            <>
              <li>
                <button data-testid="logout"
                  onClick={() => logout({ returnTo: window.location.origin })}
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <button onClick={loginWithRedirect} data-testid="login">Login</button>
              </li>
            </>
          )}
        </ul>
      </nav>

      <style jsx>{`
        header {
          padding: 0.2rem;
          color: #fff;
          background-color: #333;
        }
        nav {
          max-width: 42rem;
          margin: 1.5rem auto;
        }
        ul {
          display: flex;
          list-style: none;
          margin-left: 0;
          padding-left: 0;
        }
        li {
          margin-right: 1rem;
        }
        li:nth-child(3) {
          margin-right: auto;
        }
        a {
          color: #fff;
          text-decoration: none;
        }
        button {
          font-size: 1rem;
          color: #fff;
          cursor: pointer;
          border: none;
          background: none;
        }
      `}</style>
    </header>
  );
};

export default Header;
