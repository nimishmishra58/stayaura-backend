import cloudinary from "../config/cloudinary.js";
import { resend } from "../config/resend.js";
import { supabase } from "../config/supabase.js";

export const createEnquiry = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      bedrooms,
      address,
      city,
      postcode,
    } = req.body;

    // Upload images
    const imageUrls = [];

    if (req.files) {
      for (const file of req.files) {
        const upload = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
          { folder: "stayaura/enquiries" }
        );
        imageUrls.push(upload.secure_url);
      }
    }

    // Save to database
    const { error } = await supabase.from("landlord_enquiries").insert([
      {
        name,
        email,
        phone,
        bedrooms,
        address,
        city,
        postcode,
        images: imageUrls,
      },
    ]);

    if (error) throw error;

    // Send email
    await resend.emails.send({
      from: "StayAura <no-reply@stayaura.com>",
      to: [process.env.ADMIN_EMAIL],
      subject: "New Guaranteed Rent Enquiry",
      html: `
        <h2>New Landlord Enquiry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Bedrooms:</strong> ${bedrooms}</p>
        <p><strong>Address:</strong> ${address}, ${city}, ${postcode}</p>
        <p><strong>Images:</strong></p>
        ${imageUrls.map(url => `<a href="${url}">${url}</a>`).join("<br/>")}
      `,
    });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
};
