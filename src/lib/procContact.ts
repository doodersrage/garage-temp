import { sendEmail } from '../lib/Nodemailer'; 
import { initDb } from '../lib/db';

export async function procContact(data: { name: string; email: string; message: string }): Promise<any> {
    let errors = { name: "", email: "", message: "" };
    let successSubmission = false;
    let errorMessage = "";

    try {

        // Validation logic
        const hasErrors = Object.values(errors).some(msg => msg)

    if (!hasErrors) {
        const payload = {
            name: data.name,
            email: data.email,
            html: JSON.stringify(data.message),
            subject: 'Contact Form Submission',
        };
        await sendEmail(payload);

        successSubmission = true;

        const db = await initDb();
        const qry = 'INSERT INTO contacts (name, email, message) VALUES($1, $2, $3)';
        const values = [data.name, data.email, JSON.stringify(data.message)];
        await db.query(qry, values);

        return { success: successSubmission, errors, errorMessage };
    }

    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
            errorMessage = error.message;
            
            return { success: successSubmission, errors, errorMessage };
        }
    }
  
}