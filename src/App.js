import './App.css';
import React from 'react';
import Amplify from 'aws-amplify';
import { AmplifyAuthenticator, AmplifySignUp, AmplifySignIn} from '@aws-amplify/ui-react';
import { AuthState, onAuthUIStateChange } from '@aws-amplify/ui-components';
import {Context} from './components/context';
import AppMain from './components/AppMain';
import PickRoom from './components/PickRoom';  
import AppSync from './AppSync-prod';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';


Amplify.configure({
  Auth: {

      // REQUIRED - Amazon Cognito Region
      region: 'ap-northeast-1',

      // OPTIONAL - Amazon Cognito User Pool ID
      userPoolId: 'ap-northeast-1_OhIeo4hSd',

      // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
      userPoolWebClientId: '3uui55m4alpitr0ge4rbgbak3k',

       // OPTIONAL - Hosted UI configuration
      oauth: {
          domain: 'chat-room-20210706-prod.auth.ap-northeast-1.amazoncognito.com',
          scope: ['phone', 'email', 'profile', 'openid'],
          redirectSignIn: 'http://localhost:3000/',
          redirectSignOut: 'http://localhost:3000/',
          responseType: 'code' // or 'token', note that REFRESH token will only be generated when the responseType is code
      }
  }
});
  
const AuthStateApp = () => {
  const [authState, setAuthState] = React.useState();
  const [user, setUser] = React.useState();
  const [room, setRoom] = React.useState();

  React.useEffect(() => {
      return onAuthUIStateChange((nextAuthState, authData) => {
          setRoom("");
          setAuthState(nextAuthState);
          setUser(authData);
      });
  }, []);
  if (authState === AuthState.SignedIn && user ){
    var context= {
      user: user,
      room: room,
      authState: authState,
      client: new AWSAppSyncClient({
        url: AppSync.aws_appsync_graphqlEndpoint,
        region: AppSync.aws_appsync_region,
        auth: {
            type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
            jwtToken: user.signInUserSession.idToken.jwtToken
        },
        disableOffline:true,
        fetchPolicy: 'network-only',
      }),
    };
    console.log(context); 
    if (context.room.length === 0)
      return(
        <Context.Provider value={context}>
          <PickRoom ChangeRoom={setRoom} />
        </Context.Provider>
      );
    else
    return(    
      <Context.Provider value={context}>
        <AppMain LeaveRoom={setRoom} />
      </Context.Provider>
    );
  }
  else return (
      <AmplifyAuthenticator>
        <AmplifySignIn
          headerText="Please sign-up using your real name as usename!!"
          slot="sign-in"
        ></AmplifySignIn>
        <AmplifySignUp
          slot="sign-up"
          formFields={[
            { type: "username" },
            { type: "password" }
          ]}
        />
      </AmplifyAuthenticator>
  );
}

export default AuthStateApp;