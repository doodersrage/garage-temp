import { EmailMessage } from "cloudflare:email";
import { env } from 'cloudflare:workers';
import { createMimeMessage } from "mimetext";
import { initDb } from '../lib/db';

export async function procContact(data: { name: string; email: string; message: string }): Promise<any> { 

    const msg = createMimeMessage();
    msg.setSender({ name: "Sender", addr: import.meta.env.SMTP_MAIL_FROM });
    msg.setRecipient(import.meta.env.SMTP_MAIL_TO);
    msg.setSubject('Contact Form Submission');
    msg.addMessage({
    contentType: "text/plain",
    data: 'Name: ' + data.name + '\nEmail: ' + data.email + '\nMessage: ' + data.message,
    });

    var message = new EmailMessage(
    import.meta.env.SMTP_MAIL_FROM,
    import.meta.env.SMTP_MAIL_TO,
    msg.asRaw(),
    );

    try {

        await env.MAILER.send(message);

        const db = await initDb();
        const qry = 'INSERT INTO contacts (name, email, message) VALUES($1, $2, $3)';
        const values = [data.name, data.email, JSON.stringify(data.message)];
        await db.query(qry, values);

        return { success: true, message: "Contact form submitted successfully." };

    } catch (e) {                  
        return { success: false, message: e };
    }

}