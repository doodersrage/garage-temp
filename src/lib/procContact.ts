import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";
import { initDb } from '../lib/db';

export async function procContact(data: { name: string; email: string; message: string }): Promise<any> {
    let errors = { name: "", email: "", message: "" };
    let successSubmission = false;
    let errorMessage = "";

    // Validation logic
    const hasErrors = Object.values(errors).some(msg => msg)

    if (!hasErrors) {

        const msg = createMimeMessage();
        msg.setSender({ name: "Sender", addr: data.email });
        msg.setRecipient(import.meta.env.SMTP_MAIL_FROM);
        msg.setSubject('Contact Form Submission');
        msg.addMessage({
        contentType: "text/plain",
        data: 'Name: ' + data.name + '\nEmail: ' + data.email + '\nMessage: ' + data.message,
        });

        var message = new EmailMessage(
        data.email,
        import.meta.env.SMTP_MAIL_FROM,
        msg.asRaw(),
        );

        try {

            await env.MAILER.send(message);

            const db = await initDb();
            const qry = 'INSERT INTO contacts (name, email, message) VALUES($1, $2, $3)';
            const values = [data.name, data.email, JSON.stringify(data.message)];
            await db.query(qry, values);

            successSubmission = true;

            return { success: successSubmission, errors, errorMessage };

        } catch (e) {           
            if (e instanceof Error) {
                errorMessage = e.message;
            
                return { success: successSubmission, errors, errorMessage };
            }
        }

    }
  
}