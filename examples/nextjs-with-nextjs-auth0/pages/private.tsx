import { withPageAuthRequired } from "@auth0/nextjs-auth0";
import Layout from "../components/layout";

export default function ProtectedPage(): JSX.Element {
  return (
    <Layout>
      <div>
        <p>This route is private. You may only access it while logged in.</p>
      </div>
    </Layout>
  );
}

export const getServerSideProps = withPageAuthRequired();
