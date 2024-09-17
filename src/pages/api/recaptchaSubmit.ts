import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { gRecaptchaToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Missing reCAPTCHA token" });
    }

    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
      return res.status(500).json({ error: "Missing reCAPTCHA secret key" });
    }

    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: "Failed to verify reCAPTCHA" });
    }

    const data = await response.json();
    if (!data.success) {
      return res.status(400).json({ error: "reCAPTCHA verification failed" });
    }

    return res.status(200).json({ message: "reCAPTCHA validation successful", response: data });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default handler;