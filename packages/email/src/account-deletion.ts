import "server-only";
import { Resend } from "resend";

export const sendAccountDeletionEmail = async ({
  apiKey,
  from,
  email,
  url,
}: Readonly<{
  apiKey: string;
  from: string;
  email: string;
  url: string;
}>): Promise<void> => {
  const { error } = await new Resend(apiKey).emails.send({
    from,
    to: email,
    subject: "Delete your Grabbin account",
    html: `<p>Click <a href="${url.replaceAll("&", "&amp;")}">this link</a> to permanently delete your Grabbin account.</p><p>If you did not request this, you can ignore this email.</p>`,
    text: `Open this link to permanently delete your Grabbin account: ${url}\n\nIf you did not request this, you can ignore this email.`,
  });

  if (error !== null)
    throw new Error("Unable to send the account deletion email.");
};
