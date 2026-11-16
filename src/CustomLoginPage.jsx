// LoginPage.js
import React from "react";
import { Login, LoginForm } from "react-admin";
import StyledFirebaseAuthModule from "react-firebaseui/StyledFirebaseAuth";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { firebaseConfig } from "./FIREBASE_CONFIG";
import { clearCurrentScenario } from "./currentScenario";

// a webpack-built CommonJS module: Vite hands over its exports object, the component in .default
const StyledFirebaseAuth =
  StyledFirebaseAuthModule.default ?? StyledFirebaseAuthModule;

// firebaseui needs the compat API; this wraps the app react-admin-firebase created
firebase.initializeApp(firebaseConfig);

// Configure FirebaseUI.
const uiConfig = {
  // Popup signin flow rather than redirect flow.
  signInFlow: "popup",
  // Redirect to /signedIn after sign in is successful. Alternatively you can provide a callbacks.signInSuccess function.
  signInSuccessUrl: "#/",
  // We will display Google and Facebook as auth providers.
  signInOptions: [firebase.auth.GoogleAuthProvider.PROVIDER_ID],
  callbacks: {
    signInSuccessWithAuthResult: (result) => {
      localStorage.setItem("uid", result.user.uid);
      return true;
    },
  },
};

const SignInScreen = () => (
  <StyledFirebaseAuth firebaseAuth={firebase.auth()} uiConfig={uiConfig} />
);

const CustomLoginForm = () => {
  return (
    <div>
      <LoginForm />
      <SignInScreen />
    </div>
  );
};

const CustomLoginPage = () => {
  React.useEffect(() => {
    localStorage.removeItem("uid");
    clearCurrentScenario();
    console.log("effect happened");
  });
  return (
    <Login>
      <CustomLoginForm />
    </Login>
  );
};

export default CustomLoginPage;
