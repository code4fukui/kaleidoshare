import { Context, Router } from "oak";
import {
  AuthenticationNotVerifiedError,
  AuthenticatorNotRegisteredError,
  RegistrationNotVerifiedError,
  UserAlreadyExistsError,
  authenticate,
  createAuthentication,
  createCredential,
  deleteUser,
  register,
  userExists,
} from "./auth.ts";
import {
  AuthorDoesNotMatchError,
  ContentNotFoundError,
  TooManyContentsError,
  createContent,
  getUserContent,
  getUserContentImage,
  listUserContents,
  removeAllUserContents,
  removeContent,
  updateContent,
} from "./content.ts";

import Ajv, { ValidateFunction } from "ajv";
import schema from "../schema/schema.json" assert { type: "json" };
import { Settings, Output, Image } from "../schema/schema.ts";
import { makeContentPageForTwitterBot } from "./twitter.tsx";

const ajv = new Ajv.default();
function validate<T>(validate: ValidateFunction<T>, data: unknown): T {
  if (!validate(data)) {
    throw new BadRequest(validate.errors);
  }
  return data as T;
}
export class BadRequest extends Error {
  constructor(public errors: unknown) {
    super();
  }
}

const validateSignupUser = ajv.compile({
  ...schema,
  type: "object",
  required: ["name"],
  properties: {
    name: {
      $ref: "#/definitions/UserName",
    },
  },
}) as ValidateFunction<{ name: string }>;
const validatePublishRequest = ajv.compile({
  ...schema,
  type: "object",
  required: ["settings", "output", "thumbnail", "image"],
  properties: {
    settings: {
      $ref: "#/definitions/Settings",
    },
    output: {
      $ref: "#/definitions/Output",
    },
    thumbnail: {
      $ref: "#/definitions/Image",
    },
    image: {
      $ref: "#/definitions/Image",
    },
  },
}) as ValidateFunction<{ settings: Settings; output: Output; image: Image }>;

