import nodemailer from "nodemailer";
import type { MailConfig } from "../../../config/env";
import type { Locale } from "@/shared/i18n/config";
import { DomainError } from "../../../common/errors";

export type VerificationMessage = {
  email: string;
  code: string;
  locale: Locale;
  generation: string;
};
export type VerificationSender = (message: VerificationMessage) => Promise<void>;

const copy = {
  en: {
    subject: "Verify your email for Tic Tac Toe",
    text: (code: string) =>
      `Your Tic Tac Toe verification code is:\n\n${code}\n\nIt expires within 10 minutes and works once. Enter it in the browser where you requested it. If you did not request this code, ignore this email.`,
  },
  fr: {
    subject: "Vérifiez votre adresse pour Tic Tac Toe",
    text: (code: string) =>
      `Votre code de vérification Tic Tac Toe est :\n\n${code}\n\nIl expire au plus tard dans 10 minutes et ne fonctionne qu'une fois. Saisissez-le dans le navigateur utilisé pour la demande. Si vous n'avez pas demandé ce code, ignorez cet e-mail.`,
  },
  ar: {
    subject: "تأكيد بريدك الإلكتروني في Tic Tac Toe",
    text: (code: string) =>
      `رمز تأكيد البريد الإلكتروني في Tic Tac Toe:\n\n${code}\n\nتنتهي صلاحيته خلال 10 دقائق ويُستخدم مرة واحدة. أدخله في المتصفح الذي طلبت الرمز منه. إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.`,
  },
};

// Plain text keeps the code copyable and readable without images, tracking, or remote assets.
export function verificationMessage(message: VerificationMessage) {
  const text = copy[message.locale];
  return { subject: text.subject, text: text.text(message.code) };
}

// A failed/ambiguous SMTP submission is never automatically retried or logged with its payload.
export function createVerificationSender(config: MailConfig | undefined): VerificationSender {
  const transport =
    config &&
    nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: !config.isolatedTest && config.port === 465,
      requireTLS: !config.isolatedTest,
      ignoreTLS: config.isolatedTest,
      ...(config.isolatedTest ? {} : { auth: { user: config.user!, pass: config.password! } }),
      tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  return async (message) => {
    if (!config || !transport) throw new DomainError("EMAIL_UNAVAILABLE");
    try {
      const result = await transport.sendMail({
        from: { name: "Tic Tac Toe", address: config.from },
        to: message.email,
        messageId: `<verification.${message.generation}@${config.from.split("@")[1]}>`,
        ...verificationMessage(message),
      });
      if (!result.accepted?.length) throw new Error("Delivery rejected");
    } catch {
      throw new DomainError("EMAIL_UNAVAILABLE");
    }
  };
}
