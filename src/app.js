import express from "express";
import cors from "cors";
import enquiryRoutes from "./routes/enquiries.js";
import cloudinary from "./config/cloudinary.js";
import { resend } from "./config/resend.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (_, res) => {
  res.send("StayAura backend running");
});

app.get("/test-cloudinary", async (_, res, next) => {
  try {
    const result = await cloudinary.uploader.upload(
      "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    );
    res.json({ success: true, url: result.secure_url });
  } catch (error) {
    next(error);
  }
});

app.get("/test-email", async (_, res, next) => {
  try {
    await resend.emails.send({
      from: "StayAura <no-reply@stayaura.com>",
      to: [process.env.ADMIN_EMAIL],
      subject: "Resend test email",
      html: "<p>Email system working</p>",
    });

    res.json({ success: true, message: "Email sent" });
  } catch (error) {
    next(error);
  }
});

app.use("/api/enquiry", enquiryRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
