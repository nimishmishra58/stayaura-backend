import "dotenv/config";   // MUST be first line
import app from "./app.js";

const PORT = process.env.PORT || 5000;

console.log("RESEND KEY:", process.env.RESEND_API_KEY); // debug

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
