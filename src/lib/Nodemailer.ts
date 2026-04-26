import nodemailer from "nodemailer";

interface emailFunctionProps {
  email: string;
  html: string;
  subject: string;
  text: string;
}

async function sendEmail(props: emailFunctionProps) {

  const emailPort = import.meta.env.SMTP_PORT
  const emailTo = import.meta.env.SMTP_MAIL_FROM
  const emailUser = import.meta.env.SMTP_USER
  const emailToPass = import.meta.env.SMTP_PASSWORD
  const host = import.meta.env.SMTP_HOST

  let transporter = nodemailer.createTransport({
    host: host,
    port: emailPort,
    auth: {
      user: emailUser,
      pass: emailToPass,
    },
  });

  // Message object
  let message = {
    from: props.email,
    to: emailTo,
    subject: props.subject,
    text: props.text,
    html: props.html,
  };

  let info = await transporter.sendMail(message);
  console.log("Message sent successfully as %s", info.messageId);

  console.log({ info });
  return info;
}

export { sendEmail };