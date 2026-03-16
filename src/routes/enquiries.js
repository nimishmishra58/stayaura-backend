import express from "express";
import multer from "multer";
import { resend } from "../config/resend.js";
import cloudinary from "../config/cloudinary.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const MAX_IMAGES = 5;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
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

    if (!name?.trim()) throw httpError(400, "Name is required");
    if (!email?.trim()) throw httpError(400, "Email is required");
    if (!phone?.trim()) throw httpError(400, "Phone is required");

    if (safeEnquiryType === "guest") {
      if (!bedrooms?.trim()) throw httpError(400, "Accommodation type is required");
      if (!address?.trim()) throw httpError(400, "Preferred area or address is required");
    }

    if (safeEnquiryType === "landlord") {
      if (!propertyAddress?.trim()) throw httpError(400, "Property address is required");
    }

    const adminSubject =
      emailSubject?.trim() ||
      (safeEnquiryType === "landlord" ? "New Landlord Enquiry" : "New Guest Enquiry");

    // Upload images to Cloudinary
    const imageLinks = [];
    if (req.files?.length) {
      for (const file of req.files) {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        const uploadRes = await cloudinary.uploader.upload(base64, {
          folder: "stayaura-enquiries",
        });
        imageLinks.push(uploadRes.secure_url);
      }
    }

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

    const guestRows = `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;"><strong>Accommodation Type</strong></td>
        <td style="padding:12px;border-bottom:1px solid #eee;">${safeBedrooms || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;"><strong>Preferred Area / Address</strong></td>
        <td style="padding:12px;border-bottom:1px solid #eee;">${safeAddress || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;"><strong>City</strong></td>
        <td style="padding:12px;border-bottom:1px solid #eee;">${safeCity || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;"><strong>Postcode</strong></td>
        <td style="padding:12px;border-bottom:1px solid #eee;">${safePostcode || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;"><strong>Notes</strong></td>
        <td style="padding:12px;border-bottom:1px solid #eee;">${safeNotes || "N/A"}</td>
      </tr>
    `;

    const landlordRows = `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;"><strong>Service</strong></td>
        <td style="padding:12px;border-bottom:1px solid #eee;">${safeService || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;"><strong>Property Address</strong></td>
        <td style="padding:12px;border-bottom:1px solid #eee;">${safePropertyAddress || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;"><strong>Notes</strong></td>
        <td style="padding:12px;border-bottom:1px solid #eee;">${safeNotes || "N/A"}</td>
      </tr>
    `;

    const adminHtml = `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6fb;padding:40px;">
        <div style="max-width:650px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.08);">
          <div style="background:#0f172a;color:#fff;padding:24px 30px;">
            <h2 style="margin:0;font-size:22px;">${safeEnquiryType === "landlord" ? "🏠 New Landlord Enquiry" : "🧳 New Guest Enquiry"}</h2>
            <p style="margin:6px 0 0;color:#cbd5e1;font-size:14px;">New enquiry submitted on StayAura</p>
          </div>

          <div style="padding:30px">
            <table style="width:100%;border-collapse:collapse;font-size:15px;">
              <tr>
                <td style="padding:12px;border-bottom:1px solid #eee;"><strong>Name</strong></td>
                <td style="padding:12px;border-bottom:1px solid #eee;">${safeName || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding:12px;border-bottom:1px solid #eee;"><strong>Email</strong></td>
                <td style="padding:12px;border-bottom:1px solid #eee;">${safeEmail || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding:12px;border-bottom:1px solid #eee;"><strong>Phone</strong></td>
                <td style="padding:12px;border-bottom:1px solid #eee;">${safePhone || "N/A"}</td>
              </tr>
              ${safeEnquiryType === "landlord" ? landlordRows : guestRows}
            </table>

            ${
              imageLinks.length > 0
                ? `
              <h3 style="margin-top:30px;color:#0f172a;">Uploaded Images</h3>
              <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;">
                ${imageLinks
                  .map(
                    (img) => `
                      <img src="${img}" style="width:120px;height:90px;object-fit:cover;border-radius:8px;border:1px solid #eee"/>
                    `
                  )
                  .join("")}
              </div>
            `
                : ""
            }

            <div style="margin-top:30px;text-align:center;">
              <a href="mailto:${safeEmail}" style="background:#0f766e;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                Reply to ${safeEnquiryType === "landlord" ? "Landlord" : "Guest"}
              </a>
            </div>
          </div>

          <div style="background:#f1f5f9;padding:16px;text-align:center;font-size:13px;color:#64748b;">
            StayAura Team • www.stayaura.com
          </div>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: "StayAura <onboarding@resend.dev>",
      to: ["mishranimisha58@gmail.com"],
      subject: adminSubject,
      html: adminHtml,
    });

    await resend.emails.send({
      from: "StayAura <onboarding@resend.dev>",
      to: [email],
      subject: "We received your enquiry",
      html: `
        <div style="font-family:Arial;background:#f4f6fb;padding:40px">
          <div style="max-width:600px;margin:auto;background:#fff;padding:40px;border-radius:12px">
            <h2 style="margin-top:0;color:#0f172a">Thank you, ${safeName || "there"} 👋</h2>
            <p style="color:#475569;font-size:15px;line-height:1.6">
              We have received your ${safeEnquiryType === "landlord" ? "landlord" : "guest"} enquiry.
              Our team will contact you within 24 hours.
            </p>
            <div style="margin:25px 0;padding:18px;background:#f1f5f9;border-radius:10px">
              <strong>What happens next?</strong>
              <ul>
                <li>Requirement review</li>
                <li>Follow-up from our team</li>
                <li>Best-fit plan for your request</li>
              </ul>
            </div>
            <p style="color:#64748b;font-size:14px">
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
