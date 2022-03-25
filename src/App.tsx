import { useEffect } from "react";
import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";
import { PublicKey } from "@solana/web3.js";

interface ConnectOpts {
    onlyIfTrusted: boolean;
}

type PhantomEvent = "disconnect" | "connect" | "accountChanged";

interface PhantomProvider {
    connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
    disconnect: ()=>Promise<void>;
    on: (event: PhantomEvent, callback: (args:any)=>void) => void;
    isPhantom: boolean;
}

type WindowWithSolana = Window & { 
    solana?: PhantomProvider;
}

// Constants
const TWITTER_HANDLE = "jponc";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  const checkIfWalletIsConnected = async () => {
    const solWindow = window as WindowWithSolana;
    try {
      const { solana } = solWindow;
      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");
        }
      } else {
        alert("Solana object not found! Get a Phantom Wallet!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {

  }, []);

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
