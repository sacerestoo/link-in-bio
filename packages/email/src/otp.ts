import "server-only";
import { Resend } from "resend";

type SendOtpEmailInput = Readonly<{
  apiKey: string;
  from: string;
  email: string;
  otp: string;
}>;

export const sendOtpEmail = async ({
  apiKey,
  from,
  email,
  otp,
}: SendOtpEmailInput): Promise<void> => {
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Your Grabbin sign-in code",
    html: `<p>Your Grabbin verification code is <strong>${otp}</strong>.</p><p>It expires in 5 minutes.</p>`,
    text: `Your Grabbin verification code is ${otp}. It expires in 5 minutes.`,
  });

  if (error !== null) throw new Error("Unable to send the email code.");
};
