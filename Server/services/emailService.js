import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

export const sendAccountEmail = async ({
    name,
    email,
    employeeId,
    password
}) => {

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Antarctic Expedition Platform - Account Created",
        html: `
            <h2>Welcome ${name}</h2>

            <p>Your account has been created by HQ Admin.</p>

            <p><strong>Employee ID:</strong> ${employeeId}</p>
            <p><strong>Password:</strong> ${password}</p>

            <p>
                Login here:
                <a href="${process.env.FRONTEND_URL}/login">
                    Login
                </a>
            </p>

            <p>Please complete your personnel profile after logging in.</p>
        `
    });
};