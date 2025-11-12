import { TinaNodeBackend, LocalBackendAuthProvider } from "@tinacms/datalayer";
import { BasicAuthProvider } from "../../../lib/basicAuth";
import databaseClient from "../../../tina/__generated__/databaseClient";

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === "true";

const handler = TinaNodeBackend({
  authProvider: isLocal
    ? LocalBackendAuthProvider()
    : BasicAuthProvider({
        username: process.env.TINA_ADMIN_USERNAME,
        password: process.env.TINA_ADMIN_PASSWORD,
      }),
  databaseClient,
});

export default (req, res) => {
  // Modify the request here if you need to
  return handler(req, res);
};
