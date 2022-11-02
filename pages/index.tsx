import {  Card } from 'flowbite-react';
import PositionsTable from '../components/positions-table/positions-table';
import Cookies from 'cookies'
import KiteConnect from 'kiteconnect';
import { API_KEY, cookieName } from '../components/contants';

const kc = new KiteConnect.KiteConnect({
  api_key: API_KEY
});

async function fetchAccessToken(requestToken) {
  console.log('fetching access token', requestToken);
  let response;
  try {
    response = await kc.generateSession(requestToken, "60960qn0cpdca5m4o5lymxpj05xz0hcl");
  } catch (e) {
    console.log(e);
    return;
  }
  console.log({ response });
  return response.access_token;
}


export function Index() {
  return (
    <div className="mt-4 mx-auto max-w-screen-xl	">
      <Card>
        
      </Card>
    </div>
  );
}



export const getServerSideProps = async (context) => {
  const { req, res } = context;
  const query = context.query;
  const cookies = new Cookies(req, res)

  
  const requestToken = query['request_token'];

  if (requestToken) {

    const env = query['env'];
    if(env == 'development'){
      res.writeHead(301, { Location: `http://localhost:4200?request_token=${requestToken}` });
      res.end();
      return {
        props:{

        }
      }
    }

    const token = await fetchAccessToken(requestToken);
    if (token) {
      cookies.set(cookieName, token, {
        httpOnly: true // true by default
      })
      res.writeHead(301, { Location: `/` });
      res.end();
      return {
        props:{

        }
      }
      // return 
    }
  }

  return {
    props: {

    }
  }
}

export default Index;
