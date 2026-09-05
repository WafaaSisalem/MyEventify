import nodemailer from "nodemailer";
import type { SendMailOptions } from "nodemailer";
import { config } from "../config.ts";

const etherealTransport = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: config.ETHEREAL_USER,
    pass: config.ETHEREAL_PASS,
  },
});

const consoleTransport = nodemailer.createTransport({
  streamTransport: true,
  newline: "unix",
  buffer: true,
});

export const mailer = {
  async sendMail(options: SendMailOptions) {
    try {
      const info = await etherealTransport.sendMail(options);

      console.log("Email sent through Ethereal:", info.messageId);

      const previewUrl = nodemailer.getTestMessageUrl(info);

      if (previewUrl) {
        console.log("Preview URL:", previewUrl);
      }

      return info;
    } catch (error) {
      // Fallback: Console
      console.warn("Ethereal failed, using console transport...");

      const info = await consoleTransport.sendMail(options);

      console.log("Email:", info.message?.toString());

      return info;
    }
  },
};
