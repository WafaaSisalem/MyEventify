import nodemailer from "nodemailer";
import type { SendMailOptions } from "nodemailer";
import { config } from "../config.ts";
import { logger } from "./logger.ts";

const mailerLogger = logger.child({ component: "mailer" });

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

      mailerLogger.info({ messageId: info.messageId }, "email sent through Ethereal");

      const previewUrl = nodemailer.getTestMessageUrl(info);

      if (previewUrl) {
        mailerLogger.debug("Ethereal preview is available");
      }

      return info;
    } catch {
      // Fallback: Console
      mailerLogger.warn("Ethereal delivery failed; using console transport");

      const info = await consoleTransport.sendMail(options);

      mailerLogger.info("email generated with console transport");

      return info;
    }
  },
};
