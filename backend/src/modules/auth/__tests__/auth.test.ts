import request from "supertest";
import express from "express";
import authRoutes from "../routes";

const app = express();
app.use(express.json());
app.use("/auth", authRoutes);

describe("Auth Module", () => {
  describe("POST /auth/register", () => {
    it("should register an individual account successfully", async () => {
      const res = await request(app).post("/auth/register").send({
        fullName: "John Doe",
        email: "john@example.com",
        mobile: "+255712345678",
        password: "SecurePass1!",
        accountType: "INDIVIDUAL",
        physicalAddress: "123 Main St, Zanzibar",
        termsAccepted: true,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain("pending approval");
      expect(res.body.data.accountId).toBeDefined();
    });

    it("should reject duplicate email registration", async () => {
      await request(app).post("/auth/register").send({
        fullName: "John Doe",
        email: "dup@example.com",
        mobile: "+255712345679",
        password: "SecurePass1!",
        accountType: "INDIVIDUAL",
        physicalAddress: "123 Main St",
        termsAccepted: true,
      });

      const res = await request(app).post("/auth/register").send({
        fullName: "Jane Doe",
        email: "dup@example.com",
        mobile: "+255712345680",
        password: "SecurePass1!",
        accountType: "INDIVIDUAL",
        physicalAddress: "456 Main St",
        termsAccepted: true,
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should reject weak passwords", async () => {
      const res = await request(app).post("/auth/register").send({
        fullName: "John Doe",
        email: "weak@example.com",
        mobile: "+255712345681",
        password: "short",
        accountType: "INDIVIDUAL",
        physicalAddress: "123 Main St",
        termsAccepted: true,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /auth/login", () => {
    it("should return 401 for invalid credentials", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "nonexistent@example.com",
        password: "WrongPass1!",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
