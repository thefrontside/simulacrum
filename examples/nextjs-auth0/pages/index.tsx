/* eslint-disable @next/next/no-img-element */
import Head from "next/head";
import { getSession } from "@auth0/nextjs-auth0";
import { NextPage, GetServerSideProps } from 'next';
import { LinkWrapper } from '../components/LinkWrapper/LinkWrapper';

export const getServerSideProps: GetServerSideProps = async (context) => {
  let session = getSession(context.req, context.res);

  if (!session) {
    return { props: {} };
  }

  return {
    redirect: {
      permanent: false,
      destination: "/hirer"
    }
  };
};

const SelectLoginPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Sign in to Enigma</title>
      </Head>

      <div className="min-h-screen bg-enigma-dark-blue flex">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-20 z-0"
          src="/images/network_background.png"
          alt=""
        />

        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 w-full lg:flex-none lg:px-20 xl:px-24 z-10">
          <div className="mx-auto w-full max-w-sm">
            <div className="flex flex-col items-center">
              <img
                className="h-20 flex-initial"
                src="/images/enigma_logo_text_red.png"
                alt="Enigma Logo"
              />
              <h2 className="mt-3 text-3xl font-extrabold text-white text-center">
                Sign in to start using Enigma
              </h2>
            </div>

            <div className="mt-8">
              <div>
                <div>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button
                      className="btn-enigma login-option"
                      data-cy="login-btn-hirer"
                    >
                      <LinkWrapper
                        href="/api/auth/login?role=hirer"
                        className="w-full inline-flex justify-center py-2 shadow-sm bg-enigma-blue text-sm font-medium text-gray-500 hover:bg-enigma-light-blue"
                      >
                        <span className="text-white flex items-center">
                          Start Hiring
                        </span>
                      </LinkWrapper>
                    </button>
                    <button
                      className="btn-enigma login-option"
                      data-cy="login-btn-candidate"
                    >
                      <LinkWrapper
                        href="/api/auth/login?role=candidate"
                        className="w-full inline-flex justify-center py-2 shadow-sm bg-enigma-blue text-sm font-medium text-gray-500 hover:bg-enigma-light-blue"
                      >
                        <span className="text-white flex items-center">
                          Take Assessment
                        </span>
                      </LinkWrapper>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SelectLoginPage;
