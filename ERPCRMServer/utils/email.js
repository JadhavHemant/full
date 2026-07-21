const nodemailer = require("nodemailer");

let transporter = null;

const getEmailUser = () => String(process.env.EMAIL_USER || "").trim();
const getEmailPass = () => String(process.env.EMAIL_PASS || "").replace(/\s+/g, "");

const isEmailConfigured = () => Boolean(getEmailUser() && getEmailPass());

const normalizeEmailInput = (toOrOptions, subject, text) => {
  if (typeof toOrOptions === "object" && toOrOptions !== null && !Array.isArray(toOrOptions)) {
    return {
      from: getEmailUser(),
      ...toOrOptions,
    };
  }

  return {
    from: getEmailUser(),
    to: toOrOptions,
    subject,
    text,
  };
};

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: getEmailUser(),
        pass: getEmailPass(),
      },
    });
  }

  return transporter;
};

const sendEmail = async (toOrOptions, subject, text) => {
  if (!isEmailConfigured()) {
    throw new Error("Email credentials are not configured");
  }

  const mailOptions = normalizeEmailInput(toOrOptions, subject, text);
  try {
    await getTransporter().sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    if (error?.code === "EAUTH") {
      const authError = new Error(
        "Gmail authentication failed. Check EMAIL_USER and the Gmail App Password in server/.env."
      );
      authError.code = "EAUTH";
      authError.originalError = error;
      throw authError;
    }

    throw error;
  }
};

module.exports = { sendEmail, isEmailConfigured };



