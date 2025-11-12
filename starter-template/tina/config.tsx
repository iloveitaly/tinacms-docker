import { defineConfig, LocalAuthProvider } from "tinacms";
import { BasicAuthClientProvider } from "../lib/basicAuthClient";

import { PageCollection } from "./collections/page";
import { PostCollection } from "./collections/post";

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === "true";

export default defineConfig({
  authProvider: isLocal
    ? new LocalAuthProvider()
    : BasicAuthClientProvider(),
  contentApiUrlOverride: "/api/tina/gql",
  build: {
    publicFolder: "public",
    outputFolder: "admin",
  },
  media: {
    tina: {
      mediaRoot: "uploads",
      publicFolder: "public",
      static: true,
    },
  },
  schema: {
    collections: [PageCollection, PostCollection],
  },
});
