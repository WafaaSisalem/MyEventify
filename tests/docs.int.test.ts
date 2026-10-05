import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.ts";

describe("API documentation", () => {
  it("serves the OpenAPI contract", async () => {
    const response = await request(app).get("/openapi.json").expect(200);

    expect(response.body.openapi).toBe("3.1.0");
    expect(response.body.info.title).toBe("Eventify API");
    const operationCount = Object.values(response.body.paths).reduce(
      (count: number, path: unknown) =>
        count + Object.keys(path as Record<string, unknown>).length,
      0,
    );

    expect(operationCount).toBe(12);
    expect(response.body.paths["/v1/auth/signup"].post).toBeDefined();
    expect(response.body.paths["/v1/events"].get).toBeDefined();
    expect(response.body.paths["/v1/bookings/{id}"].get).toBeDefined();
    expect(response.body.paths["/health"].get).toBeDefined();
    expect(response.body.components.securitySchemes.bearerAuth).toEqual(
      expect.objectContaining({ type: "http", scheme: "bearer" }),
    );
    expect(response.body.components.securitySchemes.refreshCookie).toEqual(
      expect.objectContaining({
        type: "apiKey",
        in: "cookie",
        name: "refresh_token",
      }),
    );
    expect(response.body.components.schemas.ValidationError).toEqual(
      expect.objectContaining({ type: "object" }),
    );
    expect(
      response.body.paths["/v1/auth/signup"].post.responses["400"].content[
        "application/json"
      ].examples.validationFailed.value.error,
    ).toBe("Validation failed");
    expect(
      response.body.paths["/v1/auth/refresh"].post.responses["401"].content[
        "application/json"
      ].examples.reusedRefreshToken.value.error,
    ).toBe("Refresh token has been revoked (potential token theft)");
    expect(
      Object.keys(
        response.body.paths["/v1/bookings"].post.responses["409"].content[
          "application/json"
        ].examples,
      ),
    ).toEqual([
      "duplicateBooking",
      "alreadyWaitlisted",
      "fullRebooking",
    ]);
    expect(
      response.body.paths["/v1/events"].post.responses["500"].content[
        "application/json"
      ].examples.internalServerError.value.error,
    ).toBe("Internal server error");
  });

  it("serves Swagger UI", async () => {
    const response = await request(app).get("/docs/").expect(200);

    expect(response.text).toContain('id="swagger-ui"');
    expect(response.text).toContain("Eventify API Docs");
  });
});