export function createRouters(
  expectedRPIDs: string[],
  expectedOrigins: string[]
): { router: Router; routerWithAuth: Router; routerForBot: Router } {
  const router = new Router({
    prefix: "/api",
  });
  const routerWithAuth = new Router({
    prefix: "/api",
  });
  routerWithAuth.use(async (context, next) => {
    const userName = await context.state.session.get("login");
    if (userName == null) {
      context.response.status = 401;
      context.response.body = JSON.stringify({
        message: "not authenticated",
      });
      return;
    }
    await next();
  });
  router.post("/session/new", async (context) => {
    const body = await context.request.body({ type: "json" }).value;
    const optionalUserName = body.name;
    const origin = context.request.headers.get("origin");
    const rpID =
      expectedRPIDs.find(
        (rpID) => origin != null && new URL(origin).hostname === rpID
      ) ?? expectedRPIDs[0];
    const options = await createAuthentication(rpID, optionalUserName);
    context.response.status = 200;
    await context.state.session.flash("challenge", options.challenge);
    context.response.body = JSON.stringify(options);
  });
  router.post("/session", async (context) => {
    const response = await context.request.body({ type: "json" }).value;
    const challenge = await context.state.session.get("challenge");
    if (challenge == null) {
      throw new AuthenticationNotVerifiedError();
    }
    const userName = await authenticate(
      expectedRPIDs,
      expectedOrigins,
      response,
      challenge
    );
    await context.state.session.set("login", userName);
    context.response.status = 200;
    context.response.body = JSON.stringify({ name: userName });
  });
  router.get("/session", async (context) => {
    const name = await context.state.session.get("login");
    const user = name == null ? null : { name };
    context.response.status = 200;
    context.response.body = JSON.stringify(user);
  });
  router.delete("/session", async (context) => {
    await context.state.session.deleteSession();
    context.response.status = 200;
  });
  router.post("/credential/new", async (context) => {
    const json = await context.request.body({ type: "json" }).value;
    const { name: userName } = validate(validateSignupUser, json);
    const origin = context.request.headers.get("origin");
    const rpID =
      expectedRPIDs.find(
        (rpID) => origin != null && new URL(origin).hostname === rpID
      ) ?? expectedRPIDs[0];
    const options = await createCredential(rpID, userName, true);
    await context.state.session.flash("challenge", options.challenge);
    await context.state.session.flash("userName", userName);
    context.response.status = 200;
    context.response.body = JSON.stringify(options);
  });
  routerWithAuth.post("/credential/add", async (context) => {
    const userName = await context.state.session.get("login");
    const origin = context.request.headers.get("origin");
    const rpID =
      origin != null
        ? expectedRPIDs.find((rpID) => new URL(origin).hostname === rpID) ??
          expectedRPIDs[0]
        : expectedRPIDs[0];
    const options = await createCredential(rpID, userName, false);
    await context.state.session.flash("challenge", options.challenge);
    await context.state.session.flash("userName", userName);
    context.response.status = 200;
    context.response.body = JSON.stringify(options);
  });
  router.post("/credential", async (context) => {
    const response = await context.request.body({ type: "json" }).value;
    const challenge: string = await context.state.session.get("challenge");
    const userName: string = await context.state.session.get("userName");
    if (challenge == null || userName == null) {
      throw new RegistrationNotVerifiedError();
    }
    await register(
      expectedRPIDs,
      expectedOrigins,
      response,
      challenge,
      userName
    );
    await context.state.session.set("login", userName);
    context.response.status = 200;
  });
  routerWithAuth.delete("/user", async (context) => {
    const userName = await context.state.session.get("login");
    await removeAllUserContents(userName); // TODO: 消さなくてもいい？
    await deleteUser(userName);
    await context.state.session.deleteSession();
    context.response.status = 200;
  });
  routerWithAuth.post("/contents/:author", async (context) => {
    const author = context.params.author;
    const userName = await context.state.session.get("login");
    const body = await context.request.body({ type: "json" }).value;
    const { settings, output, thumbnail, image } = validate(
      validatePublishRequest,
      body
    );
    const content = await createContent(
      userName,
      author,
      settings,
      output,
      thumbnail,
      image
    );
    context.response.status = 200;
    context.response.body = JSON.stringify(content);
  });
  routerWithAuth.put("/contents/:author/:contentId", async (context) => {
    const author = context.params.author;
    const userName = await context.state.session.get("login");
    const contentId = context.params.contentId;
    const body = await context.request.body({ type: "json" }).value;
    const { settings, output, thumbnail, image } = validate(
      validatePublishRequest,
      body
    );
    const content = await updateContent(
      userName,
      author,
      contentId,
      settings,
      output,
      thumbnail,
      image
    );
    context.response.status = 200;
    context.response.body = JSON.stringify(content);
  });
  routerWithAuth.delete("/contents/:author/:contentId", async (context) => {
    const author = context.params.author;
    const userName = await context.state.session.get("login");
    const contentId = context.params.contentId;
    const content = await removeContent(userName, author, contentId);
    context.response.status = 200;
    context.response.body = JSON.stringify(content);
  });
  router.get("/contents/:author", async (context) => {
    const author = context.params.author;
    const authorExists = await userExists(author);
    const contents = authorExists ? await listUserContents(author) : null;
    context.response.status = 200;
    context.response.body = JSON.stringify(contents);
  });
  router.get("/contents/:author/:contentId", async (context) => {
    const author = context.params.author;
    const contentId = context.params.contentId;
    const content = await getUserContent(author, contentId);
    context.response.status = 200;
    context.response.body = JSON.stringify(content);
  });
  router.get("/contents/:author/:contentId/image.png", async (context) => {
    const author = context.params.author;
    const contentId = context.params.contentId;
    const image = await getUserContentImage(author, contentId);
    if (image == null) {
      throw new ContentNotFoundError();
    }
    const array = dataUrlToUint8Array(image);
    context.response.status = 200;
    context.response.headers.set("content-type", "image/png");
    context.response.headers.set("content-length", array.length.toString());
    context.response.body = array;
  });
  const routerForBot = new Router();
  routerForBot.get("/contents/:author/:contentId", async (context, next) => {
    const isTwitterBot =
      context.request.headers.get("user-agent")?.includes("Twitterbot") ??
      false;
    if (!isTwitterBot) {
      await next();
      return;
    }
    const author = context.params.author;
    const contentId = context.params.contentId;
    context.response.status = 200;
    context.response.body = makeContentPageForTwitterBot(author, contentId);
  });
  return { router, routerWithAuth, routerForBot };
}
function dataUrlToUint8Array(base64Str: string): Uint8Array {
  const raw = atob(base64Str.split(",")[1]);
  return Uint8Array.from(
    Array.prototype.map.call(raw, (x) => {
      return x.charCodeAt(0);
    }) as number[]
  );
}

export function handleError(context: Context, e: unknown) {
  if (e instanceof BadRequest) {
    context.response.status = 400;
    context.response.body = JSON.stringify({
      message: "Bad request", // このメッセージを見るのは攻撃者だけ
    });
    return;
  }
  if (e instanceof UserAlreadyExistsError) {
    context.response.status = 400;
    context.response.body = JSON.stringify({
      message: "User already exists",
    });
    return;
  }
  if (e instanceof RegistrationNotVerifiedError) {
    context.response.status = 401;
    context.response.body = JSON.stringify({
      message: "Registration failed",
    });
    return;
  }
  if (
    e instanceof AuthenticatorNotRegisteredError ||
    e instanceof AuthenticationNotVerifiedError
  ) {
    context.response.status = 401;
    context.response.body = JSON.stringify({
      message: "Authentication failed",
    });
    return;
  }
  if (e instanceof AuthorDoesNotMatchError) {
    context.response.status = 403;
    context.response.body = JSON.stringify({
      message: "Author does not match",
    });
    return;
  }
  if (e instanceof TooManyContentsError) {
    context.response.status = 400;
    context.response.body = JSON.stringify({
      message: "Too many contents",
    });
    return;
  }
  console.error(e);
  context.response.status = 500;
  context.response.body = JSON.stringify({
    message: "Internal Server Error",
  });
}
