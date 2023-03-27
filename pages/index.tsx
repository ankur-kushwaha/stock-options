
import Cookies from 'cookies';
import { Card } from 'flowbite-react';
import PositionsTable from '../components/positions-table/positions-table';
import RulesList from '../components/RulesList';

export function Index({ positions,profile }: any) {
  console.log({profile});
  
  return (
    <div className="mt-4 mx-auto max-w-screen-xl	">
      <Card>
        <PositionsTable positions={positions.data} />
      </Card>
      <Card>
        <RulesList />
      </Card>
    </div>
  );
}

export const getServerSideProps = async (context: any) => {
  const { req, res } = context;
  const cookies = new Cookies(req, res)

  let { SmartAPI, WebSocket } = require("smartapi-javascript");

  let token = context.query.auth_token;

  if (!token) {
    token = cookies.get('token');
  }

  // const cookies = new Cookies(req, res)
  let smart_api = new SmartAPI({
    api_key: process.env.SMARTAPI_KEY,
    access_token: token
  });

  const profile = await smart_api.getProfile();
  
  if (!profile.status) {
    cookies.set('token');
    await smart_api.logout()
    res.writeHead(301, { Location: `/logout` });
    res.end();
    return {
      props: {

      }
    }
  }

  cookies.set('token', token, {
    httpOnly: true, // true by default
  })

  const positions = await smart_api.getPosition();


  return {
    props: {
      positions,
      profile
    }
  }
}

export default Index;
