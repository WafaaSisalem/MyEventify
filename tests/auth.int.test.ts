import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.ts";
import { resetDb } from "./helpers.ts";

const password = "password1234";

async function registerAndLogin(email: string) {
  await request(app)
    .post("/v1/auth/signup")
    .send({ email, password, name: "Test User" })
    .expect(201);

  return request(app)
    .post("/v1/auth/login")
    .send({ email, password })
    .expect(200);
}

describe("Auth", () => {
  beforeEach(resetDb);

  it("registers a new user without exposing the password", async () => {
    const response = await request(app)
      .post("/v1/auth/signup")
      .send({
        email: "new-user@test.local",
        password,
        name: "New User",
      })
      .expect(201);

    expect(response.body.email).toBe("new-user@test.local");
    expect(response.body.password).toBeUndefined();
  });

  it("logs in a registered user", async () => {
    const response = await registerAndLogin("login-user@test.local");

    expect(response.body.accessToken).toBeTypeOf("string");
    expect(response.headers["set-cookie"]).toBeDefined();
  });

  it("rotates a refresh token and rejects reuse of the old token", async () => {
    const loginResponse = await registerAndLogin("rotation-user@test.local");
    const oldCookie = loginResponse.headers["set-cookie"]?.[0];

    expect(oldCookie).toBeDefined();

    const refreshResponse = await request(app)
      .post("/v1/auth/refresh")
      .set("Cookie", oldCookie!)
      .expect(200);

    const newCookie = refreshResponse.headers["set-cookie"]?.[0];

    expect(refreshResponse.body.accessToken).toBeTypeOf("string");
    expect(newCookie).toBeDefined();
    expect(newCookie).not.toBe(oldCookie);

    await request(app)
      .post("/v1/auth/refresh")
      .set("Cookie", oldCookie!)
      .expect(401);
  });
});
