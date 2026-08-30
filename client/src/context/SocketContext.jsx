import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { io } from "socket.io-client";
import { SERVER_ORIGIN } from "../api/config";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isSignedIn, getToken } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!isSignedIn) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- скидаємо socket при виході, це навмисно
        setSocket(null);
      }
      return;
    }

    const s = io(SERVER_ORIGIN, { autoConnect: false });
    socketRef.current = s;

    const connectWithToken = async () => {
      const token = await getToken();
      s.auth = { token };
      s.connect();
    };

    s.io.on("reconnect_attempt", () => {
      getToken().then((token) => {
        s.auth = { token };
      });
    });

    connectWithToken();
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [isSignedIn, getToken]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
