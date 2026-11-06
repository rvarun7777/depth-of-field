import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";

import App from "./App.tsx";

const theme = extendTheme({
  styles: {
    global: {
      "html": { scrollPaddingTop: "16px" },
      "body": { margin: 0, minWidth: "320px" },
      "#root": { width: "100%", minWidth: 0 },
      "@media (max-width: 767px)": {
        ".chakra-select, .chakra-input": { fontSize: "16px", minHeight: "44px", maxWidth: "100%" },
        ".chakra-button": { minHeight: "44px" },
        ".chakra-checkbox, .chakra-radio": { minHeight: "44px" },
        ".chakra-slider": { minHeight: "44px" },
        ".chakra-slider__thumb": { width: "24px", height: "24px" },
        "summary": { minHeight: "44px" },
      },
    },
  },
  config: {
    initialColorMode: "light",
    useSystemColorMode: false,
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>
);
