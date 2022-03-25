import { ChangeEvent, useEffect, useState } from "react";
import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  ConfirmOptions,
} from "@solana/web3.js";
import { Program, Provider, web3, Wallet } from "@project-serum/anchor";
import idl from "./idl.json";
import kp from "./keypair.json";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

type PhantomEvent = "disconnect" | "connect" | "accountChanged";

(window as any).global = window;
window.Buffer = require("buffer").Buffer;

interface PhantomProvider {
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, callback: (args: any) => void) => void;
  isPhantom: boolean;
}

type WindowWithSolana = Window & {
  solana?: PhantomProvider & Wallet;
};

// systemProgram is a reference to the Solana runtime
const { SystemProgram } = web3;

// Load keypair to be used for baseAccount
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl("devnet");

// Controls how we want to acknowledge when a transaction is "done".

const opts: ConfirmOptions = {
  preflightCommitment: "processed",
};

const TWITTER_HANDLE = "jponc";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

type Item = {
  id: string,
  gifLink: string;
  userAddress: PublicKey;
  votes: any;
};

const App = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [gifList, setGifList] = useState<Item[] | null>(null);

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching GIF list...");

      // Calls solana program to fetch the gif list
      getGifList();
    }
  }, [walletAddress]);

  const getGifList = async () => {
    try {
      const provider = getProvider();
      // @ts-ignore
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );

      console.log("Got the account", account);
      setGifList(account.gifList);
    } catch (err) {
      console.log("Error in getGifList: ", err);
      setGifList(null);
    }
  };

  const checkIfWalletIsConnected = async () => {
    const solWindow = window as WindowWithSolana;
    try {
      const { solana } = solWindow;
      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");

          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            `Connected with Public Key: ${response.publicKey.toString()}`
          );

          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Phantom Wallet!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const connectWallet = async () => {
    const solWindow = window as WindowWithSolana;

    const { solana } = solWindow;

    if (solana) {
      const response = await solana.connect();
      console.log(
        `Connected with Public Key: ${response.publicKey.toString()}`
      );

      setWalletAddress(response.publicKey.toString());
    }
  };

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const solWindow = window as WindowWithSolana;
    const connection = new Connection(network, opts.preflightCommitment);

    const provider = new Provider(connection, solWindow.solana!, opts);

    return provider;
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!");
      return;
    }

    setInputValue("");
    console.log("Gif link: ", inputValue);

    try {
      // initialize the program
      const provider = getProvider();
      // @ts-ignore
      const program = new Program(idl, programID, provider);

      // send the link to the program
      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });

      console.log("GIF successfully sent to program", inputValue);

      await getGifList();
    } catch (err) {
      console.log("Error sending GIF: ", err);
    }
  };

  const voteGif = async (id: string) => {
    try {
      // initialize the program
      const provider = getProvider();
      // @ts-ignore
      const program = new Program(idl, programID, provider);

      // send the link to the program
      await program.rpc.voteGif(id, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });

      console.log("GIF successfully voted", inputValue);

      await getGifList();
    } catch (err) {
      console.log("Error voting GIF: ", err);
    }
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      // @ts-ignore
      const program = new Program(idl, programID, provider);
      console.log("ping");
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
      console.log(
        "Created a new BaseAccount w/ address:",
        baseAccount.publicKey.toString()
      );
      await getGifList();
    } catch (error) {
      console.log("Error creating BaseAccount account:", error);
    }
  };

  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't been initialized.
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createGifAccount}
          >
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      );
    }
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return (
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
            <input
              type="text"
              placeholder="Enter gif link!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
          </form>
          <div className="gif-grid">
            {/* We use index as the key instead, also, the src is now item.gifLink */}
            {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <div>
                  <img src={item.gifLink} />
                  <div className="gif-item-details">
                    <button
                      className="cta-button connect-wallet-button cta-upvote"
                      onClick={() => voteGif(item.id)}
                    >
                      upvote
                    </button>
                    <div className="gif-item-votes">
                      votes: {item.votes.toNumber()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>

          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
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
