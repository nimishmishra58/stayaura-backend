import express from "express";
import multer from "multer";
import { resend } from "../config/resend.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();
const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_IMAGES,
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      cb(new Error("Only JPG, PNG, WEBP, and HEIC images are allowed."));
      return;
    }
    cb(null, true);
  },
});

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

router.post(
  "/",
  upload.array("images", MAX_IMAGES),
  asyncHandler(async (req, res) => {
    const {
      name = "",
      email = "",
      phone = "",
      bedrooms = "",
      address = "",
      city = "",
      postcode = "",
      propertyAddress = "",
      notes = "",
      service = "",
      enquiryType = "guest",
      emailSubject,
    } = req.body;

    const safeEnquiryType = enquiryType === "landlord" ? "landlord" : "guest";

    if (!name.trim()) throw httpError(400, "Name is required");
    if (!email.trim()) throw httpError(400, "Email is required");
    if (!phone.trim()) throw httpError(400, "Phone is required");

    if (safeEnquiryType === "guest") {
      if (!bedrooms.trim()) throw httpError(400, "Accommodation type is required");
      if (!address.trim()) throw httpError(400, "Preferred area or address is required");
    }

    if (safeEnquiryType === "landlord" && !propertyAddress.trim()) {
      throw httpError(400, "Property address is required");
    }

    const adminSubject =
      emailSubject?.trim() ||
      (safeEnquiryType === "landlord" ? "New Landlord Enquiry" : "New Guest Enquiry");

    const attachments = (req.files || []).map((file) => ({
      filename: file.originalname,
      content: file.buffer.toString("base64"),
      contentType: file.mimetype,
    }));

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeBedrooms = escapeHtml(bedrooms);
    const safeAddress = escapeHtml(address);
    const safeCity = escapeHtml(city);
    const safePostcode = escapeHtml(postcode);
    const safePropertyAddress = escapeHtml(propertyAddress);
    const safeNotes = escapeHtml(notes);
    const safeService = escapeHtml(service);

    const detailsHtml =
      safeEnquiryType === "landlord"
        ? `
          <p><strong>Service:</strong> ${safeService || "Landlord Services"}</p>
          <p><strong>Property Address:</strong> ${safePropertyAddress}</p>
          ${safeNotes ? `<p><strong>Notes:</strong> ${safeNotes}</p>` : ""}
        `
        : `
          <p><strong>Accommodation Type:</strong> ${safeBedrooms}</p>
          <p><strong>Preferred Area / Address:</strong> ${safeAddress}</p>
          ${safeCity ? `<p><strong>City:</strong> ${safeCity}</p>` : ""}
          ${safePostcode ? `<p><strong>Postcode:</strong> ${safePostcode}</p>` : ""}
          ${safeNotes ? `<p><strong>Notes:</strong> ${safeNotes}</p>` : ""}
        `;

    const attachmentPreviewHtml = attachments.length
      ? `
        <div style="margin-top:18px;">
          <p><strong>Image Attachments:</strong></p>
          <div style="display:flex;flex-wrap:wrap;gap:10px;">
            ${attachments
              .map(
                (file) => `
                  <img
                    src="data:${file.contentType};base64,${file.content}"
                    alt="${escapeHtml(file.filename || "Enquiry image")}"
                    style="width:140px;height:100px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;"
                  />
                `
              )
              .join("")}
          </div>
        </div>
      `
      : "";

    const adminHtml = `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:32px;">
        <div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="background:#0f766e;padding:24px 32px;color:#ffffff;">
            <h2 style="margin:0;font-size:24px;">${escapeHtml(adminSubject)}</h2>
            <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">A new ${safeEnquiryType} enquiry was submitted on stayaura.com.</p>
          </div>
          <div style="padding:32px;color:#0f172a;line-height:1.6;">
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
            <p><strong>Phone:</strong> ${safePhone}</p>
            ${detailsHtml}
            ${attachmentPreviewHtml}
            <div style="margin-top:28px;text-align:center;">
              <a href="mailto:${safeEmail}" style="background:#0f766e;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Reply to ${safeEnquiryType === "landlord" ? "Landlord" : "Guest"}</a>
            </div>
          </div>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: "StayAura <info@stayaura.com>",
      to: [process.env.ADMIN_EMAIL],
      replyTo: email,
      subject: adminSubject,
      html: adminHtml,
      attachments,
    });

    await resend.emails.send({
      from: "StayAura <info@stayaura.com>",
      to: [email],
      subject: "We received your enquiry",
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6fb;padding:40px;">
          <div style="max-width:600px;margin:auto;background:#fff;padding:40px;border-radius:12px;">
            <h2 style="margin-top:0;color:#0f172a;">Thank you, ${safeName || "there"}</h2>
            <p style="color:#475569;font-size:15px;line-height:1.6;">
              We have received your ${safeEnquiryType === "landlord" ? "landlord" : "guest"} enquiry.
              Our team will contact you within 24 hours.
            </p>
            <div style="margin:25px 0;padding:18px;background:#f1f5f9;border-radius:10px;">
              <strong>What happens next?</strong>
              <ul>
                <li>Requirement review</li>
                <li>Follow-up from our team</li>
                <li>Best-fit plan for your request</li>
              </ul>
            </div>
            <p style="color:#64748b;font-size:14px;">
              StayAura Team<br/>
              www.stayaura.com
            </p>
          </div>
        </div>
      `,
    });

    res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully",
    });
  })
);

export default router;
