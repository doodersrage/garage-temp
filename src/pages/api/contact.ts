export const prerender = false; // Not needed in 'server' mode
import type { APIRoute } from "astro";
import { EmailMessage } from "cloudflare:email";
import { env } from 'cloudflare:workers';
import { createMimeMessage } from "mimetext";
import { initDb } from '../../lib/db';

export const POST: APIRoute = async ({ request }) => {
    const data = await request.formData();
    const name = data.get("name");
    const email = data.get("email");
    const message = data.get("message");

    // Validate the data - you'll probably want to do more than this
    if (!name || !email || !message) {
        return new Response(
            JSON.stringify({
            message: "Missing required fields",
            }),
            { status: 400 }
        );
    }

    const msg = createMimeMessage();
    msg.setSender({ name: "Sender", addr: import.meta.env.SMTP_MAIL_FROM });
    msg.setRecipient(import.meta.env.SMTP_MAIL_TO);
    msg.setSubject('Contact Form Submission');
    msg.addMessage({
        contentType: "text/plain",
        data: 'Name: ' + name + '\nEmail: ' + email + '\nMessage: ' + message,
    });

    var mailMessage = new EmailMessage(
        import.meta.env.SMTP_MAIL_FROM,
        import.meta.env.SMTP_MAIL_TO,
        msg.asRaw(),
    );

    try {

        await env.MAILER.send(mailMessage);

        const db = await initDb();
        const qry = 'INSERT INTO contacts (name, email, message) VALUES($1, $2, $3)';
        const values = [name, email, JSON.stringify(message)];
        await db.query(qry, values);

        return new Response(
            JSON.stringify(
                { success: true, message: "Contact form submitted successfully." }
            ),
                { status: 200 }
            );

    } catch (e) {                  
        return { success: false, message: e };
    }

    // Do something with the data, then return a success response
    



    
};