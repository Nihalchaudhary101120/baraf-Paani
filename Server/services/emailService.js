import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const getTransporter = () => {
    const user = process.env.EMAIL_USER?.trim();
    const pass = process.env.EMAIL_PASSWORD;

    return nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user,
            pass
        }
    });
};

export const sendAccountEmail = async ({
    name,
    email,
    employeeId,
    password,
    role
}) => {
    try {
        const user = process.env.EMAIL_USER?.trim();
        const pass = process.env.EMAIL_PASSWORD;

        if (!user || !pass) {
            console.log(`[EMAIL NOTICE] Credentials not set in .env. Account created for ${email} (Emp ID: ${employeeId}, Role: ${role}). Password: ${password}`);
            return;
        }

        const transporter = getTransporter();
        await transporter.verify();

        let frontendHost = (process.env.FRONTEND_URL || 'http://localhost:5174').trim();
        if (!frontendHost.startsWith('http://') && !frontendHost.startsWith('https://')) {
            frontendHost = `http://${frontendHost}`;
        }
        const loginUrl = `${frontendHost}/login`;

        await transporter.sendMail({
            from: `"NCPOR Polar Operations" <${user}>`,
            to: email,
            subject: "NIRANTRA Antarctic Operations Platform - Your Account Details",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #005B7F; border-radius: 8px;">
                    <div style="background-color: #005B7F; color: #ffffff; padding: 15px; border-radius: 6px 6px 0 0; text-align: center;">
                        <h2 style="margin: 0; font-size: 20px;">NCPOR Antarctic Operations Platform</h2>
                        <p style="margin: 5px 0 0 0; font-size: 13px; color: #99F6E4;">NIRANTRA Digital Operations Portal</p>
                    </div>

                    <div style="padding: 20px;">
                        <p>Dear <strong>${name}</strong>,</p>

                        <p>Your official user account for the Antarctic Expedition Digital Operations Platform has been provisioned by HQ Admin.</p>

                        <div style="background-color: #F4F7F9; padding: 15px; border-left: 4px solid #005B7F; border-radius: 4px; margin: 20px 0;">
                            <p style="margin: 6px 0;"><strong>Email Address:</strong> ${email}</p>
                            <p style="margin: 6px 0;"><strong>Employee / Service ID:</strong> ${employeeId}</p>
                            <p style="margin: 6px 0;"><strong>Temporary Password:</strong> <span style="font-family: monospace; font-weight: bold; color: #005B7F;">${password}</span></p>
                            <p style="margin: 6px 0;"><strong>Assigned Role:</strong> <span style="background-color: #005B7F; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${role}</span></p>
                        </div>

                        <p style="margin-top: 20px;">
                            You can log in to the portal using your email and temporary password:
                            <br/><br/>
                            <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #005B7F; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
                                Login to NIRANTRA Portal
                            </a>
                        </p>

                        <p style="font-size: 12px; color: #475569; margin-top: 15px; background-color: #F8FAFC; padding: 10px; border-radius: 4px; border: 1px solid #E2E8F0;">
                            <strong>Direct Portal Link:</strong>
                            <br/>
                            <a href="${loginUrl}" target="_blank" style="color: #005B7F; word-break: break-all; font-weight: 600;">
                                ${loginUrl}
                            </a>
                        </p>

                        <p style="font-size: 11px; color: #666; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                            This is an automated operational notice from National Centre for Polar and Ocean Research (NCPOR), Ministry of Earth Sciences, Govt. of India.
                        </p>
                    </div>
                </div>
            `
        });
        console.log(`Account email successfully dispatched to ${email}`);
    } catch (error) {
        console.error("Error sending account creation email:", error.message);
    }
};